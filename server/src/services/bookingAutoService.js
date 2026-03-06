import Booking from '../models/Booking.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import * as NotificationService from './notificationService.js';
import * as WalletService from './walletService.js';
import { v4 as uuidv4 } from 'uuid';

class BookingAutoService {
  
  /**
   * إنشاء حجز جديد
   * @param {Object} bookingData - بيانات الحجز
   * @returns {Promise<Object>} الحجز المنشأ
   */
  async createBooking(bookingData) {
    try {
      const { 
        touristId, guideId, programId, programPrice, 
        totalPrice, commission, paymentMethod, bookingDate 
      } = bookingData;

      // إنشاء الحجز
      const booking = new Booking({
        bookingId: `BOK-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`,
        touristId,
        guideId,
        programId,
        guidePrice: programPrice,
        totalPrice,
        commission,
        paymentMethod,
        bookingDate,
        status: 'PENDING',
        
        // تفاصيل الرسوم (تحسب تلقائياً)
        feeBreakdown: {
          platform: totalPrice * 0.005,  // 0.5%
          booking: totalPrice * 0.0075,   // 0.75%
          map: totalPrice * 0.005,        // 0.5%
          payment: totalPrice * 0.005,     // 0.5%
          dispute: totalPrice * 0.0025     // 0.25%
        }
      });

      await booking.save();

      // إذا كان الدفع عبر المحفظة، نقوم بتجميد المبلغ فوراً
      if (paymentMethod === 'WALLET') {
        await this.holdPayment(booking);
      }

      // إرسال إشعار للمرشد
      await NotificationService.sendNewBookingNotification(booking);

      return booking;
    } catch (error) {
      console.error('خطأ في إنشاء الحجز:', error);
      throw error;
    }
  }

  /**
   * تجميد مبلغ الحجز
   * @param {Object} booking - الحجز
   */
  async holdPayment(booking) {
    const result = await WalletService.holdAmount(
      booking.touristId,
      booking.totalPrice,
      booking.bookingId
    );

    if (!result.success) {
      throw new Error('فشل تجميد المبلغ');
    }

    // تحديث حالة الحجز
    booking.status = 'CONFIRMED';
    await booking.save();
  }

  /**
   * تأكيد الحجز من قبل المرشد
   * @param {string} bookingId - معرف الحجز
   * @returns {Promise<Object>} الحجز المؤكد
   */
  async confirmBooking(bookingId) {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) throw new Error('الحجز غير موجود');

      if (booking.status !== 'PENDING') {
        throw new Error('لا يمكن تأكيد هذا الحجز');
      }

      booking.status = 'CONFIRMED';
      await booking.save();

      // إرسال إشعار للسائح
      await NotificationService.sendBookingConfirmedNotification(booking);

      return booking;
    } catch (error) {
      console.error('خطأ في تأكيد الحجز:', error);
      throw error;
    }
  }

  /**
   * بدء البرنامج السياحي
   * @param {string} bookingId - معرف الحجز
   * @returns {Promise<Object>} الحجز
   */
  async startProgram(bookingId) {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) throw new Error('الحجز غير موجود');

      if (booking.status !== 'CONFIRMED') {
        throw new Error('لا يمكن بدء هذا الحجز');
      }

      booking.status = 'IN_PROGRESS';
      booking.startTime = new Date();
      await booking.save();

      // إشعار المرشد ببدء البرنامج
      await NotificationService.notifyGuideProgramStarted(booking);

      return booking;
    } catch (error) {
      console.error('خطأ في بدء البرنامج:', error);
      throw error;
    }
  }

  /**
   * إتمام البرنامج - هنا يتم حسم الرسوم تلقائياً
   * @param {string} bookingId - معرف الحجز
   * @returns {Promise<Object>} الحجز المكتمل
   */
  async completeProgram(bookingId) {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) throw new Error('الحجز غير موجود');

      if (booking.status !== 'IN_PROGRESS') {
        throw new Error('لا يمكن إكمال هذا الحجز');
      }

      booking.status = 'COMPLETED';
      booking.endTime = new Date();

      // معالجة الدفع حسب الطريقة
      if (booking.paymentMethod === 'WALLET') {
        await this.processWalletPayment(booking);
      } else if (booking.paymentMethod === 'CASH') {
        await this.processCashPayment(booking);
      }

      await booking.save();

      // إرسال الفواتير والإشعارات
      await this.sendBookingCompletionNotifications(booking);

      return booking;
    } catch (error) {
      console.error('خطأ في إكمال البرنامج:', error);
      throw error;
    }
  }

  /**
   * معالجة الدفع عبر المحفظة
   * @param {Object} booking - الحجز
   */
  async processWalletPayment(booking) {
    // 1. تحرير المبلغ المجمد من السائح
    await WalletService.releaseAmount(
      booking.touristId,
      booking.totalPrice,
      booking.bookingId
    );

    // 2. الحصول على محفظة المرشد
    const guideWallet = await Wallet.findOne({ userId: booking.guideId });
    
    // 3. إضافة المبلغ للمرشد (بعد خصم العمولة)
    const guideEarnings = booking.guidePrice;
    guideWallet.balance += guideEarnings;
    guideWallet.stats.totalEarnings = (guideWallet.stats.totalEarnings || 0) + guideEarnings;
    guideWallet.stats.totalBookings = (guideWallet.stats.totalBookings || 0) + 1;
    await guideWallet.save();

    // 4. تسجيل معاملة أرباح المرشد
    const earningsTransaction = new Transaction({
      transactionId: WalletService.generateTransactionId(),
      walletId: guideWallet._id,
      userId: booking.guideId,
      type: 'EARNING',
      amount: guideEarnings,
      netAmount: guideEarnings,
      status: 'COMPLETED',
      description: `أرباح برنامج ${booking.bookingId}`,
      referenceId: booking.bookingId,
      metadata: { bookingId: booking.bookingId }
    });
    await earningsTransaction.save();

    // 5. تسجيل معاملة عمولة التطبيق
    await this.recordCommissionTransaction(booking);
  }

  /**
   * معالجة الدفع نقداً
   * @param {Object} booking - الحجز
   */
  async processCashPayment(booking) {
    // الدفع نقداً: يتم خصم العمولة من رصيد المرشد
    const guideWallet = await Wallet.findOne({ userId: booking.guideId });
    
    // خصم العمولة
    guideWallet.balance -= booking.commission;
    guideWallet.stats.totalFees = (guideWallet.stats.totalFees || 0) + booking.commission;
    await guideWallet.save();

    // تسجيل معاملة خصم العمولة
    const feeTransaction = new Transaction({
      transactionId: WalletService.generateTransactionId(),
      walletId: guideWallet._id,
      userId: booking.guideId,
      type: 'FEE',
      amount: booking.commission,
      netAmount: 0,
      status: 'COMPLETED',
      description: `رسوم خدمة للحجز النقدي ${booking.bookingId}`,
      referenceId: booking.bookingId,
      metadata: { bookingId: booking.bookingId, paymentType: 'CASH' }
    });
    await feeTransaction.save();

    // تسجيل معاملة عمولة التطبيق
    await this.recordCommissionTransaction(booking, 'CASH');
  }

  /**
   * تسجيل معاملة عمولة التطبيق
   * @param {Object} booking - الحجز
   * @param {string} paymentType - نوع الدفع
   */
  async recordCommissionTransaction(booking, paymentType = 'WALLET') {
    // الحصول على محفظة التطبيق
    let appWallet = await Wallet.findOne({ walletNumber: 'APP-FEES-001' });
    if (!appWallet) {
      // إنشاء محفظة التطبيق إذا لم تكن موجودة
      appWallet = new Wallet({
        walletNumber: 'APP-FEES-001',
        userId: 'SYSTEM_APP',
        userType: 'system',
        balance: 0,
        frozenBalance: 0,
        currency: 'SAR',
        status: 'active'
      });
      await appWallet.save();
    }

    // إضافة العمولة لمحفظة التطبيق
    appWallet.balance += booking.commission;
    await appWallet.save();

    // تسجيل معاملة العمولة
    const commissionTransaction = new Transaction({
      transactionId: WalletService.generateTransactionId(),
      walletId: appWallet._id,
      userId: 'SYSTEM_APP',
      type: 'COMMISSION',
      amount: booking.commission,
      netAmount: booking.commission,
      status: 'COMPLETED',
      description: `عمولة حجز ${booking.bookingId}`,
      referenceId: booking.bookingId,
      metadata: {
        bookingId: booking.bookingId,
        paymentType,
        guideId: booking.guideId,
        touristId: booking.touristId,
        feeBreakdown: booking.feeBreakdown
      }
    });
    await commissionTransaction.save();
  }

  /**
   * إرسال إشعارات إكمال الحجز
   * @param {Object} booking - الحجز
   */
  async sendBookingCompletionNotifications(booking) {
    // إشعار للسائح
    await NotificationService.sendBookingCompletedNotification(booking, 'tourist');
    
    // إشعار للمرشد
    await NotificationService.sendBookingCompletedNotification(booking, 'guide');
    
    // إرسال الفواتير
    await this.sendInvoices(booking);
  }

  /**
   * إرسال الفواتير
   * @param {Object} booking - الحجز
   */
  async sendInvoices(booking) {
    // فاتورة السائح
    const touristInvoice = {
      invoiceId: `INV-T-${Date.now()}`,
      date: new Date(),
      customer: booking.touristId,
      items: [{
        description: `برنامج سياحي`,
        quantity: 1,
        price: booking.guidePrice
      }],
      commission: booking.commission,
      total: booking.totalPrice,
      paymentMethod: booking.paymentMethod,
      bookingId: booking.bookingId,
      feeBreakdown: booking.feeBreakdown
    };

    // فاتورة المرشد
    const guideInvoice = {
      invoiceId: `INV-G-${Date.now()}`,
      date: new Date(),
      guide: booking.guideId,
      earnings: booking.guidePrice,
      deductions: booking.paymentMethod === 'CASH' ? booking.commission : 0,
      netAmount: booking.paymentMethod === 'CASH' ? 
                 booking.guidePrice - booking.commission : 
                 booking.guidePrice,
      bookingId: booking.bookingId
    };

    // إرسال الفواتير عبر الإشعارات
    await NotificationService.sendInvoice(touristInvoice, 'tourist');
    await NotificationService.sendInvoice(guideInvoice, 'guide');
  }

  /**
   * إلغاء حجز
   * @param {string} bookingId - معرف الحجز
   * @param {string} cancelledBy - من قام بالإلغاء
   * @param {string} reason - سبب الإلغاء
   * @returns {Promise<Object>} الحجز الملغي
   */
  async cancelBooking(bookingId, cancelledBy, reason = '') {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) throw new Error('الحجز غير موجود');

      if (booking.status === 'COMPLETED') {
        throw new Error('لا يمكن إلغاء حجز مكتمل');
      }

      // حساب رسوم الإلغاء حسب الوقت
      const hoursBeforeBooking = this.calculateHoursBeforeBooking(booking);
      const cancellationFees = this.calculateCancellationFees(
        booking.totalPrice,
        hoursBeforeBooking
      );

      // إذا كان الدفع عبر المحفظة، نعيد المبلغ بعد خصم الرسوم
      if (booking.paymentMethod === 'WALLET') {
        await this.processCancellationRefund(booking, cancellationFees);
      }

      // تحديث الحجز
      booking.status = 'CANCELLED';
      booking.cancellation = {
        cancelledBy,
        cancelledAt: new Date(),
        reason,
        refundAmount: cancellationFees.refundAmount
      };
      await booking.save();

      // إرسال إشعار بالإلغاء
      await NotificationService.sendBookingCancelledNotification(booking, cancelledBy);

      return booking;
    } catch (error) {
      console.error('خطأ في إلغاء الحجز:', error);
      throw error;
    }
  }

  /**
   * حساب عدد الساعات قبل الحجز
   * @param {Object} booking - الحجز
   * @returns {number} عدد الساعات
   */
  calculateHoursBeforeBooking(booking) {
    const now = new Date();
    const bookingDateTime = new Date(booking.bookingDate);
    const diffMs = bookingDateTime - now;
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  /**
   * حساب رسوم الإلغاء
   * @param {number} amount - المبلغ
   * @param {number} hoursBeforeBooking - الساعات قبل الحجز
   * @returns {Object} رسوم الإلغاء
   */
  calculateCancellationFees(amount, hoursBeforeBooking) {
    if (hoursBeforeBooking > 48) {
      return { fee: 0, refundAmount: amount };
    } else if (hoursBeforeBooking > 24) {
      return { 
        fee: amount * 0.25, 
        refundAmount: amount * 0.75 
      };
    } else if (hoursBeforeBooking > 12) {
      return { 
        fee: amount * 0.5, 
        refundAmount: amount * 0.5 
      };
    } else {
      return { 
        fee: amount, 
        refundAmount: 0 
      };
    }
  }

  /**
   * معالجة استرداد مبلغ الإلغاء
   * @param {Object} booking - الحجز
   * @param {Object} cancellationFees - رسوم الإلغاء
   */
  async processCancellationRefund(booking, cancellationFees) {
    // تحرير المبلغ المجمد
    await WalletService.releaseAmount(
      booking.touristId,
      booking.totalPrice,
      booking.bookingId
    );

    // إعادة المبلغ المسترد للسائح
    if (cancellationFees.refundAmount > 0) {
      const touristWallet = await Wallet.findOne({ userId: booking.touristId });
      touristWallet.balance += cancellationFees.refundAmount;
      await touristWallet.save();

      // تسجيل معاملة الاسترداد
      const refundTransaction = new Transaction({
        transactionId: WalletService.generateTransactionId(),
        walletId: touristWallet._id,
        userId: booking.touristId,
        type: 'REFUND',
        amount: cancellationFees.refundAmount,
        netAmount: cancellationFees.refundAmount,
        status: 'COMPLETED',
        description: `استرداد مبلغ الحجز الملغي ${booking.bookingId}`,
        referenceId: booking.bookingId,
        metadata: { cancellationFee: cancellationFees.fee }
      });
      await refundTransaction.save();
    }

    // رسوم الإلغاء تذهب للتطبيق
    if (cancellationFees.fee > 0) {
      const appWallet = await Wallet.findOne({ walletNumber: 'APP-FEES-001' });
      appWallet.balance += cancellationFees.fee;
      await appWallet.save();

      // تسجيل معاملة رسوم الإلغاء
      const feeTransaction = new Transaction({
        transactionId: WalletService.generateTransactionId(),
        walletId: appWallet._id,
        userId: 'SYSTEM_APP',
        type: 'FEE',
        amount: cancellationFees.fee,
        netAmount: cancellationFees.fee,
        status: 'COMPLETED',
        description: `رسوم إلغاء الحجز ${booking.bookingId}`,
        referenceId: booking.bookingId,
        metadata: { hoursBeforeBooking: this.calculateHoursBeforeBooking(booking) }
      });
      await feeTransaction.save();
    }
  }
}

const bookingAutoService = new BookingAutoService();
export default bookingAutoService;
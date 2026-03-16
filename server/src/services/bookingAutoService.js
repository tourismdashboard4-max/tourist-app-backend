// server/src/services/bookingAutoService.js
import { pool } from '../config/database.js';
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
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { 
        touristId, guideId, programId, programPrice, 
        totalPrice, commission, paymentMethod, bookingDate 
      } = bookingData;

      const bookingId = `BOK-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
      
      // إنشاء الحجز
      const bookingResult = await client.query(
        `INSERT INTO app.bookings (
          booking_id, tourist_id, guide_id, program_id, guide_price,
          total_price, commission, payment_method, booking_date, status,
          fee_breakdown, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
          bookingId,
          touristId,
          guideId,
          programId,
          programPrice,
          totalPrice,
          commission,
          paymentMethod,
          bookingDate,
          'PENDING',
          JSON.stringify({
            platform: totalPrice * 0.005,  // 0.5%
            booking: totalPrice * 0.0075,   // 0.75%
            map: totalPrice * 0.005,        // 0.5%
            payment: totalPrice * 0.005,     // 0.5%
            dispute: totalPrice * 0.0025     // 0.25%
          })
        ]
      );

      const booking = bookingResult.rows[0];

      // إذا كان الدفع عبر المحفظة، نقوم بتجميد المبلغ فوراً
      if (paymentMethod === 'WALLET') {
        await this.holdPayment(client, booking);
      }

      await client.query('COMMIT');

      // إرسال إشعار للمرشد (بعد الـ commit)
      await NotificationService.sendNewBookingNotification(booking);

      return booking;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ خطأ في إنشاء الحجز:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * تجميد مبلغ الحجز
   * @param {Object} client - عميل PostgreSQL للـ transaction
   * @param {Object} booking - الحجز
   */
  async holdPayment(client, booking) {
    const result = await WalletService.holdAmount(
      client,
      booking.tourist_id,
      booking.total_price,
      booking.booking_id
    );

    if (!result.success) {
      throw new Error('فشل تجميد المبلغ');
    }

    // تحديث حالة الحجز
    await client.query(
      `UPDATE app.bookings 
       SET status = $1, updated_at = NOW()
       WHERE booking_id = $2`,
      ['CONFIRMED', booking.booking_id]
    );
    
    booking.status = 'CONFIRMED';
  }

  /**
   * تأكيد الحجز من قبل المرشد
   * @param {string} bookingId - معرف الحجز
   * @returns {Promise<Object>} الحجز المؤكد
   */
  async confirmBooking(bookingId) {
    try {
      const bookingResult = await pool.query(
        'SELECT * FROM app.bookings WHERE booking_id = $1',
        [bookingId]
      );
      
      if (bookingResult.rows.length === 0) {
        throw new Error('الحجز غير موجود');
      }
      
      const booking = bookingResult.rows[0];

      if (booking.status !== 'PENDING') {
        throw new Error('لا يمكن تأكيد هذا الحجز');
      }

      const updatedResult = await pool.query(
        `UPDATE app.bookings 
         SET status = $1, updated_at = NOW()
         WHERE booking_id = $2
         RETURNING *`,
        ['CONFIRMED', bookingId]
      );

      const updatedBooking = updatedResult.rows[0];

      // إرسال إشعار للسائح
      await NotificationService.sendBookingConfirmedNotification(updatedBooking);

      return updatedBooking;
    } catch (error) {
      console.error('❌ خطأ في تأكيد الحجز:', error);
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
      const bookingResult = await pool.query(
        'SELECT * FROM app.bookings WHERE booking_id = $1',
        [bookingId]
      );
      
      if (bookingResult.rows.length === 0) {
        throw new Error('الحجز غير موجود');
      }
      
      const booking = bookingResult.rows[0];

      if (booking.status !== 'CONFIRMED') {
        throw new Error('لا يمكن بدء هذا الحجز');
      }

      const updatedResult = await pool.query(
        `UPDATE app.bookings 
         SET status = $1, start_time = NOW(), updated_at = NOW()
         WHERE booking_id = $2
         RETURNING *`,
        ['IN_PROGRESS', bookingId]
      );

      const updatedBooking = updatedResult.rows[0];

      // إشعار المرشد ببدء البرنامج
      await NotificationService.notifyGuideProgramStarted(updatedBooking);

      return updatedBooking;
    } catch (error) {
      console.error('❌ خطأ في بدء البرنامج:', error);
      throw error;
    }
  }

  /**
   * إتمام البرنامج - هنا يتم حسم الرسوم تلقائياً
   * @param {string} bookingId - معرف الحجز
   * @returns {Promise<Object>} الحجز المكتمل
   */
  async completeProgram(bookingId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const bookingResult = await client.query(
        'SELECT * FROM app.bookings WHERE booking_id = $1',
        [bookingId]
      );
      
      if (bookingResult.rows.length === 0) {
        throw new Error('الحجز غير موجود');
      }
      
      const booking = bookingResult.rows[0];

      if (booking.status !== 'IN_PROGRESS') {
        throw new Error('لا يمكن إكمال هذا الحجز');
      }

      // معالجة الدفع حسب الطريقة
      if (booking.payment_method === 'WALLET') {
        await this.processWalletPayment(client, booking);
      } else if (booking.payment_method === 'CASH') {
        await this.processCashPayment(client, booking);
      }

      const updatedResult = await client.query(
        `UPDATE app.bookings 
         SET status = $1, end_time = NOW(), updated_at = NOW()
         WHERE booking_id = $2
         RETURNING *`,
        ['COMPLETED', bookingId]
      );

      const updatedBooking = updatedResult.rows[0];

      await client.query('COMMIT');

      // إرسال الفواتير والإشعارات (بعد الـ commit)
      await this.sendBookingCompletionNotifications(updatedBooking);

      return updatedBooking;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ خطأ في إكمال البرنامج:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * معالجة الدفع عبر المحفظة
   * @param {Object} client - عميل PostgreSQL للـ transaction
   * @param {Object} booking - الحجز
   */
  async processWalletPayment(client, booking) {
    // 1. تحرير المبلغ المجمد من السائح
    await WalletService.releaseAmount(
      client,
      booking.tourist_id,
      booking.total_price,
      booking.booking_id
    );

    // 2. إضافة المبلغ للمرشد (بعد خصم العمولة)
    const guideEarnings = booking.guide_price;
    
    await client.query(
      `UPDATE app.wallets 
       SET balance = balance + $1,
           stats = jsonb_set(
             COALESCE(stats, '{}'::jsonb), 
             '{totalEarnings}', 
             COALESCE(stats->'totalEarnings', '0')::int + $2
           ),
           stats = jsonb_set(
             COALESCE(stats, '{}'::jsonb), 
             '{totalBookings}', 
             COALESCE(stats->'totalBookings', '0')::int + 1
           ),
           updated_at = NOW()
       WHERE user_id = $3`,
      [guideEarnings, guideEarnings, booking.guide_id]
    );

    // 3. الحصول على محفظة المرشد لتسجيل المعاملة
    const guideWalletResult = await client.query(
      'SELECT id FROM app.wallets WHERE user_id = $1',
      [booking.guide_id]
    );
    
    const guideWalletId = guideWalletResult.rows[0].id;

    // 4. تسجيل معاملة أرباح المرشد
    await client.query(
      `INSERT INTO app.transactions (
        transaction_id, wallet_id, user_id, type, amount, net_amount,
        status, description, reference_id, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        WalletService.generateTransactionId(),
        guideWalletId,
        booking.guide_id,
        'EARNING',
        guideEarnings,
        guideEarnings,
        'COMPLETED',
        `أرباح برنامج ${booking.booking_id}`,
        booking.booking_id,
        JSON.stringify({ bookingId: booking.booking_id })
      ]
    );

    // 5. تسجيل معاملة عمولة التطبيق
    await this.recordCommissionTransaction(client, booking, 'WALLET');
  }

  /**
   * معالجة الدفع نقداً
   * @param {Object} client - عميل PostgreSQL للـ transaction
   * @param {Object} booking - الحجز
   */
  async processCashPayment(client, booking) {
    // الدفع نقداً: يتم خصم العمولة من رصيد المرشد
    await client.query(
      `UPDATE app.wallets 
       SET balance = balance - $1,
           stats = jsonb_set(
             COALESCE(stats, '{}'::jsonb), 
             '{totalFees}', 
             COALESCE(stats->'totalFees', '0')::int + $2
           ),
           updated_at = NOW()
       WHERE user_id = $3`,
      [booking.commission, booking.commission, booking.guide_id]
    );

    // الحصول على محفظة المرشد لتسجيل المعاملة
    const guideWalletResult = await client.query(
      'SELECT id FROM app.wallets WHERE user_id = $1',
      [booking.guide_id]
    );
    
    const guideWalletId = guideWalletResult.rows[0].id;

    // تسجيل معاملة خصم العمولة
    await client.query(
      `INSERT INTO app.transactions (
        transaction_id, wallet_id, user_id, type, amount, net_amount,
        status, description, reference_id, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        WalletService.generateTransactionId(),
        guideWalletId,
        booking.guide_id,
        'FEE',
        booking.commission,
        0,
        'COMPLETED',
        `رسوم خدمة للحجز النقدي ${booking.booking_id}`,
        booking.booking_id,
        JSON.stringify({ 
          bookingId: booking.booking_id, 
          paymentType: 'CASH' 
        })
      ]
    );

    // تسجيل معاملة عمولة التطبيق
    await this.recordCommissionTransaction(client, booking, 'CASH');
  }

  /**
   * تسجيل معاملة عمولة التطبيق
   * @param {Object} client - عميل PostgreSQL للـ transaction
   * @param {Object} booking - الحجز
   * @param {string} paymentType - نوع الدفع
   */
  async recordCommissionTransaction(client, booking, paymentType = 'WALLET') {
    // البحث عن محفظة التطبيق أو إنشاؤها
    let appWalletResult = await client.query(
      "SELECT * FROM app.wallets WHERE wallet_number = 'APP-FEES-001'"
    );
    
    let appWalletId;
    
    if (appWalletResult.rows.length === 0) {
      // إنشاء محفظة التطبيق إذا لم تكن موجودة
      const newWalletResult = await client.query(
        `INSERT INTO app.wallets (
          wallet_number, user_id, user_type, balance, frozen_balance,
          currency, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id`,
        [
          'APP-FEES-001',
          'SYSTEM_APP',
          'system',
          0,
          0,
          'SAR',
          'active'
        ]
      );
      appWalletId = newWalletResult.rows[0].id;
    } else {
      appWalletId = appWalletResult.rows[0].id;
    }

    // إضافة العمولة لمحفظة التطبيق
    await client.query(
      `UPDATE app.wallets 
       SET balance = balance + $1, updated_at = NOW()
       WHERE wallet_number = $2`,
      [booking.commission, 'APP-FEES-001']
    );

    // تسجيل معاملة العمولة
    await client.query(
      `INSERT INTO app.transactions (
        transaction_id, wallet_id, user_id, type, amount, net_amount,
        status, description, reference_id, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        WalletService.generateTransactionId(),
        appWalletId,
        'SYSTEM_APP',
        'COMMISSION',
        booking.commission,
        booking.commission,
        'COMPLETED',
        `عمولة حجز ${booking.booking_id}`,
        booking.booking_id,
        JSON.stringify({
          bookingId: booking.booking_id,
          paymentType,
          guideId: booking.guide_id,
          touristId: booking.tourist_id,
          feeBreakdown: booking.fee_breakdown
        })
      ]
    );
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
      customer: booking.tourist_id,
      items: [{
        description: `برنامج سياحي`,
        quantity: 1,
        price: booking.guide_price
      }],
      commission: booking.commission,
      total: booking.total_price,
      paymentMethod: booking.payment_method,
      bookingId: booking.booking_id,
      feeBreakdown: booking.fee_breakdown
    };

    // فاتورة المرشد
    const guideInvoice = {
      invoiceId: `INV-G-${Date.now()}`,
      date: new Date(),
      guide: booking.guide_id,
      earnings: booking.guide_price,
      deductions: booking.payment_method === 'CASH' ? booking.commission : 0,
      netAmount: booking.payment_method === 'CASH' ? 
                 booking.guide_price - booking.commission : 
                 booking.guide_price,
      bookingId: booking.booking_id
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
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const bookingResult = await client.query(
        'SELECT * FROM app.bookings WHERE booking_id = $1',
        [bookingId]
      );
      
      if (bookingResult.rows.length === 0) {
        throw new Error('الحجز غير موجود');
      }
      
      const booking = bookingResult.rows[0];

      if (booking.status === 'COMPLETED') {
        throw new Error('لا يمكن إلغاء حجز مكتمل');
      }

      // حساب رسوم الإلغاء حسب الوقت
      const hoursBeforeBooking = this.calculateHoursBeforeBooking(booking);
      const cancellationFees = this.calculateCancellationFees(
        booking.total_price,
        hoursBeforeBooking
      );

      // إذا كان الدفع عبر المحفظة، نعيد المبلغ بعد خصم الرسوم
      if (booking.payment_method === 'WALLET') {
        await this.processCancellationRefund(client, booking, cancellationFees);
      }

      // تحديث الحجز
      const updatedResult = await client.query(
        `UPDATE app.bookings 
         SET status = $1, 
             cancellation = $2,
             updated_at = NOW()
         WHERE booking_id = $3
         RETURNING *`,
        [
          'CANCELLED',
          JSON.stringify({
            cancelledBy,
            cancelledAt: new Date(),
            reason,
            refundAmount: cancellationFees.refundAmount
          }),
          bookingId
        ]
      );

      const updatedBooking = updatedResult.rows[0];

      await client.query('COMMIT');

      // إرسال إشعار بالإلغاء
      await NotificationService.sendBookingCancelledNotification(updatedBooking, cancelledBy);

      return updatedBooking;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ خطأ في إلغاء الحجز:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * حساب عدد الساعات قبل الحجز
   * @param {Object} booking - الحجز
   * @returns {number} عدد الساعات
   */
  calculateHoursBeforeBooking(booking) {
    const now = new Date();
    const bookingDateTime = new Date(booking.booking_date);
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
   * @param {Object} client - عميل PostgreSQL للـ transaction
   * @param {Object} booking - الحجز
   * @param {Object} cancellationFees - رسوم الإلغاء
   */
  async processCancellationRefund(client, booking, cancellationFees) {
    // تحرير المبلغ المجمد
    await WalletService.releaseAmount(
      client,
      booking.tourist_id,
      booking.total_price,
      booking.booking_id
    );

    // إعادة المبلغ المسترد للسائح
    if (cancellationFees.refundAmount > 0) {
      await client.query(
        `UPDATE app.wallets 
         SET balance = balance + $1, updated_at = NOW()
         WHERE user_id = $2`,
        [cancellationFees.refundAmount, booking.tourist_id]
      );

      // الحصول على محفظة السائح
      const touristWalletResult = await client.query(
        'SELECT id FROM app.wallets WHERE user_id = $1',
        [booking.tourist_id]
      );
      
      const touristWalletId = touristWalletResult.rows[0].id;

      // تسجيل معاملة الاسترداد
      await client.query(
        `INSERT INTO app.transactions (
          transaction_id, wallet_id, user_id, type, amount, net_amount,
          status, description, reference_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          WalletService.generateTransactionId(),
          touristWalletId,
          booking.tourist_id,
          'REFUND',
          cancellationFees.refundAmount,
          cancellationFees.refundAmount,
          'COMPLETED',
          `استرداد مبلغ الحجز الملغي ${booking.booking_id}`,
          booking.booking_id,
          JSON.stringify({ cancellationFee: cancellationFees.fee })
        ]
      );
    }

    // رسوم الإلغاء تذهب للتطبيق
    if (cancellationFees.fee > 0) {
      // البحث عن محفظة التطبيق
      const appWalletResult = await client.query(
        "SELECT id FROM app.wallets WHERE wallet_number = 'APP-FEES-001'"
      );
      
      const appWalletId = appWalletResult.rows[0].id;

      await client.query(
        `UPDATE app.wallets 
         SET balance = balance + $1, updated_at = NOW()
         WHERE wallet_number = $2`,
        [cancellationFees.fee, 'APP-FEES-001']
      );

      // تسجيل معاملة رسوم الإلغاء
      await client.query(
        `INSERT INTO app.transactions (
          transaction_id, wallet_id, user_id, type, amount, net_amount,
          status, description, reference_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          WalletService.generateTransactionId(),
          appWalletId,
          'SYSTEM_APP',
          'FEE',
          cancellationFees.fee,
          cancellationFees.fee,
          'COMPLETED',
          `رسوم إلغاء الحجز ${booking.booking_id}`,
          booking.booking_id,
          JSON.stringify({ hoursBeforeBooking: this.calculateHoursBeforeBooking(booking) })
        ]
      );
    }
  }
}

const bookingAutoService = new BookingAutoService();
export default bookingAutoService;

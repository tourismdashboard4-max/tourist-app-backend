// server/src/services/walletService.js
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import BankAccount from '../models/BankAccount.js';
import WithdrawRequest from '../models/WithdrawRequest.js';
import { v4 as uuidv4 } from 'uuid';

class WalletService {
  
  /**
   * إنشاء معرف معاملة فريد
   * @returns {string} معرف المعاملة
   */
  generateTransactionId() {
    return `TXN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /**
   * إنشاء معرف طلب سحب
   * @returns {string} معرف الطلب
   */
  generateRequestId() {
    return `REQ-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
  }

  /**
   * التحقق من صحة المبلغ
   * @param {number} amount - المبلغ
   * @returns {Object} نتيجة التحقق
   */
  validateAmount(amount) {
    if (!amount || isNaN(amount)) {
      return { valid: false, error: 'المبلغ غير صحيح' };
    }
    if (amount <= 0) {
      return { valid: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };
    }
    if (amount > 1000000) {
      return { valid: false, error: 'المبلغ يتجاوز الحد المسموح' };
    }
    return { valid: true, amount: parseFloat(amount.toFixed(2)) };
  }

  /**
   * الحصول على رصيد المحفظة
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Object>} معلومات الرصيد
   */
  async getBalance(userId) {
    try {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('المحفظة غير موجودة');
      }

      return {
        success: true,
        data: {
          balance: wallet.balance,
          frozen: wallet.frozenBalance,
          pending: wallet.pendingBalance,
          total: wallet.balance + wallet.frozenBalance,
          currency: wallet.currency,
          dailyLimit: wallet.dailyLimit,
          monthlyLimit: wallet.monthlyLimit,
          dailyRemaining: wallet.dailyLimit - wallet.dailyWithdrawn,
          monthlyRemaining: wallet.monthlyLimit - wallet.monthlyWithdrawn,
          stats: wallet.stats
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * إيداع في المحفظة
   * @param {string} userId - معرف المستخدم
   * @param {number} amount - المبلغ
   * @param {string} paymentMethod - طريقة الدفع
   * @returns {Promise<Object>} نتيجة الإيداع
   */
  async deposit(userId, amount, paymentMethod) {
    try {
      // التحقق من صحة المبلغ
      const validation = this.validateAmount(amount);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('المحفظة غير موجودة');
      }

      if (wallet.status !== 'active') {
        throw new Error('المحفظة غير نشطة');
      }

      // إنشاء معاملة جديدة
      const transaction = new Transaction({
        transactionId: this.generateTransactionId(),
        walletId: wallet._id,
        userId,
        type: 'DEPOSIT',
        amount: validation.amount,
        netAmount: validation.amount,
        status: 'COMPLETED',
        paymentMethod,
        description: 'إيداع في المحفظة',
        balanceAfter: wallet.balance + validation.amount
      });

      // تحديث المحفظة
      wallet.balance += validation.amount;
      wallet.stats.totalDeposits += validation.amount;
      wallet.stats.lastActivity = new Date();

      await transaction.save();
      await wallet.save();

      return {
        success: true,
        message: 'تم الإيداع بنجاح',
        data: {
          transaction,
          newBalance: wallet.balance
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * طلب سحب
   * @param {string} userId - معرف المستخدم
   * @param {number} amount - المبلغ
   * @param {string} bankAccountId - معرف الحساب البنكي
   * @returns {Promise<Object>} نتيجة الطلب
   */
  async requestWithdraw(userId, amount, bankAccountId) {
    try {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('المحفظة غير موجودة');
      }

      if (wallet.userType !== 'guide') {
        throw new Error('فقط المرشدين يمكنهم سحب الأموال');
      }

      if (wallet.status !== 'active') {
        throw new Error('المحفظة غير نشطة');
      }

      // التحقق من الحساب البنكي
      const bankAccount = await BankAccount.findOne({ 
        _id: bankAccountId, 
        userId,
        isVerified: true 
      });

      if (!bankAccount) {
        throw new Error('الحساب البنكي غير موجود أو غير موثق');
      }

      // التحقق من الرصيد
      if (wallet.balance < amount) {
        throw new Error('الرصيد غير كافٍ');
      }

      // التحقق من الحد الأدنى
      if (amount < 100) {
        throw new Error('الحد الأدنى للسحب 100 ريال');
      }

      // التحقق من الحدود اليومية
      const dailyCheck = this.checkDailyLimit(wallet, amount);
      if (!dailyCheck.allowed) {
        throw new Error(dailyCheck.message);
      }

      // التحقق من الحدود الشهرية
      const monthlyCheck = this.checkMonthlyLimit(wallet, amount);
      if (!monthlyCheck.allowed) {
        throw new Error(monthlyCheck.message);
      }

      // حساب الرسوم (1% للمبالغ فوق 5000)
      let fee = 0;
      if (amount > 5000) {
        fee = amount * 0.01;
      }

      // إنشاء طلب سحب
      const withdrawRequest = new WithdrawRequest({
        requestId: this.generateRequestId(),
        userId,
        walletId: wallet._id,
        bankAccountId,
        amount,
        fee,
        netAmount: amount - fee,
        status: 'PENDING'
      });

      // إنشاء معاملة
      const transaction = new Transaction({
        transactionId: this.generateTransactionId(),
        walletId: wallet._id,
        userId,
        type: 'WITHDRAW',
        amount,
        fee,
        netAmount: amount - fee,
        status: 'PENDING',
        description: 'طلب سحب قيد المراجعة',
        metadata: { requestId: withdrawRequest.requestId }
      });

      // تجميد المبلغ
      wallet.balance -= amount;
      wallet.frozenBalance += amount;

      await withdrawRequest.save();
      await transaction.save();
      await wallet.save();

      return {
        success: true,
        message: 'تم تقديم طلب السحب بنجاح',
        data: {
          requestId: withdrawRequest.requestId,
          transactionId: transaction.transactionId,
          amount,
          fee,
          netAmount: amount - fee,
          estimatedProcessing: '24-72 ساعة'
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * التحقق من الحد اليومي
   * @param {Object} wallet - المحفظة
   * @param {number} amount - المبلغ
   * @returns {Object} نتيجة التحقق
   */
  checkDailyLimit(wallet, amount) {
    const today = new Date().toDateString();
    const lastWithdraw = wallet.lastWithdrawDate ? 
      new Date(wallet.lastWithdrawDate).toDateString() : null;

    let dailyWithdrawn = wallet.dailyWithdrawn;
    
    if (lastWithdraw !== today) {
      dailyWithdrawn = 0;
    }

    if (dailyWithdrawn + amount > wallet.dailyLimit) {
      return {
        allowed: false,
        remaining: wallet.dailyLimit - dailyWithdrawn,
        message: `تجاوزت الحد اليومي، المتبقي ${wallet.dailyLimit - dailyWithdrawn} ريال`
      };
    }

    return {
      allowed: true,
      remaining: wallet.dailyLimit - (dailyWithdrawn + amount)
    };
  }

  /**
   * التحقق من الحد الشهري
   * @param {Object} wallet - المحفظة
   * @param {number} amount - المبلغ
   * @returns {Object} نتيجة التحقق
   */
  checkMonthlyLimit(wallet, amount) {
    const now = new Date();
    const lastWithdraw = wallet.lastWithdrawDate ? new Date(wallet.lastWithdrawDate) : null;

    let monthlyWithdrawn = wallet.monthlyWithdrawn;

    if (lastWithdraw && 
        (lastWithdraw.getMonth() !== now.getMonth() || 
         lastWithdraw.getFullYear() !== now.getFullYear())) {
      monthlyWithdrawn = 0;
    }

    if (monthlyWithdrawn + amount > wallet.monthlyLimit) {
      return {
        allowed: false,
        remaining: wallet.monthlyLimit - monthlyWithdrawn,
        message: `تجاوزت الحد الشهري، المتبقي ${wallet.monthlyLimit - monthlyWithdrawn} ريال`
      };
    }

    return {
      allowed: true,
      remaining: wallet.monthlyLimit - (monthlyWithdrawn + amount)
    };
  }

  /**
   * معالجة طلب سحب (للمشرف)
   * @param {string} requestId - معرف الطلب
   * @param {boolean} approved - موافقة أو رفض
   * @param {string} notes - ملاحظات
   * @returns {Promise<Object>} نتيجة المعالجة
   */
  async processWithdrawRequest(requestId, approved, notes = '') {
    try {
      const request = await WithdrawRequest.findOne({ requestId })
        .populate('walletId');

      if (!request) {
        throw new Error('طلب السحب غير موجود');
      }

      if (request.status !== 'PENDING') {
        throw new Error('تم معالجة الطلب مسبقاً');
      }

      const wallet = request.walletId;

      if (approved) {
        // الموافقة على السحب
        request.status = 'APPROVED';
        request.processedAt = new Date();
        
        // تحديث المحفظة
        wallet.frozenBalance -= request.amount;
        wallet.dailyWithdrawn += request.amount;
        wallet.monthlyWithdrawn += request.amount;
        wallet.lastWithdrawDate = new Date();
        wallet.stats.totalWithdrawals += request.amount;

        // تحديث المعاملة
        await Transaction.findOneAndUpdate(
          { 'metadata.requestId': requestId },
          { 
            status: 'COMPLETED',
            processedAt: new Date()
          }
        );

      } else {
        // رفض السحب
        request.status = 'REJECTED';
        request.processedAt = new Date();
        request.rejectionReason = notes;

        // إعادة المبلغ للمحفظة
        wallet.balance += request.amount;
        wallet.frozenBalance -= request.amount;

        // تحديث المعاملة
        await Transaction.findOneAndUpdate(
          { 'metadata.requestId': requestId },
          { 
            status: 'FAILED',
            processedAt: new Date(),
            description: `تم رفض طلب السحب: ${notes}`
          }
        );
      }

      request.notes = notes;
      await request.save();
      await wallet.save();

      return {
        success: true,
        message: approved ? 'تمت الموافقة على طلب السحب' : 'تم رفض طلب السحب',
        data: request
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * الحصول على سجل المعاملات
   * @param {string} userId - معرف المستخدم
   * @param {Object} filter - فلتر
   * @returns {Promise<Object>} سجل المعاملات
   */
  async getTransactions(userId, filter = {}) {
    try {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('المحفظة غير موجودة');
      }

      const query = { walletId: wallet._id };
      
      if (filter.type) query.type = filter.type;
      if (filter.status) query.status = filter.status;
      if (filter.startDate || filter.endDate) {
        query.createdAt = {};
        if (filter.startDate) query.createdAt.$gte = new Date(filter.startDate);
        if (filter.endDate) query.createdAt.$lte = new Date(filter.endDate);
      }

      const skip = (filter.page - 1) * filter.limit || 0;
      const limit = filter.limit || 50;

      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Transaction.countDocuments(query);

      return {
        success: true,
        data: {
          transactions,
          pagination: {
            page: filter.page || 1,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * تجميد مبلغ للحجز
   * @param {string} userId - معرف المستخدم
   * @param {number} amount - المبلغ
   * @param {string} bookingId - معرف الحجز
   * @returns {Promise<Object>} نتيجة التجميد
   */
  async holdAmount(userId, amount, bookingId) {
    try {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('المحفظة غير موجودة');
      }

      if (wallet.balance < amount) {
        throw new Error('الرصيد غير كافٍ للحجز');
      }

      const transaction = new Transaction({
        transactionId: this.generateTransactionId(),
        walletId: wallet._id,
        userId,
        type: 'HOLD',
        amount,
        netAmount: amount,
        status: 'COMPLETED',
        description: `تجميد مبلغ للحجز ${bookingId}`,
        referenceId: bookingId,
        balanceAfter: wallet.balance - amount
      });

      wallet.balance -= amount;
      wallet.frozenBalance += amount;

      await transaction.save();
      await wallet.save();

      return { success: true, transaction };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * إطلاق المبلغ المجمد
   * @param {string} userId - معرف المستخدم
   * @param {number} amount - المبلغ
   * @param {string} bookingId - معرف الحجز
   * @returns {Promise<Object>} نتيجة الإطلاق
   */
  async releaseAmount(userId, amount, bookingId) {
    try {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('المحفظة غير موجودة');
      }

      if (wallet.frozenBalance < amount) {
        throw new Error('المبلغ المجمد غير كافٍ');
      }

      const transaction = new Transaction({
        transactionId: this.generateTransactionId(),
        walletId: wallet._id,
        userId,
        type: 'RELEASE',
        amount,
        netAmount: amount,
        status: 'COMPLETED',
        description: `إطلاق مبلغ مجمد للحجز ${bookingId}`,
        referenceId: bookingId,
        balanceAfter: wallet.balance + amount
      });

      wallet.balance += amount;
      wallet.frozenBalance -= amount;

      await transaction.save();
      await wallet.save();

      return { success: true, transaction };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

const walletService = new WalletService();
export default walletService;
const crypto = require('crypto');
const { FEE_STRUCTURE } = require('../../../shared/constants/fees.constants');

class WalletUtils {
  
  /**
   * إنشاء معرف معاملة فريد
   * @returns {string} معرف المعاملة
   */
  generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }

  /**
   * إنشاء معرف طلب سحب
   * @returns {string} معرف الطلب
   */
  generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `REQ-${timestamp}-${random}`;
  }

  /**
   * إنشاء رقم محفظة
   * @param {string} userId - معرف المستخدم
   * @param {string} userType - نوع المستخدم
   * @returns {string} رقم المحفظة
   */
  generateWalletNumber(userId, userType) {
    const prefix = userType === 'guide' ? 'G' : 'T';
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    const userIdHash = userId.toString().slice(-4).padStart(4, '0');
    
    return `${prefix}-${timestamp}-${random}-${userIdHash}`;
  }

  /**
   * التحقق من صحة المبلغ
   * @param {number} amount - المبلغ
   * @returns {Object} نتيجة التحقق
   */
  validateAmount(amount) {
    if (amount === undefined || amount === null) {
      return { valid: false, error: 'المبلغ مطلوب' };
    }
    
    if (isNaN(amount)) {
      return { valid: false, error: 'المبلغ غير صحيح' };
    }
    
    const numAmount = parseFloat(amount);
    
    if (numAmount <= 0) {
      return { valid: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };
    }
    
    if (numAmount > 1000000) {
      return { valid: false, error: 'المبلغ يتجاوز الحد المسموح (1,000,000 ريال)' };
    }
    
    // تقريب لأقرب جزءين من المئة
    const roundedAmount = Math.round(numAmount * 100) / 100;
    
    return { valid: true, amount: roundedAmount };
  }

  /**
   * التحقق من الحدود اليومية
   * @param {Object} wallet - المحفظة
   * @param {number} amount - المبلغ
   * @returns {Object} نتيجة التحقق
   */
  checkDailyLimit(wallet, amount) {
    const today = new Date().toDateString();
    const lastWithdraw = wallet.lastWithdrawDate ? 
      new Date(wallet.lastWithdrawDate).toDateString() : null;

    let dailyWithdrawn = wallet.dailyWithdrawn || 0;
    
    if (lastWithdraw !== today) {
      dailyWithdrawn = 0;
    }

    if (dailyWithdrawn + amount > wallet.dailyLimit) {
      const remaining = wallet.dailyLimit - dailyWithdrawn;
      return {
        allowed: false,
        remaining,
        message: `تجاوزت الحد اليومي للسحب. المتبقي: ${remaining} ريال`
      };
    }

    return {
      allowed: true,
      remaining: wallet.dailyLimit - (dailyWithdrawn + amount)
    };
  }

  /**
   * التحقق من الحدود الشهرية
   * @param {Object} wallet - المحفظة
   * @param {number} amount - المبلغ
   * @returns {Object} نتيجة التحقق
   */
  checkMonthlyLimit(wallet, amount) {
    const now = new Date();
    const lastWithdraw = wallet.lastWithdrawDate ? new Date(wallet.lastWithdrawDate) : null;

    let monthlyWithdrawn = wallet.monthlyWithdrawn || 0;

    if (lastWithdraw && 
        (lastWithdraw.getMonth() !== now.getMonth() || 
         lastWithdraw.getFullYear() !== now.getFullYear())) {
      monthlyWithdrawn = 0;
    }

    if (monthlyWithdrawn + amount > wallet.monthlyLimit) {
      const remaining = wallet.monthlyLimit - monthlyWithdrawn;
      return {
        allowed: false,
        remaining,
        message: `تجاوزت الحد الشهري للسحب. المتبقي: ${remaining} ريال`
      };
    }

    return {
      allowed: true,
      remaining: wallet.monthlyLimit - (monthlyWithdrawn + amount)
    };
  }

  /**
   * تحديث إحصائيات المحفظة
   * @param {Object} wallet - المحفظة
   * @param {string} type - نوع المعاملة
   * @param {number} amount - المبلغ
   * @returns {Object} المحفظة المحدثة
   */
  updateWalletStats(wallet, type, amount) {
    if (!wallet.stats) {
      wallet.stats = {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalBookings: 0,
        totalFees: 0,
        lastActivity: new Date()
      };
    }

    wallet.stats.lastActivity = new Date();
    
    switch(type) {
      case 'DEPOSIT':
        wallet.stats.totalDeposits += amount;
        break;
      case 'WITHDRAW':
        wallet.stats.totalWithdrawals += amount;
        break;
      case 'BOOKING':
        wallet.stats.totalBookings += 1;
        break;
      case 'FEE':
        wallet.stats.totalFees += amount;
        break;
    }
    
    return wallet;
  }

  /**
   * حساب رسوم السحب
   * @param {number} amount - المبلغ
   * @returns {number} الرسوم
   */
  calculateWithdrawFee(amount) {
    // 1% للمبالغ فوق 5000 ريال
    if (amount > 5000) {
      return amount * 0.01;
    }
    return 0;
  }

  /**
   * تنسيق المبلغ للعرض
   * @param {number} amount - المبلغ
   * @param {string} currency - العملة
   * @returns {string} المبلغ المنسق
   */
  formatAmount(amount, currency = 'SAR') {
    const formatter = new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    });
    
    return formatter.format(amount);
  }

  /**
   * تحويل المبلغ إلى كلمات (للفواتير)
   * @param {number} num - المبلغ
   * @returns {string} المبلغ بالكلمات
   */
  numberToWords(num) {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];
    
    // هذه دالة مبسطة - يمكن تحسينها لاحقاً
    return num.toString() + ' ريال';
  }

  /**
   * الحصول على لون حالة المعاملة
   * @param {string} status - الحالة
   * @returns {string} اللون
   */
  getTransactionStatusColor(status) {
    const colors = {
      PENDING: '#FFA000',
      COMPLETED: '#4CAF50',
      FAILED: '#F44336',
      CANCELLED: '#9E9E9E'
    };
    return colors[status] || '#000000';
  }

  /**
   * ترجمة حالة المعاملة
   * @param {string} status - الحالة
   * @returns {string} الترجمة
   */
  translateTransactionStatus(status) {
    const translations = {
      PENDING: 'قيد الانتظار',
      COMPLETED: 'مكتمل',
      FAILED: 'فشل',
      CANCELLED: 'ملغي'
    };
    return translations[status] || status;
  }

  /**
   * ترجمة نوع المعاملة
   * @param {string} type - النوع
   * @returns {string} الترجمة
   */
  translateTransactionType(type) {
    const translations = {
      DEPOSIT: 'إيداع',
      WITHDRAW: 'سحب',
      BOOKING: 'حجز',
      REFUND: 'استرداد',
      FEE: 'رسوم',
      HOLD: 'تجميد',
      RELEASE: 'إطلاق',
      EARNING: 'أرباح',
      COMMISSION: 'عمولة'
    };
    return translations[type] || type;
  }
}

module.exports = new WalletUtils();
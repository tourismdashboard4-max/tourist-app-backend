const { FEE_STRUCTURE, PROGRAM_TYPES } = require('../../../shared/constants/fees.constants');

class FeeCalculator {
  
  /**
   * حساب رسوم السائح
   * @param {number} amount - المبلغ
   * @returns {Object} تفاصيل الرسوم
   */
  calculateTouristFees(amount) {
    const serviceFee = amount * 0.025; // 2.5%
    const vat = serviceFee * 0.15; // 15% ضريبة على الخدمة
    
    return {
      amount,
      serviceFee,
      vat,
      totalFees: serviceFee + vat,
      netAmount: amount - (serviceFee + vat),
      breakdown: {
        serviceFee: { rate: '2.5%', amount: serviceFee },
        vat: { rate: '15%', amount: vat }
      }
    };
  }

  /**
   * حساب رسوم المرشد
   * @param {number} amount - المبلغ
   * @param {string} programType - نوع البرنامج
   * @returns {Object} تفاصيل الرسوم
   */
  calculateGuideFees(amount, programType = PROGRAM_TYPES.BASIC) {
    const program = FEE_STRUCTURE.GUIDE[programType];
    
    if (!program) {
      throw new Error('نوع البرنامج غير صحيح');
    }

    const commission = amount * program.commission;
    const totalFees = commission + program.monthlyFee;
    const vat = totalFees * 0.15;

    return {
      amount,
      commission,
      monthlyFee: program.monthlyFee,
      totalFees,
      vat,
      netAmount: amount - totalFees - vat,
      breakdown: {
        commission: { rate: `${program.commission * 100}%`, amount: commission },
        monthlyFee: { type: 'ثابت', amount: program.monthlyFee },
        vat: { rate: '15%', amount: vat }
      }
    };
  }

  /**
   * حساب رسوم التحويل البنكي
   * @param {number} amount - المبلغ
   * @param {string} bankType - نوع البنك
   * @returns {Object} تفاصيل الرسوم
   */
  calculateBankTransferFees(amount, bankType = 'local') {
    const fees = {
      local: 15, // 15 ريال للتحويلات المحلية
      international: amount * 0.01 + 50 // 1% + 50 ريال
    };

    return {
      transferFee: fees[bankType],
      totalAmount: amount + fees[bankType],
      feeType: bankType
    };
  }

  /**
   * حساب رسوم الإلغاء
   * @param {number} amount - المبلغ
   * @param {number} hoursBeforeBooking - الساعات قبل الحجز
   * @returns {Object} تفاصيل رسوم الإلغاء
   */
  calculateCancellationFees(amount, hoursBeforeBooking) {
    if (hoursBeforeBooking > 48) {
      return { fee: 0, refundAmount: amount, percentage: 0 };
    } else if (hoursBeforeBooking > 24) {
      return { 
        fee: amount * 0.25, 
        refundAmount: amount * 0.75,
        percentage: 25
      };
    } else if (hoursBeforeBooking > 12) {
      return { 
        fee: amount * 0.5, 
        refundAmount: amount * 0.5,
        percentage: 50
      };
    } else {
      return { 
        fee: amount, 
        refundAmount: 0,
        percentage: 100
      };
    }
  }

  /**
   * حساب رسوم التأخير
   * @param {number} amount - المبلغ
   * @param {number} minutesLate - دقائق التأخير
   * @returns {Object} تفاصيل رسوم التأخير
   */
  calculateLateFees(amount, minutesLate) {
    if (minutesLate <= 15) return { fee: 0, minutesLate };
    if (minutesLate <= 30) return { fee: amount * 0.1, minutesLate };
    if (minutesLate <= 60) return { fee: amount * 0.25, minutesLate };
    return { fee: amount * 0.5, minutesLate };
  }

  /**
   * حساب إجمالي الرسوم
   * @param {Array} feesList - قائمة الرسوم
   * @returns {Object} إجمالي الرسوم
   */
  calculateTotalFees(feesList) {
    const total = feesList.reduce((sum, fee) => sum + fee.amount, 0);
    const breakdown = feesList.reduce((acc, fee) => {
      acc[fee.type] = (acc[fee.type] || 0) + fee.amount;
      return acc;
    }, {});

    return {
      total,
      breakdown,
      count: feesList.length
    };
  }

  /**
   * تطبيق ضريبة القيمة المضافة
   * @param {number} amount - المبلغ
   * @param {number} rate - نسبة الضريبة
   * @returns {Object} تفاصيل الضريبة
   */
  applyVAT(amount, rate = 0.15) {
    const vat = amount * rate;
    return {
      amount,
      vat,
      totalWithVAT: amount + vat,
      rate: rate * 100
    };
  }

  /**
   * حساب الخصم
   * @param {number} amount - المبلغ
   * @param {number} discountPercent - نسبة الخصم
   * @returns {Object} تفاصيل الخصم
   */
  calculateDiscount(amount, discountPercent) {
    const discount = amount * (discountPercent / 100);
    return {
      originalAmount: amount,
      discountPercent,
      discountAmount: discount,
      finalAmount: amount - discount
    };
  }
}

module.exports = new FeeCalculator();
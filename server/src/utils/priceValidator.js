class PriceValidator {
  
  /**
   * التحقق من صحة سعر البرنامج
   * @param {number} price - السعر
   * @param {string} programType - نوع البرنامج
   * @returns {Object} نتيجة التحقق
   */
  validateProgramPrice(price, programType) {
    const minPrices = {
      basic: 25,
      premium: 50,
      enterprise: 100
    };

    const minPrice = minPrices[programType] || 25;

    if (!price || isNaN(price)) {
      return {
        valid: false,
        error: 'السعر مطلوب'
      };
    }

    if (price < minPrice) {
      return {
        valid: false,
        error: `الحد الأدنى لسعر هذا البرنامج هو ${minPrice} ريال`,
        minPrice
      };
    }

    if (price > 10000) {
      return {
        valid: false,
        error: 'السعر يتجاوز الحد الأقصى (10,000 ريال)',
        maxPrice: 10000
      };
    }

    // التحقق من أن السعر مضاعف 0.5
    if (price % 0.5 !== 0) {
      return {
        valid: false,
        error: 'السعر يجب أن يكون مضاعف 0.5 ريال'
      };
    }

    return {
      valid: true,
      price: parseFloat(price.toFixed(2))
    };
  }

  /**
   * حساب السعر النهائي مع العمولة
   * @param {number} guidePrice - سعر المرشد
   * @returns {Object} الأسعار المحسوبة
   */
  calculateFinalPrice(guidePrice) {
    const commission = guidePrice * 0.025; // 2.5%
    const totalPrice = guidePrice + commission;

    return {
      guidePrice,
      commission: parseFloat(commission.toFixed(2)),
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      commissionRate: 2.5
    };
  }

  /**
   * استخراج سعر المرشد من السعر النهائي
   * @param {number} totalPrice - السعر النهائي
   * @returns {Object} تفاصيل السعر
   */
  extractGuidePrice(totalPrice) {
    const guidePrice = totalPrice / 1.025;
    const commission = totalPrice - guidePrice;

    return {
      totalPrice,
      guidePrice: parseFloat(guidePrice.toFixed(2)),
      commission: parseFloat(commission.toFixed(2)),
      commissionRate: 2.5
    };
  }

  /**
   * التحقق من صحة السعر قبل وبعد العمولة
   * @param {number} guidePrice - سعر المرشد
   * @param {number} totalPrice - السعر النهائي
   * @returns {Object} نتيجة التحقق
   */
  validatePriceConsistency(guidePrice, totalPrice) {
    const calculatedTotal = guidePrice * 1.025;
    const difference = Math.abs(calculatedTotal - totalPrice);

    if (difference > 0.01) {
      return {
        valid: false,
        error: 'تناقض في حساب الأسعار',
        expectedTotal: parseFloat(calculatedTotal.toFixed(2)),
        providedTotal: totalPrice
      };
    }

    return {
      valid: true,
      guidePrice,
      totalPrice,
      commission: parseFloat((totalPrice - guidePrice).toFixed(2))
    };
  }

  /**
   * تنسيق السعر للعرض
   * @param {number} price - السعر
   * @param {string} currency - العملة
   * @returns {string} السعر المنسق
   */
  formatPrice(price, currency = 'SAR') {
    const formatter = new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    });
    
    return formatter.format(price);
  }

  /**
   * الحصول على نطاق سعري نصي
   * @param {number} min - الحد الأدنى
   * @param {number} max - الحد الأقصى
   * @returns {string} النطاق السعري
   */
  getPriceRangeText(min, max) {
    if (min === max) {
      return `${this.formatPrice(min)}`;
    }
    return `${this.formatPrice(min)} - ${this.formatPrice(max)}`;
  }

  /**
   * تقدير السعر بناءً على المدة
   * @param {number} basePrice - السعر الأساسي
   * @param {number} duration - المدة بالساعات
   * @returns {number} السعر المقدر
   */
  estimatePriceByDuration(basePrice, duration) {
    const hourlyRate = basePrice / 4; // افتراض أن السعر الأساسي لـ 4 ساعات
    return parseFloat((hourlyRate * duration).toFixed(2));
  }
}

module.exports = new PriceValidator();
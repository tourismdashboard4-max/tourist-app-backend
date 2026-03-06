const crypto = require('crypto');

class Generators {
  
  /**
   * إنشاء معرف فريد
   * @param {string} prefix - بادئة المعرف
   * @returns {string} معرف فريد
   */
  generateId(prefix = 'ID') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * إنشاء معرف معاملة
   * @returns {string} معرف المعاملة
   */
  generateTransactionId() {
    return this.generateId('TXN');
  }

  /**
   * إنشاء معرف حجز
   * @returns {string} معرف الحجز
   */
  generateBookingId() {
    const timestamp = Date.now().toString(36).slice(-6).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `BOK-${timestamp}-${random}`;
  }

  /**
   * إنشاء معرف مستخدم
   * @returns {string} معرف المستخدم
   */
  generateUserId() {
    return this.generateId('USR');
  }

  /**
   * إنشاء رمز تحقق (OTP)
   * @param {number} length - طول الرمز
   * @returns {string} رمز التحقق
   */
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    
    return otp;
  }

  /**
   * إنشاء رمز مميز (Token)
   * @param {number} length - طول الرمز
   * @returns {string} الرمز المميز
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * إنشاء كلمة مرور عشوائية
   * @param {number} length - الطول
   * @returns {string} كلمة المرور
   */
  generatePassword(length = 10) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';
    
    // ضمان وجود حرف كبير وحرف صغير ورقم ورمز
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // إكمال باقي الأحرف
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // خلط الأحرف
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  /**
   * إنشاء رقم فاتورة
   * @returns {string} رقم الفاتورة
   */
  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `INV-${year}${month}-${random}`;
  }

  /**
   * إنشاء كود خصم
   * @returns {string} كود الخصم
   */
  generateDiscountCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // إضافة شرطة كل 4 أحرف
    return code.match(/.{1,4}/g).join('-');
  }

  /**
   * إنشاء اسم مستخدم عشوائي
   * @param {string} baseName - الاسم الأساسي
   * @returns {string} اسم المستخدم
   */
  generateUsername(baseName) {
    const cleanName = baseName.replace(/\s+/g, '').toLowerCase();
    const random = Math.floor(Math.random() * 1000);
    return `${cleanName}${random}`;
  }

  /**
   * إنشاء تاريخ عشوائي
   * @param {Date} start - تاريخ البداية
   * @param {Date} end - تاريخ النهاية
   * @returns {Date} تاريخ عشوائي
   */
  generateRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  /**
   * إنشاء UUID v4
   * @returns {string} UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * إنشاء رقم عشوائي بين مديين
   * @param {number} min - الحد الأدنى
   * @param {number} max - الحد الأقصى
   * @returns {number} رقم عشوائي
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * إنشاء عنصر عشوائي من مصفوفة
   * @param {Array} array - المصفوفة
   * @returns {*} عنصر عشوائي
   */
  randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * إنشاء مجموعة عشوائية من عناصر المصفوفة
   * @param {Array} array - المصفوفة
   * @param {number} count - العدد المطلوب
   * @returns {Array} عناصر عشوائية
   */
  randomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * إنشاء لون عشوائي
   * @returns {string} لون عشوائي
   */
  randomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
}

module.exports = new Generators();
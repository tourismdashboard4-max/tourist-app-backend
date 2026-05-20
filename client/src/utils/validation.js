// client/src/utils/validation.js
// ===================== دوال التحقق الأساسية =====================

/**
 * التحقق من صحة النص
 * @param {string} text - النص
 * @param {Object} options - خيارات التحقق
 * @returns {Object} نتيجة التحقق
 */
export const validateText = (text, options = {}) => {
  const {
    required = true,
    minLength = 3,
    maxLength = 100,
    pattern = null
  } = options;

  if (required && (!text || text.trim() === '')) {
    return { isValid: false, error: 'هذا الحقل مطلوب' };
  }

  if (text && text.length < minLength) {
    return { isValid: false, error: `يجب أن يكون النص على الأقل ${minLength} أحرف` };
  }

  if (text && text.length > maxLength) {
    return { isValid: false, error: `يجب أن لا يتجاوز النص ${maxLength} حرف` };
  }

  if (pattern && text && !pattern.test(text)) {
    return { isValid: false, error: 'النص غير صالح' };
  }

  return { isValid: true };
};

/**
 * التحقق من صحة الرقم
 * @param {number} value - الرقم
 * @param {Object} options - خيارات التحقق
 * @returns {Object} نتيجة التحقق
 */
export const validateNumber = (value, options = {}) => {
  const {
    required = true,
    min = null,
    max = null,
    integer = false,
    positive = false
  } = options;

  if (required && (value === null || value === undefined || value === '')) {
    return { isValid: false, error: 'هذا الحقل مطلوب' };
  }

  if (value === null || value === undefined || value === '') {
    return { isValid: true };
  }

  const num = Number(value);
  if (isNaN(num)) {
    return { isValid: false, error: 'يجب أن يكون رقماً صحيحاً' };
  }

  if (integer && !Number.isInteger(num)) {
    return { isValid: false, error: 'يجب أن يكون رقماً صحيحاً' };
  }

  if (positive && num <= 0) {
    return { isValid: false, error: 'يجب أن يكون الرقم موجباً' };
  }

  if (min !== null && num < min) {
    return { isValid: false, error: `يجب أن يكون الرقم أكبر من أو يساوي ${min}` };
  }

  if (max !== null && num > max) {
    return { isValid: false, error: `يجب أن يكون الرقم أصغر من أو يساوي ${max}` };
  }

  return { isValid: true };
};

// ===================== دوال التحقق المتقدمة =====================

/**
 * التحقق من صحة البريد الإلكتروني
 * @param {string} email - البريد الإلكتروني
 * @param {Object} options - خيارات التحقق
 * @returns {Object} نتيجة التحقق
 */
export const validateEmail = (email, options = {}) => {
  const { required = true } = options;
  
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  
  if (required && (!email || email.trim() === '')) {
    return { isValid: false, error: 'البريد الإلكتروني مطلوب' };
  }
  
  if (email && !emailRegex.test(email)) {
    return { isValid: false, error: 'البريد الإلكتروني غير صالح' };
  }
  
  return { isValid: true };
};

/**
 * التحقق من صحة رقم الهاتف (السعودي)
 * @param {string} phone - رقم الهاتف
 * @param {Object} options - خيارات التحقق
 * @returns {Object} نتيجة التحقق
 */
export const validatePhone = (phone, options = {}) => {
  const { required = true } = options;
  
  // أرقام السعودية: 05xxxxxxxx أو 5xxxxxxxx أو +9665xxxxxxxx
  const phoneRegex = /^(05|5|\+9665)[0-9]{8}$/;
  
  if (required && (!phone || phone.trim() === '')) {
    return { isValid: false, error: 'رقم الهاتف مطلوب' };
  }
  
  if (phone && !phoneRegex.test(phone.replace(/\s/g, ''))) {
    return { isValid: false, error: 'رقم الهاتف غير صالح (يجب أن يبدأ بـ 05)' };
  }
  
  return { isValid: true };
};

/**
 * التحقق من صحة المعرف (UUID أو ID رقمي)
 * @param {string|number} id - المعرف
 * @param {Object} options - خيارات التحقق
 * @returns {Object} نتيجة التحقق
 */
export const validateId = (id, options = {}) => {
  const { required = true, type = 'any' } = options;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (required && (id === null || id === undefined || id === '')) {
    return { isValid: false, error: 'المعرف مطلوب' };
  }
  
  if (!id) return { isValid: true };
  
  if (type === 'uuid') {
    if (!uuidRegex.test(String(id))) {
      return { isValid: false, error: 'معرف UUID غير صالح' };
    }
  } else if (type === 'numeric') {
    if (isNaN(Number(id))) {
      return { isValid: false, error: 'المعرف الرقمي غير صالح' };
    }
  } else {
    // أي نوع مقبول
    if (!uuidRegex.test(String(id)) && isNaN(Number(id))) {
      return { isValid: false, error: 'المعرف غير صالح' };
    }
  }
  
  return { isValid: true };
};

/**
 * التحقق من صحة السعر
 * @param {number} price - السعر
 * @param {Object} options - خيارات التحقق
 * @returns {Object} نتيجة التحقق
 */
export const validatePrice = (price, options = {}) => {
  const { required = true, min = 0, max = 100000 } = options;
  
  return validateNumber(price, { required, min, max, positive: true });
};

/**
 * التحقق من صحة المدة الزمنية
 * @param {string} duration - المدة (مثال: "3 ساعات", "يومين")
 * @returns {Object} نتيجة التحقق
 */
export const validateDuration = (duration, options = {}) => {
  const { required = true } = options;
  
  if (required && (!duration || duration.trim() === '')) {
    return { isValid: false, error: 'المدة مطلوبة' };
  }
  
  if (duration && duration.length < 2) {
    return { isValid: false, error: 'المدة غير صالحة' };
  }
  
  return { isValid: true };
};

/**
 * التحقق من صحة إحداثيات الموقع
 * @param {number} lat - خط العرض
 * @param {number} lng - خط الطول
 * @returns {Object} نتيجة التحقق
 */
export const validateCoordinates = (lat, lng) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return { isValid: false, error: 'إحداثيات الموقع مطلوبة' };
  }
  
  const latNum = Number(lat);
  const lngNum = Number(lng);
  
  if (isNaN(latNum) || isNaN(lngNum)) {
    return { isValid: false, error: 'الإحداثيات غير صالحة' };
  }
  
  if (latNum < -90 || latNum > 90) {
    return { isValid: false, error: 'خط العرض غير صالح (يجب أن يكون بين -90 و 90)' };
  }
  
  if (lngNum < -180 || lngNum > 180) {
    return { isValid: false, error: 'خط الطول غير صالح (يجب أن يكون بين -180 و 180)' };
  }
  
  return { isValid: true };
};

/**
 * التحقق من صحة الصورة
 * @param {File} file - ملف الصورة
 * @param {Object} options - خيارات التحقق
 * @returns {Object} نتيجة التحقق
 */
export const validateImage = (file, options = {}) => {
  const {
    required = true,
    maxSizeMB = 5,
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
  } = options;
  
  if (required && (!file)) {
    return { isValid: false, error: 'الصورة مطلوبة' };
  }
  
  if (!file) return { isValid: true };
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}` };
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { isValid: false, error: `حجم الصورة يجب أن لا يتجاوز ${maxSizeMB} ميجابايت` };
  }
  
  return { isValid: true };
};

/**
 * التحقق من صحة إرشادات السلامة
 * @param {string} text - نص الإرشادات
 * @returns {Object} نتيجة التحقق
 */
export const validateSafetyGuidelines = (text) => {
  if (!text || text.trim() === '') {
    return { isValid: true }; // اختياري
  }
  
  if (text.length > 2000) {
    return { isValid: false, error: 'إرشادات السلامة يجب أن لا تتجاوز 2000 حرف' };
  }
  
  return { isValid: true };
};

/**
 * التحقق من صحة البرنامج بالكامل
 * @param {Object} program - بيانات البرنامج
 * @returns {Object} نتيجة التحقق مع الأخطاء التفصيلية
 */
export const validateProgram = (program) => {
  const errors = {};
  
  // اسم البرنامج
  const nameValidation = validateText(program.name, { required: true, minLength: 3, maxLength: 100 });
  if (!nameValidation.isValid) errors.name = nameValidation.error;
  
  // السعر
  const priceValidation = validatePrice(program.price, { required: true });
  if (!priceValidation.isValid) errors.price = priceValidation.error;
  
  // المدة
  const durationValidation = validateDuration(program.duration, { required: true });
  if (!durationValidation.isValid) errors.duration = durationValidation.error;
  
  // عدد المشاركين
  const maxParticipantsValidation = validateNumber(program.maxParticipants, { required: true, min: 1, max: 1000, integer: true });
  if (!maxParticipantsValidation.isValid) errors.maxParticipants = maxParticipantsValidation.error;
  
  // الإحداثيات
  const coordsValidation = validateCoordinates(program.location_lat, program.location_lng);
  if (!coordsValidation.isValid) errors.location = coordsValidation.error;
  
  // إرشادات السلامة (اختيارية)
  const safetyValidation = validateSafetyGuidelines(program.safetyGuidelines);
  if (!safetyValidation.isValid) errors.safetyGuidelines = safetyValidation.error;
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * التحقق من صحة الرسالة (دردشة)
 * @param {string} message - نص الرسالة
 * @returns {Object} نتيجة التحقق
 */
export const validateMessage = (message) => {
  return validateText(message, { required: true, minLength: 1, maxLength: 2000 });
};

/**
 * تنظيف النص من المسافات الزائدة
 * @param {string} text - النص
 * @returns {string} النص المنظف
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.trim().replace(/\s+/g, ' ');
};

/**
 * تنسيق رقم الهاتف إلى الصيغة الموحدة
 * @param {string} phone - رقم الهاتف
 * @returns {string} الرقم المنسق
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  let cleaned = phone.replace(/\s/g, '');
  
  // تحويل 05xxxxxxxx إلى 9665xxxxxxxx
  if (cleaned.startsWith('05')) {
    cleaned = '966' + cleaned.substring(1);
  }
  // تحويل 5xxxxxxxx إلى 9665xxxxxxxx
  else if (cleaned.startsWith('5')) {
    cleaned = '966' + cleaned;
  }
  // تحويل +9665xxxxxxxx إلى 9665xxxxxxxx
  else if (cleaned.startsWith('+966')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
};

// ===================== دوال مساعدة للتحقق في الوقت الفعلي =====================

/**
 * إنشاء مدقق في الوقت الفعلي لحقل النص
 * @param {Function} setError - دالة تعيين الخطأ
 * @param {Object} options - خيارات التحقق
 * @returns {Function} دالة التحقق
 */
export const createTextValidator = (setError, options = {}) => {
  return (value) => {
    const result = validateText(value, options);
    setError(result.isValid ? null : result.error);
    return result.isValid;
  };
};

/**
 * إنشاء مدقق في الوقت الفعلي لحقل الرقم
 * @param {Function} setError - دالة تعيين الخطأ
 * @param {Object} options - خيارات التحقق
 * @returns {Function} دالة التحقق
 */
export const createNumberValidator = (setError, options = {}) => {
  return (value) => {
    const result = validateNumber(value, options);
    setError(result.isValid ? null : result.error);
    return result.isValid;
  };
};

// تصدير جميع الدوال ككائن واحد للاستخدام البديل
export default {
  validateText,
  validateNumber,
  validateEmail,
  validatePhone,
  validateId,
  validatePrice,
  validateDuration,
  validateCoordinates,
  validateImage,
  validateSafetyGuidelines,
  validateProgram,
  validateMessage,
  sanitizeText,
  formatPhoneNumber,
  createTextValidator,
  createNumberValidator
};

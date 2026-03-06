// ===================== دوال التحقق =====================

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
    integer = false
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

  if (min !== null && num < min) {
    return { isValid: false, error: `يجب أن يكون الرقم أكبر من أو يساوي ${min}` };
  }

  if (max !== null && num > max) {
    return { isValid: false, error: `يجب أن يكون الرقم أصغر من أو يساوي ${max}` };
  }

  return { isValid: true };
};
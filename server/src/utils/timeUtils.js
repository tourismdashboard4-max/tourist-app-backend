// server/src/utils/timeUtils.js

/**
 * ============================================
 * دوال مساعدة للتعامل مع الوقت والتواريخ
 * حل مشكلة الفرق الزمني (Timezone) نهائياً
 * ============================================
 */

/**
 * دالة لإنشاء تاريخ انتهاء الصلاحية
 * @param {number} minutes - عدد الدقائق (افتراضي 10 دقائق)
 * @returns {Date} تاريخ الانتهاء
 */
export const createExpiryDate = (minutes = 10) => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  
  console.log('🕐 [createExpiryDate]', {
    now: new Date().toISOString(),
    expiresAt: now.toISOString(),
    minutesAdded: minutes,
    timezone: 'UTC'
  });
  
  return now;
};

/**
 * دالة للتحقق من صلاحية الرمز
 * @param {Object} otpRecord - سجل الرمز من قاعدة البيانات
 * @returns {boolean} هل الرمز صالح؟
 */
export const isOTPValid = (otpRecord) => {
  if (!otpRecord) {
    console.log('⏰ [isOTPValid] No record found');
    return false;
  }
  
  const now = new Date();
  const expiry = new Date(otpRecord.expires_at || otpRecord.expiresAt);
  const timeDiffMinutes = (expiry - now) / (1000 * 60);
  const isValid = now < expiry;
  
  console.log('⏰ [isOTPValid] Time check:', {
    serverTime: now.toISOString(),
    expiryTime: expiry.toISOString(),
    timeDiffMinutes: timeDiffMinutes.toFixed(2),
    isValid,
    recordId: otpRecord.id,
    code: otpRecord.code
  });
  
  return isValid;
};

/**
 * دالة للحصول على الوقت المتبقي بالثواني
 * @param {Object} otpRecord - سجل الرمز من قاعدة البيانات
 * @returns {number} الوقت المتبقي بالثواني
 */
export const getTimeRemaining = (otpRecord) => {
  if (!otpRecord) return 0;
  
  const now = new Date();
  const expiry = new Date(otpRecord.expires_at || otpRecord.expiresAt);
  const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
  
  return remaining;
};

/**
 * دالة لتنسيق الوقت المتبقي (mm:ss)
 * @param {number} seconds - الثواني المتبقية
 * @returns {string} الوقت المنسق
 */
export const formatTimeRemaining = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * دالة للتحقق من أن الرمز لم ينتهِ مع طباعة تحذير
 * @param {Object} otpRecord - سجل الرمز
 * @returns {boolean} هل الرمز صالح؟
 */
export const isOTPValidWithWarning = (otpRecord) => {
  if (!otpRecord) return false;
  
  const now = new Date();
  const expiry = new Date(otpRecord.expires_at || otpRecord.expiresAt);
  const remainingSeconds = Math.floor((expiry - now) / 1000);
  const isValid = now < expiry;
  
  if (!isValid) {
    console.warn('⚠️ [OTP Expired]', {
      expiredSince: Math.abs(remainingSeconds) + ' seconds ago',
      expiryTime: expiry.toISOString(),
      serverTime: now.toISOString()
    });
  } else if (remainingSeconds < 60) {
    console.warn('⚠️ [OTP Expiring Soon]', {
      remainingSeconds,
      expiryTime: expiry.toISOString()
    });
  }
  
  return isValid;
};

/**
 * دالة لإنشاء تاريخ في الماضي (لإلغاء الرموز)
 * @returns {Date} تاريخ في الماضي
 */
export const getPastDate = () => {
  const past = new Date();
  past.setMinutes(past.getMinutes() - 1); // دقيقة واحدة في الماضي
  return past;
};

/**
 * دالة لمقارنة توقيتين
 * @param {Date|string} date1 - التاريخ الأول
 * @param {Date|string} date2 - التاريخ الثاني
 * @returns {Object} نتيجة المقارنة
 */
export const compareDates = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return {
    d1: d1.toISOString(),
    d2: d2.toISOString(),
    d1Greater: d1 > d2,
    d2Greater: d2 > d1,
    equal: d1.getTime() === d2.getTime(),
    differenceMs: d1.getTime() - d2.getTime(),
    differenceMinutes: ((d1.getTime() - d2.getTime()) / (1000 * 60)).toFixed(2)
  };
};

/**
 * دالة للحصول على الوقت الحالي بتنسيق ISO
 * @returns {string} الوقت الحالي بتنسيق ISO
 */
export const getCurrentISO = () => {
  return new Date().toISOString();
};

/**
 * دالة للحصول على الوقت الحالي مع إضافة دقائق
 * @param {number} minutes - الدقائق المراد إضافتها
 * @returns {string} الوقت بتنسيق ISO
 */
export const getFutureISO = (minutes = 10) => {
  const future = new Date();
  future.setMinutes(future.getMinutes() + minutes);
  return future.toISOString();
};

export default {
  createExpiryDate,
  isOTPValid,
  getTimeRemaining,
  formatTimeRemaining,
  isOTPValidWithWarning,
  getPastDate,
  compareDates,
  getCurrentISO,
  getFutureISO
};
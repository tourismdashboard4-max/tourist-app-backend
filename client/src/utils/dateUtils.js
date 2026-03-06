// ===================== دوال التاريخ =====================

/**
 * الحصول على الفرق بين تاريخين
 * @param {Date|string} date1 - التاريخ الأول
 * @param {Date|string} date2 - التاريخ الثاني
 * @returns {Object} الفرق بالأيام والساعات والدقائق
 */
export const getDateDiff = (date1, date2 = new Date()) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2 - d1);
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes, total: diff };
};

/**
 * الحصول على وقت نسبي
 * @param {Date|string} date - التاريخ
 * @returns {string} الوقت النسبي
 */
export const getRelativeTime = (date) => {
  const { days, hours, minutes } = getDateDiff(date);
  
  if (days > 0) return `منذ ${days} يوم`;
  if (hours > 0) return `منذ ${hours} ساعة`;
  if (minutes > 0) return `منذ ${minutes} دقيقة`;
  return 'الآن';
};

/**
 * إضافة أيام إلى تاريخ
 * @param {Date} date - التاريخ
 * @param {number} days - عدد الأيام
 * @returns {Date} التاريخ الجديد
 */
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * بداية اليوم
 * @param {Date} date - التاريخ
 * @returns {Date} بداية اليوم
 */
export const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * نهاية اليوم
 * @param {Date} date - التاريخ
 * @returns {Date} نهاية اليوم
 */
export const endOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};
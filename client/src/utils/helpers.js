// ===================== دوال مساعدة عامة =====================

/**
 * تنسيق التاريخ
 * @param {string|Date} date - التاريخ المراد تنسيقه
 * @param {string} format - صيغة التنسيق (short, long, time)
 * @returns {string} التاريخ المنسق
 */
export const formatDate = (date, format = 'short') => {
  const d = new Date(date);
  
  const options = {
    short: { 
      year: 'numeric', 
      month: 'numeric', 
      day: 'numeric' 
    },
    long: { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    }
  };

  return d.toLocaleDateString('ar-SA', options[format]);
};

/**
 * تنسيق المبلغ المالي
 * @param {number} amount - المبلغ
 * @param {string} currency - العملة
 * @returns {string} المبلغ المنسق
 */
export const formatCurrency = (amount, currency = 'SAR') => {
  const formatter = new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  });
  
  return formatter.format(amount);
};

/**
 * تقطيع النص الطويل
 * @param {string} text - النص
 * @param {number} length - الطول المطلوب
 * @returns {string} النص المقطوع
 */
export const truncateText = (text, length = 100) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

/**
 * إنشاء معرف فريد
 * @returns {string} معرف فريد
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * التحقق من صحة البريد الإلكتروني
 * @param {string} email - البريد الإلكتروني
 * @returns {boolean} صحة البريد
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * التحقق من صحة رقم الجوال السعودي
 * @param {string} phone - رقم الجوال
 * @returns {boolean} صحة الرقم
 */
export const isValidSaudiPhone = (phone) => {
  const re = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
  return re.test(phone.replace(/\s/g, ''));
};

/**
 * تأخير التنفيذ
 * @param {number} ms - وقت التأخير بالميلي ثانية
 * @returns {Promise} Promise
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * نسخ نص إلى الحافظة
 * @param {string} text - النص المراد نسخه
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

/**
 * تحميل ملف
 * @param {string} url - رابط الملف
 * @param {string} filename - اسم الملف
 */
export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * الحصول على معلمات URL
 * @returns {Object} معلمات URL
 */
export const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

/**
 * تصفية الكائن من القيم الفارغة
 * @param {Object} obj - الكائن
 * @returns {Object} الكائن بعد التصفية
 */
export const filterEmptyValues = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null && v !== '')
  );
};
// ===================== أدوات المحادثة =====================

/**
 * تنسيق وقت الرسالة
 * @param {string} timestamp - الوقت
 * @returns {string} الوقت المنسق
 */
export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // أقل من دقيقة
  if (diff < 60000) {
    return 'الآن';
  }
  
  // أقل من ساعة
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `منذ ${minutes} دقيقة`;
  }
  
  // اليوم
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // أمس
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'أمس';
  }
  
  // تاريخ كامل
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * تجميع الرسائل حسب التاريخ
 * @param {Array} messages - قائمة الرسائل
 * @returns {Object} الرسائل المجمعة
 */
export const groupMessagesByDate = (messages) => {
  const groups = {};
  
  messages.forEach(message => {
    const date = new Date(message.createdAt).toLocaleDateString('ar-SA');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
  });
  
  return groups;
};

/**
 * الحصول على أيقونة نوع الملف
 * @param {string} fileType - نوع الملف
 * @returns {string} الأيقونة المناسبة
 */
export const getFileIcon = (fileType) => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('doc')) return '📝';
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
  if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️';
  return '📎';
};

/**
 * تنسيق حجم الملف
 * @param {number} bytes - الحجم بالبايت
 * @returns {string} الحجم المنسق
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * التحقق من صحة نوع الملف
 * @param {string} fileType - نوع الملف
 * @param {Array} allowedTypes - الأنواع المسموحة
 * @returns {boolean} صحة النوع
 */
export const isValidFileType = (fileType, allowedTypes = ['image/*', 'application/pdf', 'text/plain']) => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const category = type.split('/')[0];
      return fileType.startsWith(category);
    }
    return fileType === type;
  });
};

/**
 * إنشاء معرف مؤقت للرسالة
 * @returns {string} معرف مؤقت
 */
export const generateTempMessageId = () => {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * الحصول على لون المستخدم
 * @param {string} userId - معرف المستخدم
 * @returns {string} لون المستخدم
 */
export const getUserColor = (userId) => {
  const colors = [
    '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', 
    '#E91E63', '#00BCD4', '#FF5722', '#795548'
  ];
  
  // استخدام الـ ID لتوليد رقم ثابت
  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

/**
 * تنسيق نص الرسالة (إضافة روابط، إيموجي، الخ)
 * @param {string} text - النص
 * @returns {string} النص المنسق
 */
export const formatMessageText = (text) => {
  if (!text) return '';
  
  // تحويل الروابط إلى عناصر قابلة للنقر
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  text = text.replace(urlRegex, '<a href="$1" target="_blank" class="text-blue-600 hover:underline">$1</a>');
  
  // تحويل الإيميلات
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  text = text.replace(emailRegex, '<a href="mailto:$1" class="text-blue-600 hover:underline">$1</a>');
  
  // تحويل Mentions (@username)
  const mentionRegex = /@(\w+)/g;
  text = text.replace(mentionRegex, '<span class="text-purple-600 font-semibold">@$1</span>');
  
  return text;
};

/**
 * التحقق من وجود روابط ضارة في النص
 * @param {string} text - النص
 * @returns {boolean} وجود روابط ضارة
 */
export const hasMaliciousLinks = (text) => {
  const maliciousPatterns = [
    /bit\.ly/i,
    /tinyurl\.com/i,
    /goo\.gl/i,
    /ow\.ly/i,
    /is\.gd/i,
    /buff\.ly/i,
    /adf\.ly/i
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(text));
};
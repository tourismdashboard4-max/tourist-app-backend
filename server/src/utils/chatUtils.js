const crypto = require('crypto');

class ChatUtils {
  
  /**
   * إنشاء معرف رسالة فريد
   * @returns {string} معرف الرسالة
   */
  generateMessageId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `MSG-${timestamp}-${random}`;
  }

  /**
   * إنشاء معرف محادثة فريد
   * @returns {string} معرف المحادثة
   */
  generateChatId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `CHAT-${timestamp}-${random}`;
  }

  /**
   * تنسيق وقت الرسالة
   * @param {Date|string} timestamp - الوقت
   * @returns {string} الوقت المنسق
   */
  formatMessageTime(timestamp) {
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
    
    // أقل من 24 ساعة
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `منذ ${hours} ساعة`;
    }
    
    // أقل من 7 أيام
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `منذ ${days} يوم`;
    }
    
    // تاريخ كامل
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * تجميع الرسائل حسب التاريخ
   * @param {Array} messages - قائمة الرسائل
   * @returns {Object} الرسائل المجمعة
   */
  groupMessagesByDate(messages) {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  }

  /**
   * الحصول على أيقونة نوع الملف
   * @param {string} mimeType - نوع MIME
   * @returns {string} الأيقونة
   */
  getFileIcon(mimeType) {
    if (!mimeType) return '📎';
    
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    }
    if (mimeType.startsWith('video/')) {
      return '🎥';
    }
    if (mimeType.startsWith('audio/')) {
      return '🎵';
    }
    if (mimeType.includes('pdf')) {
      return '📄';
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return '📝';
    }
    if (mimeType.includes('excel') || mimeType.includes('sheet')) {
      return '📊';
    }
    if (mimeType.includes('zip') || mimeType.includes('rar')) {
      return '🗜️';
    }
    
    return '📎';
  }

  /**
   * تنسيق حجم الملف
   * @param {number} bytes - الحجم بالبايت
   * @returns {string} الحجم المنسق
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 بايت';
    
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }

  /**
   * التحقق من صحة نوع الملف
   * @param {string} mimeType - نوع MIME
   * @param {Array} allowedTypes - الأنواع المسموحة
   * @returns {boolean} صحة النوع
   */
  isValidFileType(mimeType, allowedTypes = ['image/*', 'application/pdf']) {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return mimeType.startsWith(category);
      }
      return mimeType === type;
    });
  }

  /**
   * إنشاء معرف مؤقت للرسالة
   * @returns {string} معرف مؤقت
   */
  generateTempId() {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * الحصول على لون المستخدم
   * @param {string} userId - معرف المستخدم
   * @returns {string} اللون
   */
  getUserColor(userId) {
    const colors = [
      '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', 
      '#E91E63', '#00BCD4', '#FF5722', '#795548',
      '#607D8B', '#3F51B5', '#009688', '#FFC107'
    ];
    
    // استخدام الـ ID لتوليد رقم ثابت
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  /**
   * تنسيق نص الرسالة (اكتشاف الروابط)
   * @param {string} text - النص
   * @returns {string} النص المنسق
   */
  formatMessageText(text) {
    if (!text) return '';
    
    // تحويل الروابط إلى عناصر قابلة للنقر
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, '<a href="$1" target="_blank" class="text-blue-600 hover:underline">$1</a>');
    
    // تحويل mentions
    const mentionRegex = /@(\w+)/g;
    text = text.replace(mentionRegex, '<span class="text-purple-600 font-semibold">@$1</span>');
    
    return text;
  }

  /**
   * التحقق من وجود روابط ضارة
   * @param {string} text - النص
   * @returns {boolean} وجود روابط ضارة
   */
  hasMaliciousLinks(text) {
    const maliciousPatterns = [
      /bit\.ly/i,
      /tinyurl\.com/i,
      /goo\.gl/i,
      /ow\.ly/i,
      /is\.gd/i,
      /shortlink\./i
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(text));
  }

  /**
   * حساب وقت آخر نشاط
   * @param {Date} lastActivity - آخر نشاط
   * @returns {string} نص آخر نشاط
   */
  getLastActivityText(lastActivity) {
    if (!lastActivity) return 'غير متصل';
    
    const now = new Date();
    const last = new Date(lastActivity);
    const diffMinutes = Math.floor((now - last) / (1000 * 60));
    
    if (diffMinutes < 1) return 'متصل الآن';
    if (diffMinutes < 5) return 'منذ لحظات';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffMinutes < 1440) return `منذ ${Math.floor(diffMinutes / 60)} ساعة`;
    
    return last.toLocaleDateString('ar-SA');
  }

  /**
   * الحصول على تحية حسب الوقت
   * @returns {string} التحية المناسبة
   */
  getGreeting() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'صباح الخير';
    } else if (hour >= 12 && hour < 17) {
      return 'مساء الخير';
    } else if (hour >= 17 && hour < 22) {
      return 'مساء النور';
    } else {
      return 'تصبح على خير';
    }
  }
}

module.exports = new ChatUtils();
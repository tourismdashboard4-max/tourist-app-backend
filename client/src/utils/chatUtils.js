// src/utils/chatUtils.js
// ════════════════════════════════════════════════════════════════════════════
// دوال مساعدة لإدارة المحادثات بين السائح والمرشد (UUID + أدوات إضافية)
// ════════════════════════════════════════════════════════════════════════════

import api from '../services/api';
import toast from 'react-hot-toast';

const API_BASE = 'https://tourist-app-api.onrender.com';

// ════════════════════════════════════════════════════════════════════════════
// 1. دوال UUID الأساسية (لحل مشكلة old_id)
// ════════════════════════════════════════════════════════════════════════════

/**
 * تحويل old_id (رقمي) إلى UUID الحقيقي للمرشد
 * @param {string|number} guideId - معرف المرشد (قد يكون UUID أو old_id)
 * @returns {Promise<string|null>} UUID الحقيقي أو null
 */
export const resolveGuideUuid = async (guideId) => {
  if (!guideId) return null;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (typeof guideId === 'string' && uuidRegex.test(guideId)) {
    return guideId;
  }
  
  if (!isNaN(Number(guideId))) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/guides/${guideId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const data = await response.json();
      if (data.success && data.guide && data.guide.id) {
        return data.guide.id;
      }
    } catch (err) {
      console.warn('Failed to resolve guide UUID:', err);
    }
  }
  
  const storedMap = localStorage.getItem('guidesMapReverse');
  if (storedMap) {
    try {
      const reverseMap = JSON.parse(storedMap);
      if (reverseMap[String(guideId)]) {
        return reverseMap[String(guideId)];
      }
    } catch(e) {}
  }
  
  return null;
};

/**
 * بناء خريطة تحويل old_id -> uuid من قائمة المرشدين
 * @returns {Promise<Object>} خريطة مثل { "6": "64be64ff-..." }
 */
export const buildGuidesReverseMap = async () => {
  try {
    const response = await api.get('/api/guides');
    let guidesList = [];
    if (response.data?.data?.guides) guidesList = response.data.data.guides;
    else if (response.data?.guides) guidesList = response.data.guides;
    else if (Array.isArray(response.data)) guidesList = response.data;
    else if (response.data?.data && Array.isArray(response.data.data)) guidesList = response.data.data;

    const reverseMap = {};
    guidesList.forEach(guide => {
      const uuid = guide.id || guide.uuid;
      const numericId = guide.old_id;
      if (uuid && numericId && !isNaN(Number(numericId))) {
        reverseMap[String(numericId)] = uuid;
      }
    });
    
    localStorage.setItem('guidesMapReverse', JSON.stringify(reverseMap));
    return reverseMap;
  } catch (err) {
    console.error('Failed to build guides reverse map:', err);
    return {};
  }
};

/**
 * الوظيفة المركزية لفتح المحادثة مع المرشد
 * تقوم بالتحقق من UUID، إنشاء التذكرة، وحفظ المعاملات
 * @param {Object} params
 * @param {string} params.guideId - معرف المرشد (UUID أو old_id)
 * @param {string} params.guideName - اسم المرشد
 * @param {Object} params.user - المستخدم الحالي
 * @param {string} params.lang - اللغة
 * @param {Function} params.setPage - دالة لتغيير الصفحة
 * @param {Function} params.onError - دالة خطأ اختيارية
 * @returns {Promise<boolean>}
 */
export const openChatWithGuide = async ({ guideId, guideName, user, lang, setPage, onError }) => {
  if (!user) {
    const msg = lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً' : 'Please login first';
    if (onError) onError(msg);
    else toast.error(msg);
    if (setPage) setPage('profile');
    return false;
  }

  if (!guideId) {
    const msg = lang === 'ar' ? 'معرف المرشد غير موجود' : 'Guide ID missing';
    if (onError) onError(msg);
    else toast.error(msg);
    return false;
  }

  let realUuid = null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (typeof guideId === 'string' && uuidRegex.test(guideId)) {
    realUuid = guideId;
  } else if (!isNaN(Number(guideId))) {
    const storedMap = localStorage.getItem('guidesMapReverse');
    if (storedMap) {
      try {
        const reverseMap = JSON.parse(storedMap);
        if (reverseMap[String(guideId)]) {
          realUuid = reverseMap[String(guideId)];
        }
      } catch(e) {}
    }
    if (!realUuid) {
      try {
        const resolved = await resolveGuideUuid(guideId);
        if (resolved) realUuid = resolved;
      } catch(e) { console.warn(e); }
    }
  }

  if (!realUuid) {
    const msg = lang === 'ar' ? 'لم نتمكن من العثور على معرف المرشد الصحيح' : 'Could not find valid guide ID';
    if (onError) onError(msg);
    else toast.error(msg);
    return false;
  }

  const chatParams = {
    recipientId: realUuid,
    recipientName: guideName || 'المرشد',
    timestamp: Date.now(),
    from: 'chatUtils'
  };
  localStorage.setItem('directChatParams', JSON.stringify(chatParams));
  console.log('✅ Saved chat params (UUID):', chatParams);

  if (setPage) setPage('directChat');
  return true;
};

/**
 * إنشاء أو استرجاع تذكرة محادثة بين المستخدم والمرشد
 * @param {Object} params
 * @param {string} params.userId - UUID المستخدم الحالي
 * @param {string} params.guideId - UUID المرشد
 * @param {string} params.guideName - اسم المرشد (للعرض)
 * @param {string} params.lang - اللغة ('ar' أو 'en')
 * @returns {Promise<{ticketId: number, isNew: boolean}>}
 */
export const getOrCreateChatTicket = async ({ userId, guideId, guideName, lang = 'ar' }) => {
  if (!userId || !guideId) {
    throw new Error('معرف المستخدم والمرشد مطلوبان');
  }
  
  try {
    const ticketsResponse = await api.getSupportTickets({ user_id: userId, status: 'open' });
    let existingTicket = null;
    
    if (ticketsResponse.success && ticketsResponse.tickets) {
      existingTicket = ticketsResponse.tickets.find(ticket => 
        ticket.type === 'guide_chat' && 
        ticket.metadata?.guideId === guideId
      );
    }
    
    if (existingTicket) {
      return { ticketId: existingTicket.id, isNew: false };
    }
    
    const subject = `${lang === 'ar' ? 'محادثة مع المرشد' : 'Chat with guide'}: ${guideName}`;
    const newTicket = await api.createSupportTicket({
      user_id: userId,
      subject: subject,
      type: 'guide_chat',
      priority: 'normal',
      message: `${lang === 'ar' ? 'بدء محادثة مع المرشد' : 'Start conversation with guide'} ${guideName}`,
      metadata: { guideId, guideName }
    });
    
    if (newTicket.success && newTicket.ticket) {
      return { ticketId: newTicket.ticket.id, isNew: true };
    }
    
    throw new Error('Failed to create ticket');
  } catch (err) {
    console.error('Error in getOrCreateChatTicket:', err);
    throw err;
  }
};

/**
 * جلب رسائل التذكرة
 * @param {number} ticketId 
 * @returns {Promise<Array>}
 */
export const fetchTicketMessages = async (ticketId) => {
  try {
    const response = await api.getSupportMessages(ticketId);
    if (response.success && response.messages) {
      return response.messages.map(msg => ({
        id: msg.id,
        message: msg.message,
        isFromUser: msg.is_from_user,
        createdAt: msg.created_at,
        senderName: msg.sender_name
      }));
    }
    return [];
  } catch (err) {
    console.error('Error fetching messages:', err);
    return [];
  }
};

/**
 * إرسال رسالة في التذكرة
 * @param {number} ticketId 
 * @param {string} message 
 * @returns {Promise<boolean>}
 */
export const sendTicketMessage = async (ticketId, message) => {
  if (!ticketId || !message.trim()) return false;
  try {
    const response = await api.sendSupportMessage(ticketId, message);
    return response.success === true;
  } catch (err) {
    console.error('Error sending message:', err);
    return false;
  }
};

/**
 * جلب تذاكر المحادثة الموجهة لمرشد معين (للوحة تحكم المرشد)
 * @param {string} guideUuid - UUID المرشد
 * @returns {Promise<Array>}
 */
export const fetchGuideChatTickets = async (guideUuid) => {
  if (!guideUuid) return [];
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/support/tickets?status=open`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (data.success && data.tickets) {
      return data.tickets.filter(ticket => 
        ticket.type === 'guide_chat' && 
        ticket.metadata?.guideId === guideUuid
      );
    }
    return [];
  } catch (err) {
    console.error('Error fetching guide tickets:', err);
    return [];
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 2. دوال مساعدة إضافية (تنسيق الوقت، الملفات، الرسائل)
// ════════════════════════════════════════════════════════════════════════════

/**
 * تنسيق وقت الرسالة (نسخة محسنة للعربية)
 * @param {string} timestamp - الوقت
 * @returns {string} الوقت المنسق
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'الآن';
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `منذ ${minutes} دقيقة`;
  }
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'أمس';
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
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
    if (!groups[date]) groups[date] = [];
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
 * الحصول على لون المستخدم بناءً على معرفه
 * @param {string} userId - معرف المستخدم
 * @returns {string} لون المستخدم
 */
export const getUserColor = (userId) => {
  const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4', '#FF5722', '#795548'];
  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

/**
 * تنسيق نص الرسالة (إضافة روابط، إيموجي، الخ)
 * @param {string} text - النص
 * @returns {string} النص المنسق (آمن لـ dangerouslySetInnerHTML)
 */
export const formatMessageText = (text) => {
  if (!text) return '';
  let formatted = text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" class="text-blue-600 hover:underline">$1</a>');
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  formatted = formatted.replace(emailRegex, '<a href="mailto:$1" class="text-blue-600 hover:underline">$1</a>');
  const mentionRegex = /@(\w+)/g;
  formatted = formatted.replace(mentionRegex, '<span class="text-purple-600 font-semibold">@$1</span>');
  return formatted;
};

/**
 * التحقق من وجود روابط ضارة في النص
 * @param {string} text - النص
 * @returns {boolean} وجود روابط ضارة
 */
export const hasMaliciousLinks = (text) => {
  const maliciousPatterns = [/bit\.ly/i, /tinyurl\.com/i, /goo\.gl/i, /ow\.ly/i, /is\.gd/i, /buff\.ly/i, /adf\.ly/i];
  return maliciousPatterns.some(pattern => pattern.test(text));
};

// حفظ معاملات المحادثة (للاستخدام مع DirectChatPage)
export const saveChatParams = ({ recipientId, recipientName, from = 'app' }) => {
  if (!recipientId) return false;
  const chatParams = { recipientId, recipientName: recipientName || 'المرشد', timestamp: Date.now(), from };
  localStorage.setItem('directChatParams', JSON.stringify(chatParams));
  console.log('✅ Saved chat params (UUID):', chatParams);
  return true;
};

export const getChatParams = () => {
  const paramsStr = localStorage.getItem('directChatParams');
  if (!paramsStr) return null;
  try { return JSON.parse(paramsStr); } catch(e) { return null; }
};

export const clearChatParams = () => localStorage.removeItem('directChatParams');

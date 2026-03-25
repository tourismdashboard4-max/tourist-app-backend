// ===================== Chat APIs =====================
/**
 * جلب جميع محادثات المستخدم
 * @returns {Promise<Object>} قائمة المحادثات
 */
async getUserConversations() {
  try {
    const response = await this.api.get('/api/chats');
    console.log('📥 Conversations response:', response.data);
    
    // تحويل البيانات إلى الشكل المطلوب
    const conversations = response.data?.conversations || response.data?.data?.conversations || [];
    
    return {
      success: true,
      conversations: conversations
    };
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    return { 
      success: false, 
      conversations: [],
      error: error.response?.data?.message || 'فشل تحميل المحادثات'
    };
  }
},

/**
 * جلب رسائل محادثة محددة
 * @param {string} conversationId - معرف المحادثة
 * @param {number} page - رقم الصفحة
 * @param {number} limit - عدد الرسائل
 * @returns {Promise<Object>} الرسائل
 */
async getConversationMessages(conversationId, page = 1, limit = 50) {
  try {
    console.log(`📤 Fetching messages for conversation: ${conversationId}, page: ${page}`);
    
    const response = await this.api.get(
      `/api/chats/${conversationId}/messages?page=${page}&limit=${limit}`
    );

    console.log('📥 Messages response:', response.data);
    
    const messages = response.data?.messages || response.data?.data?.messages || [];
    const pagination = response.data?.pagination || response.data?.data?.pagination || {};
    
    return {
      success: true,
      messages: messages,
      hasMore: pagination.currentPage < pagination.totalPages,
      pagination: pagination
    };
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    return { 
      success: false, 
      messages: [], 
      hasMore: false,
      error: error.response?.data?.message || 'فشل تحميل الرسائل'
    };
  }
},

/**
 * إرسال رسالة نصية
 * @param {string} conversationId - معرف المحادثة
 * @param {string} content - نص الرسالة
 * @returns {Promise<Object>} نتيجة الإرسال
 */
async sendMessage(conversationId, content) {
  try {
    console.log(`📤 Sending message to conversation: ${conversationId}`);
    
    const response = await this.api.post('/api/chats/message', {
      chatId: conversationId,
      content: content,
      type: 'text'
    });

    console.log('📥 Send message response:', response.data);
    
    return {
      success: true,
      message: response.data.message || response.data,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || 'فشل إرسال الرسالة'
    };
  }
},

/**
 * جلب معلومات محادثة محددة
 * @param {string} conversationId - معرف المحادثة
 * @returns {Promise<Object>} معلومات المحادثة
 */
async getConversation(conversationId) {
  try {
    console.log(`📤 Fetching conversation details: ${conversationId}`);
    
    const response = await this.api.get(`/api/chats/${conversationId}`);

    console.log('📥 Conversation details response:', response.data);
    
    const conversation = response.data?.conversation || response.data?.data || response.data;
    
    return {
      success: true,
      conversation: conversation
    };
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    return { 
      success: false, 
      conversation: null,
      error: error.response?.data?.message || 'فشل تحميل معلومات المحادثة'
    };
  }
},

/**
 * إرسال رسالة ملف
 * @param {FormData} formData - بيانات الملف
 * @returns {Promise<Object>} نتيجة الإرسال
 */
async sendFileMessage(formData) {
  try {
    console.log('📤 Sending file message');
    
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/api/chats/message/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      withCredentials: true
    });

    console.log('📥 File message response:', response.data);
    
    return {
      success: true,
      message: response.data.message || 'تم رفع الملف بنجاح',
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error sending file:', error);
    
    // محاكاة للاختبار
    if (!error.response) {
      console.log('🔄 Using mock file upload');
      return {
        success: true,
        message: 'تم رفع الملف بنجاح (محاكاة)',
        data: {
          id: `msg-${Date.now()}`,
          type: 'file',
          url: URL.createObjectURL(formData.get('file'))
        }
      };
    }
    
    return { 
      success: false, 
      error: error.response?.data?.message || 'فشل رفع الملف'
    };
  }
},

/**
 * حذف رسالة
 * @param {string} messageId - معرف الرسالة
 * @returns {Promise<Object>} نتيجة الحذف
 */
async deleteMessage(messageId) {
  try {
    console.log(`📤 Deleting message: ${messageId}`);
    
    const response = await this.api.delete(`/api/chats/message/${messageId}`);

    console.log('📥 Delete message response:', response.data);
    
    return {
      success: true,
      message: response.data.message || 'تم حذف الرسالة'
    };
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || 'فشل حذف الرسالة'
    };
  }
},

/**
 * تحديث حالة القراءة للمحادثة
 * @param {string} conversationId - معرف المحادثة
 * @returns {Promise<Object>} نتيجة التحديث
 */
async markConversationAsRead(conversationId) {
  try {
    console.log(`📤 Marking conversation as read: ${conversationId}`);
    
    const response = await this.api.put(`/api/chats/${conversationId}/read`);

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error marking as read:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || 'فشل تحديث حالة القراءة'
    };
  }
},

/**
 * بدء محادثة دعم جديدة
 * @param {Object} data - بيانات المحادثة
 * @returns {Promise<Object>} نتيجة الإنشاء
 */
async startSupportChat(data) {
  try {
    console.log('📤 Starting support chat with data:', data);
    
    const response = await this.api.post('/api/chats/support', {
      subject: data.subject || 'استفسار',
      manual: data.manual || false
    });

    console.log('📥 Support chat response:', response.data);
    
    return {
      success: true,
      message: response.data.message || 'تم بدء محادثة الدعم',
      chat: response.data.chat || response.data
    };
  } catch (error) {
    console.error('❌ Error starting support chat:', error);
    
    // محاكاة للاختبار
    if (!error.response) {
      console.log('🔄 Using mock support chat');
      return {
        success: true,
        message: 'تم بدء محادثة الدعم (محاكاة)',
        chat: {
          id: `CHAT-SUPPORT-${Date.now()}`,
          type: 'support',
          participants: [2, 3],
          created_at: new Date().toISOString()
        }
      };
    }
    
    return { 
      success: false, 
      message: error.response?.data?.message || 'فشل بدء محادثة الدعم'
    };
  }
},

// ===================== Upgrade APIs =====================
/**
 * إنشاء طلب ترقية جديد إلى مرشد سياحي
 * @param {FormData} formData - بيانات النموذج مع الملفات
 * @returns {Promise<Object>} نتيجة الطلب
 */
async upgradeToGuide(formData) {
  try {
    console.log('📤 Sending upgrade request to /api/upgrade/upgrade-requests');
    
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/api/upgrade/upgrade-requests`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      withCredentials: true
    });

    console.log('📥 Upgrade request response:', response.data);
    
    return {
      success: true,
      message: response.data.message || 'تم إرسال طلب الترقية بنجاح',
      data: response.data
    };
  } catch (error) {
    console.error('❌ Upgrade request error:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'فشل إرسال طلب الترقية',
      statusCode: error.response?.status
    };
  }
},

/**
 * جلب حالة طلب الترقية للمستخدم الحالي
 * @returns {Promise<Object>} حالة الطلب
 */
async getMyUpgradeStatus() {
  try {
    console.log('📤 Fetching my upgrade status');
    
    const response = await this.api.get('/api/upgrade/upgrade-requests/my-status');

    console.log('📥 Upgrade status response:', response.data);
    
    return {
      success: true,
      request: response.data.request,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error fetching upgrade status:', error);
    return { 
      success: false, 
      request: null,
      message: error.response?.data?.message || 'فشل تحميل حالة الترقية'
    };
  }
},

/**
 * جلب جميع طلبات الترقية (للمسؤول فقط)
 * @returns {Promise<Object>} قائمة الطلبات
 */
async getAllUpgradeRequests() {
  try {
    console.log('📤 Fetching all upgrade requests');
    
    const response = await this.api.get('/api/upgrade/upgrade-requests');

    console.log('📥 Upgrade requests response:', response.data);
    
    return {
      success: true,
      requests: response.data.requests || [],
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error fetching upgrade requests:', error);
    return { 
      success: false, 
      requests: [],
      message: error.response?.data?.message || 'فشل تحميل طلبات الترقية'
    };
  }
},

/**
 * الموافقة على طلب ترقية (للمسؤول فقط)
 * @param {number} requestId - معرف الطلب
 * @param {string} notes - ملاحظات (اختياري)
 * @returns {Promise<Object>} نتيجة الموافقة
 */
async approveUpgradeRequest(requestId, notes = '') {
  try {
    console.log(`📤 Approving upgrade request: ${requestId}`);
    
    const response = await this.api.post(`/api/upgrade/upgrade-requests/${requestId}/approve`, { notes });

    console.log('📥 Approve response:', response.data);
    
    return {
      success: true,
      message: response.data.message || 'تمت الموافقة على الطلب',
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error approving request:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'فشل الموافقة على الطلب'
    };
  }
},

/**
 * رفض طلب ترقية (للمسؤول فقط)
 * @param {number} requestId - معرف الطلب
 * @param {string} reason - سبب الرفض
 * @returns {Promise<Object>} نتيجة الرفض
 */
async rejectUpgradeRequest(requestId, reason) {
  try {
    console.log(`📤 Rejecting upgrade request: ${requestId}`);
    
    const response = await this.api.post(`/api/upgrade/upgrade-requests/${requestId}/reject`, { reason });

    console.log('📥 Reject response:', response.data);
    
    return {
      success: true,
      message: response.data.message || 'تم رفض الطلب',
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'فشل رفض الطلب'
    };
  }
},

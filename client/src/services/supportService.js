// client/src/services/supportService.js
import api from './api';

// تخزين محلي للرسائل مؤقتاً
let localSupportChats = [];

// تحميل المحادثات المحفوظة
const loadLocalChats = () => {
  const saved = localStorage.getItem('support_chats');
  if (saved) {
    localSupportChats = JSON.parse(saved);
  }
};

// حفظ المحادثات
const saveLocalChats = () => {
  localStorage.setItem('support_chats', JSON.stringify(localSupportChats));
};

// تهيئة الخدمة
loadLocalChats();

export const supportService = {
  // الحصول على محادثة محددة
  getChat: async (chatId) => {
    try {
      // محاولة الاتصال بالخادم أولاً
      const response = await api.get(`/support/chats/${chatId}`);
      if (response.data.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Using local support data');
      
      // استخدام البيانات المحلية
      const localChat = localSupportChats.find(c => c.id === chatId);
      if (localChat) {
        return {
          success: true,
          chat: localChat
        };
      }
      
      return {
        success: false,
        error: 'Chat not found'
      };
    }
  },
  
  // الحصول على رسائل المحادثة
  getMessages: async (chatId) => {
    try {
      const response = await api.get(`/support/chats/${chatId}/messages`);
      return response.data;
    } catch (error) {
      console.log('Using local messages');
      
      const localChat = localSupportChats.find(c => c.id === chatId);
      if (localChat) {
        return {
          success: true,
          messages: localChat.messages || []
        };
      }
      
      return {
        success: true,
        messages: []
      };
    }
  },
  
  // إرسال رسالة
  sendMessage: async (chatId, message, userId, userName) => {
    try {
      // محاولة الإرسال للخادم
      const response = await api.post(`/support/chats/${chatId}/messages`, {
        message,
        userId,
        userName
      });
      
      if (response.data.success) {
        return response.data;
      }
    } catch (error) {
      console.log('Saving message locally');
      
      // حفظ الرسالة محلياً
      let chat = localSupportChats.find(c => c.id === chatId);
      
      if (!chat) {
        // إنشاء محادثة جديدة
        chat = {
          id: chatId,
          userId: userId,
          userName: userName,
          createdAt: new Date().toISOString(),
          messages: []
        };
        localSupportChats.push(chat);
      }
      
      const newMessage = {
        id: Date.now(),
        chatId: chatId,
        senderId: userId,
        senderName: userName,
        message: message,
        timestamp: new Date().toISOString(),
        isFromUser: true,
        status: 'sent'
      };
      
      chat.messages.push(newMessage);
      chat.lastMessage = message;
      chat.lastMessageTime = new Date().toISOString();
      
      saveLocalChats();
      
      return {
        success: true,
        message: newMessage,
        isLocal: true
      };
    }
  },
  
  // إنشاء محادثة دعم جديدة
  createSupportChat: async (userId, userName, subject, message) => {
    const chatId = `CHAT-SUPPORT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const newChat = {
      id: chatId,
      userId: userId,
      userName: userName,
      subject: subject,
      status: 'open',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: Date.now(),
          chatId: chatId,
          senderId: userId,
          senderName: userName,
          message: message,
          timestamp: new Date().toISOString(),
          isFromUser: true,
          status: 'sent'
        }
      ],
      lastMessage: message,
      lastMessageTime: new Date().toISOString()
    };
    
    localSupportChats.unshift(newChat);
    saveLocalChats();
    
    // محاولة إرسال إشعار للمسؤول
    try {
      await api.post('/notifications/send', {
        userId: 3, // ID المسؤول
        title: '🆕 طلب دعم جديد',
        message: `${userName} يحتاج إلى مساعدة: ${subject}`,
        type: 'support',
        action_url: `/support/chats/${chatId}`,
        data: {
          chatId: chatId,
          userId: userId,
          userName: userName
        }
      });
    } catch (error) {
      console.log('Could not send notification to admin');
    }
    
    return {
      success: true,
      chatId: chatId,
      chat: newChat
    };
  },
  
  // الحصول على جميع محادثات المستخدم
  getUserChats: async (userId) => {
    const userChats = localSupportChats.filter(chat => chat.userId === userId);
    return {
      success: true,
      chats: userChats
    };
  },
  
  // الحصول على جميع محادثات الدعم (للمسؤول)
  getAllChats: async () => {
    return {
      success: true,
      chats: localSupportChats
    };
  }
};

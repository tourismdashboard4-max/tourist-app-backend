import api from './apiService';

class ChatService {
  async getConversations() {
    try {
      const response = await api.getConversations();
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getMessages(conversationId, page = 1, limit = 50) {
    try {
      const response = await api.getMessages(conversationId, { page, limit });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async sendMessage(conversationId, content, type = 'text', attachment = null) {
    try {
      const response = await api.sendMessage({
        conversationId,
        content,
        type,
        attachment
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteMessage(messageId) {
    try {
      const response = await api.deleteMessage(messageId);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async markAsRead(messageId) {
    try {
      const response = await api.markMessageAsRead(messageId);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createConversation(participantId, initialMessage = '') {
    try {
      const response = await api.createConversation(participantId);
      
      if (initialMessage && response.data.success) {
        await this.sendMessage(response.data.conversation.id, initialMessage);
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getUnreadCount() {
    try {
      const response = await api.get('/chat/unread-count');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  formatTime(timestamp) {
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
    
    // أقل من يوم
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `منذ ${hours} ساعة`;
    }
    
    // أقل من أسبوع
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `منذ ${days} يوم`;
    }
    
    // تاريخ كامل
    return date.toLocaleDateString('ar-SA');
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTimeOnly(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default new ChatService();
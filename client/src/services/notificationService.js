import api from './apiService';

class NotificationService {
  async getNotifications(page = 1, limit = 20, filter = 'all') {
    try {
      const response = await api.getNotifications({ page, limit, filter });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async markAllAsRead() {
    try {
      const response = await api.markAllNotificationsAsRead();
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteNotification(notificationId) {
    try {
      const response = await api.deleteNotification(notificationId);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async clearAll() {
    try {
      const response = await api.delete('/notifications/all');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getPreferences() {
    try {
      const response = await api.getNotificationPreferences();
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updatePreferences(preferences) {
    try {
      const response = await api.updateNotificationPreferences(preferences);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getUnreadCount() {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ===================== دوال مساعدة =====================
  getNotificationIcon(type) {
    const icons = {
      booking: '📅',
      payment: '💰',
      message: '💬',
      warning: '⚠️',
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      review: '⭐',
      promotion: '🎁'
    };
    return icons[type] || '🔔';
  }

  getNotificationColor(type) {
    const colors = {
      booking: 'blue',
      payment: 'green',
      message: 'purple',
      warning: 'yellow',
      success: 'green',
      error: 'red',
      info: 'blue',
      review: 'yellow',
      promotion: 'pink'
    };
    return colors[type] || 'gray';
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    if (diff < 604800000) return `منذ ${Math.floor(diff / 86400000)} يوم`;
    
    return date.toLocaleDateString('ar-SA');
  }

  groupByDate(notifications) {
    const groups = {};
    
    notifications.forEach(notif => {
      const date = new Date(notif.createdAt).toLocaleDateString('ar-SA');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notif);
    });
    
    return groups;
  }
}

export default new NotificationService();
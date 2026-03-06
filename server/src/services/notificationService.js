// server/src/services/notificationService.js
import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';

class NotificationService {
  // إنشاء إشعار جديد
  async create(userId, data) {
    try {
      const notification = await Notification.create({
        user: userId,
        ...data
      });

      // جلب عدد الإشعارات غير المقروءة
      const unreadCount = await this.getUnreadCount(userId);

      // إرسال الإشعار عبر WebSocket
      const io = getIO();
      if (io) {
        // إرسال للمستخدم المحدد
        io.to(`user-${userId}`).emit('new_notification', {
          notification,
          unreadCount
        });

        // إذا كان الإشعار مهم، أرسل إشعار منبثق أيضاً
        if (data.priority === 'high' || data.priority === 'urgent') {
          io.to(`user-${userId}`).emit('urgent_notification', notification);
        }
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // إنشاء إشعارات متعددة
  async createBulk(userIds, data) {
    try {
      const notifications = await Notification.insertMany(
        userIds.map(userId => ({
          user: userId,
          ...data
        }))
      );

      const io = getIO();
      if (io) {
        userIds.forEach(async (userId) => {
          const unreadCount = await this.getUnreadCount(userId);
          io.to(`user-${userId}`).emit('new_notification', {
            notification: data,
            unreadCount
          });
        });
      }

      return notifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // جلب إشعارات المستخدم
  async getUserNotifications(userId, page = 1, limit = 20, filters = {}) {
    try {
      const query = { user: userId, isDeleted: false };

      if (filters.type && filters.type !== 'all') {
        query.type = filters.type;
      }

      if (filters.isRead !== undefined && filters.isRead !== 'all') {
        query.isRead = filters.isRead === 'read';
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      const total = await Notification.countDocuments(query);
      const unreadCount = await this.getUnreadCount(userId);

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        },
        unreadCount
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // جلب عدد الإشعارات غير المقروءة
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({
        user: userId,
        isRead: false,
        isDeleted: false
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // تحديث إشعار كمقروء
  async markAsRead(userId, notificationId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { 
          isRead: true, 
          readAt: new Date() 
        },
        { new: true }
      );

      if (notification) {
        const unreadCount = await this.getUnreadCount(userId);
        const io = getIO();
        if (io) {
          io.to(`user-${userId}`).emit('notification_read', {
            notificationId,
            unreadCount
          });
        }
      }

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // تحديث الكل كمقروء
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, isRead: false, isDeleted: false },
        { 
          isRead: true, 
          readAt: new Date() 
        }
      );

      const io = getIO();
      if (io) {
        io.to(`user-${userId}`).emit('all_notifications_read', {
          count: result.modifiedCount,
          unreadCount: 0
        });
      }

      return result;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  // حذف إشعار
  async deleteNotification(userId, notificationId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { isDeleted: true },
        { new: true }
      );

      if (notification) {
        const unreadCount = await this.getUnreadCount(userId);
        const io = getIO();
        if (io) {
          io.to(`user-${userId}`).emit('notification_deleted', {
            notificationId,
            unreadCount
          });
        }
      }

      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // حذف جميع الإشعارات
  async deleteAllNotifications(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, isDeleted: false },
        { isDeleted: true }
      );

      const io = getIO();
      if (io) {
        io.to(`user-${userId}`).emit('all_notifications_deleted', {
          count: result.modifiedCount,
          unreadCount: 0
        });
      }

      return result;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }

  // إنشاء إشعارات مخصصة للأحداث المختلفة
  async createBookingNotification(userId, bookingData) {
    return this.create(userId, {
      title: 'تأكيد الحجز',
      message: `تم تأكيد حجزك في برنامج ${bookingData.programName}`,
      type: 'booking',
      priority: 'high',
      data: { 
        bookingId: bookingData.bookingId,
        programId: bookingData.programId 
      },
      actionUrl: `/bookings/${bookingData.bookingId}`
    });
  }

  async createPaymentNotification(userId, paymentData) {
    return this.create(userId, {
      title: 'عملية دفع ناجحة',
      message: `تم إضافة ${paymentData.amount} ريال إلى محفظتك`,
      type: 'payment',
      priority: 'high',
      data: { 
        transactionId: paymentData.transactionId,
        amount: paymentData.amount 
      },
      actionUrl: '/wallet/transactions'
    });
  }

  async createChatNotification(userId, chatData) {
    return this.create(userId, {
      title: 'رسالة جديدة',
      message: `لديك رسالة جديدة من ${chatData.senderName}`,
      type: 'chat',
      priority: 'medium',
      data: { 
        chatId: chatData.chatId,
        senderId: chatData.senderId 
      },
      actionUrl: `/chat/${chatData.chatId}`
    });
  }

  async createUpgradeNotification(userId, upgradeData) {
    return this.create(userId, {
      title: 'طلب ترقية',
      message: upgradeData.message,
      type: 'upgrade',
      priority: 'high',
      data: { 
        requestId: upgradeData.requestId,
        status: upgradeData.status 
      },
      actionUrl: '/profile/upgrade-status'
    });
  }

  async createGuideNotification(userId, guideData) {
    return this.create(userId, {
      title: 'تحديث للمرشدين',
      message: guideData.message,
      type: 'guide',
      priority: 'medium',
      data: guideData.data,
      actionUrl: guideData.actionUrl
    });
  }

  async createSystemNotification(userId, systemData) {
    return this.create(userId, {
      title: systemData.title || 'إشعار النظام',
      message: systemData.message,
      type: 'system',
      priority: systemData.priority || 'low',
      data: systemData.data
    });
  }
}

export default new NotificationService();
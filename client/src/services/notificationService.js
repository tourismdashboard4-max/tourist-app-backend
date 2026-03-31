// server/src/services/notificationService.js
import { pool } from '../../server.js';

class NotificationService {
  // جلب إشعارات المستخدم
  async getUserNotifications(userId, page = 1, limit = 20, isRead = null) {
    try {
      const offset = (page - 1) * limit;
      
      let countQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
      let dataQuery = `
        SELECT id, title, message, type, is_read, data, created_at
        FROM notifications 
        WHERE user_id = $1
      `;
      
      const countParams = [userId];
      const dataParams = [userId];
      
      if (isRead !== null && isRead !== 'all' && isRead !== undefined) {
        const readValue = isRead === 'true' || isRead === '1' || isRead === true;
        countQuery += ' AND is_read = $2';
        dataQuery += ' AND is_read = $2';
        countParams.push(readValue);
        dataParams.push(readValue);
      }
      
      dataQuery += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
      dataParams.push(limit, offset);
      
      console.log('🔍 Executing count query:', countQuery, countParams);
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);
      
      console.log('🔍 Executing data query:', dataQuery, dataParams);
      const dataResult = await pool.query(dataQuery, dataParams);
      
      console.log(`✅ Found ${dataResult.rows.length} notifications for user ${userId}`);
      
      return {
        notifications: dataResult.rows.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.is_read,
          data: n.data,
          createdAt: n.created_at
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error in getUserNotifications:', error);
      throw error;
    }
  }

  // جلب عدد الإشعارات غير المقروءة
  async getUnreadCount(userId) {
    try {
      const query = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false';
      const result = await pool.query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Error in getUnreadCount:', error);
      throw error;
    }
  }

  // تحديث إشعار كمقروء
  async markAsRead(userId, notificationId) {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = true, read_at = NOW() 
        WHERE id = $1 AND user_id = $2 
        RETURNING id
      `;
      const result = await pool.query(query, [notificationId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error in markAsRead:', error);
      throw error;
    }
  }

  // تحديث جميع الإشعارات كمقروءة
  async markAllAsRead(userId) {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = true, read_at = NOW() 
        WHERE user_id = $1 AND is_read = false
      `;
      const result = await pool.query(query, [userId]);
      return result;
    } catch (error) {
      console.error('❌ Error in markAllAsRead:', error);
      throw error;
    }
  }

  // حذف إشعار
  async deleteNotification(userId, notificationId) {
    try {
      const query = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id';
      const result = await pool.query(query, [notificationId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error in deleteNotification:', error);
      throw error;
    }
  }

  // حذف جميع الإشعارات
  async deleteAllNotifications(userId) {
    try {
      const query = 'DELETE FROM notifications WHERE user_id = $1';
      const result = await pool.query(query, [userId]);
      return result;
    } catch (error) {
      console.error('❌ Error in deleteAllNotifications:', error);
      throw error;
    }
  }

  // إنشاء إشعار جديد
  async create(userId, notificationData) {
    try {
      const { title, message, type = 'system', data = {} } = notificationData;
      
      const query = `
        INSERT INTO notifications (user_id, title, message, type, data, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, title, message, type, data, created_at
      `;
      
      const result = await pool.query(query, [userId, title, message, type, JSON.stringify(data)]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  // إنشاء إشعار حجز
  async createBookingNotification(userId, bookingData) {
    return this.create(userId, {
      title: 'تأكيد الحجز',
      message: `تم تأكيد حجزك في برنامج ${bookingData.programName}`,
      type: 'booking',
      data: { 
        bookingId: bookingData.bookingId,
        programId: bookingData.programId 
      }
    });
  }

  // إنشاء إشعار دفع
  async createPaymentNotification(userId, paymentData) {
    return this.create(userId, {
      title: 'عملية دفع ناجحة',
      message: `تم إضافة ${paymentData.amount} ريال إلى محفظتك`,
      type: 'payment',
      data: { 
        transactionId: paymentData.transactionId,
        amount: paymentData.amount 
      }
    });
  }

  // إنشاء إشعار رسالة
  async createChatNotification(userId, chatData) {
    return this.create(userId, {
      title: 'رسالة جديدة',
      message: `لديك رسالة جديدة من ${chatData.senderName}`,
      type: 'chat',
      data: { 
        chatId: chatData.chatId,
        senderId: chatData.senderId 
      }
    });
  }

  // إنشاء إشعار ترقية
  async createUpgradeNotification(userId, upgradeData) {
    return this.create(userId, {
      title: 'طلب ترقية',
      message: upgradeData.message,
      type: 'upgrade',
      data: { 
        requestId: upgradeData.requestId,
        status: upgradeData.status 
      }
    });
  }

  // إنشاء إشعار مرشد
  async createGuideNotification(userId, guideData) {
    return this.create(userId, {
      title: 'تحديث للمرشدين',
      message: guideData.message,
      type: 'guide',
      data: guideData.data
    });
  }

  // إنشاء إشعار نظام
  async createSystemNotification(userId, systemData) {
    return this.create(userId, {
      title: systemData.title || 'إشعار النظام',
      message: systemData.message,
      type: 'system',
      data: systemData.data
    });
  }
}

export default new NotificationService();

// server/src/services/notificationService.js
import { pool } from '../config/database.js';
import { getIO } from '../config/socket.js';

class NotificationService {
  /**
   * إنشاء إشعار جديد
   * @param {string} userId - معرف المستخدم
   * @param {Object} data - بيانات الإشعار
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async create(userId, data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // إنشاء الإشعار
      const notificationResult = await client.query(
        `INSERT INTO app.notifications (
          notification_id, user_id, title, message, type, priority,
          data, action_url, is_read, read_at, is_deleted, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
          notificationId,
          userId,
          data.title || 'إشعار جديد',
          data.message,
          data.type || 'system',
          data.priority || 'low',
          data.data ? JSON.stringify(data.data) : null,
          data.actionUrl || null,
          false,
          null,
          false
        ]
      );

      const notification = notificationResult.rows[0];

      // جلب عدد الإشعارات غير المقروءة
      const unreadCount = await this.getUnreadCount(client, userId);

      await client.query('COMMIT');

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
      await client.query('ROLLBACK');
      console.error('❌ Error creating notification:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * إنشاء إشعارات متعددة
   * @param {Array} userIds - قائمة معرفات المستخدمين
   * @param {Object} data - بيانات الإشعار
   * @returns {Promise<Array>} الإشعارات المنشأة
   */
  async createBulk(userIds, data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const notifications = [];

      for (const userId of userIds) {
        const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}-${userId}`;

        const result = await client.query(
          `INSERT INTO app.notifications (
            notification_id, user_id, title, message, type, priority,
            data, action_url, is_read, read_at, is_deleted, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
          RETURNING *`,
          [
            notificationId,
            userId,
            data.title || 'إشعار جديد',
            data.message,
            data.type || 'system',
            data.priority || 'low',
            data.data ? JSON.stringify(data.data) : null,
            data.actionUrl || null,
            false,
            null,
            false
          ]
        );

        notifications.push(result.rows[0]);
      }

      await client.query('COMMIT');

      const io = getIO();
      if (io) {
        userIds.forEach(async (userId) => {
          const unreadCount = await this.getUnreadCount(null, userId);
          io.to(`user-${userId}`).emit('new_notification', {
            notification: data,
            unreadCount
          });
        });
      }

      return notifications;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating bulk notifications:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * جلب إشعارات المستخدم
   * @param {string} userId - معرف المستخدم
   * @param {number} page - رقم الصفحة
   * @param {number} limit - عدد العناصر
   * @param {Object} filters - عوامل التصفية
   * @returns {Promise<Object>} الإشعارات مع معلومات التصفح
   */
  async getUserNotifications(userId, page = 1, limit = 20, filters = {}) {
    try {
      let query = 'SELECT * FROM app.notifications WHERE user_id = $1 AND is_deleted = false';
      const queryParams = [userId];
      let paramIndex = 2;

      if (filters.type && filters.type !== 'all') {
        query += ` AND type = $${paramIndex}`;
        queryParams.push(filters.type);
        paramIndex++;
      }

      if (filters.isRead !== undefined && filters.isRead !== 'all') {
        query += ` AND is_read = $${paramIndex}`;
        queryParams.push(filters.isRead === 'read');
        paramIndex++;
      }

      if (filters.startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        queryParams.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        queryParams.push(filters.endDate);
        paramIndex++;
      }

      // جلب العدد الإجمالي
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // جلب الإشعارات مع الترتيب والتصفح
      const offset = (page - 1) * limit;
      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
      queryParams.push(limit, offset);

      const notificationsResult = await pool.query(query, queryParams);

      // جلب عدد الإشعارات غير المقروءة
      const unreadCount = await this.getUnreadCount(null, userId);

      return {
        notifications: notificationsResult.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        },
        unreadCount
      };
    } catch (error) {
      console.error('❌ Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * جلب عدد الإشعارات غير المقروءة
   * @param {Object} client - عميل PostgreSQL (اختياري)
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<number>} عدد الإشعارات غير المقروءة
   */
  async getUnreadCount(client, userId) {
    try {
      const query = 'SELECT COUNT(*) FROM app.notifications WHERE user_id = $1 AND is_read = false AND is_deleted = false';
      const values = [userId];

      if (client) {
        const result = await client.query(query, values);
        return parseInt(result.rows[0].count);
      } else {
        const result = await pool.query(query, values);
        return parseInt(result.rows[0].count);
      }
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * تحديث إشعار كمقروء
   * @param {string} userId - معرف المستخدم
   * @param {string} notificationId - معرف الإشعار
   * @returns {Promise<Object>} الإشعار المحدث
   */
  async markAsRead(userId, notificationId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_read = true, read_at = NOW(), updated_at = NOW()
         WHERE notification_id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, userId]
      );

      if (result.rows.length > 0) {
        const unreadCount = await this.getUnreadCount(client, userId);
        
        await client.query('COMMIT');

        const io = getIO();
        if (io) {
          io.to(`user-${userId}`).emit('notification_read', {
            notificationId,
            unreadCount
          });
        }

        return result.rows[0];
      }

      await client.query('COMMIT');
      return null;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error marking notification as read:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * تحديث الكل كمقروء
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Object>} نتيجة التحديث
   */
  async markAllAsRead(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_read = true, read_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND is_read = false AND is_deleted = false`,
        [userId]
      );

      await client.query('COMMIT');

      const io = getIO();
      if (io) {
        io.to(`user-${userId}`).emit('all_notifications_read', {
          count: result.rowCount,
          unreadCount: 0
        });
      }

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error marking all as read:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * حذف إشعار
   * @param {string} userId - معرف المستخدم
   * @param {string} notificationId - معرف الإشعار
   * @returns {Promise<Object>} الإشعار المحذوف
   */
  async deleteNotification(userId, notificationId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_deleted = true, updated_at = NOW()
         WHERE notification_id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, userId]
      );

      if (result.rows.length > 0) {
        const unreadCount = await this.getUnreadCount(client, userId);
        
        await client.query('COMMIT');

        const io = getIO();
        if (io) {
          io.to(`user-${userId}`).emit('notification_deleted', {
            notificationId,
            unreadCount
          });
        }

        return result.rows[0];
      }

      await client.query('COMMIT');
      return null;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error deleting notification:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * حذف جميع الإشعارات
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Object>} نتيجة الحذف
   */
  async deleteAllNotifications(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_deleted = true, updated_at = NOW()
         WHERE user_id = $1 AND is_deleted = false`,
        [userId]
      );

      await client.query('COMMIT');

      const io = getIO();
      if (io) {
        io.to(`user-${userId}`).emit('all_notifications_deleted', {
          count: result.rowCount,
          unreadCount: 0
        });
      }

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error deleting all notifications:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * إنشاء إشعار حجز
   * @param {string} userId - معرف المستخدم
   * @param {Object} bookingData - بيانات الحجز
   * @returns {Promise<Object>} الإشعار المنشأ
   */
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

  /**
   * إنشاء إشعار دفع
   * @param {string} userId - معرف المستخدم
   * @param {Object} paymentData - بيانات الدفع
   * @returns {Promise<Object>} الإشعار المنشأ
   */
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

  /**
   * إنشاء إشعار محادثة
   * @param {string} userId - معرف المستخدم
   * @param {Object} chatData - بيانات المحادثة
   * @returns {Promise<Object>} الإشعار المنشأ
   */
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

  /**
   * إنشاء إشعار ترقية
   * @param {string} userId - معرف المستخدم
   * @param {Object} upgradeData - بيانات الترقية
   * @returns {Promise<Object>} الإشعار المنشأ
   */
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

  /**
   * إنشاء إشعار مرشد
   * @param {string} userId - معرف المستخدم
   * @param {Object} guideData - بيانات المرشد
   * @returns {Promise<Object>} الإشعار المنشأ
   */
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

  /**
   * إنشاء إشعار نظام
   * @param {string} userId - معرف المستخدم
   * @param {Object} systemData - بيانات النظام
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async createSystemNotification(userId, systemData) {
    return this.create(userId, {
      title: systemData.title || 'إشعار النظام',
      message: systemData.message,
      type: 'system',
      priority: systemData.priority || 'low',
      data: systemData.data
    });
  }

  /**
   * إرسال إشعار بمحادثة دعم جديدة - تمت الإضافة حديثاً
   * @param {string} chatId - معرف المحادثة
   * @param {string} userId - معرف المستخدم
   * @param {string} supportId - معرف موظف الدعم (اختياري)
   * @param {string} message - نص الرسالة
   * @returns {Promise<boolean>} نجاح أو فشل
   */
  async sendNewChatNotification(chatId, userId, supportId, message) {
    try {
      console.log(`📨 [sendNewChatNotification] Sending notification for chat: ${chatId}`);
      
      // 1️⃣ إشعار للمستخدم
      await this.create(userId, {
        title: '💬 محادثة دعم جديدة',
        message: message || 'تم إنشاء محادثة دعم جديدة. سيتم الرد عليك في أقرب وقت.',
        type: 'chat',
        priority: 'high',
        data: { 
          chatId,
          type: 'support'
        },
        actionUrl: `/chat/${chatId}`
      });

      // 2️⃣ إذا كان هناك موظف دعم، أرسل له إشعاراً أيضاً
      if (supportId) {
        // الحصول على معلومات المستخدم
        const userResult = await pool.query(
          'SELECT full_name, email FROM app.users WHERE id = $1',
          [userId]
        );
        
        const userName = userResult.rows[0]?.full_name || 'مستخدم جديد';
        
        await this.create(supportId, {
          title: '🆕 طلب دعم جديد',
          message: `مستخدم ${userName} يحتاج إلى مساعدة`,
          type: 'support',
          priority: 'high',
          data: { 
            chatId,
            userId,
            userName: userName
          },
          actionUrl: `/support/chats/${chatId}`
        });
      }

      // 3️⃣ إرسال WebSocket notification
      const io = getIO();
      if (io) {
        // إشعار للمستخدم
        io.to(`user-${userId}`).emit('new_chat_notification', {
          chatId,
          message: 'تم إنشاء محادثة دعم جديدة',
          type: 'support'
        });

        // إشعار لموظفي الدعم
        if (supportId) {
          io.to(`support-${supportId}`).emit('new_support_request', {
            chatId,
            userId,
            message: 'طلب دعم جديد'
          });
        }
      }

      console.log(`✅ [sendNewChatNotification] Notification sent successfully for chat: ${chatId}`);
      return true;
      
    } catch (error) {
      console.error('❌ [sendNewChatNotification] Error:', error);
      return false;
    }
  }
}

export default new NotificationService();

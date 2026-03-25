// server/src/services/notificationService.js
import { pool } from '../config/database.js';
import { getIO } from '../config/socket.js';

class NotificationService {
  
  /**
   * إنشاء إشعار جديد - متوافق مع هيكل قاعدة البيانات
   * @param {string} userId - معرف المستخدم
   * @param {Object} data - بيانات الإشعار
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async create(userId, data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // ✅ استخدام الأعمدة الموجودة فقط في قاعدة البيانات
      const notificationResult = await client.query(
        `INSERT INTO app.notifications (
          user_id, title, message, type, 
          data, action_url, is_read, read_at, is_deleted, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *`,
        [
          userId,
          data.title || 'إشعار جديد',
          data.message,
          data.type || 'system',
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
        const result = await client.query(
          `INSERT INTO app.notifications (
            user_id, title, message, type, 
            data, action_url, is_read, read_at, is_deleted, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING *`,
          [
            userId,
            data.title || 'إشعار جديد',
            data.message,
            data.type || 'system',
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
   * @param {string} notificationId - معرف الإشعار (id في قاعدة البيانات)
   * @returns {Promise<Object>} الإشعار المحدث
   */
  async markAsRead(userId, notificationId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2
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
         SET is_read = true, read_at = NOW()
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
   * @param {string} notificationId - معرف الإشعار (id في قاعدة البيانات)
   * @returns {Promise<Object>} الإشعار المحذوف
   */
  async deleteNotification(userId, notificationId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_deleted = true, deleted_at = NOW()
         WHERE id = $1 AND user_id = $2
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
         SET is_deleted = true, deleted_at = NOW()
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

  // ============================================
  // ✅ دوال إشعارات الدعم والترقية مع منع التكرار
  // ============================================

  /**
   * ✅ التحقق من وجود إشعار دعم غير مقروء لنفس المستخدم
   * @param {string} adminId - معرف المسؤول
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Object|null>} الإشعار الموجود أو null
   */
  async checkExistingSupportNotification(adminId, userId) {
    try {
      const result = await pool.query(
        `SELECT id, message, created_at, data
         FROM app.notifications 
         WHERE user_id = $1 
           AND type = 'support_message' 
           AND is_read = false
           AND is_deleted = false
           AND data->>'userId' = $2
         ORDER BY created_at DESC 
         LIMIT 1`,
        [adminId, userId.toString()]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error checking existing support notification:', error);
      return null;
    }
  }

  /**
   * ✅ تحديث إشعار دعم موجود (بدلاً من إنشاء جديد)
   * @param {string} notificationId - معرف الإشعار
   * @param {string} newMessage - الرسالة الجديدة
   * @param {string} userName - اسم المستخدم
   * @returns {Promise<Object>} الإشعار المحدث
   */
  async updateSupportNotification(notificationId, newMessage, userName) {
    try {
      const result = await pool.query(
        `UPDATE app.notifications 
         SET message = $1, 
             created_at = NOW(),
             data = jsonb_set(data, '{message}', to_jsonb($2)),
             title = $3
         WHERE id = $4
         RETURNING *`,
        [
          `${userName || 'مستخدم'} أرسل رسالة جديدة: "${newMessage.substring(0, 50)}${newMessage.length > 50 ? '...' : ''}"`,
          newMessage,
          `رسالة جديدة من ${userName || 'مستخدم'}`,
          notificationId
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating support notification:', error);
      throw error;
    }
  }

  /**
   * ✅ إنشاء أو تحديث إشعار للمسؤول عند استلام رسالة دعم جديدة (إشعار واحد لكل مستخدم)
   * @param {string} adminId - معرف المسؤول
   * @param {string} userId - معرف المستخدم
   * @param {string} ticketId - معرف التذكرة
   * @param {string} message - نص الرسالة
   * @param {string} userName - اسم المستخدم
   * @returns {Promise<Object>} الإشعار المنشأ أو المحدث
   */
  async createOrUpdateAdminMessageNotification(adminId, userId, ticketId, message, userName) {
    try {
      // التحقق من وجود إشعار غير مقروء لنفس المستخدم
      const existingNotification = await this.checkExistingSupportNotification(adminId, userId);
      
      if (existingNotification) {
        // تحديث الإشعار الموجود
        console.log(`📝 Updating existing notification for admin ${adminId} from user ${userId}`);
        const updatedNotification = await this.updateSupportNotification(
          existingNotification.id,
          message,
          userName
        );
        
        // إرسال تحديث عبر WebSocket
        const io = getIO();
        if (io) {
          io.to(`user-${adminId}`).emit('notification_updated', {
            notification: updatedNotification
          });
        }
        
        return updatedNotification;
      }
      
      // إنشاء إشعار جديد
      console.log(`🆕 Creating new notification for admin ${adminId} from user ${userId}`);
      const adminUrl = `/admin/support/tickets/${ticketId}`;
      
      const notification = await this.create(adminId, {
        title: `رسالة جديدة من ${userName || 'مستخدم'}`,
        message: `${userName || 'مستخدم'} أرسل رسالة جديدة: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        type: 'support_message',
        priority: 'high',
        data: { 
          ticketId, 
          userId, 
          type: 'admin_notification',
          message: message.substring(0, 100),
          userName: userName || 'مستخدم'
        },
        actionUrl: adminUrl
      });
      
      return notification;
    } catch (error) {
      console.error('❌ Error creating/updating admin message notification:', error);
      throw error;
    }
  }

  /**
   * ✅ إنشاء إشعار للمسؤول عند إنشاء تذكرة دعم جديدة (مع منع التكرار)
   * @param {string} adminId - معرف المسؤول
   * @param {string} userId - معرف المستخدم
   * @param {string} ticketId - معرف التذكرة
   * @param {string} userName - اسم المستخدم
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async createOrUpdateAdminTicketNotification(adminId, userId, ticketId, userName) {
    try {
      // التحقق من وجود إشعار غير مقروء لنفس المستخدم
      const existingNotification = await pool.query(
        `SELECT id FROM app.notifications 
         WHERE user_id = $1 
           AND type = 'support_ticket' 
           AND is_read = false
           AND is_deleted = false
           AND data->>'userId' = $2
         ORDER BY created_at DESC 
         LIMIT 1`,
        [adminId, userId.toString()]
      );
      
      if (existingNotification.rows.length > 0) {
        // يوجد إشعار بالفعل، لا داعي لإنشاء جديد
        console.log(`⏭️ Skipping duplicate ticket notification for admin ${adminId}, user ${userId}`);
        return existingNotification.rows[0];
      }
      
      const adminUrl = `/admin/support/tickets/${ticketId}`;
      
      const notification = await this.create(adminId, {
        title: '🆕 تذكرة دعم جديدة',
        message: `${userName || 'مستخدم'} أنشأ تذكرة دعم جديدة`,
        type: 'support_ticket',
        priority: 'high',
        data: { 
          ticketId, 
          userId, 
          type: 'admin_notification' 
        },
        actionUrl: adminUrl
      });
      
      return notification;
    } catch (error) {
      console.error('❌ Error creating admin ticket notification:', error);
      throw error;
    }
  }

  /**
   * ✅ إنشاء أو تحديث إشعار للمستخدم عند رد المسؤول (إشعار واحد لكل تذكرة)
   * @param {string} userId - معرف المستخدم
   * @param {string} ticketId - معرف التذكرة
   * @param {string} message - نص الرسالة
   * @param {string} adminName - اسم المسؤول
   * @returns {Promise<Object>} الإشعار المنشأ أو المحدث
   */
  async createOrUpdateAdminReplyNotification(userId, ticketId, message, adminName) {
    try {
      // التحقق من وجود إشعار غير مقروء لنفس التذكرة
      const existingNotification = await pool.query(
        `SELECT id FROM app.notifications 
         WHERE user_id = $1 
           AND type = 'support_reply' 
           AND is_read = false
           AND is_deleted = false
           AND data->>'ticketId' = $2
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId, ticketId.toString()]
      );
      
      if (existingNotification.rows.length > 0) {
        // تحديث الإشعار الموجود
        console.log(`📝 Updating existing reply notification for user ${userId}, ticket ${ticketId}`);
        
        const result = await pool.query(
          `UPDATE app.notifications 
           SET message = $1, 
               created_at = NOW(),
               data = jsonb_set(data, '{message}', to_jsonb($2))
           WHERE id = $3
           RETURNING *`,
          [
            `${adminName || 'الدعم الفني'} رد على رسالتك: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
            message,
            existingNotification.rows[0].id
          ]
        );
        
        return result.rows[0];
      }
      
      const chatUrl = `/support-chat/${ticketId}`;
      
      const notification = await this.create(userId, {
        title: 'رد من الدعم الفني',
        message: `${adminName || 'الدعم الفني'} رد على رسالتك: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        type: 'support_reply',
        priority: 'high',
        data: { 
          ticketId, 
          type: 'support_reply', 
          message: message.substring(0, 100),
          adminName
        },
        actionUrl: chatUrl
      });
      
      return notification;
    } catch (error) {
      console.error('❌ Error creating/updating admin reply notification:', error);
      throw error;
    }
  }

  /**
   * ✅ إنشاء أو تحديث إشعار للمستخدم عند إرسال رسالة (تأكيد) - إشعار واحد لكل تذكرة
   * @param {string} userId - معرف المستخدم
   * @param {string} ticketId - معرف التذكرة
   * @param {string} message - نص الرسالة
   * @returns {Promise<Object>} الإشعار المنشأ أو المحدث
   */
  async createOrUpdateUserMessageNotification(userId, ticketId, message) {
    try {
      // التحقق من وجود إشعار غير مقروء لنفس التذكرة للمستخدم
      const existingNotification = await pool.query(
        `SELECT id FROM app.notifications 
         WHERE user_id = $1 
           AND type = 'message_sent' 
           AND is_read = false
           AND is_deleted = false
           AND data->>'ticketId' = $2
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId, ticketId.toString()]
      );
      
      if (existingNotification.rows.length > 0) {
        // تحديث الإشعار الموجود
        const result = await pool.query(
          `UPDATE app.notifications 
           SET message = $1, 
               created_at = NOW(),
               data = jsonb_set(data, '{message}', to_jsonb($2))
           WHERE id = $3
           RETURNING *`,
          [
            `تم إرسال رسالتك إلى فريق الدعم: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
            message,
            existingNotification.rows[0].id
          ]
        );
        
        return result.rows[0];
      }
      
      const chatUrl = `/support-chat/${ticketId}`;
      
      const notification = await this.create(userId, {
        title: 'تم إرسال رسالتك بنجاح',
        message: `تم إرسال رسالتك إلى فريق الدعم: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        type: 'message_sent',
        priority: 'normal',
        data: { 
          ticketId, 
          type: 'message_sent', 
          message: message.substring(0, 100) 
        },
        actionUrl: chatUrl
      });
      
      return notification;
    } catch (error) {
      console.error('❌ Error creating/updating user message notification:', error);
      throw error;
    }
  }

  /**
   * ✅ الحصول على إشعارات المسؤول المجمعة (إشعار واحد لكل مستخدم)
   * @param {string} adminId - معرف المسؤول
   * @param {number} page - رقم الصفحة
   * @param {number} limit - عدد العناصر
   * @returns {Promise<Object>} الإشعارات المجمعة
   */
  async getGroupedAdminNotifications(adminId, page = 1, limit = 20) {
    try {
      // جلب الإشعارات المجمعة حسب المستخدم
      const query = `
        SELECT 
          MAX(id) as id,
          (data->>'userId')::int as user_id,
          MAX(title) as title,
          MAX(message) as message,
          'support_message' as type,
          bool_or(is_read) as is_read,
          MAX(created_at) as created_at,
          MAX(action_url) as action_url,
          jsonb_build_object(
            'userId', (data->>'userId')::int,
            'userName', MAX(data->>'userName'),
            'lastMessage', MAX(data->>'message'),
            'messageCount', COUNT(*),
            'ticketId', MAX(data->>'ticketId')
          ) as data
        FROM app.notifications 
        WHERE user_id = $1
          AND type = 'support_message'
          AND is_deleted = false
        GROUP BY data->>'userId'
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const offset = (page - 1) * limit;
      const result = await pool.query(query, [adminId, limit, offset]);
      
      // جلب العدد الإجمالي للمستخدمين الذين لديهم إشعارات
      const countResult = await pool.query(`
        SELECT COUNT(DISTINCT data->>'userId') as count
        FROM app.notifications 
        WHERE user_id = $1
          AND type = 'support_message'
          AND is_deleted = false
      `, [adminId]);
      
      const total = parseInt(countResult.rows[0].count);
      
      return {
        notifications: result.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        },
        unreadCount: await this.getUnreadCount(null, adminId)
      };
    } catch (error) {
      console.error('❌ Error getting grouped admin notifications:', error);
      throw error;
    }
  }

  /**
   * ✅ إرسال إشعار بمحادثة دعم جديدة
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

      // 2️⃣ إذا كان هناك موظف دعم، أرسل له إشعاراً أيضاً (باستخدام الدالة الجديدة)
      if (supportId) {
        const userResult = await pool.query(
          'SELECT full_name, email FROM app.users WHERE id = $1',
          [userId]
        );
        
        const userName = userResult.rows[0]?.full_name || 'مستخدم جديد';
        
        await this.createOrUpdateAdminTicketNotification(supportId, userId, chatId, userName);
      }

      console.log(`✅ [sendNewChatNotification] Notification sent successfully for chat: ${chatId}`);
      return true;
      
    } catch (error) {
      console.error('❌ [sendNewChatNotification] Error:', error);
      return false;
    }
  }

  /**
   * ✅ إنشاء إشعار حجز
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
   * ✅ إنشاء إشعار دفع
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
   * ✅ إنشاء إشعار محادثة
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
   * ✅ إنشاء إشعار للمستخدم عند الرد على طلب الترقية
   * @param {string} userId - معرف المستخدم
   * @param {string} requestId - معرف طلب الترقية
   * @param {string} message - نص الرسالة
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async createUpgradeNotification(userId, requestId, message) {
    try {
      const upgradeUrl = `/upgrade-status?requestId=${requestId}`;
      
      const notification = await this.create(userId, {
        title: 'طلب استكمال بيانات الترقية',
        message: message,
        type: 'upgrade_incomplete',
        priority: 'high',
        data: { 
          requestId, 
          type: 'upgrade_notification', 
          requiresAction: true,
          message: message
        },
        actionUrl: upgradeUrl
      });
      
      return notification;
    } catch (error) {
      console.error('❌ Error creating upgrade notification:', error);
      throw error;
    }
  }
}

export default new NotificationService();

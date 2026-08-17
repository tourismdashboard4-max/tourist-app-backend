// server/src/services/notificationService.js
import { pool } from '../config/database.js';
import { getIO } from '../config/socket.js';

class NotificationService {
  
  // ============================================
  // ✅ دالة مساعدة للحصول على المعرف الرقمي من أي معرف (UUID أو رقم)
  // ============================================
  async _getNumericUserId(userId) {
    if (!userId) return null;
    // إذا كان رقمياً، نعيده كما هو
    if (!isNaN(Number(userId))) return Number(userId);
    // وإلا فهو UUID، نستعلم عن old_id
    try {
      const result = await pool.query(
        `SELECT old_id FROM app.users WHERE id = $1`,
        [userId]
      );
      if (result.rows.length > 0 && result.rows[0].old_id) {
        return Number(result.rows[0].old_id);
      }
      // محاولة تحويله إلى رقم مباشر (احتياطي)
      const numeric = parseInt(userId);
      if (!isNaN(numeric)) return numeric;
      return null;
    } catch (error) {
      console.error('❌ Error in _getNumericUserId:', error);
      return null;
    }
  }

  /**
   * إنشاء إشعار جديد - متوافق مع هيكل قاعدة البيانات
   * @param {string|number} userId - معرف المستخدم (يمكن أن يكون UUID أو رقمياً)
   * @param {Object} data - بيانات الإشعار
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async create(userId, data) {
    // تحويل userId إلى رقمي إن أمكن
    const numericUserId = await this._getNumericUserId(userId);
    if (!numericUserId) {
      console.error(`❌ Cannot determine numeric user ID for: ${userId}`);
      throw new Error(`Invalid user ID: ${userId}`);
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const notificationResult = await client.query(
        `INSERT INTO app.notifications (
          user_id, title, message, type, 
          data, action_url, is_read, read_at, is_deleted, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *`,
        [
          numericUserId,
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
      const unreadCount = await this.getUnreadCount(client, numericUserId);

      await client.query('COMMIT');

      // إرسال الإشعار عبر WebSocket
      const io = getIO();
      if (io) {
        io.to(`user-${numericUserId}`).emit('new_notification', {
          notification,
          unreadCount
        });

        if (data.priority === 'high' || data.priority === 'urgent') {
          io.to(`user-${numericUserId}`).emit('urgent_notification', notification);
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
      const numericUserIds = [];

      // تحويل جميع المعرفات إلى أرقام
      for (const uid of userIds) {
        const numericId = await this._getNumericUserId(uid);
        if (numericId) numericUserIds.push(numericId);
      }

      if (numericUserIds.length === 0) {
        console.warn('⚠️ No valid numeric user IDs found in createBulk');
        return [];
      }

      for (const numericUserId of numericUserIds) {
        const result = await client.query(
          `INSERT INTO app.notifications (
            user_id, title, message, type, 
            data, action_url, is_read, read_at, is_deleted, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING *`,
          [
            numericUserId,
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
        numericUserIds.forEach(async (numericUserId) => {
          const unreadCount = await this.getUnreadCount(null, numericUserId);
          io.to(`user-${numericUserId}`).emit('new_notification', {
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
      // تحويل userId إلى رقمي
      const numericUserId = await this._getNumericUserId(userId);
      if (!numericUserId) {
        return { notifications: [], pagination: { totalItems: 0 }, unreadCount: 0 };
      }

      let query = 'SELECT * FROM app.notifications WHERE user_id = $1 AND is_deleted = false';
      const queryParams = [numericUserId];
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
      const unreadCount = await this.getUnreadCount(null, numericUserId);

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
   * @param {string|number} userId - معرف المستخدم
   * @returns {Promise<number>} عدد الإشعارات غير المقروءة
   */
  async getUnreadCount(client, userId) {
    try {
      const numericUserId = await this._getNumericUserId(userId);
      if (!numericUserId) return 0;

      const query = 'SELECT COUNT(*) FROM app.notifications WHERE user_id = $1 AND is_read = false AND is_deleted = false';
      const values = [numericUserId];

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
   * @param {string|number} userId - معرف المستخدم
   * @param {string} notificationId - معرف الإشعار (id في قاعدة البيانات)
   * @returns {Promise<Object>} الإشعار المحدث
   */
  async markAsRead(userId, notificationId) {
    const numericUserId = await this._getNumericUserId(userId);
    if (!numericUserId) return null;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, numericUserId]
      );

      if (result.rows.length > 0) {
        const unreadCount = await this.getUnreadCount(client, numericUserId);
        
        await client.query('COMMIT');

        const io = getIO();
        if (io) {
          io.to(`user-${numericUserId}`).emit('notification_read', {
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
   * @param {string|number} userId - معرف المستخدم
   * @returns {Promise<Object>} نتيجة التحديث
   */
  async markAllAsRead(userId) {
    const numericUserId = await this._getNumericUserId(userId);
    if (!numericUserId) return { rowCount: 0 };

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_read = true, read_at = NOW()
         WHERE user_id = $1 AND is_read = false AND is_deleted = false`,
        [numericUserId]
      );

      await client.query('COMMIT');

      const io = getIO();
      if (io) {
        io.to(`user-${numericUserId}`).emit('all_notifications_read', {
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
   * @param {string|number} userId - معرف المستخدم
   * @param {string} notificationId - معرف الإشعار (id في قاعدة البيانات)
   * @returns {Promise<Object>} الإشعار المحذوف
   */
  async deleteNotification(userId, notificationId) {
    const numericUserId = await this._getNumericUserId(userId);
    if (!numericUserId) return null;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_deleted = true, deleted_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, numericUserId]
      );

      if (result.rows.length > 0) {
        const unreadCount = await this.getUnreadCount(client, numericUserId);
        
        await client.query('COMMIT');

        const io = getIO();
        if (io) {
          io.to(`user-${numericUserId}`).emit('notification_deleted', {
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
   * @param {string|number} userId - معرف المستخدم
   * @returns {Promise<Object>} نتيجة الحذف
   */
  async deleteAllNotifications(userId) {
    const numericUserId = await this._getNumericUserId(userId);
    if (!numericUserId) return { rowCount: 0 };

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE app.notifications 
         SET is_deleted = true, deleted_at = NOW()
         WHERE user_id = $1 AND is_deleted = false`,
        [numericUserId]
      );

      await client.query('COMMIT');

      const io = getIO();
      if (io) {
        io.to(`user-${numericUserId}`).emit('all_notifications_deleted', {
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
   * @param {string|number} adminId - معرف المسؤول
   * @param {string|number} userId - معرف المستخدم
   * @returns {Promise<Object|null>} الإشعار الموجود أو null
   */
  async checkExistingSupportNotification(adminId, userId) {
    try {
      const numericAdminId = await this._getNumericUserId(adminId);
      const numericUserId = await this._getNumericUserId(userId);
      if (!numericAdminId || !numericUserId) return null;

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
        [numericAdminId, numericUserId.toString()]
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
   * @param {string|number} adminId - معرف المسؤول
   * @param {string|number} userId - معرف المستخدم
   * @param {string} ticketId - معرف التذكرة
   * @param {string} message - نص الرسالة
   * @param {string} userName - اسم المستخدم
   * @returns {Promise<Object>} الإشعار المنشأ أو المحدث
   */
  async createOrUpdateAdminMessageNotification(adminId, userId, ticketId, message, userName) {
    try {
      const numericAdminId = await this._getNumericUserId(adminId);
      const numericUserId = await this._getNumericUserId(userId);
      if (!numericAdminId || !numericUserId) {
        console.warn('⚠️ Could not convert IDs to numeric in createOrUpdateAdminMessageNotification');
        return null;
      }

      // التحقق من وجود إشعار غير مقروء لنفس المستخدم
      const existingNotification = await this.checkExistingSupportNotification(numericAdminId, numericUserId);
      
      if (existingNotification) {
        // تحديث الإشعار الموجود
        console.log(`📝 Updating existing notification for admin ${numericAdminId} from user ${numericUserId}`);
        const updatedNotification = await this.updateSupportNotification(
          existingNotification.id,
          message,
          userName
        );
        
        // إرسال تحديث عبر WebSocket
        const io = getIO();
        if (io) {
          io.to(`user-${numericAdminId}`).emit('notification_updated', {
            notification: updatedNotification
          });
        }
        
        return updatedNotification;
      }
      
      // إنشاء إشعار جديد
      console.log(`🆕 Creating new notification for admin ${numericAdminId} from user ${numericUserId}`);
      const adminUrl = `/admin/support/tickets/${ticketId}`;
      
      const notification = await this.create(numericAdminId, {
        title: `رسالة جديدة من ${userName || 'مستخدم'}`,
        message: `${userName || 'مستخدم'} أرسل رسالة جديدة: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        type: 'support_message',
        priority: 'high',
        data: { 
          ticketId, 
          userId: numericUserId, 
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
   * @param {string|number} adminId - معرف المسؤول
   * @param {string|number} userId - معرف المستخدم
   * @param {string} ticketId - معرف التذكرة
   * @param {string} userName - اسم المستخدم
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async createOrUpdateAdminTicketNotification(adminId, userId, ticketId, userName) {
    try {
      const numericAdminId = await this._getNumericUserId(adminId);
      const numericUserId = await this._getNumericUserId(userId);
      if (!numericAdminId || !numericUserId) return null;

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
        [numericAdminId, numericUserId.toString()]
      );
      
      if (existingNotification.rows.length > 0) {
        // يوجد إشعار بالفعل، لا داعي لإنشاء جديد
        console.log(`⏭️ Skipping duplicate ticket notification for admin ${numericAdminId}, user ${numericUserId}`);
        return existingNotification.rows[0];
      }
      
      const adminUrl = `/admin/support/tickets/${ticketId}`;
      
      const notification = await this.create(numericAdminId, {
        title: '🆕 تذكرة دعم جديدة',
        message: `${userName || 'مستخدم'} أنشأ تذكرة دعم جديدة`,
        type: 'support_ticket',
        priority: 'high',
        data: { 
          ticketId, 
          userId: numericUserId, 
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
   * @param {string|number} userId - معرف المستخدم
   * @param {string} ticketId - معرف التذكرة
   * @param {string} message - نص الرسالة
   * @param {string} adminName - اسم المسؤول
   * @returns {Promise<Object>} الإشعار المنشأ أو المحدث
   */
  async createOrUpdateAdminReplyNotification(userId, ticketId, message, adminName) {
    try {
      const numericUserId = await this._getNumericUserId(userId);
      if (!numericUserId) return null;

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
        [numericUserId, ticketId.toString()]
      );
      
      if (existingNotification.rows.length > 0) {
        // تحديث الإشعار الموجود
        console.log(`📝 Updating existing reply notification for user ${numericUserId}, ticket ${ticketId}`);
        
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
      
      const notification = await this.create(numericUserId, {
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
   * @param {string|number} userId - معرف المستخدم
   * @param {string} ticketId - معرف التذكرة
   * @param {string} message - نص الرسالة
   * @returns {Promise<Object>} الإشعار المنشأ أو المحدث
   */
  async createOrUpdateUserMessageNotification(userId, ticketId, message) {
    try {
      const numericUserId = await this._getNumericUserId(userId);
      if (!numericUserId) return null;

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
        [numericUserId, ticketId.toString()]
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
      
      const notification = await this.create(numericUserId, {
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
   * @param {string|number} adminId - معرف المسؤول
   * @param {number} page - رقم الصفحة
   * @param {number} limit - عدد العناصر
   * @returns {Promise<Object>} الإشعارات المجمعة
   */
  async getGroupedAdminNotifications(adminId, page = 1, limit = 20) {
    try {
      const numericAdminId = await this._getNumericUserId(adminId);
      if (!numericAdminId) {
        return { notifications: [], pagination: { totalItems: 0 }, unreadCount: 0 };
      }

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
      const result = await pool.query(query, [numericAdminId, limit, offset]);
      
      // جلب العدد الإجمالي للمستخدمين الذين لديهم إشعارات
      const countResult = await pool.query(`
        SELECT COUNT(DISTINCT data->>'userId') as count
        FROM app.notifications 
        WHERE user_id = $1
          AND type = 'support_message'
          AND is_deleted = false
      `, [numericAdminId]);
      
      const total = parseInt(countResult.rows[0].count);
      
      return {
        notifications: result.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        },
        unreadCount: await this.getUnreadCount(null, numericAdminId)
      };
    } catch (error) {
      console.error('❌ Error getting grouped admin notifications:', error);
      throw error;
    }
  }

  /**
   * ✅ إرسال إشعار بمحادثة دعم جديدة
   * @param {string} chatId - معرف المحادثة
   * @param {string|number} userId - معرف المستخدم
   * @param {string|number} supportId - معرف موظف الدعم (اختياري)
   * @param {string} message - نص الرسالة
   * @returns {Promise<boolean>} نجاح أو فشل
   */
  async sendNewChatNotification(chatId, userId, supportId, message) {
    try {
      console.log(`📨 [sendNewChatNotification] Sending notification for chat: ${chatId}`);
      
      const numericUserId = await this._getNumericUserId(userId);
      if (!numericUserId) {
        console.error('❌ Invalid user ID in sendNewChatNotification');
        return false;
      }

      // 1️⃣ إشعار للمستخدم
      await this.create(numericUserId, {
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
        const numericSupportId = await this._getNumericUserId(supportId);
        if (numericSupportId) {
          const userResult = await pool.query(
            'SELECT full_name, email FROM app.users WHERE id = $1',
            [numericUserId]
          );
          
          const userName = userResult.rows[0]?.full_name || 'مستخدم جديد';
          
          await this.createOrUpdateAdminTicketNotification(numericSupportId, numericUserId, chatId, userName);
        }
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
   * @param {string|number} userId - معرف المستخدم
   * @param {Object} bookingData - بيانات الحجز
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async createBookingNotification(userId, bookingData) {
    const numericUserId = await this._getNumericUserId(userId);
    if (!numericUserId) return null;

    return this.create(numericUserId, {
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
   * @param {string|number} userId - معرف المستخدم
   * @param {Object} paymentData - بيانات الدفع
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async createPaymentNotification(userId, paymentData) {
    const numericUserId = await this._getNumericUserId(userId);
    if (!numericUserId) return null;

    return this.create(numericUserId, {
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
   * @param {string|number} userId - معرف المستخدم
   * @param {Object} chatData - بيانات المحادثة
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async createChatNotification(userId, chatData) {
    const numericUserId = await this._getNumericUserId(userId);
    if (!numericUserId) return null;

    return this.create(numericUserId, {
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
   * @param {string|number} userId - معرف المستخدم
   * @param {string} requestId - معرف طلب الترقية
   * @param {string} message - نص الرسالة
   * @returns {Promise<Object>} الإشعار المنشأ
   */
  async createUpgradeNotification(userId, requestId, message) {
    try {
      const numericUserId = await this._getNumericUserId(userId);
      if (!numericUserId) return null;

      const upgradeUrl = `/upgrade-status?requestId=${requestId}`;
      
      const notification = await this.create(numericUserId, {
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

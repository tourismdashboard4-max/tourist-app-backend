// server/src/services/messageService.js
import { pool } from '../config/database.js';
import * as SocketService from './socketService.js';
import * as NotificationService from './notificationService.js';

class MessageService {
  
  /**
   * إنشاء رسالة نصية
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createTextMessage(messageData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { chatId, senderId, content, replyTo } = messageData;

      // التحقق من صحة البيانات
      if (!content || content.trim() === '') {
        throw new Error('محتوى الرسالة مطلوب');
      }

      // إنشاء معرف فريد للرسالة
      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // التحقق من وجود الرد إذا وجد
      let replyToId = null;
      if (replyTo) {
        const replyResult = await client.query(
          'SELECT id FROM app.messages WHERE message_id = $1',
          [replyTo]
        );
        if (replyResult.rows.length > 0) {
          replyToId = replyResult.rows[0].id;
        }
      }

      // إنشاء الرسالة
      const messageResult = await client.query(
        `INSERT INTO app.messages (
          message_id, chat_id, sender_id, type, content,
          reply_to_id, status, read_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id`,
        [
          messageId,
          chatId,
          senderId,
          'text',
          content.trim(),
          replyToId,
          'sent',
          JSON.stringify([{ userId: parseInt(senderId), readAt: new Date() }])
        ]
      );

      const newMessageId = messageResult.rows[0].id;

      // تحديث المحادثة
      await client.query(
        `UPDATE app.chats 
         SET last_message_id = $1,
             last_message_at = NOW(),
             stats = jsonb_set(
               COALESCE(stats, '{}'::jsonb),
               '{totalMessages}',
               COALESCE(stats->'totalMessages', '0')::int + 1
             ),
             updated_at = NOW()
         WHERE chat_id = $2`,
        [newMessageId, chatId]
      );

      await client.query('COMMIT');

      // تجهيز البيانات للإرسال
      const populatedMessage = await this.populateMessageData(newMessageId);

      // إرسال عبر WebSocket
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating text message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * إنشاء رسالة صورة
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createImageMessage(messageData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { chatId, senderId, images, replyTo } = messageData;

      if (!images || images.length === 0) {
        throw new Error('الصور مطلوبة');
      }

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // التحقق من وجود الرد إذا وجد
      let replyToId = null;
      if (replyTo) {
        const replyResult = await client.query(
          'SELECT id FROM app.messages WHERE message_id = $1',
          [replyTo]
        );
        if (replyResult.rows.length > 0) {
          replyToId = replyResult.rows[0].id;
        }
      }

      // إنشاء الرسالة
      const messageResult = await client.query(
        `INSERT INTO app.messages (
          message_id, chat_id, sender_id, type, attachments,
          reply_to_id, status, read_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id`,
        [
          messageId,
          chatId,
          senderId,
          'image',
          JSON.stringify(images.map(img => ({
            url: img.url,
            type: 'image',
            name: img.name || 'image.jpg',
            size: img.size || 0
          }))),
          replyToId,
          'sent',
          JSON.stringify([{ userId: parseInt(senderId), readAt: new Date() }])
        ]
      );

      const newMessageId = messageResult.rows[0].id;

      // تحديث المحادثة
      await client.query(
        `UPDATE app.chats 
         SET last_message_id = $1,
             last_message_at = NOW(),
             stats = jsonb_set(
               COALESCE(stats, '{}'::jsonb),
               '{totalMessages}',
               COALESCE(stats->'totalMessages', '0')::int + 1
             ),
             updated_at = NOW()
         WHERE chat_id = $2`,
        [newMessageId, chatId]
      );

      await client.query('COMMIT');

      const populatedMessage = await this.populateMessageData(newMessageId);
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating image message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * إنشاء رسالة ملف
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createFileMessage(messageData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { chatId, senderId, files, replyTo } = messageData;

      if (!files || files.length === 0) {
        throw new Error('الملفات مطلوبة');
      }

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // التحقق من وجود الرد إذا وجد
      let replyToId = null;
      if (replyTo) {
        const replyResult = await client.query(
          'SELECT id FROM app.messages WHERE message_id = $1',
          [replyTo]
        );
        if (replyResult.rows.length > 0) {
          replyToId = replyResult.rows[0].id;
        }
      }

      // إنشاء الرسالة
      const messageResult = await client.query(
        `INSERT INTO app.messages (
          message_id, chat_id, sender_id, type, attachments,
          reply_to_id, status, read_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id`,
        [
          messageId,
          chatId,
          senderId,
          'file',
          JSON.stringify(files.map(file => ({
            url: file.url,
            type: file.mimeType || 'application/octet-stream',
            name: file.name,
            size: file.size
          }))),
          replyToId,
          'sent',
          JSON.stringify([{ userId: parseInt(senderId), readAt: new Date() }])
        ]
      );

      const newMessageId = messageResult.rows[0].id;

      // تحديث المحادثة
      await client.query(
        `UPDATE app.chats 
         SET last_message_id = $1,
             last_message_at = NOW(),
             stats = jsonb_set(
               COALESCE(stats, '{}'::jsonb),
               '{totalMessages}',
               COALESCE(stats->'totalMessages', '0')::int + 1
             ),
             updated_at = NOW()
         WHERE chat_id = $2`,
        [newMessageId, chatId]
      );

      await client.query('COMMIT');

      const populatedMessage = await this.populateMessageData(newMessageId);
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating file message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * إنشاء رسالة موقع
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createLocationMessage(messageData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { chatId, senderId, location, replyTo } = messageData;

      if (!location || !location.lat || !location.lng) {
        throw new Error('بيانات الموقع غير كاملة');
      }

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // التحقق من وجود الرد إذا وجد
      let replyToId = null;
      if (replyTo) {
        const replyResult = await client.query(
          'SELECT id FROM app.messages WHERE message_id = $1',
          [replyTo]
        );
        if (replyResult.rows.length > 0) {
          replyToId = replyResult.rows[0].id;
        }
      }

      // إنشاء الرسالة
      const messageResult = await client.query(
        `INSERT INTO app.messages (
          message_id, chat_id, sender_id, type, location,
          reply_to_id, status, read_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id`,
        [
          messageId,
          chatId,
          senderId,
          'location',
          JSON.stringify({
            lat: location.lat,
            lng: location.lng,
            address: location.address || ''
          }),
          replyToId,
          'sent',
          JSON.stringify([{ userId: parseInt(senderId), readAt: new Date() }])
        ]
      );

      const newMessageId = messageResult.rows[0].id;

      // تحديث المحادثة
      await client.query(
        `UPDATE app.chats 
         SET last_message_id = $1,
             last_message_at = NOW(),
             stats = jsonb_set(
               COALESCE(stats, '{}'::jsonb),
               '{totalMessages}',
               COALESCE(stats->'totalMessages', '0')::int + 1
             ),
             updated_at = NOW()
         WHERE chat_id = $2`,
        [newMessageId, chatId]
      );

      await client.query('COMMIT');

      const populatedMessage = await this.populateMessageData(newMessageId);
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating location message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * إنشاء رسالة صوتية
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createVoiceMessage(messageData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { chatId, senderId, audioUrl, duration, replyTo } = messageData;

      if (!audioUrl) {
        throw new Error('الملف الصوتي مطلوب');
      }

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // التحقق من وجود الرد إذا وجد
      let replyToId = null;
      if (replyTo) {
        const replyResult = await client.query(
          'SELECT id FROM app.messages WHERE message_id = $1',
          [replyTo]
        );
        if (replyResult.rows.length > 0) {
          replyToId = replyResult.rows[0].id;
        }
      }

      // إنشاء الرسالة
      const messageResult = await client.query(
        `INSERT INTO app.messages (
          message_id, chat_id, sender_id, type, attachments,
          reply_to_id, status, read_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id`,
        [
          messageId,
          chatId,
          senderId,
          'voice',
          JSON.stringify([{
            url: audioUrl,
            type: 'audio/webm',
            name: 'voice-message.webm',
            size: 0,
            duration: duration || 0
          }]),
          replyToId,
          'sent',
          JSON.stringify([{ userId: parseInt(senderId), readAt: new Date() }])
        ]
      );

      const newMessageId = messageResult.rows[0].id;

      // تحديث المحادثة
      await client.query(
        `UPDATE app.chats 
         SET last_message_id = $1,
             last_message_at = NOW(),
             stats = jsonb_set(
               COALESCE(stats, '{}'::jsonb),
               '{totalMessages}',
               COALESCE(stats->'totalMessages', '0')::int + 1
             ),
             updated_at = NOW()
         WHERE chat_id = $2`,
        [newMessageId, chatId]
      );

      await client.query('COMMIT');

      const populatedMessage = await this.populateMessageData(newMessageId);
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating voice message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * إنشاء رسالة نظام
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createSystemMessage(messageData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { chatId, systemType, targetUser } = messageData;

      const messageId = `SYS-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // إنشاء الرسالة
      const messageResult = await client.query(
        `INSERT INTO app.messages (
          message_id, chat_id, type, system_message, status,
          read_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id`,
        [
          messageId,
          chatId,
          'system',
          JSON.stringify({
            type: systemType,
            targetUser
          }),
          'sent',
          JSON.stringify([])
        ]
      );

      const newMessageId = messageResult.rows[0].id;

      // تحديث المحادثة
      await client.query(
        `UPDATE app.chats 
         SET last_message_id = $1,
             last_message_at = NOW(),
             stats = jsonb_set(
               COALESCE(stats, '{}'::jsonb),
               '{totalMessages}',
               COALESCE(stats->'totalMessages', '0')::int + 1
             ),
             updated_at = NOW()
         WHERE chat_id = $2`,
        [newMessageId, chatId]
      );

      await client.query('COMMIT');

      const populatedMessage = await this.populateMessageData(newMessageId);
      await this.broadcastNewMessage(chatId, populatedMessage, null);

      return populatedMessage;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating system message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * تجهيز بيانات الرسالة
   * @param {string} messageId - معرف الرسالة (id في قاعدة البيانات)
   * @returns {Promise<Object>} الرسالة مع البيانات الكاملة
   */
  async populateMessageData(messageId) {
    const result = await pool.query(
      `SELECT m.*,
              json_build_object(
                'id', s.id,
                'fullName', s.full_name,
                'email', s.email,
                'avatar', s.avatar,
                'type', s.type
              ) as sender,
              json_build_object(
                'id', rm.id,
                'message_id', rm.message_id,
                'content', rm.content,
                'sender_id', rm.sender_id,
                'sender', json_build_object(
                  'id', rms.id,
                  'fullName', rms.full_name,
                  'email', rms.email,
                  'avatar', rms.avatar
                )
              ) as reply_to,
              (
                SELECT json_agg(json_build_object(
                  'userId', rb.user_id,
                  'user', json_build_object(
                    'id', ru.id,
                    'fullName', ru.full_name,
                    'email', ru.email,
                    'avatar', ru.avatar
                  ),
                  'readAt', rb.read_at
                ))
                FROM jsonb_to_recordset(m.read_by) as rb(user_id int, read_at timestamp)
                LEFT JOIN app.users ru ON ru.id = rb.user_id
              ) as read_by_users,
              (
                SELECT json_agg(json_build_object(
                  'userId', re.user_id,
                  'user', json_build_object(
                    'id', reu.id,
                    'fullName', reu.full_name,
                    'email', reu.email,
                    'avatar', reu.avatar
                  ),
                  'emoji', re.emoji,
                  'createdAt', re.created_at
                ))
                FROM jsonb_to_recordset(m.reactions) as re(user_id int, emoji text, created_at timestamp)
                LEFT JOIN app.users reu ON reu.id = re.user_id
              ) as reactions_with_users
       FROM app.messages m
       JOIN app.users s ON s.id = m.sender_id
       LEFT JOIN app.messages rm ON rm.id = m.reply_to_id
       LEFT JOIN app.users rms ON rms.id = rm.sender_id
       WHERE m.id = $1`,
      [messageId]
    );

    const message = result.rows[0];
    
    // تنسيق البيانات
    if (message) {
      message.readBy = message.read_by_users || [];
      message.reactions = message.reactions_with_users || [];
      delete message.read_by_users;
      delete message.reactions_with_users;
    }

    return message;
  }

  /**
   * بث رسالة جديدة
   * @param {string} chatId - معرف المحادثة
   * @param {Object} message - الرسالة
   * @param {string} senderId - معرف المرسل
   */
  async broadcastNewMessage(chatId, message, senderId) {
    // إرسال عبر WebSocket
    SocketService.emitToConversation(chatId, 'new-message', message);

    // الحصول على المحادثة مع المشاركين
    const chatResult = await pool.query(
      'SELECT participants FROM app.chats WHERE chat_id = $1',
      [chatId]
    );

    if (chatResult.rows.length === 0) return;

    const chat = chatResult.rows[0];
    const participants = chat.participants;

    // إرسال إشعارات للمشاركين
    for (const participantId of participants) {
      if (participantId !== parseInt(senderId)) {
        await NotificationService.sendNewMessageNotification(
          participantId,
          message,
          chat
        );
      }
    }
  }

  /**
   * تحديث حالة الرسالة
   * @param {string} messageId - معرف الرسالة
   * @param {string} status - الحالة الجديدة
   * @returns {Promise<Object>} الرسالة المحدثة
   */
  async updateMessageStatus(messageId, status) {
    try {
      const result = await pool.query(
        `UPDATE app.messages 
         SET status = $1, updated_at = NOW()
         WHERE message_id = $2
         RETURNING *`,
        [status, messageId]
      );

      if (result.rows.length === 0) {
        throw new Error('الرسالة غير موجودة');
      }

      const message = result.rows[0];

      // إرسال تحديث الحالة عبر WebSocket
      SocketService.emitToConversation(message.chat_id, 'message-status-update', {
        messageId,
        status
      });

      return message;
    } catch (error) {
      console.error('❌ Error updating message status:', error);
      throw error;
    }
  }

  /**
   * حذف رسالة
   * @param {string} messageId - معرف الرسالة
   * @param {string} userId - معرف المستخدم
   * @param {boolean} forEveryone - حذف للجميع
   * @returns {Promise<Object>} نتيجة الحذف
   */
  async deleteMessage(messageId, userId, forEveryone = false) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const messageResult = await client.query(
        'SELECT * FROM app.messages WHERE message_id = $1',
        [messageId]
      );

      if (messageResult.rows.length === 0) {
        throw new Error('الرسالة غير موجودة');
      }

      const message = messageResult.rows[0];

      if (forEveryone) {
        // التحقق من أن المستخدم هو المرسل
        if (message.sender_id !== parseInt(userId)) {
          throw new Error('يمكنك فقط حذف رسائلك الخاصة للجميع');
        }

        await client.query(
          `UPDATE app.messages 
           SET is_deleted = true,
               content = 'تم حذف هذه الرسالة',
               attachments = NULL,
               updated_at = NOW()
           WHERE message_id = $1`,
          [messageId]
        );

        SocketService.emitToConversation(message.chat_id, 'message-deleted', {
          messageId,
          forEveryone: true
        });
      } else {
        // حذف للمستخدم فقط
        const deletedFor = message.deleted_for || [];
        if (!deletedFor.includes(parseInt(userId))) {
          deletedFor.push(parseInt(userId));
        }

        await client.query(
          `UPDATE app.messages 
           SET deleted_for = $1, updated_at = NOW()
           WHERE message_id = $2`,
          [JSON.stringify(deletedFor), messageId]
        );

        SocketService.emitToConversation(message.chat_id, 'message-deleted', {
          messageId,
          userId,
          forEveryone: false
        });
      }

      await client.query('COMMIT');

      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error deleting message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * تعديل رسالة
   * @param {string} messageId - معرف الرسالة
   * @param {string} userId - معرف المستخدم
   * @param {string} newContent - المحتوى الجديد
   * @returns {Promise<Object>} الرسالة المعدلة
   */
  async editMessage(messageId, userId, newContent) {
    try {
      const messageResult = await pool.query(
        'SELECT * FROM app.messages WHERE message_id = $1',
        [messageId]
      );

      if (messageResult.rows.length === 0) {
        throw new Error('الرسالة غير موجودة');
      }

      const message = messageResult.rows[0];

      // التحقق من أن المستخدم هو المرسل
      if (message.sender_id !== parseInt(userId)) {
        throw new Error('يمكنك فقط تعديل رسائلك الخاصة');
      }

      // التحقق من أن الرسالة من نوع نص
      if (message.type !== 'text') {
        throw new Error('يمكن تعديل الرسائل النصية فقط');
      }

      const updatedResult = await pool.query(
        `UPDATE app.messages 
         SET content = $1,
             edited = true,
             edited_at = NOW(),
             updated_at = NOW()
         WHERE message_id = $2
         RETURNING *`,
        [newContent, messageId]
      );

      const updatedMessage = updatedResult.rows[0];

      // إرسال تحديث عبر WebSocket
      SocketService.emitToConversation(message.chat_id, 'message-edited', {
        messageId,
        newContent,
        editedAt: updatedMessage.edited_at
      });

      return updatedMessage;
    } catch (error) {
      console.error('❌ Error editing message:', error);
      throw error;
    }
  }

  /**
   * البحث في الرسائل
   * @param {string} chatId - معرف المحادثة
   * @param {string} query - كلمة البحث
   * @param {number} page - رقم الصفحة
   * @param {number} limit - عدد النتائج
   * @returns {Promise<Object>} نتائج البحث
   */
  async searchMessages(chatId, query, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;

      const messagesResult = await pool.query(
        `SELECT m.*,
                json_build_object(
                  'id', u.id,
                  'fullName', u.full_name,
                  'email', u.email,
                  'avatar', u.avatar
                ) as sender
         FROM app.messages m
         JOIN app.users u ON u.id = m.sender_id
         WHERE m.chat_id = $1 
           AND m.type = 'text' 
           AND m.content ILIKE $2
           AND m.is_deleted = false
         ORDER BY m.created_at DESC
         LIMIT $3 OFFSET $4`,
        [chatId, `%${query}%`, limit, offset]
      );

      const totalResult = await pool.query(
        `SELECT COUNT(*) 
         FROM app.messages 
         WHERE chat_id = $1 
           AND type = 'text' 
           AND content ILIKE $2
           AND is_deleted = false`,
        [chatId, `%${query}%`]
      );

      const total = parseInt(totalResult.rows[0].count);

      return {
        messages: messagesResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error searching messages:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الرسائل
   * @param {string} chatId - معرف المحادثة
   * @returns {Promise<Object>} إحصائيات الرسائل
   */
  async getMessageStats(chatId) {
    try {
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN type = 'text' THEN 1 END) as text_messages,
          COUNT(CASE WHEN type = 'image' THEN 1 END) as image_messages,
          COUNT(CASE WHEN type = 'file' THEN 1 END) as file_messages,
          COUNT(CASE WHEN type = 'voice' THEN 1 END) as voice_messages,
          COUNT(CASE WHEN type = 'location' THEN 1 END) as location_messages,
          COUNT(CASE WHEN type = 'system' THEN 1 END) as system_messages
         FROM app.messages
         WHERE chat_id = $1 AND is_deleted = false`,
        [chatId]
      );

      const stats = statsResult.rows[0];

      return {
        totalMessages: parseInt(stats.total_messages) || 0,
        textMessages: parseInt(stats.text_messages) || 0,
        imageMessages: parseInt(stats.image_messages) || 0,
        fileMessages: parseInt(stats.file_messages) || 0,
        voiceMessages: parseInt(stats.voice_messages) || 0,
        locationMessages: parseInt(stats.location_messages) || 0,
        systemMessages: parseInt(stats.system_messages) || 0
      };
    } catch (error) {
      console.error('❌ Error getting message stats:', error);
      throw error;
    }
  }
}

const messageService = new MessageService();
export default messageService;

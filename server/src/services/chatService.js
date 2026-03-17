// server/src/services/chatService.js
import { pool } from '../config/database.js';
import notificationService from './notificationService.js';
import * as SocketService from './socketService.js';
import { v4 as uuidv4 } from 'uuid';

class ChatService {
  
  /**
   * إنشاء محادثة جديدة
   * @param {Array} participants - قائمة المشاركين
   * @param {string} type - نوع المحادثة
   * @param {string} bookingId - معرف الحجز (اختياري)
   * @returns {Promise<Object>} المحادثة المنشأة
   */
  async createConversation(participants, type = 'direct', bookingId = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      if (type === 'direct') {
        const existingChat = await client.query(
          `SELECT * FROM app.chats 
           WHERE type = 'direct' 
           AND participants @> $1 
           AND array_length(participants, 1) = 2
           AND is_active = true
           LIMIT 1`,
          [participants]
        );

        if (existingChat.rows.length > 0) {
          await client.query('COMMIT');
          return existingChat.rows[0];
        }
      }

      const chatId = `CHAT-${Date.now()}-${uuidv4().slice(0, 8)}`;

      const chatResult = await client.query(
        `INSERT INTO app.chats (
          chat_id, participants, type, booking_id, settings, stats,
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *`,
        [
          chatId,
          participants,
          type,
          bookingId,
          JSON.stringify({ isMuted: false, isPinned: false }),
          JSON.stringify({ totalMessages: 0, unreadCount: 0 }),
          true
        ]
      );

      const chat = chatResult.rows[0];

      await client.query('COMMIT');

      for (const participantId of participants) {
        if (participantId) {
          await notificationService.create(participantId, {
            title: 'محادثة جديدة',
            message: 'تم إنشاء محادثة جديدة',
            type: 'chat',
            priority: 'medium',
            data: { chatId, type },
            actionUrl: `/chat/${chatId}`
          });
        }
      }

      return chat;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * إنشاء محادثة دعم
   * @param {string} userId - معرف المستخدم
   * @param {string} subject - موضوع المحادثة
   * @returns {Promise<Object>} المحادثة المنشأة
   */
  async createSupportChat(userId, subject = '') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const supportUserResult = await client.query(
        `SELECT id FROM app.users 
         WHERE email = 'y7g5mggnbr@privaterelay.appleid.com'`
      );
      
      let supportUserId;
      
      if (supportUserResult.rows.length === 0) {
        console.log('⚠️ حساب الدعم غير موجود، سيتم إنشاؤه تلقائياً');
        
        const newSupportUserResult = await client.query(
          `INSERT INTO app.users (
            full_name, email, password_hash, type, role, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id`,
          [
            'الدعم الفني',
            'y7g5mggnbr@privaterelay.appleid.com',
            '$2b$10$YourHashedPasswordHere',
            'admin',
            'support'
          ]
        );
        
        supportUserId = newSupportUserResult.rows[0].id;
        console.log('✅ تم إنشاء حساب الدعم تلقائياً');
      } else {
        supportUserId = supportUserResult.rows[0].id;
      }

      let chatResult = await client.query(
        `SELECT * FROM app.chats 
         WHERE participants @> $1 
         AND type = 'support' 
         AND is_active = true
         LIMIT 1`,
        [[userId, supportUserId]]
      );

      let chat;

      if (chatResult.rows.length === 0) {
        const chatId = `CHAT-SUPPORT-${Date.now()}-${uuidv4().slice(0, 6)}`;

        chatResult = await client.query(
          `INSERT INTO app.chats (
            chat_id, participants, type, is_active, settings, stats,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING *`,
          [
            chatId,
            [userId, supportUserId],
            'support',
            true,
            JSON.stringify({ isMuted: false, isPinned: false }),
            JSON.stringify({ totalMessages: 0, unreadCount: 0 })
          ]
        );

        chat = chatResult.rows[0];
        console.log(`✅ تم إنشاء محادثة دعم جديدة: ${chat.chat_id}`);

        const userResult = await client.query(
          'SELECT full_name, email FROM app.users WHERE id = $1',
          [userId]
        );
        
        const user = userResult.rows[0];
        
        await notificationService.sendNewChatNotification(
          chat.chat_id,
          userId,
          supportUserId,
          subject || 'طلب دعم جديد'
        );

        await notificationService.create(userId, {
          title: 'تم إنشاء محادثة الدعم',
          message: 'سيتم الرد عليك في أقرب وقت ممكن',
          type: 'chat',
          priority: 'high',
          data: { chatId: chat.chat_id },
          actionUrl: `/chat/${chat.chat_id}`
        });

      } else {
        chat = chatResult.rows[0];
      }

      await client.query('COMMIT');

      return chat;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating support chat:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * الحصول على محادثات المستخدم - نسخة مصححة
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Array>} قائمة المحادثات
   */
  async getUserConversations(userId) {
    try {
      // استعلام مبسط ومصحح
      const conversationsResult = await pool.query(
        `SELECT 
          c.*,
          (
            SELECT json_agg(
              json_build_object(
                'id', u.id,
                'fullName', u.full_name,
                'email', u.email,
                'avatar', u.avatar
              )
            )
            FROM app.users u
            WHERE u.id = ANY(c.participants)
          ) as participants_details,
          (
            SELECT row_to_json(message_row)
            FROM (
              SELECT 
                m.id,
                m.message_id,
                m.content,
                m.type,
                m.created_at,
                m.sender_id
              FROM app.messages m
              WHERE m.chat_id = c.chat_id
              ORDER BY m.created_at DESC
              LIMIT 1
            ) message_row
          ) as last_message
         FROM app.chats c
         WHERE $1::int = ANY(c.participants)
           AND c.is_active = true
         ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC`,
        [userId]
      );

      // تنسيق النتائج
      const formattedConversations = conversationsResult.rows.map(conv => {
        const participants = conv.participants_details || [];
        const otherParticipant = participants.find(p => p.id !== parseInt(userId));
        
        return {
          id: conv.chat_id,
          type: conv.type,
          name: conv.type === 'direct' 
            ? (otherParticipant?.fullName || 'محادثة') 
            : (conv.group_name || 'محادثة جماعية'),
          avatar: conv.type === 'direct' ? otherParticipant?.avatar : null,
          participant: otherParticipant,
          lastMessage: conv.last_message,
          lastMessageAt: conv.last_message_at || conv.last_message?.created_at,
          unreadCount: 0, // يمكن تحديثها لاحقاً
          isMuted: conv.settings?.isMuted || false,
          isPinned: conv.settings?.isPinned || false,
          bookingId: conv.booking_id,
          createdAt: conv.created_at
        };
      });

      // ترتيب المحادثات (المثبتة أولاً)
      return formattedConversations.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt);
      });
    } catch (error) {
      console.error('❌ Error getting user conversations:', error);
      // في حالة الخطأ، نعيد مصفوفة فارغة بدلاً من رمي الخطأ
      return [];
    }
  }

  // باقي الدوال كما هي...
  calculateUnreadCount(conversation, userId) {
    return 0;
  }

  async getConversationMessages(conversationId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;

      const messagesResult = await pool.query(
        `SELECT m.*,
                json_build_object(
                  'id', u.id,
                  'fullName', u.full_name,
                  'email', u.email,
                  'avatar', u.avatar,
                  'type', u.type
                ) as sender,
                json_build_object(
                  'id', rm.id,
                  'message_id', rm.message_id,
                  'content', rm.content,
                  'sender_id', rm.sender_id
                ) as reply_to
         FROM app.messages m
         JOIN app.users u ON u.id = m.sender_id
         LEFT JOIN app.messages rm ON rm.id = m.reply_to_id
         WHERE m.chat_id = $1 AND m.is_deleted = false
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [conversationId, limit, offset]
      );

      const totalResult = await pool.query(
        'SELECT COUNT(*) FROM app.messages WHERE chat_id = $1 AND is_deleted = false',
        [conversationId]
      );

      const total = parseInt(totalResult.rows[0].count);

      return {
        messages: messagesResult.rows.reverse(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting conversation messages:', error);
      throw error;
    }
  }

  async sendMessage(messageData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        chatId,
        senderId,
        type = 'text',
        content,
        attachments,
        location,
        replyTo
      } = messageData;

      const chatResult = await client.query(
        'SELECT * FROM app.chats WHERE chat_id = $1 AND is_active = true',
        [chatId]
      );
      
      if (chatResult.rows.length === 0) {
        throw new Error('المحادثة غير موجودة');
      }
      
      const chat = chatResult.rows[0];

      if (!chat.participants.includes(parseInt(senderId))) {
        throw new Error('لست مشاركاً في هذه المحادثة');
      }

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      let replyToId = null;
      if (replyTo) {
        const replyToResult = await client.query(
          'SELECT id FROM app.messages WHERE message_id = $1',
          [replyTo]
        );
        if (replyToResult.rows.length > 0) {
          replyToId = replyToResult.rows[0].id;
        }
      }

      const messageResult = await client.query(
        `INSERT INTO app.messages (
          message_id, chat_id, sender_id, type, content,
          attachments, location, reply_to_id, status,
          read_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id`,
        [
          messageId,
          chatId,
          senderId,
          type,
          content,
          attachments ? JSON.stringify(attachments) : null,
          location ? JSON.stringify(location) : null,
          replyToId,
          'sent',
          JSON.stringify([{ userId: parseInt(senderId), readAt: new Date() }])
        ]
      );

      const newMessageId = messageResult.rows[0].id;

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

      const populatedMessageResult = await pool.query(
        `SELECT m.*,
                json_build_object(
                  'id', u.id,
                  'fullName', u.full_name,
                  'email', u.email,
                  'avatar', u.avatar,
                  'type', u.type
                ) as sender,
                json_build_object(
                  'id', rm.id,
                  'message_id', rm.message_id,
                  'content', rm.content,
                  'sender_id', rm.sender_id
                ) as reply_to
         FROM app.messages m
         JOIN app.users u ON u.id = m.sender_id
         LEFT JOIN app.messages rm ON rm.id = m.reply_to_id
         WHERE m.id = $1`,
        [newMessageId]
      );

      const populatedMessage = populatedMessageResult.rows[0];

      SocketService.emitToConversation(chatId, 'new-message', populatedMessage);

      for (const participantId of chat.participants) {
        if (participantId !== parseInt(senderId)) {
          await notificationService.create(participantId, {
            title: 'رسالة جديدة',
            message: content?.substring(0, 100) || 'لديك رسالة جديدة',
            type: 'chat',
            priority: 'medium',
            data: { chatId, messageId, senderId },
            actionUrl: `/chat/${chatId}`
          });
        }
      }

      return populatedMessage;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error sending message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async markAsRead(messageId, userId) {
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
      const readBy = message.read_by || [];
      const alreadyRead = readBy.some(r => r.userId === parseInt(userId));
      
      if (alreadyRead) {
        await client.query('COMMIT');
        return { success: true, alreadyRead: true };
      }

      readBy.push({ userId: parseInt(userId), readAt: new Date() });

      await client.query(
        `UPDATE app.messages 
         SET read_by = $1,
             updated_at = NOW()
         WHERE message_id = $2`,
        [
          JSON.stringify(readBy),
          messageId
        ]
      );

      await client.query('COMMIT');

      SocketService.emitToConversation(message.chat_id, 'message-read', {
        messageId,
        userId,
        readAt: new Date()
      });

      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error marking message as read:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async addReaction(messageId, userId, emoji) {
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
      let reactions = message.reactions || [];

      const existingReactionIndex = reactions.findIndex(
        r => r.userId === parseInt(userId) && r.emoji === emoji
      );

      if (existingReactionIndex !== -1) {
        reactions.splice(existingReactionIndex, 1);
      } else {
        reactions.push({ 
          userId: parseInt(userId), 
          emoji, 
          createdAt: new Date() 
        });
      }

      await client.query(
        'UPDATE app.messages SET reactions = $1, updated_at = NOW() WHERE message_id = $2',
        [JSON.stringify(reactions), messageId]
      );

      await client.query('COMMIT');

      SocketService.emitToConversation(message.chat_id, 'message-reaction', {
        messageId,
        userId,
        emoji,
        reactions
      });

      return { success: true, reactions };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error adding reaction:', error);
      throw error;
    } finally {
      client.release();
    }
  }

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
        if (message.sender_id !== parseInt(userId)) {
          throw new Error('يمكنك فقط حذف رسائلك الخاصة');
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
        const deletedFor = message.deleted_for || [];
        if (!deletedFor.includes(parseInt(userId))) {
          deletedFor.push(parseInt(userId));
        }

        await client.query(
          'UPDATE app.messages SET deleted_for = $1, updated_at = NOW() WHERE message_id = $2',
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

  async updateChatSettings(chatId, userId, settings) {
    try {
      const chatResult = await pool.query(
        'SELECT * FROM app.chats WHERE chat_id = $1',
        [chatId]
      );
      
      if (chatResult.rows.length === 0) {
        throw new Error('المحادثة غير موجودة');
      }
      
      const chat = chatResult.rows[0];
      const currentSettings = chat.settings || {};
      const updatedSettings = { ...currentSettings, ...settings };

      const updatedResult = await pool.query(
        `UPDATE app.chats 
         SET settings = $1, updated_at = NOW()
         WHERE chat_id = $2
         RETURNING *`,
        [JSON.stringify(updatedSettings), chatId]
      );

      return { 
        success: true, 
        settings: updatedResult.rows[0].settings 
      };
    } catch (error) {
      console.error('❌ Error updating chat settings:', error);
      throw error;
    }
  }
}

const chatService = new ChatService();
export default chatService;

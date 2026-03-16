// server/src/controllers/chat.controller.js
import { pool } from '../config/database.js';
import chatService from '../services/chatService.js';

/**
 * الحصول على محادثات المستخدم
 */
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ PostgreSQL uses 'id' not '_id'
    const conversations = await chatService.getUserConversations(userId);

    res.json({
      success: true,
      conversations
    });

  } catch (error) {
    console.error('❌ Get user conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب المحادثات'
    });
  }
};

/**
 * إنشاء محادثة جديدة
 */
export const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { participantId, type = 'direct', bookingId } = req.body;

    const participants = [userId, participantId];
    const chat = await chatService.createConversation(participants, type, bookingId);

    res.json({
      success: true,
      message: 'تم إنشاء المحادثة بنجاح',
      chat
    });

  } catch (error) {
    console.error('❌ Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في إنشاء المحادثة'
    });
  }
};

/**
 * بدء محادثة دعم
 */
export const startSupportChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject } = req.body;

    const chat = await chatService.createSupportChat(userId, subject);

    res.json({
      success: true,
      message: 'تم بدء محادثة الدعم',
      chat
    });

  } catch (error) {
    console.error('❌ Start support chat error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في بدء المحادثة'
    });
  }
};

/**
 * الحصول على رسائل المحادثة
 */
export const getConversationMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // التحقق من أن المستخدم مشارك في المحادثة (باستخدام PostgreSQL)
    const chatResult = await pool.query(
      'SELECT * FROM app.chats WHERE chat_id = $1 AND $2 = ANY(participants)',
      [conversationId, userId]
    );
    
    if (chatResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بعرض هذه المحادثة'
      });
    }

    // الحصول على الرسائل مع التصفح
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
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
      [conversationId, parseInt(limit), offset]
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM app.messages WHERE chat_id = $1 AND is_deleted = false',
      [conversationId]
    );

    const total = parseInt(totalResult.rows[0].count);

    // تحديث حالة القراءة (باستخدام PostgreSQL)
    await pool.query(
      `UPDATE app.messages 
       SET read_by = read_by || jsonb_build_array(
         jsonb_build_object('userId', $1, 'readAt', NOW())
       )
       WHERE chat_id = $2 
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(read_by) AS rb 
           WHERE rb->>'userId' = $1::text
         )`,
      [userId, conversationId]
    );

    res.json({
      success: true,
      messages: messagesResult.rows.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get conversation messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب الرسائل'
    });
  }
};

/**
 * إرسال رسالة نصية
 */
export const sendTextMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId, content, replyTo } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'محتوى الرسالة مطلوب'
      });
    }

    const message = await chatService.sendMessage({
      chatId,
      senderId: userId,
      type: 'text',
      content,
      replyTo
    });

    res.json({
      success: true,
      message: 'تم إرسال الرسالة',
      data: message
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في إرسال الرسالة'
    });
  }
};

/**
 * تحديث حالة القراءة
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const result = await chatService.markAsRead(messageId, userId);

    res.json({
      success: true,
      message: 'تم تحديث حالة القراءة',
      ...result
    });

  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في تحديث حالة القراءة'
    });
  }
};

/**
 * حذف رسالة
 */
export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { forEveryone = false } = req.body;

    const result = await chatService.deleteMessage(messageId, userId, forEveryone);

    res.json({
      success: true,
      message: forEveryone ? 'تم حذف الرسالة للجميع' : 'تم حذف الرسالة',
      ...result
    });

  } catch (error) {
    console.error('❌ Delete message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في حذف الرسالة'
    });
  }
};

/**
 * إضافة تفاعل لرسالة
 */
export const addReaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    const result = await chatService.addReaction(messageId, userId, emoji);

    res.json({
      success: true,
      message: 'تم تحديث التفاعل',
      reactions: result.reactions
    });

  } catch (error) {
    console.error('❌ Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في إضافة التفاعل'
    });
  }
};

/**
 * تحديث إعدادات المحادثة
 */
export const updateChatSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const settings = req.body;

    const result = await chatService.updateChatSettings(chatId, userId, settings);

    res.json({
      success: true,
      message: 'تم تحديث الإعدادات',
      settings: result.settings
    });

  } catch (error) {
    console.error('❌ Update chat settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ في تحديث الإعدادات'
    });
  }
};

// ✅ تصدير جميع الدوال (مفردة)
export default {
  getUserConversations,
  createConversation,
  startSupportChat,
  getConversationMessages,
  sendTextMessage,
  markAsRead,
  deleteMessage,
  addReaction,
  updateChatSettings
};

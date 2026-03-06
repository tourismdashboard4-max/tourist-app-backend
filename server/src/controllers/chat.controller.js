// server/src/controllers/chatController.js
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import chatService from '../services/chatService.js';
import User from '../models/User.js';

/**
 * الحصول على محادثات المستخدم
 */
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // التحقق من أن المستخدم مشارك في المحادثة
    const chat = await Chat.findById(conversationId);
    if (!chat || !chat.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بعرض هذه المحادثة'
      });
    }

    const messages = await Message.find({ chatId: conversationId })
      .populate('senderId', 'fullName email avatar type')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Message.countDocuments({ chatId: conversationId });

    // تحديث حالة القراءة
    await Message.updateMany(
      {
        chatId: conversationId,
        'readBy.userId': { $ne: userId }
      },
      {
        $push: { readBy: { userId, readAt: new Date() } }
      }
    );

    res.json({
      success: true,
      messages: messages.reverse(),
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
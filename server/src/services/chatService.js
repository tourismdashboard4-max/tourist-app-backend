import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import * as NotificationService from './notificationService.js';
import * as SocketService from './socketService.js';

class ChatService {
  
  /**
   * إنشاء محادثة جديدة
   * @param {Array} participants - قائمة المشاركين
   * @param {string} type - نوع المحادثة
   * @param {string} bookingId - معرف الحجز (اختياري)
   * @returns {Promise<Object>} المحادثة المنشأة
   */
  async createConversation(participants, type = 'direct', bookingId = null) {
    try {
      // التحقق من وجود محادثة سابقة للمشاركين
      if (type === 'direct') {
        const existingChat = await Chat.findOne({
          type: 'direct',
          participants: { $all: participants, $size: 2 }
        });

        if (existingChat) {
          return existingChat;
        }
      }

      // إنشاء محادثة جديدة
      const chat = new Chat({
        participants,
        type,
        bookingId,
        settings: {
          isMuted: false,
          isPinned: false
        },
        stats: {
          totalMessages: 0,
          unreadCount: 0
        }
      });

      await chat.save();

      // إشعار المشاركين بالمحادثة الجديدة
      for (const participantId of participants) {
        await NotificationService.sendNewChatNotification(participantId, chat);
      }

      return chat;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * إنشاء محادثة دعم
   * @param {string} userId - معرف المستخدم
   * @param {string} subject - موضوع المحادثة
   * @returns {Promise<Object>} المحادثة المنشأة
   */
  async createSupportChat(userId, subject = '') {
    try {
      // البحث عن حساب الدعم (admin)
      const supportUser = await User.findOne({ 
        email: 'y7g5mggnbr@privaterelay.appleid.com' 
      });
      
      if (!supportUser) {
        console.log('⚠️ حساب الدعم غير موجود، سيتم إنشاؤه تلقائياً');
        
        // إنشاء حساب دعم تلقائياً إذا لم يكن موجوداً
        const newSupportUser = new User({
          fullName: 'الدعم الفني',
          email: 'y7g5mggnbr@privaterelay.appleid.com',
          password: 'Support@123456', // كلمة مرور افتراضية
          type: 'admin',
          role: 'support',
          status: 'active'
        });
        
        await newSupportUser.save();
        console.log('✅ تم إنشاء حساب الدعم تلقائياً');
        
        var supportUserId = newSupportUser._id;
      } else {
        var supportUserId = supportUser._id;
      }

      // التحقق من وجود محادثة دعم نشطة
      let chat = await Chat.findOne({
        participants: { $all: [userId, supportUserId] },
        type: 'support',
        isActive: true
      });

      if (!chat) {
        // إنشاء محادثة جديدة
        chat = new Chat({
          participants: [userId, supportUserId],
          type: 'support',
          isActive: true,
          settings: {
            isMuted: false,
            isPinned: false
          },
          stats: {
            totalMessages: 0,
            unreadCount: 0
          },
          metadata: {
            subject: subject || 'استفسار دعم فني'
          }
        });

        await chat.save();
        console.log(`✅ تم إنشاء محادثة دعم جديدة: ${chat._id}`);

        // إرسال إشعار للدعم
        const user = await User.findById(userId);
        await NotificationService.sendNewChatNotification(supportUserId, {
          ...chat.toObject(),
          userInfo: {
            name: user.fullName,
            email: user.email
          }
        });
      }

      return chat;
    } catch (error) {
      console.error('❌ Error creating support chat:', error);
      throw error;
    }
  }

  /**
   * الحصول على محادثات المستخدم
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Array>} قائمة المحادثات
   */
  async getUserConversations(userId) {
    try {
      const conversations = await Chat.find({
        participants: userId,
        isActive: true
      })
      .populate('participants', 'fullName email avatar type')
      .populate('lastMessage')
      .populate('bookingId')
      .sort({ lastMessageAt: -1, updatedAt: -1 });

      // تنسيق البيانات
      const formattedConversations = conversations.map(conv => {
        const otherParticipant = conv.participants.find(p => p._id.toString() !== userId);
        const unreadCount = this.calculateUnreadCount(conv, userId);

        return {
          id: conv._id,
          type: conv.type,
          name: conv.type === 'direct' ? otherParticipant?.fullName : conv.groupName,
          avatar: conv.type === 'direct' ? otherParticipant?.avatar : conv.groupAvatar,
          participant: otherParticipant,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          isMuted: conv.settings?.isMuted,
          isPinned: conv.settings?.isPinned,
          bookingId: conv.bookingId,
          createdAt: conv.createdAt
        };
      });

      // ترتيب المحادثات (المثبتة أولاً)
      return formattedConversations.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt);
      });
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  /**
   * حساب عدد الرسائل غير المقروءة
   * @param {Object} conversation - المحادثة
   * @param {string} userId - معرف المستخدم
   * @returns {number} عدد الرسائل غير المقروءة
   */
  calculateUnreadCount(conversation, userId) {
    // يمكن تنفيذ هذه الدالة بناءً على آخر قراءة للمستخدم
    // حالياً نعيد 0 كمؤقت
    return 0;
  }

  /**
   * الحصول على رسائل المحادثة
   * @param {string} conversationId - معرف المحادثة
   * @param {number} page - رقم الصفحة
   * @param {number} limit - عدد الرسائل
   * @returns {Promise<Object>} الرسائل
   */
  async getConversationMessages(conversationId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;

      const messages = await Message.find({ 
        chatId: conversationId,
        isDeleted: false 
      })
      .populate('senderId', 'fullName email avatar type')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      const total = await Message.countDocuments({ 
        chatId: conversationId,
        isDeleted: false 
      });

      return {
        messages: messages.reverse(), // نعرض الأقدم أولاً
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw error;
    }
  }

  /**
   * إرسال رسالة
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المرسلة
   */
  async sendMessage(messageData) {
    try {
      const {
        chatId,
        senderId,
        type = 'text',
        content,
        attachments,
        location,
        replyTo
      } = messageData;

      // التحقق من وجود المحادثة
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('المحادثة غير موجودة');
      }

      // التحقق من أن المرسل مشارك في المحادثة
      if (!chat.participants.includes(senderId)) {
        throw new Error('لست مشاركاً في هذه المحادثة');
      }

      // إنشاء معرف فريد للرسالة
      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // إنشاء الرسالة
      const message = new Message({
        messageId,
        chatId,
        senderId,
        type,
        content,
        attachments,
        location,
        replyTo,
        status: 'sent',
        readBy: [{ userId: senderId, readAt: new Date() }]
      });

      await message.save();

      // تحديث المحادثة
      chat.lastMessage = message._id;
      chat.lastMessageAt = new Date();
      chat.stats.totalMessages += 1;
      await chat.save();

      // إرسال الرسالة عبر WebSocket
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'fullName email avatar type')
        .populate('replyTo');

      SocketService.emitToConversation(chatId, 'new-message', populatedMessage);

      // إرسال إشعارات للمشاركين الآخرين
      for (const participantId of chat.participants) {
        if (participantId.toString() !== senderId) {
          await NotificationService.sendNewMessageNotification(
            participantId,
            populatedMessage,
            chat
          );
        }
      }

      return populatedMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * تحديث حالة القراءة
   * @param {string} messageId - معرف الرسالة
   * @param {string} userId - معرف المستخدم
   * @returns {Promise<Object>} نتيجة التحديث
   */
  async markAsRead(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('الرسالة غير موجودة');
      }

      // التحقق من أن المستخدم لم يقرأ الرسالة بالفعل
      const alreadyRead = message.readBy.some(r => r.userId.toString() === userId);
      if (alreadyRead) {
        return { success: true, alreadyRead: true };
      }

      // إضافة المستخدم إلى قائمة القراء
      message.readBy.push({ userId, readAt: new Date() });
      await message.save();

      // تحديث حالة الرسالة إذا قرأها الجميع
      const chat = await Chat.findById(message.chatId);
      const allParticipantsRead = chat.participants.every(p => 
        message.readBy.some(r => r.userId.toString() === p.toString())
      );

      if (allParticipantsRead) {
        message.status = 'read';
        await message.save();
      }

      // إرسال تحديث عبر WebSocket
      SocketService.emitToConversation(message.chatId, 'message-read', {
        messageId,
        userId,
        readAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * إضافة تفاعل لرسالة
   * @param {string} messageId - معرف الرسالة
   * @param {string} userId - معرف المستخدم
   * @param {string} emoji - الإيموجي
   * @returns {Promise<Object>} نتيجة الإضافة
   */
  async addReaction(messageId, userId, emoji) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('الرسالة غير موجودة');
      }

      // التحقق من وجود تفاعل سابق للمستخدم
      const existingReaction = message.reactions.find(
        r => r.userId.toString() === userId && r.emoji === emoji
      );

      if (existingReaction) {
        // إزالة التفاعل إذا كان موجوداً
        message.reactions = message.reactions.filter(
          r => !(r.userId.toString() === userId && r.emoji === emoji)
        );
      } else {
        // إضافة تفاعل جديد
        message.reactions.push({ userId, emoji, createdAt: new Date() });
      }

      await message.save();

      // إرسال تحديث عبر WebSocket
      SocketService.emitToConversation(message.chatId, 'message-reaction', {
        messageId,
        userId,
        emoji,
        reactions: message.reactions
      });

      return { success: true, reactions: message.reactions };
    } catch (error) {
      console.error('Error adding reaction:', error);
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
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('الرسالة غير موجودة');
      }

      if (forEveryone) {
        // حذف للجميع (المرسل فقط)
        if (message.senderId.toString() !== userId) {
          throw new Error('يمكنك فقط حذف رسائلك الخاصة');
        }

        message.isDeleted = true;
        message.content = 'تم حذف هذه الرسالة';
        message.attachments = [];
        await message.save();

        SocketService.emitToConversation(message.chatId, 'message-deleted', {
          messageId,
          forEveryone: true
        });
      } else {
        // حذف للمستخدم فقط
        message.deletedFor.push(userId);
        await message.save();

        SocketService.emitToConversation(message.chatId, 'message-deleted', {
          messageId,
          userId,
          forEveryone: false
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * تحديث إعدادات المحادثة
   * @param {string} chatId - معرف المحادثة
   * @param {string} userId - معرف المستخدم
   * @param {Object} settings - الإعدادات الجديدة
   * @returns {Promise<Object>} الإعدادات المحدثة
   */
  async updateChatSettings(chatId, userId, settings) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('المحادثة غير موجودة');
      }

      // تحديث الإعدادات
      chat.settings = { ...chat.settings, ...settings };
      await chat.save();

      return { success: true, settings: chat.settings };
    } catch (error) {
      console.error('Error updating chat settings:', error);
      throw error;
    }
  }
}

const chatService = new ChatService();
export default chatService;
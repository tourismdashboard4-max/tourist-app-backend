import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import * as SocketService from './socketService.js';
import * as NotificationService from './notificationService.js';

class MessageService {
  
  /**
   * إنشاء رسالة نصية
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createTextMessage(messageData) {
    try {
      const { chatId, senderId, content, replyTo } = messageData;

      // التحقق من صحة البيانات
      if (!content || content.trim() === '') {
        throw new Error('محتوى الرسالة مطلوب');
      }

      // إنشاء معرف فريد للرسالة
      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const message = new Message({
        messageId,
        chatId,
        senderId,
        type: 'text',
        content: content.trim(),
        replyTo,
        status: 'sent',
        readBy: [{ userId: senderId, readAt: new Date() }]
      });

      await message.save();

      // تحديث المحادثة
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
        $inc: { 'stats.totalMessages': 1 }
      });

      // تجهيز البيانات للإرسال
      const populatedMessage = await this.populateMessageData(message._id);

      // إرسال عبر WebSocket
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      console.error('Error creating text message:', error);
      throw error;
    }
  }

  /**
   * إنشاء رسالة صورة
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createImageMessage(messageData) {
    try {
      const { chatId, senderId, images, replyTo } = messageData;

      if (!images || images.length === 0) {
        throw new Error('الصور مطلوبة');
      }

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const message = new Message({
        messageId,
        chatId,
        senderId,
        type: 'image',
        attachments: images.map(img => ({
          url: img.url,
          type: 'image',
          name: img.name || 'image.jpg',
          size: img.size || 0
        })),
        replyTo,
        status: 'sent',
        readBy: [{ userId: senderId, readAt: new Date() }]
      });

      await message.save();

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
        $inc: { 'stats.totalMessages': 1 }
      });

      const populatedMessage = await this.populateMessageData(message._id);
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      console.error('Error creating image message:', error);
      throw error;
    }
  }

  /**
   * إنشاء رسالة ملف
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createFileMessage(messageData) {
    try {
      const { chatId, senderId, files, replyTo } = messageData;

      if (!files || files.length === 0) {
        throw new Error('الملفات مطلوبة');
      }

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const message = new Message({
        messageId,
        chatId,
        senderId,
        type: 'file',
        attachments: files.map(file => ({
          url: file.url,
          type: file.mimeType || 'application/octet-stream',
          name: file.name,
          size: file.size
        })),
        replyTo,
        status: 'sent',
        readBy: [{ userId: senderId, readAt: new Date() }]
      });

      await message.save();

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
        $inc: { 'stats.totalMessages': 1 }
      });

      const populatedMessage = await this.populateMessageData(message._id);
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      console.error('Error creating file message:', error);
      throw error;
    }
  }

  /**
   * إنشاء رسالة موقع
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createLocationMessage(messageData) {
    try {
      const { chatId, senderId, location, replyTo } = messageData;

      if (!location || !location.lat || !location.lng) {
        throw new Error('بيانات الموقع غير كاملة');
      }

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const message = new Message({
        messageId,
        chatId,
        senderId,
        type: 'location',
        location: {
          lat: location.lat,
          lng: location.lng,
          address: location.address || ''
        },
        replyTo,
        status: 'sent',
        readBy: [{ userId: senderId, readAt: new Date() }]
      });

      await message.save();

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
        $inc: { 'stats.totalMessages': 1 }
      });

      const populatedMessage = await this.populateMessageData(message._id);
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      console.error('Error creating location message:', error);
      throw error;
    }
  }

  /**
   * إنشاء رسالة صوتية
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createVoiceMessage(messageData) {
    try {
      const { chatId, senderId, audioUrl, duration, replyTo } = messageData;

      if (!audioUrl) {
        throw new Error('الملف الصوتي مطلوب');
      }

      const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const message = new Message({
        messageId,
        chatId,
        senderId,
        type: 'voice',
        attachments: [{
          url: audioUrl,
          type: 'audio/webm',
          name: 'voice-message.webm',
          size: 0,
          duration: duration || 0
        }],
        replyTo,
        status: 'sent',
        readBy: [{ userId: senderId, readAt: new Date() }]
      });

      await message.save();

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
        $inc: { 'stats.totalMessages': 1 }
      });

      const populatedMessage = await this.populateMessageData(message._id);
      await this.broadcastNewMessage(chatId, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      console.error('Error creating voice message:', error);
      throw error;
    }
  }

  /**
   * إنشاء رسالة نظام
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise<Object>} الرسالة المنشأة
   */
  async createSystemMessage(messageData) {
    try {
      const { chatId, systemType, targetUser } = messageData;

      const messageId = `SYS-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const message = new Message({
        messageId,
        chatId,
        type: 'system',
        systemMessage: {
          type: systemType,
          targetUser
        },
        status: 'sent',
        readBy: []
      });

      await message.save();

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
        $inc: { 'stats.totalMessages': 1 }
      });

      const populatedMessage = await this.populateMessageData(message._id);
      await this.broadcastNewMessage(chatId, populatedMessage, null);

      return populatedMessage;
    } catch (error) {
      console.error('Error creating system message:', error);
      throw error;
    }
  }

  /**
   * تجهيز بيانات الرسالة
   * @param {string} messageId - معرف الرسالة
   * @returns {Promise<Object>} الرسالة مع البيانات الكاملة
   */
  async populateMessageData(messageId) {
    return await Message.findById(messageId)
      .populate('senderId', 'fullName email avatar type')
      .populate('replyTo')
      .populate('readBy.userId', 'fullName email avatar')
      .populate('reactions.userId', 'fullName email avatar');
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

    // إرسال إشعارات للمشاركين
    const chat = await Chat.findById(chatId).populate('participants');
    
    for (const participant of chat.participants) {
      if (participant._id.toString() !== senderId) {
        await NotificationService.sendNewMessageNotification(
          participant._id,
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
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status },
        { new: true }
      );

      if (!message) {
        throw new Error('الرسالة غير موجودة');
      }

      // إرسال تحديث الحالة عبر WebSocket
      SocketService.emitToConversation(message.chatId, 'message-status-update', {
        messageId,
        status
      });

      return message;
    } catch (error) {
      console.error('Error updating message status:', error);
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
        // التحقق من أن المستخدم هو المرسل
        if (message.senderId.toString() !== userId) {
          throw new Error('يمكنك فقط حذف رسائلك الخاصة للجميع');
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
        if (!message.deletedFor.includes(userId)) {
          message.deletedFor.push(userId);
          await message.save();
        }

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
   * تعديل رسالة
   * @param {string} messageId - معرف الرسالة
   * @param {string} userId - معرف المستخدم
   * @param {string} newContent - المحتوى الجديد
   * @returns {Promise<Object>} الرسالة المعدلة
   */
  async editMessage(messageId, userId, newContent) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('الرسالة غير موجودة');
      }

      // التحقق من أن المستخدم هو المرسل
      if (message.senderId.toString() !== userId) {
        throw new Error('يمكنك فقط تعديل رسائلك الخاصة');
      }

      // التحقق من أن الرسالة من نوع نص
      if (message.type !== 'text') {
        throw new Error('يمكن تعديل الرسائل النصية فقط');
      }

      message.content = newContent;
      message.edited = true;
      message.editedAt = new Date();
      await message.save();

      // إرسال تحديث عبر WebSocket
      SocketService.emitToConversation(message.chatId, 'message-edited', {
        messageId,
        newContent,
        editedAt: message.editedAt
      });

      return message;
    } catch (error) {
      console.error('Error editing message:', error);
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
      const skip = (page - 1) * limit;

      const messages = await Message.find({
        chatId,
        type: 'text',
        content: { $regex: query, $options: 'i' },
        isDeleted: false
      })
      .populate('senderId', 'fullName email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      const total = await Message.countDocuments({
        chatId,
        type: 'text',
        content: { $regex: query, $options: 'i' },
        isDeleted: false
      });

      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error searching messages:', error);
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
      const stats = await Message.aggregate([
        { $match: { chatId: new mongoose.Types.ObjectId(chatId), isDeleted: false } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            textMessages: {
              $sum: { $cond: [{ $eq: ['$type', 'text'] }, 1, 0] }
            },
            imageMessages: {
              $sum: { $cond: [{ $eq: ['$type', 'image'] }, 1, 0] }
            },
            fileMessages: {
              $sum: { $cond: [{ $eq: ['$type', 'file'] }, 1, 0] }
            },
            voiceMessages: {
              $sum: { $cond: [{ $eq: ['$type', 'voice'] }, 1, 0] }
            },
            locationMessages: {
              $sum: { $cond: [{ $eq: ['$type', 'location'] }, 1, 0] }
            },
            systemMessages: {
              $sum: { $cond: [{ $eq: ['$type', 'system'] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        totalMessages: 0,
        textMessages: 0,
        imageMessages: 0,
        fileMessages: 0,
        voiceMessages: 0,
        locationMessages: 0,
        systemMessages: 0
      };
    } catch (error) {
      console.error('Error getting message stats:', error);
      throw error;
    }
  }
}

const messageService = new MessageService();
export default messageService;
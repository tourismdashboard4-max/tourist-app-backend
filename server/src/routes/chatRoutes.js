// server/src/routes/chatRoutes.js
import express from 'express';
import * as chatController from '../controllers/chat.controller.js'; // ✅ تم التعديل هنا (chatController.js → chat.controller.js)
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js'; // ✅ تم التعديل هنا (validation.middleware.js → validationMiddleware.js)
import { body } from 'express-validator';

const router = express.Router();

// جميع المسارات محمية
router.use(protect);

// قواعد التحقق
const conversationValidation = [
  body('participantId').notEmpty().withMessage('معرف المشارك مطلوب')
];

const messageValidation = [
  body('chatId').notEmpty().withMessage('معرف المحادثة مطلوب'),
  body('content').notEmpty().withMessage('محتوى الرسالة مطلوب')
];

// ===================== مسارات المحادثات =====================

/**
 * GET /api/chats
 * الحصول على جميع محادثات المستخدم
 */
router.get('/', chatController.getUserConversations);

/**
 * POST /api/chats
 * إنشاء محادثة جديدة
 */
router.post('/', conversationValidation, validate, chatController.createConversation);

/**
 * POST /api/chats/support
 * بدء محادثة دعم
 */
router.post('/support', chatController.startSupportChat);

// ===================== مسارات الرسائل =====================

/**
 * GET /api/chats/:conversationId/messages
 * الحصول على رسائل محادثة محددة
 */
router.get('/:conversationId/messages', chatController.getConversationMessages);

/**
 * POST /api/chats/message/text
 * إرسال رسالة نصية
 */
router.post('/message/text', messageValidation, validate, chatController.sendTextMessage);

/**
 * PUT /api/chats/message/:messageId/read
 * تحديث حالة القراءة
 */
router.put('/message/:messageId/read', chatController.markAsRead);

/**
 * DELETE /api/chats/message/:messageId
 * حذف رسالة
 */
router.delete('/message/:messageId', chatController.deleteMessage);

/**
 * POST /api/chats/message/:messageId/reaction
 * إضافة تفاعل لرسالة
 */
router.post('/message/:messageId/reaction', chatController.addReaction);

// ===================== مسارات إعدادات المحادثة =====================

/**
 * PUT /api/chats/:chatId/settings
 * تحديث إعدادات المحادثة
 */
router.put('/:chatId/settings', chatController.updateChatSettings);

export default router;

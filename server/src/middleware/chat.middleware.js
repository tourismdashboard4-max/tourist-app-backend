const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { body, param, validationResult } = require('express-validator');

/**
 * التحقق من وجود المحادثة
 * @param {Object} req - الطلب
 * @param {Object} res - الرد
 * @param {Function} next - التالي
 */
const validateChatExists = async (req, res, next) => {
  try {
    const chatId = req.params.conversationId || req.params.chatId || req.body.chatId;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المحادثة مطلوب'
      });
    }

    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    req.chat = chat;
    next();
  } catch (error) {
    console.error('Chat validation error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في التحقق من المحادثة'
    });
  }
};

/**
 * التحقق من مشاركة المستخدم في المحادثة
 * @param {Object} req - الطلب
 * @param {Object} res - الرد
 * @param {Function} next - التالي
 */
const validateChatParticipant = (req, res, next) => {
  const chat = req.chat;
  const userId = req.user.id;

  if (!chat) {
    return res.status(404).json({
      success: false,
      message: 'المحادثة غير موجودة'
    });
  }

  if (!chat.participants.includes(userId)) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح بالوصول إلى هذه المحادثة'
    });
  }

  next();
};

/**
 * التحقق من وجود الرسالة
 * @param {Object} req - الطلب
 * @param {Object} res - الرد
 * @param {Function} next - التالي
 */
const validateMessageExists = async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'الرسالة غير موجودة'
      });
    }

    req.message = message;
    next();
  } catch (error) {
    console.error('Message validation error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في التحقق من الرسالة'
    });
  }
};

/**
 * التحقق من صلاحية المستخدم للرسالة
 * @param {Object} req - الطلب
 * @param {Object} res - الرد
 * @param {Function} next - التالي
 */
const validateMessageOwner = (req, res, next) => {
  const message = req.message;
  const userId = req.user.id;

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'الرسالة غير موجودة'
    });
  }

  if (message.senderId.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح بتعديل هذه الرسالة'
    });
  }

  next();
};

/**
 * التحقق من صحة بيانات إنشاء المحادثة
 */
const validateCreateChat = [
  body('participantId')
    .notEmpty().withMessage('معرف المشارك مطلوب')
    .isMongoId().withMessage('معرف المشارك غير صحيح'),
  
  body('type')
    .optional()
    .isIn(['direct', 'group', 'support']).withMessage('نوع المحادثة غير صحيح'),
  
  body('bookingId')
    .optional()
    .isMongoId().withMessage('معرف الحجز غير صحيح'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * التحقق من صحة بيانات إرسال رسالة نصية
 */
const validateTextMessage = [
  body('chatId')
    .notEmpty().withMessage('معرف المحادثة مطلوب')
    .isMongoId().withMessage('معرف المحادثة غير صحيح'),
  
  body('content')
    .notEmpty().withMessage('محتوى الرسالة مطلوب')
    .isLength({ max: 5000 }).withMessage('الرسالة طويلة جداً (الحد الأقصى 5000 حرف)'),
  
  body('replyTo')
    .optional()
    .isMongoId().withMessage('معرف الرسالة المراد الرد عليها غير صحيح'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * التحقق من صحة بيانات إرسال صورة
 */
const validateImageMessage = [
  body('chatId')
    .notEmpty().withMessage('معرف المحادثة مطلوب')
    .isMongoId().withMessage('معرف المحادثة غير صحيح'),
  
  body('images')
    .isArray().withMessage('الصور يجب أن تكون مصفوفة')
    .notEmpty().withMessage('الصور مطلوبة'),
  
  body('images.*.url')
    .notEmpty().withMessage('رابط الصورة مطلوب')
    .isURL().withMessage('رابط الصورة غير صحيح'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * التحقق من صحة بيانات إرسال ملف
 */
const validateFileMessage = [
  body('chatId')
    .notEmpty().withMessage('معرف المحادثة مطلوب')
    .isMongoId().withMessage('معرف المحادثة غير صحيح'),
  
  body('files')
    .isArray().withMessage('الملفات يجب أن تكون مصفوفة')
    .notEmpty().withMessage('الملفات مطلوبة'),
  
  body('files.*.name')
    .notEmpty().withMessage('اسم الملف مطلوب'),
  
  body('files.*.size')
    .isInt({ max: 10 * 1024 * 1024 }).withMessage('حجم الملف يجب أن لا يتجاوز 10 ميجابايت'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * التحقق من صحة بيانات إرسال موقع
 */
const validateLocationMessage = [
  body('chatId')
    .notEmpty().withMessage('معرف المحادثة مطلوب')
    .isMongoId().withMessage('معرف المحادثة غير صحيح'),
  
  body('location.lat')
    .notEmpty().withMessage('خط العرض مطلوب')
    .isFloat({ min: -90, max: 90 }).withMessage('خط العرض غير صحيح'),
  
  body('location.lng')
    .notEmpty().withMessage('خط الطول مطلوب')
    .isFloat({ min: -180, max: 180 }).withMessage('خط الطول غير صحيح'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * التحقق من صحة بيانات إضافة تفاعل
 */
const validateReaction = [
  body('emoji')
    .notEmpty().withMessage('الإيموجي مطلوب')
    .isLength({ max: 10 }).withMessage('الإيموجي غير صحيح'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * منع إرسال رسائل متكررة (Spam protection)
 */
const preventMessageSpam = () => {
  const userLastMessageTime = new Map();
  
  return (req, res, next) => {
    const userId = req.user.id;
    const now = Date.now();
    const lastTime = userLastMessageTime.get(userId) || 0;
    
    // منع إرسال أكثر من رسالة كل ثانية
    if (now - lastTime < 1000) {
      return res.status(429).json({
        success: false,
        message: 'الرجاء الانتظار قليلاً قبل إرسال رسالة أخرى'
      });
    }
    
    userLastMessageTime.set(userId, now);
    next();
  };
};

/**
 * التحقق من حجم المرفقات
 */
const validateAttachmentsSize = (req, res, next) => {
  const files = req.files || req.body.attachments || [];
  const maxTotalSize = 50 * 1024 * 1024; // 50 ميجابايت
  
  let totalSize = 0;
  
  if (req.files) {
    totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
  } else if (req.body.attachments) {
    totalSize = req.body.attachments.reduce((sum, att) => sum + (att.size || 0), 0);
  }
  
  if (totalSize > maxTotalSize) {
    return res.status(400).json({
      success: false,
      message: 'حجم المرفقات كبير جداً (الحد الأقصى 50 ميجابايت)'
    });
  }
  
  next();
};

module.exports = {
  validateChatExists,
  validateChatParticipant,
  validateMessageExists,
  validateMessageOwner,
  validateCreateChat,
  validateTextMessage,
  validateImageMessage,
  validateFileMessage,
  validateLocationMessage,
  validateReaction,
  preventMessageSpam,
  validateAttachmentsSize
};
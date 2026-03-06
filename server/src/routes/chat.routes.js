import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// مسار تجريبي
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Chat routes are working',
    timestamp: new Date().toISOString()
  });
});

// الحصول على محادثات المستخدم
router.get('/', authenticate, async (req, res) => {
  try {
    // بيانات تجريبية للاختبار
    res.json({
      success: true,
      data: [
        {
          id: 'support',
          participant: {
            id: 'support',
            name: 'الدعم الفني',
            type: 'support',
            online: true,
            avatar: null
          },
          lastMessage: {
            content: 'مرحباً، كيف يمكنني مساعدتك؟',
            createdAt: new Date().toISOString(),
            type: 'text'
          },
          unreadCount: 0
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الحصول على رسائل محادثة محددة
router.get('/:userId/messages', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // بيانات تجريبية
    res.json({
      success: true,
      data: {
        messages: []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إنشاء محادثة جديدة
router.post('/', authenticate, async (req, res) => {
  try {
    const { participantId, type } = req.body;
    
    res.status(201).json({
      success: true,
      data: {
        id: `chat-${Date.now()}`,
        participants: [req.user.id, participantId],
        type
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إرسال رسالة نصية
router.post('/message/text', authenticate, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    
    const message = {
      id: `msg-${Date.now()}`,
      senderId: req.user.id,
      receiverId,
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
      status: 'sent'
    };
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث حالة القراءة
router.put('/:userId/read', authenticate, async (req, res) => {
  res.json({ success: true });
});

router.put('/message/:messageId/read', authenticate, async (req, res) => {
  res.json({ success: true });
});

export default router;
// server/src/routes/notificationRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { pool } from '../../server.js';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createTestNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// جميع المسارات محمية (تحتاج تسجيل دخول)
router.use(protect);

// GET /api/notifications - جلب الإشعارات
router.get('/', getUserNotifications);

// GET /api/notifications/unread-count - جلب عدد غير المقروءة
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/read-all - تحديث الكل كمقروء
router.put('/read-all', markAllAsRead);

// PUT /api/notifications/:notificationId/read - تحديث إشعار محدد
router.put('/:notificationId/read', markAsRead);

// DELETE /api/notifications/:notificationId - حذف إشعار
router.delete('/:notificationId', deleteNotification);

// DELETE /api/notifications - حذف جميع الإشعارات
router.delete('/', deleteAllNotifications);

// ============================================
// ✅ POST /api/notifications - إنشاء إشعار جديد (للمسؤول)
// ============================================
router.post('/', async (req, res) => {
  try {
    // التحقق من صلاحيات المسؤول
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ 
        success: false, 
        message: 'غير مصرح. فقط المسؤولون يمكنهم إرسال الإشعارات' 
      });
    }
    
    const { userId, title, message, type, data, action_url } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!userId || !title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'الرجاء إدخال جميع البيانات المطلوبة: userId, title, message' 
      });
    }
    
    // إدخال الإشعار في قاعدة البيانات
    const result = await pool.query(
      `INSERT INTO app.notifications 
       (user_id, title, message, type, is_read, created_at, action_url, data)
       VALUES ($1, $2, $3, $4, false, NOW(), $5, $6)
       RETURNING *`,
      [userId, title, message, type || 'system', action_url || null, data || null]
    );
    
    console.log(`✅ Admin notification created for user ${userId}: ${title}`);
    
    res.json({
      success: true,
      message: 'تم إرسال الإشعار بنجاح',
      notification: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Create notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ في إنشاء الإشعار' 
    });
  }
});

// POST /api/notifications/test - إنشاء إشعار تجريبي (للتطوير فقط)
if (process.env.NODE_ENV === 'development') {
  router.post('/test', createTestNotification);
}

export default router;

// server/src/routes/notificationRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
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

// POST /api/notifications/test - إنشاء إشعار تجريبي (للتطوير فقط)
if (process.env.NODE_ENV === 'development') {
  router.post('/test', createTestNotification);
}

export default router;
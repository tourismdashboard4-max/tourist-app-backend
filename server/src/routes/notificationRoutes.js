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
  createTestNotification,
  createChatNotification,
  createUpgradeRequestNotification,
  createUpgradeResultNotification,
  createGeneralNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// جميع المسارات محمية (تحتاج تسجيل دخول)
router.use(protect);

// ============================================
// 📋 GET Routes - جلب الإشعارات
// ============================================

// GET /api/notifications - جلب الإشعارات
router.get('/', getUserNotifications);

// GET /api/notifications/unread-count - جلب عدد غير المقروءة
router.get('/unread-count', getUnreadCount);

// ============================================
// ✏️ PUT Routes - تحديث الإشعارات
// ============================================

// PUT /api/notifications/read-all - تحديث الكل كمقروء
router.put('/read-all', markAllAsRead);

// PUT /api/notifications/:notificationId/read - تحديث إشعار محدد
router.put('/:notificationId/read', markAsRead);

// ============================================
// 🗑️ DELETE Routes - حذف الإشعارات
// ============================================

// DELETE /api/notifications/:notificationId - حذف إشعار
router.delete('/:notificationId', deleteNotification);

// DELETE /api/notifications - حذف جميع الإشعارات
router.delete('/', deleteAllNotifications);

// ============================================
// 📨 POST Routes - إنشاء إشعارات (للمسؤول)
// ============================================

/**
 * POST /api/notifications
 * إنشاء إشعار عام (للمسؤول)
 */
router.post('/', createGeneralNotification);

/**
 * POST /api/notifications/chat
 * إنشاء إشعار محادثة مع المسؤول (للمسؤول)
 * البيانات المطلوبة: { userId, ticketId, message }
 */
router.post('/chat', createChatNotification);

/**
 * POST /api/notifications/upgrade
 * إنشاء إشعار طلب ترقية مع محادثة (للمسؤول)
 * البيانات المطلوبة: { userId, requestId, message }
 */
router.post('/upgrade', createUpgradeRequestNotification);

/**
 * POST /api/notifications/upgrade-result
 * إنشاء إشعار نتيجة الترقية (موافقة/رفض)
 * البيانات المطلوبة: { userId, requestId, status, notes }
 */
router.post('/upgrade-result', createUpgradeResultNotification);

// ============================================
// 🧪 Test Routes - للتطوير فقط
// ============================================

// POST /api/notifications/test - إنشاء إشعار تجريبي (للتطوير فقط)
if (process.env.NODE_ENV === 'development') {
  router.post('/test', createTestNotification);
}

export default router;

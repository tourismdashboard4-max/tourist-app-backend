const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// جميع مسارات الإدارة محمية وتتطلب صلاحية المشرف
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/stats
 * @desc    الحصول على إحصائيات عامة
 */
router.get('/stats', adminController.getStats);

/**
 * @route   GET /api/admin/users
 * @desc    الحصول على قائمة المستخدمين
 */
router.get('/users', adminController.getUsers);

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    تحديث حالة مستخدم
 */
router.put('/users/:userId/status', adminController.updateUserStatus);

/**
 * @route   GET /api/admin/guides/pending
 * @desc    الحصول على طلبات تسجيل المرشدين المعلقة
 */
router.get('/guides/pending', adminController.getPendingGuides);

/**
 * @route   PUT /api/admin/guides/:guideId/approve
 * @desc    الموافقة على طلب مرشد
 */
router.put('/guides/:guideId/approve', adminController.approveGuide);

/**
 * @route   GET /api/admin/bookings
 * @desc    الحصول على كل الحجوزات
 */
router.get('/bookings', adminController.getAllBookings);

/**
 * @route   GET /api/admin/withdrawals
 * @desc    الحصول على طلبات السحب
 */
router.get('/withdrawals', adminController.getWithdrawals);

/**
 * @route   GET /api/admin/reports
 * @desc    الحصول على التقارير
 */
router.get('/reports', adminController.getReports);

module.exports = router;
const express = require('express');
const router = express.Router();
const guideController = require('../controllers/guide.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireGuide } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const { body } = require('express-validator');

// قواعد التحقق
const programValidation = [
  body('title').notEmpty().withMessage('عنوان البرنامج مطلوب'),
  body('description').notEmpty().withMessage('وصف البرنامج مطلوب'),
  body('price').isFloat({ min: 25 }).withMessage('السعر يجب أن يكون 25 ريال على الأقل'),
  body('duration').isInt({ min: 1 }).withMessage('المدة يجب أن تكون ساعة على الأقل')
];

// ===================== مسارات المرشدين العامة =====================

/**
 * @route   GET /api/guides
 * @desc    الحصول على قائمة المرشدين
 * @access  Public
 */
router.get('/', guideController.getGuides);

/**
 * @route   GET /api/guides/:guideId
 * @desc    الحصول على تفاصيل مرشد
 * @access  Public
 */
router.get('/:guideId', guideController.getGuideById);

/**
 * @route   GET /api/guides/:guideId/programs
 * @desc    الحصول على برامج المرشد
 * @access  Public
 */
router.get('/:guideId/programs', guideController.getGuidePrograms);

// ===================== مسارات المرشدين المحمية =====================

/**
 * @route   POST /api/guides/programs
 * @desc    إضافة برنامج جديد
 * @access  Private (Guide)
 */
router.post('/programs', authenticate, requireGuide, programValidation, validate, guideController.addProgram);

/**
 * @route   PUT /api/guides/programs/:programId
 * @desc    تحديث برنامج
 * @access  Private (Guide)
 */
router.put('/programs/:programId', authenticate, requireGuide, guideController.updateProgram);

/**
 * @route   DELETE /api/guides/programs/:programId
 * @desc    حذف برنامج
 * @access  Private (Guide)
 */
router.delete('/programs/:programId', authenticate, requireGuide, guideController.deleteProgram);

/**
 * @route   PUT /api/guides/programs/:programId/toggle
 * @desc    تفعيل/إيقاف برنامج
 * @access  Private (Guide)
 */
router.put('/programs/:programId/toggle', authenticate, requireGuide, guideController.toggleProgramStatus);

/**
 * @route   GET /api/guides/dashboard/stats
 * @desc    الحصول على إحصائيات لوحة التحكم
 * @access  Private (Guide)
 */
router.get('/dashboard/stats', authenticate, requireGuide, guideController.getDashboardStats);

/**
 * @route   GET /api/guides/earnings
 * @desc    الحصول على تقرير الأرباح
 * @access  Private (Guide)
 */
router.get('/earnings', authenticate, requireGuide, guideController.getEarnings);

/**
 * @route   PUT /api/guides/availability
 * @desc    تحديث حالة التوفر
 * @access  Private (Guide)
 */
router.put('/availability', authenticate, requireGuide, guideController.updateAvailability);

module.exports = router;
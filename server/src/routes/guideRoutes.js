// server/src/routes/guideRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import * as guideController from '../controllers/guideController.js';
import { validate } from '../middleware/validationMiddleware.js';
import { body } from 'express-validator';

const router = express.Router();

// ============================================
// قواعد التحقق لطلب الترقية
// ============================================
const upgradeValidation = [
  body('fullName')
    .notEmpty().withMessage('الاسم الكامل مطلوب')
    .isLength({ min: 3, max: 50 }).withMessage('الاسم يجب أن يكون بين 3 و 50 حرف'),
  
  body('civilId')
    .notEmpty().withMessage('رقم الهوية مطلوب')
    .matches(/^\d{10}$/).withMessage('رقم الهوية يجب أن يكون 10 أرقام'),
  
  body('licenseNumber')
    .notEmpty().withMessage('رقم الرخصة مطلوب')
    .matches(/^[A-Z]{3}-\d{4}-\d{4}$/).withMessage('صيغة الرخصة غير صحيحة (مثال: TRL-1234-5678)'),
  
  body('phone')
    .notEmpty().withMessage('رقم الجوال مطلوب')
    .matches(/^(05|\+9665)[0-9]{8}$/).withMessage('رقم الجوال غير صحيح (مثال: 05xxxxxxxx أو +9665xxxxxxxx)'),
  
  body('experience')
    .isInt({ min: 0, max: 50 }).withMessage('سنوات الخبرة يجب أن تكون بين 0 و 50'),
  
  body('specialties')
    .optional()
    .isLength({ max: 200 }).withMessage('التخصصات يجب أن لا تتجاوز 200 حرف')
];

// ============================================
// قواعد التحقق لتسجيل الدخول
// ============================================
const loginValidation = [
  body('licenseNumber')
    .notEmpty().withMessage('رقم الرخصة مطلوب'),
  
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
];

// ============================================
// قواعد التحقق لتحديث الملف الشخصي
// ============================================
const profileUpdateValidation = [
  body('phone')
    .optional()
    .matches(/^(05|\+9665)[0-9]{8}$/).withMessage('رقم الجوال غير صحيح'),
  
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 }).withMessage('سنوات الخبرة يجب أن تكون بين 0 و 50'),
  
  body('specialties')
    .optional()
    .isLength({ max: 200 }).withMessage('التخصصات يجب أن لا تتجاوز 200 حرف'),
  
  body('programLocation')
    .optional()
    .isURL().withMessage('رابط الموقع غير صحيح'),
  
  body('programLocationName')
    .optional()
    .isLength({ max: 100 }).withMessage('اسم الموقع يجب أن لا يتجاوز 100 حرف')
];

// ============================================
// قواعد التحقق لتغيير كلمة المرور
// ============================================
const passwordChangeValidation = [
  body('currentPassword')
    .notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
  
  body('newPassword')
    .notEmpty().withMessage('كلمة المرور الجديدة مطلوبة')
    .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم')
];

// ============================================
// ✅ مسارات عامة (لا تحتاج مصادقة)
// ============================================

/**
 * @route   POST /api/guides/login
 * @desc    تسجيل دخول المرشد
 * @access  Public
 */
router.post('/login', loginValidation, validate, guideController.loginGuide);

// ============================================
// ✅ مسارات تحتاج مصادقة (للمرشدين)
// ============================================

/**
 * @route   POST /api/guides/upgrade
 * @desc    طلب ترقية إلى مرشد
 * @access  Private
 */
router.post(
  '/upgrade',
  protect,
  upload.fields([
    { name: 'licenseDocument', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 }
  ]),
  upgradeValidation,
  validate,
  guideController.requestUpgrade
);

/**
 * @route   GET /api/guides/profile
 * @desc    الحصول على الملف الشخصي للمرشد
 * @access  Private
 */
router.get('/profile', protect, guideController.getGuideProfile);

/**
 * @route   PUT /api/guides/profile
 * @desc    تحديث الملف الشخصي للمرشد
 * @access  Private
 */
router.put(
  '/profile',
  protect,
  profileUpdateValidation,
  validate,
  guideController.updateGuideProfile
);

/**
 * @route   POST /api/guides/change-password
 * @desc    تغيير كلمة المرور
 * @access  Private
 */
router.post(
  '/change-password',
  protect,
  passwordChangeValidation,
  validate,
  guideController.changePassword
);

// ============================================
// ✅ مسارات المشرف (Admin only)
// ============================================

/**
 * @route   GET /api/guides/pending-registrations
 * @desc    الحصول على طلبات الترقية المعلقة
 * @access  Private (Admin only)
 */
router.get(
  '/pending-registrations',
  protect,
  authorize('admin'),
  guideController.getPendingRegistrations
);

/**
 * @route   PUT /api/guides/approve/:registrationId
 * @desc    الموافقة على طلب ترقية
 * @access  Private (Admin only)
 */
router.put(
  '/approve/:registrationId',
  protect,
  authorize('admin'),
  guideController.approveGuideRegistration
);

/**
 * @route   PUT /api/guides/reject/:registrationId
 * @desc    رفض طلب ترقية
 * @access  Private (Admin only)
 */
router.put(
  '/reject/:registrationId',
  protect,
  authorize('admin'),
  guideController.rejectGuideRegistration
);

// ============================================
// ✅ Test route
// ============================================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Guide routes are working with PostgreSQL',
    timestamp: new Date().toISOString(),
    endpoints: {
      login: 'POST /api/guides/login',
      upgrade: 'POST /api/guides/upgrade',
      profile: 'GET /api/guides/profile',
      updateProfile: 'PUT /api/guides/profile',
      changePassword: 'POST /api/guides/change-password',
      pendingRegistrations: 'GET /api/guides/pending-registrations (Admin)',
      approve: 'PUT /api/guides/approve/:registrationId (Admin)',
      reject: 'PUT /api/guides/reject/:registrationId (Admin)'
    }
  });
});

export default router;

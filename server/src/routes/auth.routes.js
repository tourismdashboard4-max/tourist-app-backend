const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { body } = require('express-validator');

// قواعد التحقق من صحة البيانات
const registerValidation = [
  body('fullName').notEmpty().withMessage('الاسم الكامل مطلوب').isLength({ min: 3 }).withMessage('الاسم يجب أن يكون 3 أحرف على الأقل'),
  body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('phone').matches(/^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/).withMessage('رقم الجوال غير صحيح')
];

const loginValidation = [
  body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  body('password').notEmpty().withMessage('كلمة المرور مطلوبة')
];

const otpValidation = [
  body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('رمز التحقق يجب أن يكون 6 أرقام')
];

// ===================== المسارات العامة =====================

/**
 * @route   POST /api/auth/register
 * @desc    تسجيل مستخدم جديد
 * @access  Public
 */
router.post('/register', registerValidation, validate, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    تسجيل الدخول
 * @access  Public
 */
router.post('/login', loginValidation, validate, authController.login);

/**
 * @route   POST /api/auth/send-otp
 * @desc    إرسال رمز التحقق
 * @access  Public
 */
router.post('/send-otp', body('email').isEmail(), validate, authController.sendOTP);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    التحقق من رمز OTP
 * @access  Public
 */
router.post('/verify-otp', otpValidation, validate, authController.verifyOTP);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    تحديث التوكن
 * @access  Public
 */
router.post('/refresh-token', authController.refreshToken);

// ===================== المسارات المحمية =====================

/**
 * @route   GET /api/auth/me
 * @desc    الحصول على الملف الشخصي
 * @access  Private
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    تحديث الملف الشخصي
 * @access  Private
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    تغيير كلمة المرور
 * @access  Private
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * @route   POST /api/auth/avatar
 * @desc    تحديث الصورة الشخصية
 * @access  Private
 */
router.post('/avatar', authenticate, authController.updateAvatar);

/**
 * @route   POST /api/auth/logout
 * @desc    تسجيل الخروج
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

module.exports = router;
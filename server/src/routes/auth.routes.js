const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ===================== إعداد multer لرفع الصور =====================
// التأكد من وجود مجلد uploads
const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// إعداد multer لتخزين الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('الرجاء اختيار صورة بصيغة JPG أو PNG أو GIF'));
    }
  }
});

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

// ===================== مسارات التحقق من الجوال =====================
const phoneValidation = [
  body('phoneNumber').matches(/^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/).withMessage('رقم الجوال غير صحيح')
];

const phoneVerifyValidation = [
  body('phoneNumber').matches(/^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/).withMessage('رقم الجوال غير صحيح'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('رمز التحقق يجب أن يكون 6 أرقام')
];

/**
 * @route   POST /api/auth/verify-phone/send
 * @desc    إرسال رمز التحقق للجوال
 * @access  Private
 */
router.post('/verify-phone/send', authenticate, phoneValidation, validate, authController.sendPhoneOTP);

/**
 * @route   POST /api/auth/verify-phone/verify
 * @desc    التحقق من رمز الجوال
 * @access  Private
 */
router.post('/verify-phone/verify', authenticate, phoneVerifyValidation, validate, authController.verifyPhoneOTP);

/**
 * @route   POST /api/auth/verify-phone/resend
 * @desc    إعادة إرسال رمز التحقق للجوال
 * @access  Private
 */
router.post('/verify-phone/resend', authenticate, phoneValidation, validate, authController.resendPhoneOTP);

/**
 * @route   PUT /api/users/:userId/phone
 * @desc    تحديث رقم الجوال بعد التحقق
 * @access  Private
 */
router.put('/users/:userId/phone', authenticate, authController.updateUserPhone);

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
router.post('/avatar', authenticate, upload.single('avatar'), authController.updateAvatar);

/**
 * @route   POST /api/auth/profile/:userId/avatar
 * @desc    رفع الصورة الشخصية (مسار بديل)
 * @access  Private
 */
router.post('/profile/:userId/avatar', authenticate, upload.single('avatar'), authController.updateAvatar);

/**
 * @route   POST /api/auth/logout
 * @desc    تسجيل الخروج
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

module.exports = router;
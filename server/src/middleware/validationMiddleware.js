// ============================================
// VALIDATION MIDDLEWARE
// التحقق من صحة البيانات
// ============================================
const { body, param, query, validationResult } = require('express-validator');

// ============================================
// دالة التحقق من النتائج
// ============================================
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في صحة البيانات',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// ============================================
// التحقق من تسجيل المرشد
// ============================================
const validateGuideRegistration = [
  body('fullName')
    .notEmpty().withMessage('الاسم الكامل مطلوب')
    .isLength({ min: 3, max: 50 }).withMessage('الاسم يجب أن يكون بين 3 و 50 حرف'),
  
  body('civilId')
    .notEmpty().withMessage('رقم الهوية مطلوب')
    .matches(/^\d{10}$/).withMessage('رقم الهوية يجب أن يكون 10 أرقام'),
  
  body('licenseNumber')
    .notEmpty().withMessage('رقم الرخصة مطلوب')
    .matches(/^[A-Z]{3}-\d{4}-\d{4}$/).withMessage('صيغة الرخصة غير صحيحة (مثال: TRL-1234-5678)'),
  
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صحيح')
    .normalizeEmail(),
  
  body('phone')
    .notEmpty().withMessage('رقم الجوال مطلوب')
    .matches(/^(05|\+9665)[0-9]{8}$/).withMessage('رقم الجوال غير صحيح (مثال: 05xxxxxxxx أو +9665xxxxxxxx)'),
  
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 }).withMessage('سنوات الخبرة يجب أن تكون بين 0 و 50'),
  
  body('specialties')
    .optional()
    .isLength({ max: 200 }).withMessage('التخصصات يجب أن لا تتجاوز 200 حرف'),
  
  body('programLocation')
    .optional()
    .isURL().withMessage('رابط الموقع غير صحيح'),
  
  checkValidation
];

// ============================================
// التحقق من تسجيل دخول المرشد
// ============================================
const validateGuideLogin = [
  body('licenseNumber')
    .notEmpty().withMessage('رقم الرخصة مطلوب'),
  
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة'),
  
  checkValidation
];

// ============================================
// التحقق من تحديث الملف الشخصي
// ============================================
const validateProfileUpdate = [
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
  
  checkValidation
];

// ============================================
// التحقق من تغيير كلمة المرور
// ============================================
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
  
  body('newPassword')
    .notEmpty().withMessage('كلمة المرور الجديدة مطلوبة')
    .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),
  
  checkValidation
];

// ============================================
// التحقق من إعادة تعيين كلمة المرور
// ============================================
const validatePasswordReset = [
  body('token')
    .notEmpty().withMessage('رمز إعادة التعيين مطلوب'),
  
  body('newPassword')
    .notEmpty().withMessage('كلمة المرور الجديدة مطلوبة')
    .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  
  checkValidation
];

// ============================================
// التحقق من إنشاء برنامج سياحي
// ============================================
const validateProgramCreation = [
  body('name')
    .notEmpty().withMessage('اسم البرنامج مطلوب')
    .isLength({ min: 3, max: 100 }).withMessage('اسم البرنامج يجب أن يكون بين 3 و 100 حرف'),
  
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('الوصف يجب أن لا يتجاوز 500 حرف'),
  
  body('price')
    .notEmpty().withMessage('السعر مطلوب')
    .isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقماً موجباً'),
  
  body('duration')
    .notEmpty().withMessage('المدة مطلوبة'),
  
  body('location')
    .notEmpty().withMessage('الموقع مطلوب'),
  
  body('maxParticipants')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('عدد المشاركين يجب أن يكون بين 1 و 100'),
  
  checkValidation
];

// ============================================
// التحقق من معرف (ID)
// ============================================
const validateId = [
  param('id')
    .isMongoId().withMessage('معرف غير صالح'),
  checkValidation
];

// ============================================
// التحقق من البريد الإلكتروني
// ============================================
const validateEmail = [
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  checkValidation
];

// ============================================
// تصدير جميع دوال التحقق
// ============================================
module.exports = {
  validateGuideRegistration,
  validateGuideLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validatePasswordReset,
  validateProgramCreation,
  validateId,
  validateEmail,
  checkValidation
};
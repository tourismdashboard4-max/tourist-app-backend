// ============================================
// RATE LIMIT MIDDLEWARE
// تحديد عدد الطلبات
// ============================================
const rateLimit = require('express-rate-limit');

// ============================================
// حد عام لجميع API
// ============================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب لكل IP
  message: {
    success: false,
    message: 'عدد كبير جداً من المحاولات، الرجاء المحاولة بعد 15 دقيقة'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// حد خاص بالمصادقة (أقل)
// ============================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات فقط
  message: {
    success: false,
    message: 'عدد كبير جداً من محاولات الدخول، الرجاء المحاولة بعد 15 دقيقة'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // لا تحسب المحاولات الناجحة
});

// ============================================
// حد خاص بالتسجيل
// ============================================
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ساعة
  max: 3, // 3 محاولات تسجيل فقط
  message: {
    success: false,
    message: 'عدد كبير جداً من محاولات التسجيل، الرجاء المحاولة بعد ساعة'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// حد خاص بإعادة تعيين كلمة المرور
// ============================================
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ساعة
  max: 3, // 3 محاولات
  message: {
    success: false,
    message: 'عدد كبير جداً من محاولات إعادة تعيين كلمة المرور، الرجاء المحاولة بعد ساعة'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// حد خاص برفع الملفات
// ============================================
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ساعة
  max: 10, // 10 ملفات
  message: {
    success: false,
    message: 'عدد كبير جداً من محاولات رفع الملفات، الرجاء المحاولة بعد ساعة'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// حد خاص بـ API الخرائط
// ============================================
const mapApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ساعة
  max: 1000, // 1000 طلب
  message: {
    success: false,
    message: 'عدد كبير جداً من طلبات الخريطة، الرجاء المحاولة بعد ساعة'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// حد صارم جداً (للحماية من الهجمات)
// ============================================
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ساعة
  max: 20, // 20 طلب
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح، الرجاء المحاولة بعد ساعة'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// تصدير جميع الحدود
// ============================================
module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  uploadLimiter,
  mapApiLimiter,
  strictLimiter
};
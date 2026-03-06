// src/components/Auth/index.js
/**
 * ============================================
 *           AUTH COMPONENTS EXPORT
 * ============================================
 * تجميع جميع مكونات نظام المصادقة
 * النسخة النهائية الموحدة
 * ============================================
 */

// ==================== مكونات المصادقة ====================

// تخطيط المصادقة
export { default as AuthLayout } from './AuthLayout.jsx';

// مكونات الدخول
export { default as UserLogin } from './UserLogin.jsx';
export { default as GuideLogin } from './GuideLogin.jsx';

// مكونات التسجيل
export { default as RegisterForm } from './RegisterForm.jsx';
export { default as ForgotPassword } from './ForgotPassword.jsx';

// سياق المصادقة مع جميع التصديرات
export { 
  default as AuthContext, 
  AuthProvider, 
  useAuth, 
  withAuth, 
  withGuideAuth 
} from './AuthContext.jsx';

// ==================== ثوابت المصادقة ====================

export const AUTH_TYPES = {
  USER: 'user',
  GUIDE: 'guide',
  ADMIN: 'admin',
  VISITOR: 'visitor'
};

export const AUTH_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

export const AUTH_MESSAGES = {
  LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
  LOGIN_FAILED: 'فشل تسجيل الدخول. تحقق من البيانات',
  REGISTER_SUCCESS: 'تم التسجيل بنجاح',
  REGISTER_FAILED: 'فشل التسجيل',
  LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح',
  FORGOT_PASSWORD_SENT: 'تم إرسال رابط استعادة كلمة المرور',
  PASSWORD_RESET_SUCCESS: 'تم تغيير كلمة المرور بنجاح',
  EMAIL_VERIFICATION_SENT: 'تم إرسال رسالة التحقق إلى بريدك',
  ACCOUNT_CREATED: 'تم إنشاء الحساب بنجاح'
};

export const AUTH_ERRORS = {
  INVALID_EMAIL: 'بريد إلكتروني غير صحيح',
  INVALID_PASSWORD: 'كلمة مرور غير صحيحة',
  EMAIL_EXISTS: 'البريد الإلكتروني مستخدم بالفعل',
  USER_NOT_FOUND: 'المستخدم غير موجود',
  WRONG_PASSWORD: 'كلمة المرور غير صحيحة',
  ACCOUNT_DISABLED: 'الحساب موقوف',
  TOKEN_EXPIRED: 'انتهت صلاحية الجلسة',
  NETWORK_ERROR: 'خطأ في الاتصال بالخادم'
};

// ==================== دوال التحقق ====================

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    valid: emailRegex.test(email),
    message: emailRegex.test(email) ? 'بريد صحيح' : 'بريد إلكتروني غير صحيح'
  };
};

export const validatePassword = (password) => {
  if (password.length < 8) {
    return { 
      valid: false, 
      message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' 
    };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return { 
      valid: false, 
      message: 'يجب أن تحتوي على حروف كبيرة وصغيرة وأرقام' 
    };
  }
  
  return { valid: true, message: 'كلمة مرور صحيحة' };
};

export const validatePhone = (phone) => {
  const phoneRegex = /^(?:\+966|0)?5[0-9]{8}$/;
  return {
    valid: phoneRegex.test(phone),
    message: phoneRegex.test(phone) ? 'رقم صحيح' : 'رقم هاتف غير صحيح'
  };
};

export const validateLicenseNumber = (license) => {
  const licenseRegex = /^[A-Z]{3}-\d{4}-\d{4}$/;
  return {
    valid: licenseRegex.test(license),
    message: licenseRegex.test(license) ? 'رقم الرخصة صحيح' : 'صيغة الرخصة غير صحيحة (مثال: TRL-1234-5678)'
  };
};

export const validateFullName = (name) => {
  if (!name || name.trim().length < 3) {
    return { 
      valid: false, 
      message: 'الاسم يجب أن يكون 3 أحرف على الأقل' 
    };
  }
  
  const nameRegex = /^[\u0600-\u06FF\s]+$/;
  if (!nameRegex.test(name.trim())) {
    return { 
      valid: false, 
      message: 'الاسم يجب أن يحتوي على أحرف عربية فقط' 
    };
  }
  
  return { valid: true, message: 'اسم صحيح' };
};

// ==================== دوال التنسيق ====================

export const formatPhoneNumber = (phone) => {
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.startsWith('966')) {
    return `+${numbers}`;
  }
  
  if (numbers.startsWith('0')) {
    return `+966${numbers.substring(1)}`;
  }
  
  if (numbers.length === 9 && numbers.startsWith('5')) {
    return `+966${numbers}`;
  }
  
  return numbers;
};

export const formatLicenseNumber = (license) => {
  const clean = license.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (clean.length >= 3) {
    const part1 = clean.substring(0, 3);
    const part2 = clean.substring(3, 7);
    const part3 = clean.substring(7, 11);
    
    let formatted = part1;
    if (part2) formatted += `-${part2}`;
    if (part3) formatted += `-${part3}`;
    
    return formatted;
  }
  
  return license.toUpperCase();
};

// ==================== أدوات مساعدة ====================

export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: 'غير معروفة', color: '#9ca3af' };
  
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;

  const strengthMap = [
    { label: 'ضعيفة جداً', color: '#ef4444' },
    { label: 'ضعيفة', color: '#f97316' },
    { label: 'متوسطة', color: '#eab308' },
    { label: 'جيدة', color: '#84cc16' },
    { label: 'قوية', color: '#22c55e' },
    { label: 'قوية جداً', color: '#16a34a' }
  ];

  return strengthMap[strength] || strengthMap[0];
};

export const generateRandomCode = (length = 6) => {
  return Math.random().toString().slice(2, 2 + length);
};

export const maskEmail = (email) => {
  if (!email.includes('@')) return email;
  
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1)
    : local;
  
  return `${maskedLocal}@${domain}`;
};

// ==================== دوال المصادقة المساعدة ====================

export const checkPasswordMatch = (password, confirmPassword) => {
  return {
    match: password === confirmPassword,
    message: password === confirmPassword ? 'كلمات المرور متطابقة' : 'كلمتا المرور غير متطابقتين'
  };
};

export const getAuthRedirect = (userType) => {
  const redirects = {
    [AUTH_TYPES.USER]: '/dashboard',
    [AUTH_TYPES.GUIDE]: '/guide/dashboard',
    [AUTH_TYPES.ADMIN]: '/admin/dashboard',
    [AUTH_TYPES.VISITOR]: '/'
  };
  
  return redirects[userType] || '/';
};

export const shouldRememberMe = (remember) => {
  if (remember) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); // 30 يوم
    return expiry;
  }
  return null; // جلسة المتصفح فقط
};

// ==================== تصدير كائن موحد ====================

const AuthUtils = {
  // الثوابت
  TYPES: AUTH_TYPES,
  STATUS: AUTH_STATUS,
  MESSAGES: AUTH_MESSAGES,
  ERRORS: AUTH_ERRORS,
  
  // دوال التحقق
  validateEmail,
  validatePassword,
  validatePhone,
  validateLicenseNumber,
  validateFullName,
  
  // دوال التنسيق
  formatPhoneNumber,
  formatLicenseNumber,
  
  // أدوات مساعدة
  getPasswordStrength,
  generateRandomCode,
  maskEmail,
  
  // دوال المصادقة
  checkPasswordMatch,
  getAuthRedirect,
  shouldRememberMe
};

// تصدير الكائن الموحد كتصدير إضافي
export { AuthUtils };
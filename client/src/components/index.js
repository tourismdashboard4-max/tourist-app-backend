// src/components/index.js
/**
 * ================================================
 *           MAIN COMPONENTS EXPORT FILE
 * ================================================
 * الملف الرئيسي لتصدير جميع مكونات التطبيق
 * الإصدار النهائي الموحد
 * ================================================
 */

// ==================== UI Components ====================
export { Button, Input, Card, Modal, Spinner } from './ui';

// ==================== Auth Components ====================
export { 
  AuthLayout,
  UserLogin,
  GuideLogin,
  RegisterForm,
  ForgotPassword,
  AuthContext,
  AuthProvider,
  useAuth,
  withAuth,
  withGuideAuth,
  AUTH_TYPES,
  AUTH_STATUS,
  AUTH_MESSAGES,
  AUTH_ERRORS,
  validateEmail,
  validatePassword,
  validatePhone,
  validateFullName,
  formatPhoneNumber,
  getPasswordStrength
} from './Auth';

// ==================== ثوابت التطبيق ====================
export const APP_ROLES = {
  VISITOR: 'visitor',
  USER: 'user',
  GUIDE: 'guide',
  ADMIN: 'admin'
};

export const APP_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  GUIDE_LOGIN: '/guide/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  GUIDE_DASHBOARD: '/guide/dashboard',
  ADMIN_DASHBOARD: '/admin/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  MAP: '/map',
  TOURS: '/tours',
  ABOUT: '/about',
  CONTACT: '/contact',
  PRIVACY: '/privacy',
  TERMS: '/terms'
};

export const APP_THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

export const APP_PERMISSIONS = {
  // صلاحيات عامة
  VIEW_HOME: 'view_home',
  VIEW_PROFILE: 'view_profile',
  VIEW_SETTINGS: 'view_settings',
  
  // صلاحيات المستخدم
  BOOK_TOUR: 'book_tour',
  WRITE_REVIEW: 'write_review',
  SAVE_TO_WISHLIST: 'save_to_wishlist',
  CANCEL_BOOKING: 'cancel_booking',
  EDIT_PROFILE: 'edit_profile',
  
  // صلاحيات المرشد
  CREATE_TOUR: 'create_tour',
  EDIT_TOUR: 'edit_tour',
  DELETE_TOUR: 'delete_tour',
  MANAGE_TOURS: 'manage_tours',
  MANAGE_BOOKINGS: 'manage_bookings',
  MANAGE_GUIDE_PROFILE: 'manage_guide_profile',
  VIEW_GUIDE_ANALYTICS: 'view_guide_analytics',
  
  // صلاحيات المدير
  MANAGE_USERS: 'manage_users',
  MANAGE_GUIDES: 'manage_guides',
  MANAGE_CONTENT: 'manage_content',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_REPORTS: 'view_reports',
  MANAGE_ROLES: 'manage_roles'
};

// ==================== أدوات مساعدة ====================
export const formatDate = (date, locale = 'ar-SA') => {
  if (!date) return '';
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTime = (date, locale = 'ar-SA') => {
  if (!date) return '';
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatCurrency = (amount, currency = 'SAR') => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// ==================== دوال إضافية ====================
export const isEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

export const isPhone = (value) => {
  const phoneRegex = /^(?:\+966|0)?5[0-9]{8}$/;
  return phoneRegex.test(value);
};

export const isPasswordStrong = (password) => {
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers;
};

// ==================== كائن موحد للاستيراد ====================
const TouristComponents = {
  // المكونات
  UI: {
    Button,
    Input,
    Card,
    Modal,
    Spinner
  },
  
  Auth: {
    AuthLayout,
    UserLogin,
    GuideLogin,
    RegisterForm,
    ForgotPassword,
    AuthContext,
    AuthProvider,
    useAuth,
    withAuth,
    withGuideAuth
  },
  
  // الثوابت
  Constants: {
    ROLES: APP_ROLES,
    ROUTES: APP_ROUTES,
    THEME: APP_THEME,
    PERMISSIONS: APP_PERMISSIONS,
    AUTH_TYPES,
    AUTH_STATUS,
    AUTH_MESSAGES,
    AUTH_ERRORS
  },
  
  // الأدوات
  Utils: {
    validateEmail,
    validatePassword,
    validatePhone,
    validateFullName,
    formatPhoneNumber,
    getPasswordStrength,
    formatDate,
    formatDateTime,
    formatCurrency,
    truncateText,
    isEmail,
    isPhone,
    isPasswordStrong
  }
};

// تصدير الكائن الموحد
export { TouristComponents };

// ================================================
// ملاحظة: هذه هي النسخة النهائية
// آخر تحديث: 2024
// ================================================
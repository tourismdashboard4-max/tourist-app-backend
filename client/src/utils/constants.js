// ===================== ثوابت التطبيق العامة =====================

// أنواع المستخدمين
export const USER_TYPES = {
  TOURIST: 'tourist',
  GUIDE: 'guide',
  ADMIN: 'admin'
};

// حالات الحجز
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
};

// طرق الدفع
export const PAYMENT_METHODS = {
  WALLET: 'wallet',
  CASH: 'cash',
  CARD: 'card',
  APPLE_PAY: 'apple_pay',
  STC_PAY: 'stc_pay'
};

// أنواع المعاملات
export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAW: 'withdraw',
  BOOKING: 'booking',
  REFUND: 'refund',
  FEE: 'fee'
};

// حالات المعاملات
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// أنواع البرامج
export const PROGRAM_TYPES = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
};

// اللغات المدعومة
export const SUPPORTED_LANGUAGES = {
  AR: 'ar',
  EN: 'en'
};

// العملات المدعومة
export const CURRENCIES = {
  SAR: 'SAR',
  USD: 'USD'
};

// حدود النظام
export const SYSTEM_LIMITS = {
  MIN_PROGRAM_PRICE: 25,
  MAX_PROGRAM_PRICE: 10000,
  MIN_WITHDRAW_AMOUNT: 100,
  MAX_WITHDRAW_AMOUNT: 50000,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  NEGATIVE_BALANCE_LIMIT: -250
};

// نسب الرسوم
export const FEE_RATES = {
  PLATFORM: 0.5,    // 0.5%
  BOOKING: 0.75,    // 0.75%
  MAP: 0.5,         // 0.5%
  PAYMENT: 0.5,     // 0.5%
  DISPUTE: 0.25,    // 0.25%
  TOTAL: 2.5        // 2.5%
};

// رموز HTTP
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

// مسارات التطبيق
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  WALLET: '/wallet',
  BOOKINGS: '/bookings',
  PROGRAMS: '/programs',
  CHAT: '/chat',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
  GUIDE_DASHBOARD: '/guide/dashboard'
};
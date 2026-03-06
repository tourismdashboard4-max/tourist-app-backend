const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// اتصال Redis (اختياري)
let redisClient;
try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  });
} catch (error) {
  console.warn('Redis not available, using memory store');
}

/**
 * محدد معدل الطلبات العام
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // الحد الأقصى للطلبات
  message: {
    success: false,
    message: 'عدد كبير جداً من الطلبات، يرجى المحاولة بعد 15 دقيقة'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:general:'
  }) : undefined
});

/**
 * محدد معدل طلبات المصادقة
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة
  max: 10, // 10 محاولات في الساعة
  message: {
    success: false,
    message: 'عدد كبير جداً من محاولات تسجيل الدخول، يرجى المحاولة بعد ساعة'
  },
  skipSuccessfulRequests: true,
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }) : undefined
});

/**
 * محدد معدل طلبات إرسال الرسائل
 */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // دقيقة
  max: 30, // 30 رسالة في الدقيقة
  message: {
    success: false,
    message: 'لقد تجاوزت الحد المسموح من الرسائل، يرجى الانتظار قليلاً'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:message:'
  }) : undefined
});

/**
 * محدد معدل طلبات API
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // دقيقة
  max: 60, // 60 طلب في الدقيقة
  message: {
    success: false,
    message: 'عدد كبير جداً من الطلبات، يرجى المحاولة بعد دقيقة'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }) : undefined
});

module.exports = {
  generalLimiter,
  authLimiter,
  messageLimiter,
  apiLimiter
};
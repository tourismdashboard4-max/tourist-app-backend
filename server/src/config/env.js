import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Environment variables validation
const requiredEnvVars = [
  'JWT_SECRET',
  'PORT',
  'NODE_ENV'
];

// Check for missing required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.error('\nPlease check your .env file');
  process.exit(1);
}

// Export configuration object
export const config = {
  // Server
  port: process.env.PORT || 5002,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Database - PostgreSQL
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    name: process.env.DB_NAME || 'touristapp',
    url: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/touristapp',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Wallet System
  wallet: {
    appWalletNumber: process.env.APP_WALLET_NUMBER || 'APP-FEES-001',
    negativeBalanceLimit: parseInt(process.env.NEGATIVE_BALANCE_LIMIT) || -250,
    minProgramPrice: parseInt(process.env.MIN_PROGRAM_PRICE) || 25,
    defaultDailyLimit: parseInt(process.env.DEFAULT_DAILY_LIMIT) || 5000,
    defaultMonthlyLimit: parseInt(process.env.DEFAULT_MONTHLY_LIMIT) || 25000,
  },

  // Fee Structure
  fees: {
    platformRate: parseFloat(process.env.PLATFORM_FEE_RATE) || 0.50,
    bookingRate: parseFloat(process.env.BOOKING_FEE_RATE) || 0.75,
    mapRate: parseFloat(process.env.MAP_FEE_RATE) || 0.50,
    paymentRate: parseFloat(process.env.PAYMENT_FEE_RATE) || 0.50,
    disputeRate: parseFloat(process.env.DISPUTE_FEE_RATE) || 0.25,
    totalRate: parseFloat(process.env.TOTAL_FEE_RATE) || 2.50,
  },

  // Payment Gateway
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'stripe',
    stripeKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    moyasarKey: process.env.MOYASAR_SECRET_KEY,
    moyasarPublishableKey: process.env.MOYASAR_PUBLISHABLE_KEY,
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@touristapp.com',
  },

  // Frontend/Backend URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5002',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
    credentials: true,
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY,
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc',
  },

  // Cron Jobs
  cronJobs: {
    monthlyFeesSchedule: process.env.MONTHLY_FEES_CRON || '0 0 1 * *',
    autoSuspensionSchedule: process.env.AUTO_SUSPENSION_CRON || '0 */6 * * *',
    notificationSchedule: process.env.NOTIFICATION_CRON || '*/30 * * * *',
  },

  // Upload
  upload: {
    maxSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif').split(','),
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  },

  // Cache
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 60 * 60,
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 60 * 60,
  },

  // Mapbox
  mapbox: {
    token: process.env.MAPBOX_TOKEN,
  },

  // Debug
  debug: process.env.DEBUG === 'true',
};

// Helper function to get config
export const getConfig = (key) => {
  return key.split('.').reduce((obj, i) => obj?.[i], config);
};

// Validate critical configurations
const validateConfig = () => {
  const warnings = [];

  if (config.isProduction) {
    if (config.jwt.secret === 'your-super-secret-jwt-key-change-this') {
      warnings.push('⚠️ Using default JWT secret in production!');
    }
    
    if (!config.payment.stripeKey && config.payment.provider === 'stripe') {
      warnings.push('⚠️ Stripe key not configured in production!');
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️ Configuration Warnings:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
    console.warn('');
  }
};

// Run validation in non-test environments
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

// Log configuration in development
if (config.isDevelopment) {
  console.log('\n📋 Environment Configuration:');
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Frontend URL: ${config.frontendUrl}`);
  console.log(`   Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
  console.log(`   Total Fee Rate: ${config.fees.totalRate}%\n`);
}
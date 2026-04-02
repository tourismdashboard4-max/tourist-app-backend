// server/index.js - الملف الكامل مع تعديل دالة رفع الصورة لدعم UUID

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pkg from 'pg';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const { Pool } = pkg;

// الحصول على __dirname في ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// استيراد المسارات
import authRoutes from './src/routes/authRoutes.js';
import guideRoutes from './src/routes/guideRoutes.js';
import programRoutes from './src/routes/programRoutes.js';
import walletRoutes from './src/routes/walletRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import supportRoutes from './src/routes/supportRoutes.js';
import upgradeRoutes from './src/routes/upgradeRoutes.js';

// استيراد دوال الوقت المساعدة
import { createExpiryDate, isOTPValid, getTimeRemaining } from './src/utils/timeUtils.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5002;

// ===================== إعداد WebSocket =====================
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173', 
      'http://localhost:5174', 
      'http://localhost:5175', 
      'http://localhost:5176',
      'http://localhost:5177',
      'https://tourist-app-api.onrender.com'
    ],
    credentials: true
  }
});

// تخزين المستخدمين المتصلين
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('user-connected', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('users-online', Array.from(onlineUsers.keys()));
    console.log(`👤 User ${userId} is online`);
  });

  socket.on('join-chat', (chatId) => {
    socket.join(`chat:${chatId}`);
    console.log(`📢 User joined chat: ${chatId}`);
  });

  socket.on('leave-chat', (chatId) => {
    socket.leave(`chat:${chatId}`);
  });

  socket.on('send-message', (message) => {
    socket.to(`chat:${message.chatId}`).emit('new-message', message);
  });

  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(`chat:${chatId}`).emit('typing', { userId: socket.userId, isTyping });
  });

  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }
    if (disconnectedUserId) {
      io.emit('users-online', Array.from(onlineUsers.keys()));
      console.log(`👋 User ${disconnectedUserId} disconnected`);
    }
  });
});

// ===================== إعداد PostgreSQL السحابي (Supabase) =====================
let pool;
let poolConfig;

// التأكد من وجود DATABASE_URL (مطلوب للسحابي)
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is required for cloud connection!');
  console.error('⚠️ Please add DATABASE_URL to your environment variables');
  console.error('📝 Example: postgresql://postgres.sqcdxhmnrbazrzeswxmv:1Z8EorhYqsAClmLn@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true');
  process.exit(1);
}

// ✅ استخدام DATABASE_URL للسحابي
console.log('☁️ Connecting to Supabase Cloud via DATABASE_URL');
poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

pool = new Pool(poolConfig);

// ===================== إعداد رفع الصور =====================

// إنشاء مجلد uploads إذا لم يكن موجوداً
const uploadDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Created upload directory: ${uploadDir}`);
}

// إعداد multer للتخزين المؤقت في الذاكرة
const storage = multer.memoryStorage();

// فلترة الملفات
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter
});

// اختبار الاتصال بقاعدة البيانات السحابية
const connectDB = async () => {
  try {
    const client = await pool.connect();
    
    const hostMatch = process.env.DATABASE_URL.match(/@([^:]+)/);
    const host = hostMatch ? hostMatch[1] : 'supabase.co';
    
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   ✅ Supabase PostgreSQL Connected       ║
    ╠══════════════════════════════════════════╣
    ║  Host: ${host.padEnd(30)}║
    ║  Database: ${poolConfig.connectionString.split('/').pop().split('?')[0].padEnd(30)}║
    ║  Type: Cloud (Supabase)                 ║
    ║  SSL: Enabled ✅                         ║
    ║  Pool Size: 20                           ║
    ╚══════════════════════════════════════════╝
    `);
    
    client.release();

    pool.on('error', (err) => {
      console.error('❌ Supabase PostgreSQL connection error:', err);
    });

    pool.on('connect', () => {
      console.log('🔄 New client connected to Supabase PostgreSQL');
    });

    pool.on('remove', () => {
      console.log('🔄 Client removed from pool');
    });

    return true;
  } catch (error) {
    console.error(`
    ╔══════════════════════════════════════════╗
    ║   ❌ Supabase Connection Failed           ║
    ╠══════════════════════════════════════════╣
    ║  Error: ${error.message.substring(0, 30).padEnd(30)}║
    ║  Time: ${new Date().toLocaleString().padEnd(30)}║
    ╚══════════════════════════════════════════╝
    `);
    
    if (process.env.DATABASE_URL) {
      console.error('⚠️ Please check that DATABASE_URL is correct');
      console.error('🔑 Make sure your password is correct');
      console.error('🌐 Verify that your Supabase project is active');
    }
    
    return false;
  }
};

// ===================== Middleware =====================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'https://tourist-app-api.onrender.com'
  ],
  credentials: true
}));

app.use((req, res, next) => {
  console.log(`🕐 Request received at: ${new Date().toISOString()}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// خدمة الملفات الثابتة (للحل المحلي)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===================== Routes الرئيسية =====================
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Tourist App API is running on Supabase Cloud',
    docs: '/api/test',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      guides: '/api/guides',
      programs: '/api/programs',
      wallet: '/api/wallet',
      bookings: '/api/bookings',
      chats: '/api/chats',
      notifications: '/api/notifications',
      support: '/api/support',
      upgrade: '/api/upgrade',
      users: '/api/users'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/upgrade', upgradeRoutes);

// ===================== مسارات المستخدمين والصور (مع دعم UUID) =====================

// ✅ رفع الصورة الشخصية - مع دعم UUID
app.post('/api/users/:userId/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log(`📤 Uploading avatar for user: ${userId}`);
    console.log(`📤 File size: ${file.size} bytes, Type: ${file.mimetype}`);

    // التحقق من صيغة UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format. Expected UUID.' 
      });
    }

    const fileExt = path.extname(file.originalname).split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    
    // حفظ محلياً
    const localPath = path.join(uploadDir, fileName);
    fs.writeFileSync(localPath, file.buffer);
    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${fileName}`;
    
    // تحديث قاعدة البيانات - استخدام UUID مع ::uuid casting
    const result = await pool.query(
      `UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2::uuid RETURNING *`,
      [avatarUrl, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      avatar: avatarUrl,
      user: result.rows[0],
      message: 'تم رفع الصورة بنجاح'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'حدث خطأ في رفع الصورة'
    });
  }
});

// ✅ حذف الصورة الشخصية - مع دعم UUID
app.delete('/api/users/:userId/avatar', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // التحقق من صيغة UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format. Expected UUID.' 
      });
    }
    
    const result = await pool.query(
      `SELECT avatar FROM users WHERE id = $1::uuid`,
      [userId]
    );
    
    const currentAvatar = result.rows[0]?.avatar;
    
    if (currentAvatar && currentAvatar.includes('/uploads/')) {
      const fileName = currentAvatar.split('/').pop();
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await pool.query(
      `UPDATE users SET avatar = NULL, updated_at = NOW() WHERE id = $1::uuid`,
      [userId]
    );
    
    res.json({ 
      success: true, 
      message: 'تم حذف الصورة بنجاح'
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'حدث خطأ في حذف الصورة'
    });
  }
});

// ✅ تحديث الملف الشخصي - مع دعم UUID
app.put('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, bio, location } = req.body;
    
    // التحقق من صيغة UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format. Expected UUID.' 
      });
    }
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(bio);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(userId);
    
    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}::uuid
      RETURNING id, name, email, role, phone, avatar, is_guide, guide_status, bio, location, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    res.json({ 
      success: true, 
      user: result.rows[0],
      message: 'تم تحديث الملف الشخصي بنجاح'
    });
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'حدث خطأ في تحديث الملف الشخصي'
    });
  }
});

// ✅ جلب معلومات المستخدم - مع دعم UUID
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // التحقق من صيغة UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format. Expected UUID.' 
      });
    }
    
    const result = await pool.query(
      `SELECT id, name, email, role, phone, avatar, is_guide, guide_status, bio, location, created_at, updated_at 
       FROM users 
       WHERE id = $1::uuid`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    res.json({ success: true, user: result.rows[0] });
    
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'حدث خطأ في جلب البيانات'
    });
  }
});

// ✅ جلب جميع المستخدمين (للمسؤول)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, phone, avatar, is_guide, guide_status, bio, location, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المستخدمين' });
  }
});

// ===================== Route إضافي للمحفظة =====================
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📥 Fetching wallet for user: ${userId}`);
    
    const result = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1::uuid',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Wallet not found' 
      });
    }
    
    res.json({ 
      success: true, 
      wallet: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error fetching wallet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// ===================== Test route =====================
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ Server is working with Supabase PostgreSQL!',
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleString(),
    timezone: 'UTC',
    database: 'Supabase Cloud',
    websocket: 'enabled',
    onlineUsers: onlineUsers.size
  });
});

// ===================== Health check =====================
app.get('/health', async (req, res) => {
  const dbConnected = await connectDB().catch(() => false);
  
  let dbInfo = {};
  if (dbConnected) {
    try {
      const versionResult = await pool.query('SELECT version()');
      dbInfo.version = versionResult.rows[0].version.split(' ')[0] + ' ' + versionResult.rows[0].version.split(' ')[1];
    } catch (e) {
      dbInfo.version = 'PostgreSQL';
    }
  }
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleString(),
    timezone: 'UTC',
    uptime: process.uptime(),
    port: PORT,
    database: dbConnected ? 'connected' : 'disconnected',
    databaseType: 'Supabase Cloud',
    databaseVersion: dbInfo.version || 'Unknown',
    websocket: 'active',
    onlineUsers: onlineUsers.size
  });
});

// ============================================
// 📢 ADMIN NOTIFICATIONS API
// ============================================

async function sendAdminNotification(adminId, type, title, message, relatedId = null, priority = 'normal', actionUrl = null, metadata = {}) {
  try {
    const result = await pool.query(
      `INSERT INTO admin_notifications 
       (admin_id, type, title, message, related_id, priority, action_url, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [adminId, type, title, message, relatedId, priority, actionUrl, JSON.stringify(metadata)]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return null;
  }
}

async function sendNotificationToAllAdmins(type, title, message, relatedId = null, priority = 'normal', actionUrl = null, metadata = {}) {
  try {
    const admins = await pool.query(
      `SELECT id FROM users WHERE role IN ('admin', 'support')`
    );
    
    for (const admin of admins.rows) {
      await sendAdminNotification(admin.id, type, title, message, relatedId, priority, actionUrl, metadata);
    }
    return true;
  } catch (error) {
    console.error('Error sending to all admins:', error);
    return false;
  }
}

app.get('/api/admin/notifications', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    }
    
    const token = authHeader.split(' ')[1];
    let adminId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
    
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT * FROM admin_notifications 
      WHERE admin_id = $1
    `;
    const params = [adminId];
    let paramIndex = 2;
    
    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    const unreadResult = await pool.query(
      `SELECT COUNT(*) FROM admin_notifications 
       WHERE admin_id = $1 AND status = 'unread'`,
      [adminId]
    );
    
    res.json({
      success: true,
      notifications: result.rows,
      unreadCount: parseInt(unreadResult.rows[0].count),
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ success: false, message: 'فشل تحميل الإشعارات' });
  }
});

app.put('/api/admin/notifications/:id/read', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    }
    
    const token = authHeader.split(' ')[1];
    let adminId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
    
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE admin_notifications 
       SET status = 'read', read_at = NOW()
       WHERE id = $1 AND admin_id = $2
       RETURNING *`,
      [id, adminId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    }
    
    res.json({ success: true, notification: result.rows[0] });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'فشل تحديث الإشعار' });
  }
});

app.put('/api/admin/notifications/read-all', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    }
    
    const token = authHeader.split(' ')[1];
    let adminId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
    
    await pool.query(
      `UPDATE admin_notifications 
       SET status = 'read', read_at = NOW()
       WHERE admin_id = $1 AND status = 'unread'`,
      [adminId]
    );
    
    res.json({ success: true, message: 'تم تحديث جميع الإشعارات' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'فشل تحديث الإشعارات' });
  }
});

app.delete('/api/admin/notifications/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    }
    
    const token = authHeader.split(' ')[1];
    let adminId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
    
    const { id } = req.params;
    
    const result = await pool.query(
      `DELETE FROM admin_notifications 
       WHERE id = $1 AND admin_id = $2
       RETURNING id`,
      [id, adminId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    }
    
    res.json({ success: true, message: 'تم حذف الإشعار' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'فشل حذف الإشعار' });
  }
});

app.put('/api/admin/notifications/:id/archive', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    }
    
    const token = authHeader.split(' ')[1];
    let adminId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
    
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE admin_notifications 
       SET status = 'archived', archived_at = NOW()
       WHERE id = $1 AND admin_id = $2
       RETURNING *`,
      [id, adminId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    }
    
    res.json({ success: true, notification: result.rows[0] });
  } catch (error) {
    console.error('Error archiving notification:', error);
    res.status(500).json({ success: false, message: 'فشل أرشفة الإشعار' });
  }
});

// ===================== Database connection and server start =====================
const startServer = async () => {
  console.log('🚀 Starting server with Supabase Cloud connection...');
  
  const dbConnected = await connectDB();
  
  if (!dbConnected) {
    console.error('❌ Failed to connect to Supabase database. Exiting...');
    process.exit(1);
  }

  server.listen(PORT, '0.0.0.0', () => {
    setTimeout(() => {
      console.log(`
  ╔══════════════════════════════════════════════╗
  ║         🚀 TOURIST APP SERVER               ║
  ╠══════════════════════════════════════════════╣
  ║  ▶ Port:        ${PORT}
  ║  ▶ Database:    ✅ Supabase Cloud
  ║  ▶ WebSocket:   ✅ Enabled
  ║  ▶ SSL:         ✅ Enabled
  ║  ▶ Timezone:    UTC
  ║  ▶ Test API:    /api/test
  ║  ▶ Health:      /health
  ║  ▶ Uploads:     /uploads/avatars
  ╚══════════════════════════════════════════════╝
      `);
      console.log(`🕐 Server started at: ${new Date().toISOString()}`);
      console.log(`☁️ Connected to Supabase Cloud PostgreSQL`);
    }, 100);
  });
};

startServer();

// ===================== التصدير =====================
export { io, onlineUsers, pool, createExpiryDate, isOTPValid, getTimeRemaining };

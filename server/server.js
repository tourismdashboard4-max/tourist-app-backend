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
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const { Pool } = pkg;

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
      'http://localhost:5178',
      'http://localhost:5180',
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

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is required for cloud connection!');
  console.error('⚠️ Please add DATABASE_URL to your environment variables');
  process.exit(1);
}

console.log('☁️ Connecting to Supabase Cloud via DATABASE_URL');
poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // زيادة المهلة إلى 30 ثانية
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

pool = new Pool(poolConfig);

// دالة مساعدة لتحويل المعرف الرقمي إلى UUID
async function getUUIDFromNumericId(numericId) {
  console.log(`🔍 Looking for UUID with old_id = ${numericId}`);
  const result = await pool.query(
    'SELECT id FROM public.users WHERE old_id = $1',
    [parseInt(numericId)]
  );
  if (result.rows.length === 0) {
    console.warn(`⚠️ No user found with old_id = ${numericId}`);
    return null;
  }
  const uuid = result.rows[0].id;
  console.log(`✅ Found UUID: ${uuid} for old_id: ${numericId}`);
  return uuid;
}

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

    pool.on('error', (err) => console.error('❌ Supabase error:', err));
    pool.on('connect', () => console.log('🔄 New client connected'));
    pool.on('remove', () => console.log('🔄 Client removed from pool'));

    return true;
  } catch (error) {
    console.error('❌ Supabase Connection Failed:', error.message);
    return false;
  }
};

// ===================== Middleware =====================
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176',
    'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5180',
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

// ===================== إعداد رفع الصور (Multer + Sharp) =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.params.userId}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('نوع الملف غير مدعوم. استخدم JPG, PNG, GIF فقط.'));
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===================== Routes الرئيسية (قبل تحميل الـ Routers) =====================
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

// ===================== مسارات رفع الصور الشخصية =====================
app.post('/api/users/:userId/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: 'لم يتم إرسال أي صورة.' });

    const optimizedFilename = `optimized_${Date.now()}_${userId}.jpg`;
    const optimizedPath = path.join(uploadDir, optimizedFilename);
    await sharp(req.file.path).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(optimizedPath);
    fs.unlinkSync(req.file.path);
    const avatarUrl = `/uploads/avatars/${optimizedFilename}`;

    const result = await pool.query(
      `UPDATE app.users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING avatar_url`,
      [avatarUrl, userId]
    );
    if (result.rows.length === 0) {
      fs.unlinkSync(optimizedPath);
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
    }
    res.json({ success: true, message: 'تم رفع الصورة بنجاح', avatarUrl });
  } catch (error) {
    console.error('❌ Error uploading avatar:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم أثناء رفع الصورة.' });
  }
});

app.delete('/api/users/:userId/avatar', async (req, res) => {
  try {
    const { userId } = req.params;
    const userResult = await pool.query(`SELECT avatar_url FROM app.users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
    const oldAvatarUrl = userResult.rows[0].avatar_url;
    if (oldAvatarUrl) {
      const oldPath = path.join(__dirname, oldAvatarUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await pool.query(`UPDATE app.users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1`, [userId]);
    res.json({ success: true, message: 'تم حذف الصورة بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting avatar:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم أثناء حذف الصورة.' });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT id, email, full_name, phone, avatar_url, created_at FROM app.users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم.' });
  }
});

app.put('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, phone, email } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (full_name !== undefined) { updates.push(`full_name = $${paramIndex++}`); values.push(full_name); }
    if (phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }
    if (email !== undefined) { updates.push(`email = $${paramIndex++}`); values.push(email); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث.' });
    updates.push(`updated_at = NOW()`);
    values.push(userId);
    const query = `UPDATE app.users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, full_name, phone, email, avatar_url`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم.' });
  }
});

// ===================== مسارات البرامج (مُصلحة - تعتمد على guide_name من جدول programs) =====================

// ✅ جلب برامج مرشد معين
app.get('/api/guides/:guideId/programs', async (req, res) => {
  try {
    let guideId = req.params.guideId;
    console.log(`📥 Received request for guide: ${guideId}`);
    
    if (/^\d+$/.test(guideId)) {
      const realId = await getUUIDFromNumericId(guideId);
      if (!realId) {
        console.error(`❌ No UUID found for numeric guide ID: ${guideId}`);
        return res.status(404).json({ success: false, message: 'المرشد غير موجود' });
      }
      console.log(`🔄 Converted numeric ID ${guideId} to UUID: ${realId}`);
      guideId = realId;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(guideId)) {
      return res.status(400).json({ success: false, message: 'صيغة معرف المرشد غير صالحة' });
    }
    
    console.log(`🔍 Fetching programs for guide UUID: ${guideId}`);
    
    // ✅ استخدم guide_name من جدول programs مباشرة (لا JOIN)
    const result = await pool.query(
      `SELECT p.*, p.guide_name
       FROM programs p
       WHERE p.guide_id = $1
       ORDER BY p.created_at DESC`,
      [guideId]
    );
    
    console.log(`✅ Found ${result.rows.length} programs for guide ${guideId}`);
    res.json({ success: true, programs: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('❌ Error fetching guide programs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ جلب جميع البرامج (مع فلتر حسب المرشد)
app.get('/api/programs', async (req, res) => {
  try {
    let { guide_id } = req.query;
    let query = `
      SELECT p.*, p.guide_name
      FROM programs p
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    if (guide_id) {
      let realGuideId = guide_id;
      if (/^\d+$/.test(guide_id)) {
        const realId = await getUUIDFromNumericId(guide_id);
        if (realId) realGuideId = realId;
      }
      query += ` AND p.guide_id = $${paramIndex}`;
      params.push(realGuideId);
      paramIndex++;
    }
    query += ` ORDER BY p.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, programs: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('❌ Error fetching programs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ إضافة برنامج جديد
app.post('/api/programs', async (req, res) => {
  try {
    let { guide_id, name, description, price, duration, max_participants, location, location_name, location_lat, location_lng, image, status, guide_name } = req.body;
    let realGuideId = guide_id;
    if (/^\d+$/.test(String(guide_id))) {
      const realId = await getUUIDFromNumericId(guide_id);
      if (!realId) return res.status(404).json({ success: false, message: 'المرشد غير موجود' });
      realGuideId = realId;
    }
    const result = await pool.query(
      `INSERT INTO programs (guide_id, name, description, price, duration, max_participants, location, location_name, location_lat, location_lng, image, status, guide_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING *`,
      [realGuideId, name, description, price, duration, max_participants, location, location_name, location_lat, location_lng, image, status || 'active', guide_name || 'مرشد سياحي']
    );
    res.json({ success: true, program: result.rows[0], message: 'Program added successfully' });
  } catch (error) {
    console.error('❌ Error adding program:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ حذف برنامج
app.delete('/api/programs/:programId', async (req, res) => {
  try {
    const { programId } = req.params;
    const result = await pool.query(`DELETE FROM programs WHERE id = $1 RETURNING *`, [programId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, message: 'Program deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting program:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ تحديث حالة البرنامج
app.patch('/api/programs/:programId/status', async (req, res) => {
  try {
    const { programId } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE programs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, programId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, program: result.rows[0] });
  } catch (error) {
    console.error('❌ Error updating program status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== Route إضافي للمحفظة =====================
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📥 Fetching wallet for user: ${userId}`);
    const result = await pool.query('SELECT * FROM app.wallets WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Wallet not found' });
    res.json({ success: true, wallet: result.rows[0] });
  } catch (error) {
    console.error('❌ Error fetching wallet:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===================== تحميل الـ Routers (بعد مسارات البرامج) =====================
app.use('/api/auth', authRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/upgrade', upgradeRoutes);

// ===================== Test & Health =====================
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

app.get('/health', async (req, res) => {
  const dbConnected = await connectDB().catch(() => false);
  let dbInfo = {};
  if (dbConnected) {
    try {
      const versionResult = await pool.query('SELECT version()');
      dbInfo.version = versionResult.rows[0].version.split(' ')[0] + ' ' + versionResult.rows[0].version.split(' ')[1];
    } catch (e) { dbInfo.version = 'PostgreSQL'; }
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

// ===================== ADMIN NOTIFICATIONS API =====================
async function sendAdminNotification(adminId, type, title, message, relatedId = null, priority = 'normal', actionUrl = null, metadata = {}) {
  try {
    const result = await pool.query(
      `INSERT INTO app.admin_notifications 
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
    const admins = await pool.query(`SELECT id FROM app.users WHERE role IN ('admin', 'support')`);
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    const token = authHeader.split(' ')[1];
    let adminId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }
    const { status, limit = 50, offset = 0 } = req.query;
    let query = `SELECT * FROM app.admin_notifications WHERE admin_id = $1`;
    const params = [adminId];
    let paramIndex = 2;
    if (status && status !== 'all') { query += ` AND status = $${paramIndex}`; params.push(status); paramIndex++; }
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    const unreadResult = await pool.query(`SELECT COUNT(*) FROM app.admin_notifications WHERE admin_id = $1 AND status = 'unread'`, [adminId]);
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    const token = authHeader.split(' ')[1];
    let adminId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE app.admin_notifications SET status = 'read', read_at = NOW() WHERE id = $1 AND admin_id = $2 RETURNING *`,
      [id, adminId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    res.json({ success: true, notification: result.rows[0] });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'فشل تحديث الإشعار' });
  }
});

app.put('/api/admin/notifications/read-all', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    const token = authHeader.split(' ')[1];
    let adminId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }
    await pool.query(`UPDATE app.admin_notifications SET status = 'read', read_at = NOW() WHERE admin_id = $1 AND status = 'unread'`, [adminId]);
    res.json({ success: true, message: 'تم تحديث جميع الإشعارات' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'فشل تحديث الإشعارات' });
  }
});

app.delete('/api/admin/notifications/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    const token = authHeader.split(' ')[1];
    let adminId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM app.admin_notifications WHERE id = $1 AND admin_id = $2 RETURNING id`, [id, adminId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    res.json({ success: true, message: 'تم حذف الإشعار' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'فشل حذف الإشعار' });
  }
});

app.put('/api/admin/notifications/:id/archive', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
    const token = authHeader.split(' ')[1];
    let adminId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      adminId = decoded.id;
    } catch (err) { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE app.admin_notifications SET status = 'archived', archived_at = NOW() WHERE id = $1 AND admin_id = $2 RETURNING *`,
      [id, adminId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    res.json({ success: true, notification: result.rows[0] });
  } catch (error) {
    console.error('Error archiving notification:', error);
    res.status(500).json({ success: false, message: 'فشل أرشفة الإشعار' });
  }
});

// ===================== تشغيل الخادم =====================
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
  ╚══════════════════════════════════════════════╝
      `);
      console.log(`🕐 Server started at: ${new Date().toISOString()}`);
      console.log(`☁️ Connected to Supabase Cloud PostgreSQL`);
    }, 100);
  });
};

startServer();

export { io, onlineUsers, pool, createExpiryDate, isOTPValid, getTimeRemaining };

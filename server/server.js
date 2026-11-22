// server.js - النسخة النهائية المُصلحة
// ✅ الإصلاحات: (1) DATABASE_URL إلزامي بدون fallback مكشوف، (2) الخادم لا يتوقف عند فشل DB

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
import os from 'os';

const { Pool } = pkg;

import authRoutes from './src/routes/authRoutes.js';
import guideRoutes from './src/routes/guideRoutes.js';
import programRoutes from './src/routes/programRoutes.js';
import walletRoutes from './src/routes/walletRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import supportRoutes from './src/routes/supportRoutes.js';
import upgradeRoutes from './src/routes/upgradeRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';

import { createExpiryDate, isOTPValid, getTimeRemaining } from './src/utils/timeUtils.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5002;

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const isRender = !!process.env.RENDER;
console.log(`📡 Local IP: ${localIP}, Render: ${isRender}`);

// ===================== WebSocket =====================
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

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

  socket.on('leave-chat', (chatId) => socket.leave(`chat:${chatId}`));

  socket.on('send-message', (message) => {
    socket.to(`chat:${message.chatId}`).emit('new-message', message);
  });

  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(`chat:${chatId}`).emit('typing', { userId: socket.userId, isTyping });
  });

  socket.on('notify_guide', async (data) => {
    const { guideId, userId, userName, message, ticketId } = data;
    console.log(`📢 notify_guide for guide ${guideId}`);

    const guideSocketId = onlineUsers.get(guideId);
    if (guideSocketId) {
      io.to(guideSocketId).emit('guide_notification', {
        type: 'chat_message',
        from: userId,
        fromName: userName,
        message,
        ticketId,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Guide ${guideId} notified via socket`);
    } else if (pool) {
      try {
        await pool.query(`
          INSERT INTO app.notifications 
          (user_id, type, title, message, action_url, data, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          guideId, 'guide_chat',
          `رسالة جديدة من ${userName}`,
          message,
          `/guide/chats/${ticketId}`,
          JSON.stringify({ from_user: userId, from_name: userName, ticket_id: ticketId })
        ]);
        console.log(`✅ Notification stored for offline guide ${guideId}`);
      } catch (err) {
        console.error('Error storing notification:', err.message);
      }
    }
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

// ===================== ✅ إصلاح 1: DATABASE_URL إلزامي =====================
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(`
  ╔════════════════════════════════════════════════════════╗
  ║  ❌ FATAL: DATABASE_URL is NOT set                    ║
  ║                                                        ║
  ║  1. Supabase → Connect → Session pooler               ║
  ║  2. Copy full connection string                       ║
  ║  3. Render → Environment → DATABASE_URL → Paste       ║
  ║  4. Manual Deploy                                     ║
  ╚════════════════════════════════════════════════════════╝
  `);
} else {
  console.log('✅ DATABASE_URL is set');
  console.log(`🔗 ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);
}

let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    family: 4,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  });
  pool.on('error', (err) => console.error('❌ Pool error:', err.message));
  pool.on('connect', () => console.log('🔄 New DB client connected'));
  pool.on('remove', () => console.log('🔄 DB client removed'));
}

async function getUUIDFromNumericId(numericId) {
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT id FROM public.users WHERE old_id = $1',
      [parseInt(numericId)]
    );
    if (result.rows.length === 0) {
      console.warn(`⚠️ No user with old_id = ${numericId}`);
      return null;
    }
    return result.rows[0].id;
  } catch (err) {
    console.error(`❌ getUUIDFromNumericId:`, err.message);
    return null;
  }
}

const connectDB = async (retries = 1, delay = 0) => {
  if (!pool) {
    console.error('❌ Cannot connect: DATABASE_URL is missing');
    return false;
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      const hostMatch = DATABASE_URL.match(/@([^:]+)/);
      const host = hostMatch ? hostMatch[1] : 'unknown';
      console.log(`
    ╔══════════════════════════════════════════╗
    ║   ✅ Supabase PostgreSQL Connected       ║
    ╠══════════════════════════════════════════╣
    ║  Host: ${host.padEnd(31)}║
    ║  Pool Size: 20                           ║
    ╚══════════════════════════════════════════╝
      `);
      client.release();
      return true;
    } catch (error) {
      console.error(`❌ DB Connection Failed (attempt ${attempt}/${retries}):`, error.message);
      if (error.message.includes('ENOTFOUND') && error.message.includes('tenant/user')) {
        console.error(`
    ╔══════════════════════════════════════════════════════╗
    ║  🚨 SUPABASE PROJECT IS PAUSED OR DELETED            ║
    ║                                                      ║
    ║  → https://supabase.com/dashboard                    ║
    ║  → Find project sqcdxhmnrbazrzeswxmv                 ║
    ║  → Click "Restore project"                           ║
    ╚══════════════════════════════════════════════════════╝
        `);
      }
      if (attempt < retries && delay > 0) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return false;
};

// ===================== Middleware =====================
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use((req, res, next) => {
  console.log(`🕐 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ===================== Uploads =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');
const programsDir = path.join(uploadsDir, 'programs');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(programsDir)) fs.mkdirSync(programsDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

console.log(`📁 Uploads: ${uploadsDir}`);

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

app.get('/uploads/programs/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'programs', req.params.filename);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).json({ error: 'File not found', filename: req.params.filename });
});

app.get('/uploads/avatars/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'avatars', req.params.filename);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).json({ error: 'File not found' });
});

app.get('/api/check-image/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'programs', req.params.filename);
  res.json({
    filename: req.params.filename,
    exists: fs.existsSync(filePath),
    fullUrl: `${req.protocol}://${req.get('host')}/uploads/programs/${req.params.filename}`
  });
});

// ===================== Multer =====================
const uploadDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const programStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'programs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `program_${req.params.programId || 'x'}_${suffix}${path.extname(file.originalname)}`);
  }
});

const uploadProgramImages = multer({
  storage: programStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif/.test(path.extname(file.originalname).toLowerCase())
            && /jpeg|jpg|png|gif/.test(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('نوع الملف غير مدعوم. استخدم JPG, PNG, GIF فقط.'));
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar_${req.params.userId}_${suffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif/.test(path.extname(file.originalname).toLowerCase())
            && /jpeg|jpg|png|gif/.test(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('نوع الملف غير مدعوم. استخدم JPG, PNG, GIF فقط.'));
  }
});

// ===================== Routes الرئيسية =====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tourist App API is running',
    docs: '/api/test',
    health: '/health',
    environment: isRender ? 'Render Cloud' : 'Local',
    db: pool ? 'configured' : 'missing DATABASE_URL'
  });
});

// ===================== Users =====================
app.post('/api/users/:userId/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: 'لم يتم إرسال صورة' });

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
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    res.json({ success: true, message: 'تم رفع الصورة', avatarUrl });
  } catch (error) {
    console.error('❌ Upload avatar:', error.message);
    res.status(500).json({ success: false, message: 'خطأ في رفع الصورة' });
  }
});

app.delete('/api/users/:userId/avatar', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const { userId } = req.params;
    const r = await pool.query(`SELECT avatar_url FROM app.users WHERE id = $1`, [userId]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    if (r.rows[0].avatar_url) {
      const oldPath = path.join(__dirname, r.rows[0].avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await pool.query(`UPDATE app.users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1`, [userId]);
    res.json({ success: true, message: 'تم حذف الصورة' });
  } catch (error) {
    console.error('❌ Delete avatar:', error.message);
    res.status(500).json({ success: false, message: 'خطأ في حذف الصورة' });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const result = await pool.query(
      `SELECT id, email, full_name, phone, avatar_url, created_at FROM app.users WHERE id = $1`,
      [req.params.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('❌ Get user:', error.message);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

app.put('/api/users/:userId/profile', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const { full_name, phone, email } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    if (full_name !== undefined) { updates.push(`full_name = $${i++}`); values.push(full_name); }
    if (phone !== undefined) { updates.push(`phone = $${i++}`); values.push(phone); }
    if (email !== undefined) { updates.push(`email = $${i++}`); values.push(email); }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'لا توجد بيانات' });
    updates.push(`updated_at = NOW()`);
    values.push(req.params.userId);
    const result = await pool.query(
      `UPDATE app.users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, full_name, phone, email, avatar_url`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('❌ Update profile:', error.message);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// ===================== Programs =====================
app.get('/api/guides/:guideId/programs', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    let guideId = req.params.guideId;
    if (/^\d+$/.test(guideId)) {
      const realId = await getUUIDFromNumericId(guideId);
      if (!realId) return res.status(404).json({ success: false, message: 'المرشد غير موجود' });
      guideId = realId;
    }
    const result = await pool.query(
      `SELECT p.*, p.guide_name, p.safety_guidelines,
              COALESCE((SELECT json_agg(json_build_object(
                'id', pi.id, 'image_url', pi.image_url,
                'is_primary', pi.is_primary, 'display_order', pi.display_order
              ) ORDER BY pi.is_primary DESC, pi.display_order ASC)
              FROM program_images pi WHERE pi.program_id = p.id), '[]'::json) as images
       FROM programs p WHERE p.guide_id = $1 ORDER BY p.created_at DESC`,
      [guideId]
    );
    res.json({ success: true, programs: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('❌ Guide programs:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/programs', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const { guide_id } = req.query;
    let query = `
      SELECT p.*, p.guide_name, p.safety_guidelines,
        COALESCE((SELECT json_agg(json_build_object(
          'id', pi.id, 'image_url', pi.image_url,
          'is_primary', pi.is_primary, 'display_order', pi.display_order
        ) ORDER BY pi.is_primary DESC, pi.display_order ASC)
        FROM program_images pi WHERE pi.program_id = p.id), '[]'::json) as images
      FROM programs p WHERE p.status = 'active'
    `;
    const params = [];
    if (guide_id) {
      let realGuideId = guide_id;
      if (/^\d+$/.test(guide_id)) {
        const r = await getUUIDFromNumericId(guide_id);
        if (r) realGuideId = r;
      }
      query += ` AND p.guide_id = $1`;
      params.push(realGuideId);
    }
    query += ` ORDER BY p.created_at DESC`;
    const result = await pool.query(query, params);
    const programs = result.rows.map(row => {
      let imageUrls = [];
      if (row.images && Array.isArray(row.images)) imageUrls = row.images.map(i => i.image_url).filter(Boolean);
      if (imageUrls.length === 0 && row.image) imageUrls = [row.image];
      return { ...row, images: imageUrls, image: imageUrls[0] || null };
    });
    res.json({ success: true, programs, count: programs.length });
  } catch (error) {
    console.error('❌ Get programs:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/programs/:programId', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const result = await pool.query(`
      SELECT p.*, p.guide_name, p.safety_guidelines,
        COALESCE((SELECT json_agg(json_build_object(
          'id', pi.id, 'image_url', pi.image_url,
          'is_primary', pi.is_primary, 'display_order', pi.display_order
        ) ORDER BY pi.is_primary DESC, pi.display_order ASC)
        FROM program_images pi WHERE pi.program_id = p.id), '[]'::json) as images
      FROM programs p WHERE p.id = $1
    `, [req.params.programId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Program not found' });
    const row = result.rows[0];
    let imageUrls = [];
    if (row.images && Array.isArray(row.images)) imageUrls = row.images.map(i => i.image_url).filter(Boolean);
    if (imageUrls.length === 0 && row.image) imageUrls = [row.image];
    res.json({ success: true, program: { ...row, images: imageUrls, image: imageUrls[0] || null } });
  } catch (error) {
    console.error('❌ Get program:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/programs', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    let { guide_id, name, description, price, duration, max_participants, location, location_name, location_lat, location_lng, image, status, guide_name, safety_guidelines } = req.body;
    let realGuideId = guide_id;
    if (/^\d+$/.test(String(guide_id))) {
      const r = await getUUIDFromNumericId(guide_id);
      if (!r) return res.status(404).json({ success: false, message: 'المرشد غير موجود' });
      realGuideId = r;
    }
    const result = await pool.query(
      `INSERT INTO programs (guide_id, name, description, price, duration, max_participants, location, location_name, location_lat, location_lng, image, status, guide_name, safety_guidelines, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW()) RETURNING *`,
      [realGuideId, name, description, price, duration, max_participants, location, location_name, location_lat, location_lng, image, status || 'active', guide_name || 'مرشد سياحي', safety_guidelines || null]
    );
    res.json({ success: true, program: result.rows[0], message: 'Program added' });
  } catch (error) {
    console.error('❌ Add program:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/programs/:programId', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح' });
    let userId;
    try { userId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; }
    catch { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }

    let userUuid = userId;
    if (/^\d+$/.test(String(userId))) {
      const r = await getUUIDFromNumericId(userId);
      if (!r) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      userUuid = r;
    }
    const { programId } = req.params;
    const owner = await pool.query('SELECT guide_id FROM programs WHERE id = $1', [programId]);
    if (owner.rows.length === 0) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
    if (owner.rows[0].guide_id !== userUuid) return res.status(403).json({ success: false, message: 'لا تملك هذا البرنامج' });

    const { name, description, price, duration, max_participants, location, location_lat, location_lng, image, safety_guidelines } = req.body;
    const result = await pool.query(
      `UPDATE programs SET name=$1, description=$2, price=$3, duration=$4, max_participants=$5,
       location=$6, location_lat=$7, location_lng=$8, image=$9, safety_guidelines=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, description, price, duration, max_participants, location, location_lat, location_lng, image, safety_guidelines, programId]
    );
    res.json({ success: true, program: result.rows[0] });
  } catch (error) {
    console.error('❌ Update program:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/programs/:programId', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const result = await pool.query(`DELETE FROM programs WHERE id = $1 RETURNING *`, [req.params.programId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, message: 'Program deleted' });
  } catch (error) {
    console.error('❌ Delete program:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/programs/:programId/status', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const result = await pool.query(
      `UPDATE programs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [req.body.status, req.params.programId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, program: result.rows[0] });
  } catch (error) {
    console.error('❌ Update status:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== Program Images =====================
app.post('/api/programs/:programId/images', uploadProgramImages.array('images', 10), async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const { programId } = req.params;
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ success: false, message: 'لم يتم رفع صور' });

    const existing = await pool.query('SELECT COUNT(*) as count FROM program_images WHERE program_id = $1', [programId]);
    const startOrder = parseInt(existing.rows[0].count);
    const uploadedImages = [];
    let primaryImageUrl = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const optimizedFilename = `program_${programId}_${Date.now()}_${Math.round(Math.random() * 1E9)}_${i}${path.extname(file.originalname)}`;
      const optimizedPath = path.join(__dirname, 'uploads', 'programs', optimizedFilename);

      await sharp(file.path).resize(800, 600, { fit: 'inside' }).jpeg({ quality: 80 }).toFile(optimizedPath);
      fs.unlinkSync(file.path);
      const imageUrl = `/uploads/programs/${optimizedFilename}`;
      const isPrimary = (i === 0 && startOrder === 0);
      if (isPrimary) primaryImageUrl = imageUrl;

      const result = await pool.query(
        `INSERT INTO program_images (program_id, image_url, is_primary, display_order) VALUES ($1,$2,$3,$4) RETURNING *`,
        [programId, imageUrl, isPrimary, startOrder + i]
      );
      uploadedImages.push(result.rows[0]);
    }

    if (primaryImageUrl) {
      await pool.query('UPDATE programs SET image = $1, updated_at = NOW() WHERE id = $2', [primaryImageUrl, programId]);
    }
    const all = await pool.query('SELECT * FROM program_images WHERE program_id = $1 ORDER BY display_order ASC', [programId]);
    res.json({ success: true, images: all.rows });
  } catch (error) {
    console.error('❌ Upload images:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/programs/:programId/images', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const result = await pool.query(
      `SELECT id, image_url, is_primary, display_order FROM program_images WHERE program_id = $1 ORDER BY is_primary DESC, display_order ASC`,
      [req.params.programId]
    );
    res.json({ success: true, images: result.rows });
  } catch (error) {
    console.error('❌ Get images:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/programs/:programId/images/:imageId', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const { programId, imageId } = req.params;
    const img = await pool.query('SELECT image_url, is_primary FROM program_images WHERE id = $1 AND program_id = $2', [imageId, programId]);
    if (img.rows.length === 0) return res.status(404).json({ success: false, message: 'الصورة غير موجودة' });

    if (img.rows[0].is_primary) {
      const remaining = await pool.query('SELECT id, image_url FROM program_images WHERE program_id = $1 AND id != $2 ORDER BY display_order ASC LIMIT 1', [programId, imageId]);
      if (remaining.rows.length > 0) {
        await pool.query('UPDATE program_images SET is_primary = true WHERE id = $1', [remaining.rows[0].id]);
        await pool.query('UPDATE programs SET image = $1, updated_at = NOW() WHERE id = $2', [remaining.rows[0].image_url, programId]);
      } else {
        await pool.query('UPDATE programs SET image = NULL, updated_at = NOW() WHERE id = $1', [programId]);
      }
    }
    await pool.query('DELETE FROM program_images WHERE id = $1', [imageId]);

    const list = await pool.query('SELECT * FROM program_images WHERE program_id = $1 ORDER BY display_order ASC', [programId]);
    res.json({ success: true, message: 'تم حذف الصورة', images: list.rows });
  } catch (error) {
    console.error('❌ Delete image:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/programs/:programId/images/:imageId/primary', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const { programId, imageId } = req.params;
    await pool.query('UPDATE program_images SET is_primary = false WHERE program_id = $1', [programId]);
    await pool.query('UPDATE program_images SET is_primary = true WHERE id = $1 AND program_id = $2', [imageId, programId]);
    const img = await pool.query('SELECT image_url FROM program_images WHERE id = $1', [imageId]);
    if (img.rows.length > 0) {
      await pool.query('UPDATE programs SET image = $1, updated_at = NOW() WHERE id = $2', [img.rows[0].image_url, programId]);
    }
    res.json({ success: true, message: 'تم تعيين الصورة كرئيسية' });
  } catch (error) {
    console.error('❌ Set primary:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================== Wallet =====================
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const result = await pool.query('SELECT * FROM app.wallets WHERE user_id = $1', [req.params.userId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Wallet not found' });
    res.json({ success: true, wallet: result.rows[0] });
  } catch (error) {
    console.error('❌ Wallet:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===================== Routers =====================
app.use('/api/auth', authRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/upgrade', upgradeRoutes);
app.use('/api', uploadRoutes);

// ===================== Test & Health =====================
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Server is working',
    timestamp: new Date().toISOString(),
    database: pool ? 'configured' : 'missing',
    websocket: 'enabled',
    onlineUsers: onlineUsers.size,
    environment: isRender ? 'Render Cloud' : 'Local'
  });
});

app.get('/health', async (req, res) => {
  let dbConnected = false;
  let dbVersion = 'Unknown';
  if (pool) {
    try {
      const client = await pool.connect();
      dbConnected = true;
      try {
        const v = await pool.query('SELECT version()');
        dbVersion = v.rows[0].version.split(' ').slice(0, 2).join(' ');
      } catch {}
      client.release();
    } catch {}
  }
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    database: dbConnected ? 'connected' : (pool ? 'disconnected' : 'no DATABASE_URL'),
    databaseVersion: dbVersion,
    websocket: 'active',
    environment: isRender ? 'Render Cloud' : 'Local'
  });
});

// ===================== Admin Notifications =====================
async function sendAdminNotification(adminId, type, title, message, relatedId = null, priority = 'normal', actionUrl = null, metadata = {}) {
  if (!pool) return null;
  try {
    const result = await pool.query(
      `INSERT INTO app.admin_notifications 
       (admin_id, type, title, message, related_id, priority, action_url, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
      [adminId, type, title, message, relatedId, priority, actionUrl, JSON.stringify(metadata)]
    );
    return result.rows[0];
  } catch (err) {
    console.error('❌ Admin notif:', err.message);
    return null;
  }
}

async function sendNotificationToAllAdmins(type, title, message, relatedId = null, priority = 'normal', actionUrl = null, metadata = {}) {
  if (!pool) return false;
  try {
    const admins = await pool.query(`SELECT id FROM app.users WHERE role IN ('admin', 'support')`);
    for (const a of admins.rows) {
      await sendAdminNotification(a.id, type, title, message, relatedId, priority, actionUrl, metadata);
    }
    return true;
  } catch (err) {
    console.error('❌ Notif all admins:', err.message);
    return false;
  }
}

async function sendNotification(userId, type, title, message, actionUrl = null, metadata = {}) {
  if (!pool) return null;
  try {
    const result = await pool.query(
      `INSERT INTO app.notifications 
       (user_id, type, title, message, action_url, data, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [userId, type, title, message, actionUrl, JSON.stringify(metadata)]
    );
    const sid = onlineUsers.get(userId);
    if (sid && io) {
      io.to(sid).emit('new_notification', {
        id: result.rows[0].id, type, title, message,
        action_url: actionUrl, data: metadata,
        created_at: new Date().toISOString()
      });
    }
    return result.rows[0];
  } catch (err) {
    console.error('❌ Send notif:', err.message);
    return null;
  }
}

async function notifyGuideNewTicket(guideId, userName, ticketId, message) {
  return sendNotification(guideId, 'new_chat_ticket', `محادثة جديدة من ${userName}`,
    message || `لديك محادثة من ${userName}`, `/guide/chats/${ticketId}`,
    { ticket_id: ticketId, user_name: userName, type: 'new_ticket' });
}

async function notifyGuideNewMessage(guideId, userName, message, ticketId) {
  return sendNotification(guideId, 'new_chat_message', `رسالة من ${userName}`,
    message.length > 100 ? message.substring(0, 100) + '...' : message,
    `/guide/chats/${ticketId}`, { ticket_id: ticketId, user_name: userName, type: 'new_message' });
}

// ===================== Notifications API =====================
app.get('/api/notifications', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح' });
    let userId;
    try { userId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; }
    catch { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }

    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT * FROM app.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const unread = await pool.query(`SELECT COUNT(*) FROM app.notifications WHERE user_id = $1 AND is_read = false`, [userId]);
    res.json({ success: true, notifications: result.rows, unreadCount: parseInt(unread.rows[0].count) });
  } catch (err) {
    console.error('❌ Get notifs:', err.message);
    res.status(500).json({ success: false, message: 'فشل تحميل الإشعارات' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح' });
    let userId;
    try { userId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; }
    catch { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }

    const result = await pool.query(
      `UPDATE app.notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    console.error('❌ Mark read:', err.message);
    res.status(500).json({ success: false, message: 'فشل' });
  }
});

app.put('/api/notifications/read-all', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح' });
    let userId;
    try { userId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; }
    catch { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }

    await pool.query(`UPDATE app.notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false`, [userId]);
    res.json({ success: true, message: 'تم تحديث جميع الإشعارات' });
  } catch (err) {
    console.error('❌ Read all:', err.message);
    res.status(500).json({ success: false, message: 'فشل' });
  }
});

// ===================== Admin Notifications API =====================
app.get('/api/admin/notifications', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح' });
    let adminId;
    try { adminId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; }
    catch { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }

    const { status, limit = 50, offset = 0 } = req.query;
    let q = `SELECT * FROM app.admin_notifications WHERE admin_id = $1`;
    const params = [adminId];
    let idx = 2;
    if (status && status !== 'all') { q += ` AND status = $${idx}`; params.push(status); idx++; }
    q += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);
    const result = await pool.query(q, params);
    const unread = await pool.query(`SELECT COUNT(*) FROM app.admin_notifications WHERE admin_id = $1 AND status = 'unread'`, [adminId]);
    res.json({ success: true, notifications: result.rows, unreadCount: parseInt(unread.rows[0].count) });
  } catch (err) {
    console.error('❌ Admin notifs:', err.message);
    res.status(500).json({ success: false, message: 'فشل' });
  }
});

app.put('/api/admin/notifications/:id/read', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح' });
    let adminId;
    try { adminId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; }
    catch { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }

    const result = await pool.query(
      `UPDATE app.admin_notifications SET status = 'read', read_at = NOW() WHERE id = $1 AND admin_id = $2 RETURNING *`,
      [req.params.id, adminId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    console.error('❌ Admin mark read:', err.message);
    res.status(500).json({ success: false, message: 'فشل' });
  }
});

app.put('/api/admin/notifications/read-all', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح' });
    let adminId;
    try { adminId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; }
    catch { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }

    await pool.query(`UPDATE app.admin_notifications SET status = 'read', read_at = NOW() WHERE admin_id = $1 AND status = 'unread'`, [adminId]);
    res.json({ success: true, message: 'تم تحديث جميع الإشعارات' });
  } catch (err) {
    console.error('❌ Admin read all:', err.message);
    res.status(500).json({ success: false, message: 'فشل' });
  }
});

app.delete('/api/admin/notifications/:id', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح' });
    let adminId;
    try { adminId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; }
    catch { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }

    const result = await pool.query(`DELETE FROM app.admin_notifications WHERE id = $1 AND admin_id = $2 RETURNING id`, [req.params.id, adminId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    console.error('❌ Admin delete:', err.message);
    res.status(500).json({ success: false, message: 'فشل' });
  }
});

app.put('/api/admin/notifications/:id/archive', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متصلة' });
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'غير مصرح' });
    let adminId;
    try { adminId = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET).id; }
    catch { return res.status(401).json({ success: false, message: 'توكن غير صالح' }); }

    const result = await pool.query(
      `UPDATE app.admin_notifications SET status = 'archived', archived_at = NOW() WHERE id = $1 AND admin_id = $2 RETURNING *`,
      [req.params.id, adminId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    console.error('❌ Admin archive:', err.message);
    res.status(500).json({ success: false, message: 'فشل' });
  }
});

// ===================== ✅ إصلاح 2: الخادم لا يتوقف أبداً =====================
const startServer = async () => {
  console.log('🚀 Starting Tourist App Server...');
  const dbConnected = await connectDB(1, 0);

  server.listen(PORT, '0.0.0.0', () => {
    setTimeout(() => {
      console.log(`
  ╔══════════════════════════════════════════════╗
  ║         🚀 TOURIST APP SERVER               ║
  ╠══════════════════════════════════════════════╣
  ║  ▶ Port:        ${String(PORT).padEnd(28)}║
  ║  ▶ Environment: ${(isRender ? 'Render Cloud' : 'Local').padEnd(28)}║
  ║  ▶ Database:    ${(dbConnected ? '✅ CONNECTED' : '⚠️ DISCONNECTED').padEnd(28)}║
  ║  ▶ WebSocket:   ✅ Enabled                    ║
  ║  ▶ CORS:        ✅ Open                       ║
  ║  ▶ Health:      /health                       ║
  ║  ▶ Test API:    /api/test                     ║
  ╚══════════════════════════════════════════════╝
      `);

      if (!dbConnected) {
        console.warn('⚠️ Database is NOT connected. APIs will return 503.');
        console.warn('⚠️ Most likely cause: Supabase project is PAUSED.');
        console.warn('⚠️ Action: https://supabase.com/dashboard → Restore project');
        console.warn('🔄 Background retry will start every 30s...');
      } else {
        console.log('✅ Server ready. You can now login.');
      }
    }, 100);
  });

  // إعادة المحاولة في الخلفية كل 30 ثانية
  if (!dbConnected && pool) {
    let retryCount = 0;
    const interval = setInterval(async () => {
      retryCount++;
      console.log(`🔄 Background DB retry #${retryCount}...`);
      const ok = await connectDB(1, 0);
      if (ok) {
        console.log('✅ Database reconnected! APIs are now fully operational.');
        clearInterval(interval);
      } else if (retryCount >= 20) {
        console.error('❌ 20 background retries failed. Will keep trying every 60s...');
      }
    }, 30000);
  }
};

// إنشاء جدول program_images بعد الاتصال (لا يعطل البدء)
async function ensureTables() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS program_images (
        id SERIAL PRIMARY KEY,
        program_id INTEGER,
        image_url TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ program_images table ensured');
  } catch (err) {
    console.warn('⚠️ Could not ensure program_images table:', err.message);
  }
}

startServer().then(() => {
  setTimeout(ensureTables, 2000);
});

export {
  io, onlineUsers, pool,
  createExpiryDate, isOTPValid, getTimeRemaining,
  sendNotification, notifyGuideNewTicket, notifyGuideNewMessage,
  sendNotificationToAllAdmins
};

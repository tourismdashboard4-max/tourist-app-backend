import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pkg from 'pg';
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
    rejectUnauthorized: false // ضروري لـ Supabase
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

pool = new Pool(poolConfig);

// اختبار الاتصال بقاعدة البيانات السحابية
const connectDB = async () => {
  try {
    const client = await pool.connect();
    
    // استخراج معلومات المضيف من connectionString
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
    'https://tourist-app-api.onrender.com'
  ],
  credentials: true
}));

// Middleware لإضافة معلومات الوقت لكل طلب
app.use((req, res, next) => {
  console.log(`🕐 Request received at: ${new Date().toISOString()}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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
      support: '/api/support'
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

// ===================== Route إضافي للمحفظة =====================
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📥 Fetching wallet for user: ${userId}`);
    
    const result = await pool.query(
      'SELECT * FROM app.wallets WHERE user_id = $1',
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
  
  // استعلام إضافي للحصول على معلومات Supabase
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
  ╚══════════════════════════════════════════════╝
      `);
      console.log(`🕐 Server started at: ${new Date().toISOString()}`);
      console.log(`☁️ Connected to Supabase Cloud PostgreSQL`);
    }, 100);
  });
};

startServer();

// ===================== التصدير مرة واحدة فقط =====================
export { io, onlineUsers, pool, createExpiryDate, isOTPValid, getTimeRemaining };

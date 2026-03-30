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
import { createClient } from '@supabase/supabase-js';

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

// ===================== إعداد Supabase Client =====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ===================== إعداد Multer لرفع الصور =====================
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة (JPEG, PNG, GIF, WEBP)'));
        }
    }
});

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

// التأكد من وجود DATABASE_URL
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is required for cloud connection!');
    process.exit(1);
}

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

// اختبار الاتصال بقاعدة البيانات
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
    ║  Database: postgres                      ║
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
        console.error('❌ Supabase Connection Failed:', error.message);
        return false;
    }
};

// ===================== Middleware للمصادقة =====================
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'غير مصرح بالدخول' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await pool.query(
            'SELECT id, email, full_name as name, role, avatar_url FROM app.users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'مستخدم غير موجود' });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
};

// ===================== Middleware عام =====================
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

// ===================== مسارات رفع الصور =====================

// رفع الصورة الشخصية
app.post('/api/upload/avatar', authenticate, upload.single('image'), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء اختيار صورة'
            });
        }

        // إنشاء اسم فريد للصورة
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // رفع الصورة إلى Supabase Storage
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'فشل رفع الصورة'
            });
        }

        // الحصول على URL العام
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // تحديث قاعدة البيانات
        await pool.query(
            'UPDATE app.users SET avatar_url = $1 WHERE id = $2',
            [publicUrl, userId]
        );

        res.json({
            success: true,
            message: 'تم رفع الصورة بنجاح',
            avatarUrl: publicUrl
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل رفع الصورة'
        });
    }
});

// حذف الصورة الشخصية
app.delete('/api/upload/avatar', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT avatar_url FROM app.users WHERE id = $1',
            [userId]
        );

        const avatarUrl = result.rows[0]?.avatar_url;

        if (avatarUrl) {
            const fileName = avatarUrl.split('/').pop();
            const filePath = `avatars/${fileName}`;

            await supabase.storage
                .from('avatars')
                .remove([filePath]);
        }

        await pool.query(
            'UPDATE app.users SET avatar_url = NULL WHERE id = $1',
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
            message: 'فشل حذف الصورة'
        });
    }
});

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
            upload: '/api/upload/avatar'
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

// ===================== Test route =====================
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: '✅ Server is working with Supabase PostgreSQL!',
        timestamp: new Date().toISOString(),
        database: 'Supabase Cloud',
        websocket: 'enabled',
        onlineUsers: onlineUsers.size,
        upload: '/api/upload/avatar (POST)'
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
        uptime: process.uptime(),
        port: PORT,
        database: dbConnected ? 'connected' : 'disconnected',
        databaseType: 'Supabase Cloud',
        databaseVersion: dbInfo.version || 'Unknown',
        websocket: 'active',
        onlineUsers: onlineUsers.size,
        upload: 'available at /api/upload/avatar (POST, DELETE)'
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
  ║  ▶ Upload:      ✅ /api/upload/avatar
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

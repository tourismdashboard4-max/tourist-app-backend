// server/src/services/socketService.js
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userId
  }

  /**
   * تهيئة WebSocket
   * @param {Object} server - خادم HTTP
   */
  initialize(server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Middleware للمصادقة
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('مطلوب توثيق'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // البحث عن المستخدم في PostgreSQL
        const userResult = await pool.query(
          `SELECT id, full_name as "fullName", email, avatar, type 
           FROM app.users 
           WHERE id = $1`,
          [decoded.id]
        );
        
        if (userResult.rows.length === 0) {
          return next(new Error('المستخدم غير موجود'));
        }

        socket.user = userResult.rows[0];
        next();
      } catch (error) {
        console.error('❌ Socket auth error:', error);
        next(new Error('توثيق غير صالح'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('✅ WebSocket server initialized');
  }

  /**
   * معالجة اتصال جديد
   * @param {Object} socket - كائن socket
   */
  handleConnection(socket) {
    const userId = socket.user.id.toString();
    
    console.log(`🔌 مستخدم متصل: ${socket.user.fullName} (${userId})`);

    // تخزين معلومات المستخدم
    this.onlineUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, userId);

    // إرسال قائمة المتصلين
    this.broadcastOnlineUsers();

    // الانضمام إلى غرفة المستخدم الخاصة
    socket.join(`user:${userId}`);

    // معالجة الانضمام إلى محادثة
    socket.on('join-conversation', (data) => {
      this.handleJoinConversation(socket, data);
    });

    // معالجة مغادرة محادثة
    socket.on('leave-conversation', (data) => {
      this.handleLeaveConversation(socket, data);
    });

    // معالجة حالة الكتابة
    socket.on('typing', (data) => {
      this.handleTyping(socket, data);
    });

    // معالجة قراءة الرسائل
    socket.on('mark-read', (data) => {
      this.handleMarkRead(socket, data);
    });

    // معالجة فصل الاتصال
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  /**
   * معالجة الانضمام إلى محادثة
   * @param {Object} socket - كائن socket
   * @param {Object} data - البيانات
   */
  handleJoinConversation(socket, data) {
    const { conversationId } = data;
    socket.join(`conversation:${conversationId}`);
    console.log(`👥 مستخدم ${socket.user.fullName} انضم للمحادثة ${conversationId}`);
  }

  /**
   * معالجة مغادرة محادثة
   * @param {Object} socket - كائن socket
   * @param {Object} data - البيانات
   */
  handleLeaveConversation(socket, data) {
    const { conversationId } = data;
    socket.leave(`conversation:${conversationId}`);
    console.log(`👋 مستخدم ${socket.user.fullName} غادر المحادثة ${conversationId}`);
  }

  /**
   * معالجة حالة الكتابة
   * @param {Object} socket - كائن socket
   * @param {Object} data - البيانات
   */
  handleTyping(socket, data) {
    const { conversationId, isTyping } = data;
    socket.to(`conversation:${conversationId}`).emit('typing', {
      userId: socket.user.id,
      isTyping
    });
  }

  /**
   * معالجة قراءة الرسائل
   * @param {Object} socket - كائن socket
   * @param {Object} data - البيانات
   */
  handleMarkRead(socket, data) {
    const { conversationId, messageId } = data;
    socket.to(`conversation:${conversationId}`).emit('message-read', {
      messageId,
      userId: socket.user.id,
      readAt: new Date()
    });
  }

  /**
   * معالجة فصل الاتصال
   * @param {Object} socket - كائن socket
   */
  handleDisconnect(socket) {
    const userId = this.userSockets.get(socket.id);
    if (userId) {
      this.onlineUsers.delete(userId);
      this.userSockets.delete(socket.id);
      console.log(`🔌 مستخدم قطع الاتصال: ${userId}`);
      
      // إرسال قائمة المتصلين المحدثة
      this.broadcastOnlineUsers();
    }
  }

  /**
   * بث قائمة المتصلين
   */
  broadcastOnlineUsers() {
    const onlineUserIds = Array.from(this.onlineUsers.keys());
    this.io.emit('users-online', onlineUserIds);
  }

  /**
   * إرسال حدث لمستخدم محدد
   * @param {string} userId - معرف المستخدم
   * @param {string} event - اسم الحدث
   * @param {Object} data - البيانات
   */
  emitToUser(userId, event, data) {
    const socketId = this.onlineUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * إرسال حدث لمحادثة محددة
   * @param {string} conversationId - معرف المحادثة
   * @param {string} event - اسم الحدث
   * @param {Object} data - البيانات
   */
  emitToConversation(conversationId, event, data) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  /**
   * إرسال حدث للجميع
   * @param {string} event - اسم الحدث
   * @param {Object} data - البيانات
   */
  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  /**
   * التحقق من اتصال المستخدم
   * @param {string} userId - معرف المستخدم
   * @returns {boolean} حالة الاتصال
   */
  isUserOnline(userId) {
    return this.onlineUsers.has(userId.toString());
  }

  /**
   * الحصول على عدد المتصلين
   * @returns {number} عدد المتصلين
   */
  getOnlineCount() {
    return this.onlineUsers.size;
  }

  /**
   * الحصول على قائمة المتصلين
   * @returns {Array} قائمة معرفات المتصلين
   */
  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }
}

const socketService = new SocketService();
export default socketService;

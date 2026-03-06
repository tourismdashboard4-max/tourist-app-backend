// server/src/config/socket.js
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (socketIO) => {
  io = socketIO;

  // Middleware للتحقق من التوكن
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // التحقق من صحة التوكن
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // إضافة بيانات المستخدم للـ socket
      socket.userId = decoded.id;
      socket.userType = decoded.type;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id} - User: ${socket.userId}`);

    // الانضمام لغرفة المستخدم الخاصة
    socket.join(`user-${socket.userId}`);
    
    // إرسال تأكيد الاتصال
    socket.emit('connected', { 
      userId: socket.userId,
      message: 'Connected to notification server' 
    });

    // الانضمام لغرف المحادثات
    socket.on('join-chat', (chatId) => {
      socket.join(`chat-${chatId}`);
      console.log(`📢 User ${socket.userId} joined chat: ${chatId}`);
    });

    // مغادرة غرف المحادثات
    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat-${chatId}`);
    });

    // حالة الكتابة
    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(`chat-${chatId}`).emit('typing', { 
        userId: socket.userId, 
        isTyping 
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id} - User: ${socket.userId}`);
    });
  });
};

export const getIO = () => io;
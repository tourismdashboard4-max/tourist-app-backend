import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token, url = 'http://localhost:5002') {
    if (this.socket?.connected) return;

    this.socket = io(url, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket.id);
      this.reconnectAttempts = 0;
      this.emit('user-connected', { userId: this.getUserId() });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      this.listeners.set(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        const cb = this.listeners.get(event);
        if (cb) {
          this.socket.off(event, cb);
          this.listeners.delete(event);
        }
      }
    }
  }

  // ===================== أحداث المحادثة =====================
  joinConversation(conversationId) {
    this.emit('join-conversation', { conversationId });
  }

  leaveConversation(conversationId) {
    this.emit('leave-conversation', { conversationId });
  }

  sendMessage(message) {
    this.emit('send-message', message);
  }

  sendTyping(conversationId, isTyping) {
    this.emit('typing', { conversationId, isTyping });
  }

  markMessageRead(conversationId, messageId) {
    this.emit('message-read', { conversationId, messageId });
  }

  // ===================== أحداث الإشعارات =====================
  markNotificationRead(notificationId) {
    this.emit('notification-read', { notificationId });
  }

  // ===================== دوال مساعدة =====================
  isConnected() {
    return this.socket?.connected || false;
  }

  getSocketId() {
    return this.socket?.id || null;
  }

  getUserId() {
    // يمكن جلب userId من التوكن أو localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
  }
}

export default new SocketService();
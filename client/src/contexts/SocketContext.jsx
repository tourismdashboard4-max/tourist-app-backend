import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, url = 'http://localhost:5002' }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket();
    }

    return () => {
      if (socket) {
        disconnectSocket();
      }
    };
  }, [isAuthenticated, token]);

  const connectSocket = () => {
    const socketInstance = io(url, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected:', socketInstance.id);
      setIsConnected(true);
      
      // تسجيل المستخدم
      socketInstance.emit('user-connected', { userId: user?.id });
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('users-online', (users) => {
      setOnlineUsers(users);
    });

    socketInstance.on('user-online', ({ userId, online }) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: online }));
    });

    setSocket(socketInstance);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers({});
    }
  };

  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    emit,
    on,
    off,
    isUserOnline: (userId) => onlineUsers[userId] || false
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
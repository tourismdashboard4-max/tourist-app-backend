import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { socket, emit, on, off } = useSocket();
  
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (isAuthenticated && user) {
      loadConversations();
      setupSocketListeners();
    }

    return () => {
      if (currentConversation) {
        leaveConversation(currentConversation.id);
      }
    };
  }, [isAuthenticated, user]);

  const setupSocketListeners = () => {
    // استقبال رسالة جديدة
    on('new-message', handleNewMessage);
    
    // استقبال حالة الكتابة
    on('typing', handleTyping);
    
    // استقبال قراءة الرسالة
    on('message-read', handleMessageRead);
    
    // استقبال حالة الاتصال
    on('user-online', handleUserOnline);
  };

  const handleNewMessage = (message) => {
    if (currentConversation?.id === message.conversationId) {
      setMessages(prev => [...prev, message]);
      markAsRead(message.conversationId, message.id);
    } else {
      // زيادة العداد للمحادثات الأخرى
      setConversations(prev => 
        prev.map(conv => 
          conv.id === message.conversationId 
            ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1, lastMessage: message }
            : conv
        )
      );
      setUnreadCount(prev => prev + 1);
    }
  };

  const handleTyping = ({ conversationId, userId, isTyping }) => {
    if (currentConversation?.id === conversationId) {
      setTypingUsers(prev => ({
        ...prev,
        [userId]: isTyping
      }));
    }
  };

  const handleMessageRead = ({ conversationId, messageId }) => {
    if (currentConversation?.id === conversationId) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    }
  };

  const handleUserOnline = ({ userId, online }) => {
    setOnlineUsers(prev => ({ ...prev, [userId]: online }));
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat/conversations');
      if (response.data.success) {
        setConversations(response.data.data);
        const totalUnread = response.data.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('فشل تحميل المحادثات');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setLoading(true);
      const response = await api.get(`/chat/conversations/${conversationId}/messages`);
      if (response.data.success) {
        setMessages(response.data.data);
        
        // تحديث عداد المحادثة
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          )
        );
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('فشل تحميل الرسائل');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = (conversation) => {
    if (currentConversation) {
      leaveConversation(currentConversation.id);
    }
    
    setCurrentConversation(conversation);
    loadMessages(conversation.id);
    joinConversation(conversation.id);
  };

  const joinConversation = (conversationId) => {
    emit('join-conversation', { conversationId });
  };

  const leaveConversation = (conversationId) => {
    emit('leave-conversation', { conversationId });
  };

  const sendMessage = async (conversationId, content, type = 'text', attachment = null) => {
    if (!content.trim() && !attachment) return;

    const tempId = Date.now().toString();
    const tempMessage = {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: user.name,
      content,
      type,
      attachment,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    // إضافة مؤقتة
    setMessages(prev => [...prev, tempMessage]);

    try {
      // إرسال عبر Socket
      emit('send-message', tempMessage);

      // حفظ في قاعدة البيانات
      const response = await api.post('/chat/messages', {
        conversationId,
        content,
        type,
        attachment
      });

      // تحديث الرسالة
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId ? { ...msg, id: response.data.id, status: 'sent' } : msg
        )
      );

      // تحديث آخر رسالة في المحادثات
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, lastMessage: response.data, lastMessageAt: new Date() }
            : conv
        )
      );

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId ? { ...msg, status: 'error' } : msg
        )
      );
      toast.error('فشل إرسال الرسالة');
    }
  };

  const markAsRead = async (conversationId, messageId) => {
    try {
      await api.put(`/chat/messages/${messageId}/read`);
      emit('message-read', { conversationId, messageId });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendTyping = (conversationId, isTyping) => {
    emit('typing', { conversationId, userId: user.id, isTyping });
  };

  const createConversation = async (participantId) => {
    try {
      const response = await api.post('/chat/conversations', {
        participantId
      });
      
      if (response.data.success) {
        await loadConversations();
        return response.data.conversation;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('فشل إنشاء المحادثة');
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('تم حذف الرسالة');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('فشل حذف الرسالة');
    }
  };

  const value = {
    conversations,
    currentConversation,
    messages,
    loading,
    typingUsers,
    onlineUsers,
    unreadCount,
    loadConversations,
    selectConversation,
    sendMessage,
    sendTyping,
    createConversation,
    deleteMessage,
    isUserOnline: (userId) => onlineUsers[userId] || false,
    isTyping: (userId) => typingUsers[userId] || false
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
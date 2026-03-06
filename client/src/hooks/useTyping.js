import { useState, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';

export const useTyping = (conversationId) => {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const { socket } = useSocket();
  const typingTimeoutRef = useRef(null);

  // إرسال حالة الكتابة
  const sendTyping = useCallback((isTyping) => {
    if (socket && conversationId) {
      socket.emit('typing', { conversationId, isTyping });
    }
  }, [socket, conversationId]);

  // بدء الكتابة
  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }

    // إعادة تعيين المؤقت
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // إيقاف الكتابة بعد 2 ثانية من عدم النشاط
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        sendTyping(false);
      }
    }, 2000);
  }, [isTyping, sendTyping]);

  // إيقاف الكتابة
  const stopTyping = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      sendTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [isTyping, sendTyping]);

  // معالجة حدث الكتابة من المستخدمين الآخرين
  const handleTyping = useCallback(({ userId, isTyping }) => {
    setTypingUsers(prev => ({
      ...prev,
      [userId]: isTyping
    }));
  }, []);

  // تنظيف
  const cleanup = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping();
  }, [stopTyping]);

  return {
    isTyping,
    typingUsers,
    startTyping,
    stopTyping,
    handleTyping,
    cleanup
  };
};
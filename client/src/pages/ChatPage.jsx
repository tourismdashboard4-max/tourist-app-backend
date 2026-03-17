// src/pages/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaArrowDown, FaArrowUp, FaSpinner } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const ChatPage = ({ chatId: propChatId }) => {
  const { theme, darkMode } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refs للتمرير
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // الحصول على chatId من props أو من URL
  const chatId = propChatId || window.location.pathname.split('/').pop();

  // ============================================
  // دوال التمرير
  // ============================================

  // التمرير إلى الأسفل
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    setAutoScroll(true);
  };

  // التمرير إلى الأعلى
  const scrollToTop = (behavior = 'smooth') => {
    messagesContainerRef.current?.scrollTo({
      top: 0,
      behavior
    });
    setAutoScroll(false);
  };

  // التحقق من موقع التمرير
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    
    // هل نحن في الأسفل؟
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShowScrollDown(!isNearBottom);
    setAutoScroll(isNearBottom);

    // هل نحن في الأعلى؟
    const isNearTop = scrollTop < 50;
    setShowScrollUp(!isNearTop && hasMore);
    
    // إذا كنا في الأعلى ولدينا المزيد من الرسائل، حمل المزيد
    if (isNearTop && hasMore && !loadingMore && messages.length > 0) {
      loadMoreMessages();
    }
  };

  // ============================================
  // جلب الرسائل
  // ============================================

  // جلب الرسائل الأولية
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await api.getConversationMessages(chatId, 1, 30);
      
      if (response.success) {
        setMessages(response.messages || []);
        setHasMore(response.pagination?.pages > 1);
        setTimeout(() => scrollToBottom('auto'), 100);
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      toast.error('فشل تحميل الرسائل');
    } finally {
      setLoading(false);
    }
  };

  // جلب المزيد من الرسائل (التمرير للأعلى)
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const response = await api.getConversationMessages(chatId, nextPage, 30);
      
      if (response.success && response.messages?.length > 0) {
        // حفظ موقع التمرير الحالي
        const container = messagesContainerRef.current;
        const oldScrollHeight = container?.scrollHeight || 0;
        
        setMessages(prev => [...response.messages, ...prev]);
        setPage(nextPage);
        setHasMore(response.pagination?.pages > nextPage);
        
        // استعادة موقع التمرير بعد إضافة الرسائل القديمة
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight + 50;
          }
        }, 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('❌ Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // ============================================
  // إرسال رسالة
  // ============================================

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      
      const response = await api.sendMessage({
        chatId,
        senderId: user.id,
        content: newMessage.trim(),
        type: 'text'
      });

      if (response.success) {
        setMessages(prev => [...prev, response.message]);
        setNewMessage('');
        scrollToBottom('smooth');
      } else {
        toast.error('فشل إرسال الرسالة');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('حدث خطأ في الإرسال');
    } finally {
      setSending(false);
    }
  };

  // ============================================
  // جلب معلومات المحادثة
  // ============================================

  const fetchChatInfo = async () => {
    try {
      const response = await api.getConversationById(chatId);
      if (response.success) {
        setChatInfo(response.conversation);
      }
    } catch (error) {
      console.error('❌ Error fetching chat info:', error);
    }
  };

  // ============================================
  // useEffect
  // ============================================

  useEffect(() => {
    if (chatId) {
      fetchMessages();
      fetchChatInfo();
    }
  }, [chatId]);

  // إضافة مستمع للتمرير
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [hasMore, loadingMore, messages.length]);

  // التمرير التلقائي عند وصول رسائل جديدة
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length, autoScroll]);

  // ============================================
  // النصوص حسب اللغة
  // ============================================

  const texts = {
    ar: {
      title: 'المحادثة',
      typeMessage: 'اكتب رسالتك هنا...',
      send: 'إرسال',
      loading: 'جاري التحميل...',
      noMessages: 'لا توجد رسائل بعد',
      startConversation: 'ابدأ المحادثة',
      scrollToBottom: 'الذهاب إلى آخر رسالة',
      scrollToTop: 'الذهاب إلى الأعلى',
      loadMore: 'تحميل المزيد...'
    },
    en: {
      title: 'Chat',
      typeMessage: 'Type your message...',
      send: 'Send',
      loading: 'Loading...',
      noMessages: 'No messages yet',
      startConversation: 'Start conversation',
      scrollToBottom: 'Go to latest message',
      scrollToTop: 'Go to top',
      loadMore: 'Load more...'
    }
  };

  const t = texts[language];

  // ============================================
  // التنسيقات الديناميكية
  // ============================================

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: theme.background,
      color: theme.text,
      direction: language === 'ar' ? 'rtl' : 'ltr'
    },
    header: {
      padding: '16px',
      backgroundColor: theme.card,
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    chatInfo: {
      flex: 1
    },
    chatName: {
      fontSize: '18px',
      fontWeight: 'bold',
      margin: 0
    },
    chatStatus: {
      fontSize: '12px',
      color: theme.textSecondary,
      margin: '4px 0 0 0'
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      backgroundColor: darkMode ? '#1a1a1a' : '#f0f2f5'
    },
    messageWrapper: {
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '70%',
      animation: 'fadeIn 0.3s ease'
    },
    messageBubble: (isOwn) => ({
      padding: '10px 14px',
      borderRadius: '18px',
      backgroundColor: isOwn ? theme.primary : (darkMode ? '#2d2d2d' : 'white'),
      color: isOwn ? 'white' : theme.text,
      borderBottomRightRadius: isOwn ? '4px' : '18px',
      borderBottomLeftRadius: !isOwn ? '4px' : '18px',
      alignSelf: isOwn ? 'flex-end' : 'flex-start',
      wordWrap: 'break-word',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }),
    messageSender: {
      fontSize: '11px',
      fontWeight: 'bold',
      marginBottom: '4px',
      opacity: 0.8,
      color: isOwn => isOwn ? 'rgba(255,255,255,0.9)' : theme.primary
    },
    messageTime: {
      fontSize: '10px',
      marginTop: '4px',
      textAlign: 'right',
      opacity: 0.7,
      color: isOwn => 'rgba(255,255,255,0.8)' : theme.textSecondary
    },
    inputForm: {
      display: 'flex',
      padding: '16px',
      backgroundColor: theme.card,
      borderTop: `1px solid ${theme.border}`,
      gap: '10px'
    },
    input: {
      flex: 1,
      padding: '12px 16px',
      borderRadius: '25px',
      border: `1px solid ${theme.border}`,
      backgroundColor: darkMode ? '#2d2d2d' : 'white',
      color: theme.text,
      fontSize: '14px',
      outline: 'none'
    },
    sendButton: {
      width: '45px',
      height: '45px',
      borderRadius: '50%',
      backgroundColor: theme.primary,
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    },
    scrollButton: (position) => ({
      position: 'fixed',
      [position === 'down' ? 'bottom' : 'top']: '100px',
      [language === 'ar' ? 'left' : 'right']: '20px',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: theme.primary,
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      zIndex: 1000,
      transition: 'all 0.3s ease'
    })
  };

  // ============================================
  // واجهة المستخدم
  // ============================================

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <FaSpinner size={48} color={theme.primary} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* الهيدر */}
      <div style={styles.header}>
        <div style={styles.chatInfo}>
          <h2 style={styles.chatName}>
            {chatInfo?.name || t.title}
          </h2>
          <p style={styles.chatStatus}>
            {chatInfo?.participants?.length || 0} مشارك
          </p>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div 
        ref={messagesContainerRef}
        style={styles.messagesContainer}
        onScroll={handleScroll}
      >
        {/* مؤشر تحميل المزيد */}
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <FaSpinner color={theme.primary} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* الرسائل */}
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: theme.textSecondary }}>
            {t.noMessages}
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender_id === user?.id;
            const showSender = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id);
            
            return (
              <div key={msg.id || index} style={styles.messageWrapper}>
                {showSender && (
                  <div style={{ marginBottom: '4px', marginRight: isOwn ? 0 : '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.primary }}>
                      {msg.sender_name || msg.sender?.fullName || 'مستخدم'}
                    </span>
                  </div>
                )}
                <div style={styles.messageBubble(isOwn)}>
                  <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                    {msg.content || msg.message}
                  </div>
                  <div style={styles.messageTime(isOwn)}>
                    {new Date(msg.created_at || msg.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* أزرار التمرير */}
      {showScrollDown && (
        <button
          style={styles.scrollButton('down')}
          onClick={() => scrollToBottom('smooth')}
          title={t.scrollToBottom}
        >
          <FaArrowDown />
        </button>
      )}

      {showScrollUp && (
        <button
          style={styles.scrollButton('up')}
          onClick={() => scrollToTop('smooth')}
          title={t.scrollToTop}
        >
          <FaArrowUp />
        </button>
      )}

      {/* نموذج الإرسال */}
      <form style={styles.inputForm} onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t.typeMessage}
          style={styles.input}
          disabled={sending}
        />
        <button
          type="submit"
          style={{
            ...styles.sendButton,
            opacity: sending ? 0.7 : 1,
            cursor: sending ? 'wait' : 'pointer'
          }}
          disabled={sending}
        >
          {sending ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaPaperPlane />}
        </button>
      </form>

      {/* CSS للأنيميشن */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        button:hover {
          transform: scale(1.05);
        }
        input:focus {
          border-color: ${theme.primary} !important;
          box-shadow: 0 0 0 2px ${theme.primary}20;
        }
      `}</style>
    </div>
  );
};

export default ChatPage;

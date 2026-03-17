// client/src/pages/ChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FaArrowLeft, 
  FaSearch, 
  FaUserCircle, 
  FaPaperPlane, 
  FaEllipsisV,
  FaPhone,
  FaVideo,
  FaInfoCircle,
  FaCheck,
  FaCheckDouble,
  FaClock,
  FaImage,
  FaSmile,
  FaPaperclip,
  FaMicrophone,
  FaSun,
  FaMoon,
  FaSpinner,
  FaUser,
  FaFile,
  FaDownload,
  FaTrash,
  FaReply,
  FaArrowDown
} from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/apiService';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';

const ChatPage = ({ setPage, initialConversationId }) => {
  const { theme, darkMode, toggleDarkMode } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // حالات البيانات
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conversationDetails, setConversationDetails] = useState(null);
  const [page, setPageState] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typing, setTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // تحميل المحادثات عند فتح الصفحة
  useEffect(() => {
    loadConversations();
    
    // الاتصال بـ Socket.io
    connectSocket();
    
    return () => {
      disconnectSocket();
    };
  }, []);

  // تحميل محادثة محددة إذا وجدت
  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c._id === initialConversationId || c.id === initialConversationId);
      if (conv) {
        selectConversation(conv);
      }
    }
  }, [initialConversationId, conversations]);

  // التمرير لآخر رسالة
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isNearBottom]);

  // تحديث حالة الكتابة
  useEffect(() => {
    if (messageInput) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  }, [messageInput]);

  // إضافة مستمع التمرير
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [hasMore, loadingMore, selectedChat]);

  const connectSocket = () => {
    socketService.connect();
    socketService.on('new-message', handleNewMessage);
    socketService.on('message-read', handleMessageRead);
    socketService.on('message-deleted', handleMessageDeleted);
    socketService.on('user-online', handleUserOnline);
    socketService.on('user-offline', handleUserOffline);
    socketService.on('typing', handleTyping);
    socketService.on('stop-typing', handleStopTyping);
  };

  const disconnectSocket = () => {
    socketService.off('new-message');
    socketService.off('message-read');
    socketService.off('message-deleted');
    socketService.off('user-online');
    socketService.off('user-offline');
    socketService.off('typing');
    socketService.off('stop-typing');
  };

  const scrollToBottom = (behavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior, 
        block: 'end' 
      });
    }, 100);
  };

  const scrollToTop = (behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: 0,
        behavior
      });
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    
    // تحميل المزيد من الرسائل عند الوصول للأعلى
    if (scrollTop < 50 && hasMore && !loadingMore && selectedChat) {
      loadMoreMessages();
    }
    
    // تحديث حالة القرب من الأسفل
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(nearBottom);
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await api.getUserConversations();
      console.log('📥 Conversations response:', response);
      
      if (response.success) {
        setConversations(response.conversations || []);
      } else {
        toast.error('فشل تحميل المحادثات');
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      toast.error('فشل تحميل المحادثات');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId, reset = false) => {
    try {
      if (reset) {
        setMessages([]);
        setPageState(1);
      }
      
      const currentPage = reset ? 1 : page;
      setLoadingMore(currentPage > 1);
      
      const response = await api.getConversationMessages(conversationId, currentPage, 50);
      console.log('📥 Messages response:', response);
      
      if (response.success) {
        const newMessages = response.messages || [];
        
        if (reset) {
          setMessages(newMessages);
          setPageState(2);
          // التمرير للأسفل بعد تحميل الرسائل
          setTimeout(() => scrollToBottom('auto'), 200);
        } else {
          // حفظ موقع التمرير الحالي قبل إضافة الرسائل القديمة
          const container = messagesContainerRef.current;
          const oldScrollHeight = container?.scrollHeight || 0;
          
          setMessages(prev => [...newMessages, ...prev]);
          setPageState(prev => prev + 1);
          
          // استعادة موقع التمرير بعد إضافة الرسائل القديمة
          setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - oldScrollHeight + 50;
            }
          }, 50);
        }
        
        setHasMore(response.hasMore || false);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      toast.error('فشل تحميل الرسائل');
    } finally {
      setLoadingMore(false);
    }
  };

  const loadConversationDetails = async (conversationId) => {
    try {
      const response = await api.getConversation?.(conversationId);
      if (response?.success) {
        setConversationDetails(response.conversation);
      }
    } catch (error) {
      console.error('Error loading conversation details:', error);
    }
  };

  const handleNewMessage = (message) => {
    console.log('📩 New message received:', message);
    
    // إضافة الرسالة إلى المحادثة الحالية
    if (message.conversationId === selectedChat?._id || message.conversationId === selectedChat?.id) {
      setMessages(prev => [...prev, message]);
      // التمرير للأسفل إذا كنا قريبين من الأسفل
      if (isNearBottom) {
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    }
    
    // تحديث آخر رسالة في قائمة المحادثات
    setConversations(prev =>
      prev.map(conv => {
        const convId = conv._id || conv.id;
        const msgConvId = message.conversationId;
        
        if (convId === msgConvId) {
          return {
            ...conv,
            lastMessage: message,
            updatedAt: new Date().toISOString(),
            unreadCount: (conv.unreadCount || 0) + 1
          };
        }
        return conv;
      })
    );
    
    // فرز المحادثات حسب آخر رسالة
    setConversations(prev => 
      [...prev].sort((a, b) => {
        const dateA = new Date(a.lastMessage?.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.lastMessage?.createdAt || b.updatedAt || 0);
        return dateB - dateA;
      })
    );
  };

  const handleMessageRead = ({ messageId, conversationId }) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg._id === messageId || msg.id === messageId) {
          return { ...msg, read: true };
        }
        return msg;
      })
    );
  };

  const handleMessageDeleted = ({ messageId, conversationId }) => {
    setMessages(prev => prev.filter(msg => (msg._id !== messageId && msg.id !== messageId)));
  };

  const handleUserOnline = (data) => {
    setConversations(prev =>
      prev.map(conv => {
        const participantId = conv.participant?._id || conv.participant?.id;
        if (participantId === data.userId) {
          return {
            ...conv,
            participant: { ...conv.participant, online: true }
          };
        }
        return conv;
      })
    );
    
    if (conversationDetails?.participant?._id === data.userId || conversationDetails?.participant?.id === data.userId) {
      setConversationDetails(prev => ({
        ...prev,
        participant: { ...prev.participant, online: true }
      }));
    }
  };

  const handleUserOffline = (data) => {
    setConversations(prev =>
      prev.map(conv => {
        const participantId = conv.participant?._id || conv.participant?.id;
        if (participantId === data.userId) {
          return {
            ...conv,
            participant: { ...conv.participant, online: false, lastSeen: data.lastSeen }
          };
        }
        return conv;
      })
    );
    
    if (conversationDetails?.participant?._id === data.userId || conversationDetails?.participant?.id === data.userId) {
      setConversationDetails(prev => ({
        ...prev,
        participant: { ...prev.participant, online: false, lastSeen: data.lastSeen }
      }));
    }
  };

  const handleTyping = (data) => {
    if (data.conversationId === selectedChat?._id || data.conversationId === selectedChat?.id) {
      setTyping(true);
      
      // إخفاء حالة الكتابة بعد 3 ثواني
      setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
  };

  const handleStopTyping = (data) => {
    if (data.conversationId === selectedChat?._id || data.conversationId === selectedChat?.id) {
      setTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || sending) return;

    setSending(true);
    const messageText = messageInput;
    setMessageInput('');
    
    try {
      const conversationId = selectedChat._id || selectedChat.id;
      const response = await api.sendMessage(conversationId, messageText);
      
      if (!response.success) {
        throw new Error(response.message || 'فشل إرسال الرسالة');
      }
      
      // إيقاف حالة الكتابة
      socketService.stopTyping(conversationId);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error(error.message || 'فشل إرسال الرسالة');
      setMessageInput(messageText); // استرجاع النص
    } finally {
      setSending(false);
    }
  };

  const handleTypingStart = () => {
    if (!selectedChat || !messageInput) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    const conversationId = selectedChat._id || selectedChat.id;
    socketService.sendTyping(conversationId);
    
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(conversationId);
    }, 3000);
  };

  const handleTypingStop = () => {
    if (!selectedChat) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    const conversationId = selectedChat._id || selectedChat.id;
    socketService.stopTyping(conversationId);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', selectedChat._id || selectedChat.id);

      const response = await api.sendFileMessage(formData);
      
      if (response.success) {
        toast.success('تم رفع الملف بنجاح');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    
    try {
      const response = await api.deleteMessage(messageId);
      if (response.success) {
        setMessages(prev => prev.filter(msg => (msg._id !== messageId && msg.id !== messageId)));
        toast.success('تم حذف الرسالة');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('فشل حذف الرسالة');
    }
  };

  const markConversationAsRead = async (conversationId) => {
    try {
      await api.markConversationAsRead?.(conversationId);
      
      setConversations(prev =>
        prev.map(conv => {
          if ((conv._id === conversationId || conv.id === conversationId)) {
            return { ...conv, unreadCount: 0 };
          }
          return conv;
        })
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const selectConversation = async (conversation) => {
    setSelectedChat(conversation);
    setShowChatInfo(false);
    setTyping(false);
    
    const conversationId = conversation._id || conversation.id;
    
    await loadMessages(conversationId, true);
    await loadConversationDetails(conversationId);
    await markConversationAsRead(conversationId);
    
    // تحديث unreadCount في القائمة
    setConversations(prev =>
      prev.map(conv => {
        if ((conv._id === conversationId || conv.id === conversationId)) {
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      })
    );
  };

  const loadMoreMessages = () => {
    if (hasMore && !loadingMore && selectedChat) {
      const conversationId = selectedChat._id || selectedChat.id;
      loadMessages(conversationId);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      const diffMinutes = Math.floor(diff / (1000 * 60));
      const diffHours = Math.floor(diff / (1000 * 60 * 60));
      const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (language === 'ar') {
        if (diffMinutes < 1) return 'الآن';
        if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays === 1) return 'أمس';
        if (diffDays < 7) return `منذ ${diffDays} أيام`;
        return date.toLocaleDateString('ar-SA');
      } else {
        if (diffMinutes < 1) return 'now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US');
      }
    } catch (e) {
      return '';
    }
  };

  const getMessageStatusIcon = (message) => {
    if (message.senderId !== user?.id && message.sender !== user?.id) return null;
    
    if (message.read) {
      return <FaCheckDouble style={{ color: theme.primary }} size={12} />;
    } else if (message.delivered) {
      return <FaCheckDouble style={{ color: theme.textSecondary }} size={12} />;
    } else {
      return <FaCheck style={{ color: theme.textSecondary }} size={12} />;
    }
  };

  const getParticipantName = (conv) => {
    if (!conv) return 'مستخدم';
    
    if (conv.participant) {
      return conv.participant.fullName || conv.participant.name || conv.participant.email || 'مستخدم';
    }
    
    if (conv.user) {
      return conv.user.fullName || conv.user.name || conv.user.email || 'مستخدم';
    }
    
    return 'مستخدم';
  };

  const getParticipantAvatar = (conv) => {
    if (conv.participant?.avatar) return conv.participant.avatar;
    if (conv.user?.avatar) return conv.user.avatar;
    return null;
  };

  const getParticipantOnline = (conv) => {
    return conv.participant?.online || conv.user?.online || false;
  };

  const filteredConversations = conversations.filter(conv => {
    const name = getParticipantName(conv).toLowerCase();
    const lastMsg = conv.lastMessage?.content?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return name.includes(search) || lastMsg.includes(search);
  });

  const texts = {
    ar: {
      title: 'المحادثات',
      back: 'رجوع',
      search: 'بحث في المحادثات...',
      typeMessage: 'اكتب رسالتك هنا...',
      online: 'متصل',
      offline: 'غير متصل',
      lastSeen: 'آخر ظهور',
      today: 'اليوم',
      yesterday: 'أمس',
      send: 'إرسال',
      attachments: 'المرفقات',
      emoji: 'رموز تعبيرية',
      image: 'صورة',
      file: 'ملف',
      voice: 'رسالة صوتية',
      noChats: 'لا توجد محادثات',
      noMessages: 'لا توجد رسائل بعد، ابدأ المحادثة الآن',
      startChat: 'ابدأ المحادثة',
      chatInfo: 'معلومات المحادثة',
      media: 'الوسائط',
      files: 'الملفات',
      links: 'الروابط',
      typing: 'يكتب...',
      delete: 'حذف',
      reply: 'رد',
      loadMore: 'تحميل المزيد',
      scrollToBottom: 'الذهاب إلى آخر رسالة'
    },
    en: {
      title: 'Chats',
      back: 'Back',
      search: 'Search chats...',
      typeMessage: 'Type your message...',
      online: 'Online',
      offline: 'Offline',
      lastSeen: 'Last seen',
      today: 'Today',
      yesterday: 'Yesterday',
      send: 'Send',
      attachments: 'Attachments',
      emoji: 'Emoji',
      image: 'Image',
      file: 'File',
      voice: 'Voice message',
      noChats: 'No chats',
      noMessages: 'No messages yet, start the conversation',
      startChat: 'Start chat',
      chatInfo: 'Chat info',
      media: 'Media',
      files: 'Files',
      links: 'Links',
      typing: 'typing...',
      delete: 'Delete',
      reply: 'Reply',
      loadMore: 'Load more',
      scrollToBottom: 'Go to latest message'
    }
  };

  const t = texts[language];

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        backgroundColor: theme.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <FaSpinner className="animate-spin" size={40} color={theme.primary} />
        <p style={{ color: theme.textSecondary }}>جاري تحميل المحادثات...</p>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      backgroundColor: theme.background,
      color: theme.text,
      direction: language === 'ar' ? 'rtl' : 'ltr',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease'
    }}>
      
      {/* الهيدر */}
      <div style={{
        background: theme.card,
        borderBottom: `1px solid ${theme.border}`,
        padding: '15px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={() => setPage('home')}
            style={{
              background: 'none',
              border: 'none',
              color: theme.text,
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaArrowLeft size={20} />
          </button>
          <h1 style={{ margin: 0, fontSize: '20px' }}>{t.title}</h1>
        </div>

        <button
          onClick={toggleDarkMode}
          style={{
            background: 'none',
            border: 'none',
            color: theme.text,
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%'
          }}
        >
          {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* قائمة المحادثات */}
        <div style={{
          width: '350px',
          borderLeft: language === 'ar' ? 'none' : `1px solid ${theme.border}`,
          borderRight: language === 'ar' ? `1px solid ${theme.border}` : 'none',
          backgroundColor: theme.card,
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* البحث */}
          <div style={{ padding: '15px' }}>
            <div style={{
              background: theme.background,
              borderRadius: '30px',
              padding: '10px 15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: `1px solid ${theme.border}`
            }}>
              <FaSearch style={{ color: theme.textSecondary }} />
              <input
                type="text"
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.text,
                  width: '100%',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* قائمة المحادثات */}
          <div 
            style={{ flex: 1, overflowY: 'auto', padding: '0 15px' }}
          >
            {filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textSecondary }}>
                <p>{t.noChats}</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <div
                  key={conv._id || conv.id}
                  onClick={() => selectConversation(conv)}
                  style={{
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '5px',
                    backgroundColor: (selectedChat?._id === conv._id || selectedChat?.id === conv.id) 
                      ? theme.primary + '20' 
                      : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* صورة المستخدم */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: theme.border,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      color: theme.primary
                    }}>
                      {getParticipantAvatar(conv) ? (
                        <img 
                          src={getParticipantAvatar(conv)} 
                          alt="avatar"
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<FaUser size={24} />';
                          }}
                        />
                      ) : (
                        <FaUser size={24} />
                      )}
                    </div>
                    {getParticipantOnline(conv) && (
                      <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        border: `2px solid ${theme.card}`
                      }} />
                    )}
                  </div>

                  {/* معلومات المحادثة */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                        {getParticipantName(conv)}
                      </h3>
                      <span style={{ fontSize: '11px', color: theme.textSecondary }}>
                        {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        color: theme.textSecondary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '180px'
                      }}>
                        {conv.lastMessage?.content || '...'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span style={{
                          background: theme.primary,
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* منطقة المحادثة */}
        {selectedChat ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: theme.background
          }}>
            
            {/* هيدر المحادثة */}
            <div style={{
              padding: '15px 20px',
              borderBottom: `1px solid ${theme.border}`,
              backgroundColor: theme.card,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: theme.border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getParticipantAvatar(selectedChat) ? (
                      <img 
                        src={getParticipantAvatar(selectedChat)} 
                        alt="avatar"
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <FaUser size={20} />
                    )}
                  </div>
                  {getParticipantOnline(selectedChat) && (
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      border: `2px solid ${theme.card}`
                    }} />
                  )}
                </div>
                
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    {getParticipantName(selectedChat)}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.textSecondary }}>
                    {typing ? (
                      <span style={{ color: theme.primary }}>{t.typing}</span>
                    ) : getParticipantOnline(selectedChat) ? (
                      t.online
                    ) : (
                      selectedChat.participant?.lastSeen && formatTime(selectedChat.participant.lastSeen)
                    )}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button style={iconButtonStyle(theme)}>
                  <FaPhone size={16} />
                </button>
                <button style={iconButtonStyle(theme)}>
                  <FaVideo size={16} />
                </button>
                <button 
                  style={iconButtonStyle(theme)}
                  onClick={() => setShowChatInfo(!showChatInfo)}
                >
                  <FaInfoCircle size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              
              {/* الرسائل */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div 
                  ref={messagesContainerRef}
                  className="messages-container"
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {loadingMore && (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <FaSpinner className="animate-spin" color={theme.primary} />
                    </div>
                  )}
                  
                  {messages.map((msg) => {
                    const isMe = msg.senderId === user?.id || msg.sender === user?.id;
                    
                    return (
                      <div
                        key={msg._id || msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          marginBottom: '5px',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          const actions = e.currentTarget.querySelector('.message-actions');
                          if (actions) actions.style.opacity = 1;
                        }}
                        onMouseLeave={(e) => {
                          const actions = e.currentTarget.querySelector('.message-actions');
                          if (actions) actions.style.opacity = 0;
                        }}
                      >
                        <div style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          backgroundColor: isMe ? theme.primary : theme.card,
                          color: isMe ? 'white' : theme.text,
                          boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
                          position: 'relative'
                        }}>
                          {msg.type === 'text' && (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{msg.content}</p>
                          )}
                          {msg.type === 'image' && (
                            <img 
                              src={msg.content} 
                              alt="message" 
                              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', cursor: 'pointer' }}
                              onClick={() => window.open(msg.content, '_blank')}
                            />
                          )}
                          {msg.type === 'file' && (
                            <a 
                              href={msg.content} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                color: isMe ? 'white' : theme.primary,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textDecoration: 'none'
                              }}
                            >
                              <FaFile />
                              <span>تحميل الملف</span>
                              <FaDownload size={12} />
                            </a>
                          )}
                          
                          {/* وقت الرسالة وحالتها */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            marginTop: '4px',
                            fontSize: '10px',
                            color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary
                          }}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {getMessageStatusIcon(msg)}
                          </div>

                          {/* أزرار الإجراءات (تظهر عند hover) */}
                          <div 
                            className="message-actions"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              [language === 'ar' ? 'left' : 'right']: '-30px',
                              display: 'flex',
                              gap: '5px',
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              backgroundColor: theme.card,
                              borderRadius: '20px',
                              padding: '5px',
                              boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          >
                            {isMe && (
                              <button
                                onClick={() => deleteMessage(msg._id || msg.id)}
                                style={iconButtonStyle(theme)}
                                title={t.delete}
                              >
                                <FaTrash size={12} color="#ef4444" />
                              </button>
                            )}
                            <button
                              onClick={() => setReplyingTo(msg)}
                              style={iconButtonStyle(theme)}
                              title={t.reply}
                            >
                              <FaReply size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* زر العودة للأسفل */}
                {!isNearBottom && (
                  <button
                    onClick={() => scrollToBottom('smooth')}
                    style={{
                      position: 'sticky',
                      bottom: '80px',
                      left: '50%',
                      transform: 'translateX(-50%)',
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
                      zIndex: 100,
                      margin: '0 auto 10px',
                      transition: 'all 0.3s ease'
                    }}
                    title={t.scrollToBottom}
                  >
                    <FaArrowDown />
                  </button>
                )}

                {/* شريط إدخال الرسالة */}
                <div style={{
                  padding: '15px 20px',
                  borderTop: `1px solid ${theme.border}`,
                  backgroundColor: theme.card,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button style={iconButtonStyle(theme)}>
                      <FaSmile size={20} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      accept="image/*,.pdf,.doc,.docx"
                    />
                    <button 
                      style={iconButtonStyle(theme)}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <FaSpinner className="animate-spin" size={20} /> : <FaPaperclip size={20} />}
                    </button>
                  </div>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={t.typeMessage}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '30px',
                      backgroundColor: theme.background,
                      color: theme.text,
                      outline: 'none'
                    }}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || sending}
                    style={{
                      background: messageInput.trim() ? theme.primary : theme.border,
                      border: 'none',
                      borderRadius: '50%',
                      width: '45px',
                      height: '45px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {sending ? (
                      <FaSpinner className="animate-spin" color="white" size={18} />
                    ) : (
                      <FaPaperPlane color="white" size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* معلومات المحادثة */}
              {showChatInfo && conversationDetails && (
                <div style={{
                  width: '300px',
                  borderLeft: language === 'ar' ? 'none' : `1px solid ${theme.border}`,
                  borderRight: language === 'ar' ? `1px solid ${theme.border}` : 'none',
                  backgroundColor: theme.card,
                  padding: '20px',
                  overflowY: 'auto'
                }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>{t.chatInfo}</h3>
                  
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: theme.border,
                      margin: '0 auto 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getParticipantAvatar(conversationDetails) ? (
                        <img 
                          src={getParticipantAvatar(conversationDetails)} 
                          alt="avatar"
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <FaUser size={40} color={theme.primary} />
                      )}
                    </div>
                    <h4 style={{ margin: '0 0 5px 0' }}>
                      {getParticipantName(conversationDetails)}
                    </h4>
                    <p style={{ fontSize: '13px', color: theme.textSecondary }}>
                      {conversationDetails.participant?.role === 'guide' ? 'مرشد سياحي' : 'سائح'}
                    </p>
                  </div>

                  {/* وسائط مشتركة */}
                  {conversationDetails.media && conversationDetails.media.length > 0 && (
                    <div style={{
                      padding: '15px 0',
                      borderTop: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`
                    }}>
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', color: theme.textSecondary }}>{t.media}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                        {conversationDetails.media.slice(0, 6).map((media, i) => (
                          <div 
                            key={i} 
                            style={{
                              height: '80px',
                              background: theme.border,
                              borderRadius: '8px',
                              overflow: 'hidden',
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(media, '_blank')}
                          >
                            <img 
                              src={media} 
                              alt="media" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* الملفات المشتركة */}
                  {conversationDetails.files && conversationDetails.files.length > 0 && (
                    <div style={{ padding: '15px 0' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', color: theme.textSecondary }}>{t.files}</span>
                      </div>
                      <div style={{ color: theme.textSecondary, fontSize: '13px' }}>
                        {conversationDetails.files.map((file, i) => (
                          <div 
                            key={i} 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              hover: { backgroundColor: theme.border }
                            }}
                            onClick={() => window.open(file.url, '_blank')}
                          >
                            <FaFile />
                            <span style={{ flex: 1 }}>{file.name}</span>
                            <span style={{ fontSize: '11px' }}>{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.background
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: theme.border,
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaComments size={40} color={theme.primary} />
              </div>
              <h3 style={{ margin: '0 0 10px 0', color: theme.text }}>{t.noMessages}</h3>
              <p style={{ color: theme.textSecondary }}>{t.startChat}</p>
            </div>
          </div>
        )}
      </div>

      {/* CSS إضافي */}
      <style>{`
        .messages-container {
          scroll-behavior: smooth;
          overflow-y: auto !important;
        }
        
        .messages-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .messages-container::-webkit-scrollbar-track {
          background: ${theme.border};
          border-radius: 10px;
        }
        
        .messages-container::-webkit-scrollbar-thumb {
          background: ${theme.primary}80;
          border-radius: 10px;
        }
        
        .messages-container::-webkit-scrollbar-thumb:hover {
          background: ${theme.primary};
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        button:hover {
          opacity: 0.9;
          transform: scale(1.05);
        }
        
        button:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

const iconButtonStyle = (theme) => ({
  background: 'none',
  border: 'none',
  color: theme.textSecondary,
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease'
});

export default ChatPage;

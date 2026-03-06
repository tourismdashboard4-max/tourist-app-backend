// client/src/pages/SupportChatPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  FaHeadset, 
  FaArrowLeft, 
  FaSpinner, 
  FaPaperPlane, 
  FaCheck, 
  FaExclamationCircle,
  FaImage,
  FaSmile,
  FaPaperclip,
  FaStar,
  FaRegStar,
  FaTimes,
  FaEllipsisH,
  FaCheckDouble,
  FaUserCircle
} from 'react-icons/fa';
import { IoMdSend } from 'react-icons/io';
import { MdAttachFile, MdInsertEmoticon, MdImage } from 'react-icons/md';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';
import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';

// ========== رسائل التشخيص ==========
console.log('🔥🔥🔥 SupportChatPage is being imported!', new Date().toLocaleTimeString());

const SupportChatPage = ({ setPage }) => {
  // ========== تشخيص التحميل ==========
  console.log('🎯 SupportChatPage mounted at:', new Date().toLocaleTimeString());
  console.log('📦 Props received:', { setPage: !!setPage });

  const { user, isAuthenticated } = useAuth();
  
  // تشخيص الـ Auth
  console.log('👤 Auth State:', { 
    user: user?.email, 
    isAuthenticated,
    hasUser: !!user 
  });

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reconnecting, setReconnecting] = useState(false);
  const [page_, setPage_] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [supportInfo, setSupportInfo] = useState({
    name: 'فريق الدعم الفني',
    status: 'online',
    avatar: null,
    responseTime: 'عادةً يرد خلال دقائق'
  });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!conversationId) return;

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
    wsRef.current = new WebSocket(`${wsUrl}/chat/${conversationId}?userId=${user?.id}`);

    wsRef.current.onopen = () => {
      console.log('✅ WebSocket connected');
      setReconnecting(false);
      toast.success('متصل بالدعم الفني', { icon: '🔌', duration: 2000 });
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'message':
          setMessages(prev => [...prev, { ...data.message, status: 'delivered' }]);
          break;
        case 'typing':
          handleSupportTyping(data.isTyping);
          break;
        case 'read':
          markMessagesAsRead(data.messageIds);
          break;
        case 'status':
          setSupportInfo(prev => ({ ...prev, status: data.status }));
          break;
        default:
          break;
      }
    };

    wsRef.current.onclose = () => {
      console.log('❌ WebSocket disconnected');
      handleReconnection();
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [conversationId, user?.id]);

  // Handle reconnection
  const handleReconnection = useCallback(() => {
    if (reconnecting) return;
    
    setReconnecting(true);
    toast.loading('جاري إعادة الاتصال...', { id: 'reconnecting' });
    
    let attempts = 0;
    const maxAttempts = 5;
    
    const attemptReconnect = () => {
      if (attempts >= maxAttempts) {
        toast.error('تعذر إعادة الاتصال، يرجى تحديث الصفحة', { id: 'reconnecting' });
        setReconnecting(false);
        return;
      }
      
      attempts++;
      console.log(`🔄 محاولة إعادة الاتصال ${attempts}/${maxAttempts}`);
      
      setTimeout(() => {
        if (navigator.onLine) {
          connectWebSocket();
        } else {
          attemptReconnect();
        }
      }, 3000 * attempts);
    };
    
    attemptReconnect();
  }, [reconnecting, connectWebSocket]);

  // تحميل المحادثة عند فتح الصفحة
  useEffect(() => {
    console.log('📋 useEffect - checking authentication');
    
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, redirecting to profile');
      toast.error('يرجى تسجيل الدخول أولاً');
      setPage('profile');
      return;
    }
    
    console.log('✅ User authenticated, loading chat...');
    loadOrCreateChat();
  }, [isAuthenticated]);

  // WebSocket connection
  useEffect(() => {
    if (conversationId) {
      console.log('🔌 Connecting WebSocket for conversation:', conversationId);
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        console.log('🔌 Disconnecting WebSocket');
        wsRef.current.close();
      }
    };
  }, [conversationId, connectWebSocket]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال بالإنترنت');
      if (conversationId && !wsRef.current) {
        connectWebSocket();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('انقطع الاتصال بالإنترنت');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [conversationId, connectWebSocket]);

  // التمرير لآخر رسالة
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // تحميل المزيد من الرسائل عند التمرير للأعلى
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      if (chatContainer.scrollTop === 0 && hasMore && !loading) {
        loadMoreMessages();
      }
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // تحميل أو إنشاء محادثة الدعم
  const loadOrCreateChat = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 البحث عن محادثة دعم...');

      const convResponse = await api.getUserConversations();
      console.log('📥 Conversations response:', convResponse);
      
      if (convResponse.success && convResponse.conversations) {
        const existingChat = convResponse.conversations.find(
          conv => conv.type === 'support'
        );

        if (existingChat) {
          console.log('✅ Found existing support chat:', existingChat);
          const chatId = existingChat._id || existingChat.id;
          setConversationId(chatId);
          await loadMessages(chatId, 1);
          setLoading(false);
          return;
        }
      }

      // إنشاء محادثة جديدة
      console.log('🔄 إنشاء محادثة جديدة...');
      const response = await api.startSupportChat({
        subject: 'طلب دعم جديد',
        manual: true
      });

      console.log('📥 Start chat response:', response);

      if (response.success) {
        const chatId = response.chat._id || response.chat.id;
        setConversationId(chatId);
        setMessages([]);
        
        // رسالة ترحيب
        setTimeout(() => {
          const welcomeMessage = {
            id: Date.now(),
            senderId: 'support',
            text: 'مرحباً بك في الدعم الفني! كيف يمكنني مساعدتك اليوم؟',
            createdAt: new Date().toISOString(),
            status: 'delivered'
          };
          setMessages([welcomeMessage]);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل المحادثة:', error);
      setError(error.message);
      toast.error('فشل تحميل المحادثة');
      
      // عرض رسائل تجريبية في حالة الخطأ
      setMessages([
        {
          id: 1,
          senderId: 'support',
          text: 'مرحباً بك في الدعم الفني! (وضع التجربة)',
          createdAt: new Date().toISOString(),
          status: 'delivered'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // تحميل الرسائل
  const loadMessages = async (chatId, pageNum) => {
    try {
      console.log('📥 Loading messages for chat:', chatId, 'page:', pageNum);
      const response = await api.getConversationMessages(chatId, pageNum);
      if (response.success) {
        setMessages(response.messages || []);
        setHasMore(response.hasMore || false);
      }
    } catch (error) {
      console.error('خطأ في تحميل الرسائل:', error);
    }
  };

  // تحميل المزيد من الرسائل
  const loadMoreMessages = async () => {
    try {
      const nextPage = page_ + 1;
      const response = await api.getConversationMessages(conversationId, nextPage);
      
      if (response.success && response.messages.length > 0) {
        setMessages(prev => [...response.messages, ...prev]);
        setPage_(nextPage);
        setHasMore(response.hasMore);
        
        // الحفاظ على موضع التمرير
        const oldHeight = chatContainerRef.current.scrollHeight;
        setTimeout(() => {
          const newHeight = chatContainerRef.current.scrollHeight;
          chatContainerRef.current.scrollTop = newHeight - oldHeight;
        }, 100);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('خطأ في تحميل المزيد:', error);
    }
  };

  // إرسال رسالة نصية
  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || sending) return;

    // رسالة مؤقتة
    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      senderId: user?.id,
      text: newMessage,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);
    const messageText = newMessage;
    setNewMessage('');
    setSending(true);

    // إرسال عبر WebSocket إذا كان متاحاً
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        text: messageText,
        tempId
      }));
    }

    try {
      const response = await api.sendTextMessage(conversationId, messageText);
      
      if (response.success) {
        setMessages(prev => 
          prev.map(msg => msg.id === tempId ? { ...response.data, status: 'sent' } : msg)
        );
        
        // تأكيد الاستلام عبر WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'received',
            messageId: response.data.id
          }));
        }
      }
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? { ...msg, status: 'error' } : msg)
      );
      toast.error('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  // إرسال صورة
  const sendImage = async (file) => {
    if (!file || !conversationId) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('conversationId', conversationId);

    // رسالة مؤقتة
    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      senderId: user?.id,
      type: 'image',
      image: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: file.size,
      createdAt: new Date().toISOString(),
      status: 'uploading',
      uploadProgress: 0
    };

    setMessages(prev => [...prev, tempMessage]);
    setUploadProgress(0);

    try {
      const response = await api.sendImageMessage(formData, (progress) => {
        setUploadProgress(progress);
        setMessages(prev => 
          prev.map(msg => msg.id === tempId ? { ...msg, uploadProgress: progress } : msg)
        );
      });

      if (response.success) {
        setMessages(prev => 
          prev.map(msg => msg.id === tempId ? { ...response.data, status: 'sent' } : msg)
        );
        toast.success('تم إرسال الصورة بنجاح');
      }
    } catch (error) {
      console.error('خطأ في إرسال الصورة:', error);
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? { ...msg, status: 'error' } : msg)
      );
      toast.error('فشل إرسال الصورة');
    } finally {
      setUploadProgress(0);
    }
  };

  // إرسال ملف
  const sendFile = async (file) => {
    if (!file || !conversationId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);

    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      senderId: user?.id,
      type: 'file',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      createdAt: new Date().toISOString(),
      status: 'uploading'
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await api.sendFileMessage(formData);
      
      if (response.success) {
        setMessages(prev => 
          prev.map(msg => msg.id === tempId ? { ...response.data, status: 'sent' } : msg)
        );
        toast.success('تم إرسال الملف بنجاح');
      }
    } catch (error) {
      console.error('خطأ في إرسال الملف:', error);
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? { ...msg, status: 'error' } : msg)
      );
      toast.error('فشل إرسال الملف');
    }
  };

  // مؤشر الكتابة
  const handleTyping = () => {
    if (!isTyping && wsRef.current?.readyState === WebSocket.OPEN) {
      setIsTyping(true);
      wsRef.current.send(JSON.stringify({ type: 'typing', isTyping: true }));
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'typing', isTyping: false }));
        }
      }, 3000);
    }
  };

  // مؤشر كتابة الدعم
  const handleSupportTyping = (typing) => {
    setSupportInfo(prev => ({ ...prev, isTyping: typing }));
  };

  // تحديد الرسائل كمقروءة
  const markMessagesAsRead = (messageIds) => {
    setMessages(prev => 
      prev.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, status: 'read' } : msg
      )
    );
  };

  // إرسال بالضغط على Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // اختيار إيموجي
  const onEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // فتح صورة
  const openImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setLightboxOpen(true);
  };

  // تحميل ملف
  const downloadFile = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('تم تحميل الملف');
    } catch (error) {
      console.error('خطأ في تحميل الملف:', error);
      toast.error('فشل تحميل الملف');
    }
  };

  // تقييم المحادثة
  const submitRating = async () => {
    if (rating === 0) {
      toast.error('يرجى اختيار تقييم');
      return;
    }

    try {
      await api.rateConversation(conversationId, rating);
      toast.success('شكراً لتقييمك!');
      setShowRating(false);
      
      // رسالة شكر
      const thankYouMessage = {
        id: Date.now(),
        senderId: 'support',
        text: 'شكراً لتقييمك! نسعد دائماً بخدمتك',
        createdAt: new Date().toISOString(),
        status: 'delivered'
      };
      setMessages(prev => [...prev, thankYouMessage]);
    } catch (error) {
      console.error('خطأ في إرسال التقييم:', error);
      toast.error('فشل إرسال التقييم');
    }
  };

  // إنهاء المحادثة
  const endConversation = () => {
    setShowRating(true);
  };

  // تنسيق الوقت
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const diffMinutes = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);

    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    return date.toLocaleDateString('ar-EG');
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // إذا كان هناك خطأ
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <FaExclamationCircle size={48} color="#f44336" />
        <h3>حدث خطأ في تحميل المحادثة</h3>
        <p>{error}</p>
        <button 
          onClick={() => setPage('profile')}
          style={styles.errorButton}
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  // حالة التحميل
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <FaSpinner size={48} style={{ animation: 'spin 1s linear infinite', color: '#2196F3' }} />
        <p style={styles.loadingText}>جاري تحميل المحادثة...</p>
      </div>
    );
  }

  console.log('🎨 Rendering SupportChatPage UI with', messages.length, 'messages');

  return (
    <div style={styles.container}>
      {/* رأس الصفحة */}
      <div style={styles.header}>
        <button onClick={() => setPage('profile')} style={styles.backButton}>
          <FaArrowLeft /> رجوع
        </button>
        
        <div style={styles.supportInfo}>
          <div style={styles.supportAvatar}>
            {supportInfo.avatar ? (
              <img src={supportInfo.avatar} alt="Support" style={styles.avatarImage} />
            ) : (
              <FaHeadset size={24} />
            )}
            <span style={{
              ...styles.statusDot,
              backgroundColor: supportInfo.status === 'online' ? '#4CAF50' : '#FFC107'
            }} />
          </div>
          
          <div style={styles.supportDetails}>
            <h3 style={styles.supportName}>{supportInfo.name}</h3>
            <p style={styles.supportStatus}>
              {supportInfo.isTyping ? (
                <span style={styles.typingText}>يكتب...</span>
              ) : (
                <>
                  <span style={{
                    ...styles.statusText,
                    color: supportInfo.status === 'online' ? '#4CAF50' : '#FFC107'
                  }}>
                    {supportInfo.status === 'online' ? 'متصل' : 'غير متصل'}
                  </span>
                  <span style={styles.responseTime}>{supportInfo.responseTime}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <button onClick={endConversation} style={styles.endChatButton}>
          <FaTimes />
        </button>
      </div>

      {/* حالة الاتصال */}
      {!isOnline && (
        <div style={styles.offlineBanner}>
          <FaExclamationCircle /> أنت غير متصل بالإنترنت
        </div>
      )}

      {reconnecting && (
        <div style={styles.reconnectingBanner}>
          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> جاري إعادة الاتصال...
        </div>
      )}

      {/* منطقة عرض الرسائل */}
      <div ref={chatContainerRef} style={styles.messagesContainer}>
        {!hasMore && messages.length > 0 && (
          <div style={styles.conversationStart}>
            <span>بداية المحادثة</span>
          </div>
        )}

        {messages.length === 0 ? (
          <div style={styles.emptyMessages}>
            <FaHeadset size={60} color="#ccc" />
            <p>لا توجد رسائل بعد. ابدأ المحادثة الآن!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;
            const showDate = index === 0 || 
              new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1]?.createdAt).toDateString();

            return (
              <React.Fragment key={msg.id || index}>
                {showDate && (
                  <div style={styles.dateSeparator}>
                    <span>{new Date(msg.createdAt).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                )}
                
                <div style={{
                  ...styles.messageWrapper,
                  justifyContent: isMe ? 'flex-end' : 'flex-start'
                }}>
                  {!isMe && (
                    <div style={styles.supportAvatarSmall}>
                      <FaHeadset size={20} color="#2196F3" />
                    </div>
                  )}
                  
                  <div style={{
                    ...styles.messageContent,
                    maxWidth: msg.type === 'image' ? '300px' : '70%'
                  }}>
                    {/* رسالة نصية */}
                    {!msg.type && (
                      <div style={{
                        ...styles.messageBubble,
                        backgroundColor: isMe ? '#2196F3' : 'white',
                        color: isMe ? 'white' : '#333',
                        borderBottomRightRadius: isMe ? '4px' : '18px',
                        borderBottomLeftRadius: isMe ? '18px' : '4px'
                      }}>
                        <div style={styles.messageText}>{msg.text}</div>
                      </div>
                    )}

                    {/* رسالة صورة */}
                    {msg.type === 'image' && (
                      <div style={styles.imageMessage}>
                        <img 
                          src={msg.image || msg.url} 
                          alt={msg.fileName}
                          style={styles.messageImage}
                          onClick={() => openImage(msg.image || msg.url)}
                        />
                        {msg.status === 'uploading' && (
                          <div style={styles.uploadProgress}>
                            <div style={{ ...styles.progressBar, width: `${msg.uploadProgress}%` }} />
                            <span>{msg.uploadProgress}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* رسالة ملف */}
                    {msg.type === 'file' && (
                      <div style={{
                        ...styles.fileMessage,
                        backgroundColor: isMe ? '#E3F2FD' : 'white'
                      }}>
                        <div style={styles.fileIcon}>
                          <FaPaperclip size={24} color="#2196F3" />
                        </div>
                        <div style={styles.fileInfo}>
                          <div style={styles.fileName}>{msg.fileName}</div>
                          <div style={styles.fileSize}>{formatFileSize(msg.fileSize)}</div>
                        </div>
                        <button 
                          onClick={() => downloadFile(msg.url, msg.fileName)}
                          style={styles.downloadButton}
                        >
                          تحميل
                        </button>
                      </div>
                    )}

                    {/* وقت الرسالة والحالة */}
                    <div style={{
                      ...styles.messageFooter,
                      justifyContent: isMe ? 'flex-end' : 'flex-start'
                    }}>
                      <span style={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                      
                      {isMe && msg.status && (
                        <span style={styles.messageStatus}>
                          {msg.status === 'sending' && <FaSpinner size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                          {msg.status === 'sent' && <FaCheck size={10} />}
                          {msg.status === 'delivered' && <FaCheckDouble size={10} color="#4CAF50" />}
                          {msg.status === 'read' && <FaCheckDouble size={10} color="#2196F3" />}
                          {msg.status === 'error' && <FaExclamationCircle size={10} color="#f44336" />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* مؤشر كتابة الدعم */}
        {supportInfo.isTyping && (
          <div style={styles.typingIndicator}>
            <div style={styles.supportAvatarSmall}>
              <FaHeadset size={20} color="#2196F3" />
            </div>
            <div style={styles.typingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* منطقة إدخال الرسالة */}
      <div style={styles.inputArea}>
        {/* قائمة المرفقات */}
        {showAttachMenu && (
          <div style={styles.attachMenu}>
            <button 
              onClick={() => imageInputRef.current?.click()}
              style={styles.attachButton}
            >
              <MdImage size={20} />
              <span>صورة</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={styles.attachButton}
            >
              <MdAttachFile size={20} />
              <span>ملف</span>
            </button>
          </div>
        )}

        <div style={styles.inputWrapper}>
          <button 
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            style={styles.attachFileButton}
          >
            <FaPaperclip size={20} color="#666" />
          </button>

          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={styles.emojiButton}
          >
            <FaSmile size={20} color="#666" />
          </button>

          {/* منتقي الإيموجي */}
          {showEmojiPicker && (
            <div style={styles.emojiPicker}>
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </div>
          )}

          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder={isOnline ? "اكتب رسالتك هنا..." : "أنت غير متصل بالإنترنت"}
            disabled={sending || !isOnline}
            style={styles.messageInput}
          />

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files[0]) {
                sendImage(e.target.files[0]);
                setShowAttachMenu(false);
              }
            }}
            style={{ display: 'none' }}
          />

          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              if (e.target.files[0]) {
                sendFile(e.target.files[0]);
                setShowAttachMenu(false);
              }
            }}
            style={{ display: 'none' }}
          />

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending || !isOnline}
            style={{
              ...styles.sendButton,
              backgroundColor: (!newMessage.trim() || sending || !isOnline) ? '#ccc' : '#2196F3'
            }}
          >
            {sending ? (
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} size={20} />
            ) : (
              <IoMdSend size={20} />
            )}
          </button>
        </div>
      </div>

      {/* نافذة تقييم المحادثة */}
      {showRating && (
        <div style={styles.modalOverlay}>
          <div style={styles.ratingModal}>
            <h3 style={styles.ratingTitle}>تقييم المحادثة</h3>
            <p style={styles.ratingSubtitle}>كيف كانت تجربتك مع الدعم الفني؟</p>
            
            <div style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={styles.star}
                >
                  {(hoverRating || rating) >= star ? (
                    <FaStar size={40} color="#FFC107" />
                  ) : (
                    <FaRegStar size={40} color="#FFC107" />
                  )}
                </span>
              ))}
            </div>

            <div style={styles.ratingButtons}>
              <button onClick={submitRating} style={styles.submitRatingButton}>
                إرسال التقييم
              </button>
              <button onClick={() => setShowRating(false)} style={styles.cancelRatingButton}>
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة عرض الصور */}
      {lightboxOpen && selectedImage && (
        <Lightbox
          mainSrc={selectedImage}
          onCloseRequest={() => setLightboxOpen(false)}
          reactModalStyle={{ overlay: { zIndex: 9999 } }}
        />
      )}

      {/* أنيميشن */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

// Styles object
const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
    direction: 'rtl',
    fontFamily: 'Cairo, sans-serif'
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: '20px',
    color: '#666',
    fontSize: '16px'
  },
  errorContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    textAlign: 'center'
  },
  errorButton: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  header: {
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'background 0.2s'
  },
  supportInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    marginRight: '15px'
  },
  supportAvatar: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    position: 'relative'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  statusDot: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid white'
  },
  supportDetails: {
    flex: 1
  },
  supportName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600'
  },
  supportStatus: {
    margin: '4px 0 0',
    fontSize: '12px',
    opacity: 0.9,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  typingText: {
    color: '#fff',
    animation: 'pulse 1.5s infinite'
  },
  statusText: {
    fontWeight: '500'
  },
  responseTime: {
    fontSize: '11px',
    opacity: 0.8
  },
  endChatButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s'
  },
  offlineBanner: {
    backgroundColor: '#f44336',
    color: 'white',
    textAlign: 'center',
    padding: '8px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  reconnectingBanner: {
    backgroundColor: '#FFC107',
    color: '#333',
    textAlign: 'center',
    padding: '8px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: '#f0f2f5'
  },
  emptyMessages: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999',
    gap: '10px'
  },
  conversationStart: {
    textAlign: 'center',
    margin: '20px 0',
    position: 'relative'
  },
  dateSeparator: {
    textAlign: 'center',
    margin: '20px 0',
    position: 'relative'
  },
  messageWrapper: {
    display: 'flex',
    marginBottom: '12px',
    alignItems: 'flex-end'
  },
  supportAvatarSmall: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: 'rgba(33,150,243,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px',
    flexShrink: 0
  },
  messageContent: {
    maxWidth: '70%'
  },
  messageBubble: {
    padding: '12px 16px',
    borderRadius: '18px 18px 18px 4px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    wordBreak: 'break-word'
  },
  messageText: {
    fontSize: '14px',
    lineHeight: '1.5'
  },
  imageMessage: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer'
  },
  messageImage: {
    width: '100%',
    maxWidth: '300px',
    maxHeight: '300px',
    objectFit: 'cover',
    borderRadius: '12px',
    transition: 'transform 0.2s'
  },
  uploadProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '4px',
    backgroundColor: 'rgba(0,0,0,0.1)'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    transition: 'width 0.2s'
  },
  fileMessage: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '12px',
    gap: '12px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    minWidth: '250px'
  },
  fileIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: 'rgba(33,150,243,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '4px',
    color: '#333'
  },
  fileSize: {
    fontSize: '12px',
    color: '#666'
  },
  downloadButton: {
    padding: '6px 12px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  messageFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '4px',
    padding: '0 4px'
  },
  messageTime: {
    fontSize: '11px',
    color: '#999'
  },
  messageStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px'
  },
  typingDots: {
    backgroundColor: 'white',
    padding: '12px 16px',
    borderRadius: '18px 18px 18px 4px',
    display: 'flex',
    gap: '4px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  },
  inputArea: {
    backgroundColor: 'white',
    padding: '15px 20px',
    borderTop: '1px solid #e0e0e0',
    position: 'relative'
  },
  attachMenu: {
    position: 'absolute',
    bottom: '80px',
    right: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 5px 20px rgba(0,0,0,0.15)',
    padding: '8px',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  attachButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 15px',
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  inputWrapper: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    position: 'relative'
  },
  attachFileButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  emojiButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  emojiPicker: {
    position: 'absolute',
    bottom: '60px',
    left: '60px',
    zIndex: 1000
  },
  messageInput: {
    flex: 1,
    padding: '12px 18px',
    border: '2px solid #e0e0e0',
    borderRadius: '30px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'Cairo, sans-serif'
  },
  sendButton: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    border: 'none',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 10px rgba(33,150,243,0.3)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  ratingModal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '30px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center'
  },
  ratingTitle: {
    margin: '0 0 10px',
    color: '#333',
    fontSize: '24px'
  },
  ratingSubtitle: {
    margin: '0 0 20px',
    color: '#666',
    fontSize: '16px'
  },
  starsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '30px'
  },
  star: {
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  ratingButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center'
  },
  submitRatingButton: {
    padding: '12px 25px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flex: 1
  },
  cancelRatingButton: {
    padding: '12px 25px',
    backgroundColor: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flex: 1
  }
};

export default SupportChatPage;
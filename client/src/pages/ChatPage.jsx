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
  FaMoon
} from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const ChatPage = ({ setPage }) => {
  const { theme, darkMode, toggleDarkMode } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  
  const messagesEndRef = useRef(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatInfo, setShowChatInfo] = useState(false);

  // بيانات المحادثات التجريبية
  const [chats, setChats] = useState([
    {
      id: 1,
      name: 'محمد العتيبي',
      avatar: null,
      lastMessage: 'مرحباً، كيف يمكنني مساعدتك؟',
      lastTime: new Date(Date.now() - 5 * 60000).toISOString(),
      unread: 2,
      online: true,
      typing: false,
      role: 'مرشد سياحي'
    },
    {
      id: 2,
      name: 'أحمد الحربي',
      avatar: null,
      lastMessage: 'تم تأكيد الحجز الخاص بك',
      lastTime: new Date(Date.now() - 60 * 60000).toISOString(),
      unread: 0,
      online: false,
      lastSeen: new Date(Date.now() - 30 * 60000).toISOString(),
      role: 'مرشد سياحي'
    },
    {
      id: 3,
      name: 'سارة العنزي',
      avatar: null,
      lastMessage: 'شكراً لك على الرحلة الرائعة',
      lastTime: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
      unread: 0,
      online: true,
      role: 'سائحة'
    },
    {
      id: 4,
      name: 'فهد الدوسري',
      avatar: null,
      lastMessage: 'هل يمكننا تغيير موعد الرحلة؟',
      lastTime: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(),
      unread: 1,
      online: false,
      lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(),
      role: 'سائح'
    }
  ]);

  // بيانات الرسائل لكل محادثة
  const [messages, setMessages] = useState({
    1: [
      { id: 1, sender: 'them', text: 'مرحباً، كيف يمكنني مساعدتك؟', time: new Date(Date.now() - 10 * 60000).toISOString(), status: 'read' },
      { id: 2, sender: 'me', text: 'أريد الاستفسار عن رحلة سفاري', time: new Date(Date.now() - 8 * 60000).toISOString(), status: 'read' },
      { id: 3, sender: 'them', text: 'بالتأكيد، لدينا عدة خيارات متاحة', time: new Date(Date.now() - 5 * 60000).toISOString(), status: 'delivered' },
      { id: 4, sender: 'them', text: 'هل تفضل رحلة صباحية أم مسائية؟', time: new Date(Date.now() - 5 * 60000).toISOString(), status: 'delivered' }
    ],
    2: [
      { id: 1, sender: 'them', text: 'تم تأكيد الحجز الخاص بك', time: new Date(Date.now() - 60 * 60000).toISOString(), status: 'read' },
      { id: 2, sender: 'me', text: 'شكراً جزيلاً', time: new Date(Date.now() - 55 * 60000).toISOString(), status: 'read' }
    ],
    3: [
      { id: 1, sender: 'them', text: 'شكراً لك على الرحلة الرائعة', time: new Date(Date.now() - 24 * 60 * 60000).toISOString(), status: 'read' },
      { id: 2, sender: 'me', text: 'العفو، كان من دواعي سروري', time: new Date(Date.now() - 23 * 60 * 60000).toISOString(), status: 'read' }
    ],
    4: [
      { id: 1, sender: 'them', text: 'هل يمكننا تغيير موعد الرحلة؟', time: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(), status: 'read' }
    ]
  });

  // تمرير لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat, messages]);

  const formatTime = (timestamp) => {
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
  };

  const formatLastSeen = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const diffMinutes = Math.floor(diff / (1000 * 60));
    const diffHours = Math.floor(diff / (1000 * 60 * 60));

    if (language === 'ar') {
      if (diffMinutes < 1) return 'متصل الآن';
      if (diffMinutes < 60) return `آخر ظهور منذ ${diffMinutes} دقيقة`;
      if (diffHours < 24) return `آخر ظهور منذ ${diffHours} ساعة`;
      return `آخر ظهور ${date.toLocaleDateString('ar-SA')}`;
    } else {
      if (diffMinutes < 1) return 'online now';
      if (diffMinutes < 60) return `last seen ${diffMinutes} min ago`;
      if (diffHours < 24) return `last seen ${diffHours} hours ago`;
      return `last seen ${date.toLocaleDateString('en-US')}`;
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;

    const newMessage = {
      id: messages[selectedChat].length + 1,
      sender: 'me',
      text: messageInput,
      time: new Date().toISOString(),
      status: 'sent'
    };

    setMessages({
      ...messages,
      [selectedChat]: [...messages[selectedChat], newMessage]
    });

    // تحديث آخر رسالة في قائمة المحادثات
    setChats(chats.map(chat => 
      chat.id === selectedChat 
        ? { ...chat, lastMessage: messageInput, lastTime: new Date().toISOString(), unread: 0 }
        : chat
    ));

    setMessageInput('');
  };

  const getMessageStatusIcon = (status) => {
    switch(status) {
      case 'sent':
        return <FaCheck style={{ color: theme.textSecondary }} size={12} />;
      case 'delivered':
        return <FaCheckDouble style={{ color: theme.textSecondary }} size={12} />;
      case 'read':
        return <FaCheckDouble style={{ color: theme.primary }} size={12} />;
      default:
        return <FaClock style={{ color: theme.textSecondary }} size={12} />;
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.includes(searchTerm) || chat.lastMessage.includes(searchTerm)
  );

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
      links: 'الروابط'
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
      links: 'Links'
    }
  };

  const t = texts[language];

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* زر الوضع الليلي */}
          <button
            onClick={toggleDarkMode}
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
            {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* قائمة المحادثات - الجانب الأيسر */}
        <div style={{
          width: '350px',
          borderLeft: language === 'ar' ? 'none' : `1px solid ${theme.border}`,
          borderRight: language === 'ar' ? `1px solid ${theme.border}` : 'none',
          backgroundColor: theme.card,
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* شريط البحث */}
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 15px' }}>
            {filteredChats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textSecondary }}>
                <p>{t.noChats}</p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  style={{
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '5px',
                    backgroundColor: selectedChat === chat.id ? theme.primary + '20' : 'transparent',
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
                      <FaUserCircle size={30} />
                    </div>
                    {chat.online && (
                      <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: theme.primary,
                        border: `2px solid ${theme.card}`
                      }} />
                    )}
                  </div>

                  {/* معلومات المحادثة */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{chat.name}</h3>
                      <span style={{ fontSize: '11px', color: theme.textSecondary }}>
                        {formatTime(chat.lastTime)}
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
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
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
                          {chat.unread}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ marginTop: '2px', fontSize: '11px', color: theme.textSecondary }}>
                      {chat.online ? t.online : (chat.lastSeen && formatLastSeen(chat.lastSeen))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* منطقة المحادثة - الجانب الأيمن */}
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
                    <FaUserCircle size={24} color={theme.primary} />
                  </div>
                  {chats.find(c => c.id === selectedChat)?.online && (
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: theme.primary,
                      border: `2px solid ${theme.card}`
                    }} />
                  )}
                </div>
                
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    {chats.find(c => c.id === selectedChat)?.name}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.textSecondary }}>
                    {chats.find(c => c.id === selectedChat)?.online 
                      ? t.online 
                      : formatLastSeen(chats.find(c => c.id === selectedChat)?.lastSeen)}
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
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {messages[selectedChat]?.map((msg, index) => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                        marginBottom: '5px'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        borderRadius: msg.sender === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        backgroundColor: msg.sender === 'me' ? theme.primary : theme.card,
                        color: msg.sender === 'me' ? 'white' : theme.text,
                        boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
                        position: 'relative'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{msg.text}</p>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px',
                          marginTop: '4px',
                          fontSize: '10px',
                          color: msg.sender === 'me' ? 'rgba(255,255,255,0.7)' : theme.textSecondary
                        }}>
                          <span>{formatTime(msg.time)}</span>
                          {msg.sender === 'me' && getMessageStatusIcon(msg.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

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
                    <button style={iconButtonStyle(theme)}>
                      <FaPaperclip size={20} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
                    disabled={!messageInput.trim()}
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
                    <FaPaperPlane color="white" size={18} />
                  </button>
                </div>
              </div>

              {/* معلومات المحادثة - جانبية */}
              {showChatInfo && (
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
                      <FaUserCircle size={50} color={theme.primary} />
                    </div>
                    <h4 style={{ margin: '0 0 5px 0' }}>{chats.find(c => c.id === selectedChat)?.name}</h4>
                    <p style={{ fontSize: '13px', color: theme.textSecondary }}>
                      {chats.find(c => c.id === selectedChat)?.role}
                    </p>
                  </div>

                  <div style={{
                    padding: '15px 0',
                    borderTop: `1px solid ${theme.border}`,
                    borderBottom: `1px solid ${theme.border}`
                  }}>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: theme.textSecondary }}>{t.media}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{
                          height: '80px',
                          background: theme.border,
                          borderRadius: '8px'
                        }} />
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: '15px 0' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: theme.textSecondary }}>{t.files}</span>
                    </div>
                    <div style={{ color: theme.textSecondary, fontSize: '13px' }}>
                      <p>IMG_001.jpg • 2.5 MB</p>
                      <p>DOC_001.pdf • 1.2 MB</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // شاشة عدم تحديد محادثة
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
    </div>
  );
};

// نمط موحد للأزرار الأيقونية
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
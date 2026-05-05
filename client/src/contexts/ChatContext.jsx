// client/src/pages/ChatRoomPage.jsx
// ✅ نسخة معدلة للعمل داخل TouristAppPrototype (بدون React Router)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FaArrowRight, FaPaperclip, FaSmile, FaMicrophone, FaPhone, FaVideo,
  FaEllipsisV, FaCheck, FaCheckDouble, FaUser, FaImage, FaFile, FaTimes
} from 'react-icons/fa';
import { IoSend } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';

const API_BASE = 'https://tourist-app-api.onrender.com';
const SOCKET_URL = 'https://tourist-app-api.onrender.com';

// نفس دالة authFetch من DirectChatPage
const getToken = () => localStorage.getItem('token') || localStorage.getItem('touristAppToken') || '';
const authFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
};

const ChatRoomPage = ({ setPage, lang = 'ar', user: propUser, recipientId, recipientName }) => {
  const [user, setUser] = useState(propUser);
  const [participant, setParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [ticketId, setTicketId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const pollingRef = useRef(null);

  // تحميل بيانات المشارك (المرسل إليه)
  useEffect(() => {
    if (!recipientId) return;
    const fetchParticipant = async () => {
      try {
        const data = await authFetch(`/api/users/${recipientId}`);
        if (data.success && data.user) {
          setParticipant(data.user);
          setOnline(data.user.online || false);
        } else {
          // إذا فشل، نخلق كائن افتراضي
          setParticipant({ id: recipientId, name: recipientName, avatar: null });
        }
      } catch (err) {
        console.error('Error fetching participant:', err);
        setParticipant({ id: recipientId, name: recipientName, avatar: null });
      }
    };
    fetchParticipant();
  }, [recipientId, recipientName]);

  // تحميل التذكرة والرسائل
  useEffect(() => {
    if (!user?.id || !recipientId) return;

    const init = async () => {
      setLoading(true);
      try {
        // جلب جميع التذاكر المفتوحة للمستخدم الحالي
        const ticketsData = await authFetch(`/api/support/tickets?user_id=${user.id}&status=open`);
        let existingTicket = null;
        if (ticketsData.success && Array.isArray(ticketsData.tickets)) {
          existingTicket = ticketsData.tickets.find(
            t => t.type === 'guide_chat' && 
            t.metadata?.guideId !== undefined && 
            String(t.metadata.guideId) === String(recipientId)
          );
        }

        if (existingTicket) {
          setTicketId(existingTicket.id);
          await loadMessages(existingTicket.id);
        } else {
          // إنشاء تذكرة جديدة
          const createData = await authFetch('/api/support/tickets', {
            method: 'POST',
            body: JSON.stringify({
              user_id: user.id,
              subject: `${lang === 'ar' ? 'محادثة مع المرشد' : 'Chat with guide'}: ${recipientName}`,
              type: 'guide_chat',
              priority: 'high',
              message: lang === 'ar' 
                ? `بدأ المستخدم ${user.fullName || user.name} محادثة جديدة معك`
                : `User ${user.fullName || user.name} started a new chat with you`,
              metadata: {
                guideId: recipientId,
                guideName: recipientName,
                created_by: user.id,
                created_by_name: user.fullName || user.name,
                status: 'waiting_for_guide'
              },
            }),
          });
          if (createData.success && createData.ticket) {
            setTicketId(createData.ticket.id);
            setMessages([{
              id: Date.now(),
              content: lang === 'ar'
                ? `مرحباً! هذه بداية محادثتك مع ${recipientName}. سيتم إعلامه برسالتك قريباً.`
                : `Hello! This is the start of your conversation with ${recipientName}.`,
              type: 'text',
              senderId: 'system',
              timestamp: new Date().toISOString(),
              status: 'sent',
            }]);
          }
        }
      } catch (err) {
        console.error('Init error:', err);
        toast.error(lang === 'ar' ? 'حدث خطأ في فتح المحادثة' : 'Error opening chat');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, recipientId, recipientName, lang]);

  // جلب الرسائل
  const loadMessages = useCallback(async (tId) => {
    if (!tId) return;
    try {
      const data = await authFetch(`/api/support/tickets/${tId}/messages`);
      if (data.success && Array.isArray(data.messages)) {
        const formatted = data.messages.map(m => ({
          id: m.id,
          content: m.message,
          type: 'text',
          senderId: m.is_from_user ? user?.id : (m.sender_id || 'system'),
          timestamp: m.created_at,
          status: 'sent',
          attachment: null,
        }));
        setMessages(formatted);
      }
    } catch (err) { console.error('loadMessages error:', err); }
  }, [user?.id]);

  // إعادة تحميل الرسائل دورياً (polling)
  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(() => { loadMessages(ticketId); }, 5000);
    return () => clearInterval(interval);
  }, [ticketId, loadMessages]);

  // الاتصال بـ Socket.io للإشعارات الفورية
  useEffect(() => {
    if (!user?.id || !recipientId) return;
    const socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;
    socket.on('connect', () => console.log('✅ ChatRoom socket connected'));
    socket.on('new_message', (data) => {
      if (data.ticket_id === ticketId || (data.ticket_id && data.ticket_id === ticketId)) {
        loadMessages(ticketId);
      }
    });
    socket.on('user_online', ({ userId }) => {
      if (String(userId) === String(recipientId)) setOnline(true);
    });
    socket.on('user_offline', ({ userId }) => {
      if (String(userId) === String(recipientId)) setOnline(false);
    });
    return () => { socket.disconnect(); };
  }, [user?.id, recipientId, ticketId, loadMessages]);

  // دالة إرسال الرسالة
  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || sending || !ticketId) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    const tempId = Date.now().toString();
    const tempMessage = {
      id: tempId,
      content: text,
      type: 'text',
      senderId: user.id,
      timestamp: new Date().toISOString(),
      status: 'sending',
      attachment: null,
    };
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      await authFetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
      // إشعار للمستقبل عبر socket (اختياري، الخادم قد يرسله تلقائياً)
      if (socketRef.current?.connected) {
        socketRef.current.emit('notify_user', {
          userId: recipientId,
          ticketId,
          message: text,
        });
      }
    } catch (err) {
      console.error('send error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  // دوال مساعدة (مؤشر الكتابة، التمرير، تنسيق الوقت، إلخ)
  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    // إرسال حالة الكتابة عبر socket (اختياري)
    socketRef.current?.emit('typing', { room: `chat-${recipientId}`, isTyping: e.target.value.length > 0 });
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { room: `chat-${recipientId}`, isTyping: false });
    }, 2000);
  };
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return lang === 'ar' ? 'اليوم' : 'Today';
    if (date.toDateString() === yesterday.toDateString()) return lang === 'ar' ? 'أمس' : 'Yesterday';
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
  };
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      const date = formatDate(msg.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };
  const handleEmojiSelect = (emoji) => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); };
  const handleFileSelect = (file) => {
    // تبسيط: نعرض صورة أو ملف مؤقت (للتوضيح)
    setAttachment({ url: URL.createObjectURL(file), name: file.name, size: file.size, type: file.type });
    setShowFileUpload(false);
  };
  const handleRemoveAttachment = () => { if (attachment?.url) URL.revokeObjectURL(attachment.url); setAttachment(null); };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>;

  const messageGroups = groupMessagesByDate();

  return (
    <div className="h-full flex flex-col bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setPage('explore')} className="p-2 hover:bg-gray-100 rounded-lg"><FaArrowRight className="text-gray-600" /></button>
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
              {participant?.avatar ? <img src={participant.avatar} alt={participant.name} className="w-full h-full rounded-xl object-cover" /> : participant?.name?.charAt(0)}
            </div>
            {online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
          </div>
          <div>
            <h2 className="font-bold text-gray-800">{participant?.name}</h2>
            <p className="text-xs text-gray-500">{online ? (lang === 'ar' ? 'متصل الآن' : 'Online') : (lang === 'ar' ? 'غير متصل' : 'Offline')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg"><FaPhone className="text-gray-600" /></button>
          <button className="p-2 hover:bg-gray-100 rounded-lg"><FaVideo className="text-gray-600" /></button>
          <button className="p-2 hover:bg-gray-100 rounded-lg"><FaEllipsisV className="text-gray-600" /></button>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex justify-center mb-4"><span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">{date}</span></div>
            {dateMessages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              const isSystem = msg.senderId === 'system';
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex mb-4 ${isMe ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                    <div className={`flex items-end gap-2 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                      {!isMe && !isSystem && (
                        <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">{participant?.name?.charAt(0)}</div>
                      )}
                      <div className={`rounded-2xl p-3 ${isMe ? 'bg-gray-100 text-gray-800' : isSystem ? 'bg-gray-300 text-gray-600' : 'bg-green-600 text-white'}`}>
                        {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                        <div className={`flex items-center gap-1 mt-1 text-xs ${isMe ? 'text-gray-500' : isSystem ? 'text-gray-500' : 'text-green-100'}`}>
                          <span>{formatTime(msg.timestamp)}</span>
                          {isMe && msg.status === 'sent' && <FaCheck className="text-gray-400" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
        {/* مؤشر الكتابة (اختياري) */}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">{participant?.name?.charAt(0)}</div>
            <div className="bg-gray-200 rounded-2xl px-4 py-2"><div className="flex gap-1"><span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></span><span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></span></div></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* معاينة المرفق (اختياري) */}
      <AnimatePresence>
        {attachment && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white border-t p-4">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <img src={attachment.url} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
              <div className="flex-1"><p className="font-medium text-gray-800">{attachment.name}</p><p className="text-xs text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</p></div>
              <button onClick={handleRemoveAttachment} className="p-2 hover:bg-gray-200 rounded-lg"><FaTimes className="text-gray-500" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* منطقة إدخال الرسالة */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFileUpload(true)} className="p-3 hover:bg-gray-100 rounded-xl"><FaPaperclip className="text-gray-600" /></button>
          <button onClick={() => setShowEmojiPicker(true)} className="p-3 hover:bg-gray-100 rounded-xl"><FaSmile className="text-gray-600" /></button>
          <div className="flex-1"><input ref={inputRef} type="text" value={newMessage} onChange={handleTyping} onKeyPress={handleKeyPress} placeholder={lang === 'ar' ? 'اكتب رسالتك هنا...' : 'Type your message...'} className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
          <button onClick={sendMessage} disabled={(!newMessage.trim() && !attachment) || sending} className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"><IoSend /></button>
        </div>
      </div>

      {/* نافذة اختيار الإيموجي ورفع الملفات (مكونات وهمية – يمكنك تطويرها لاحقاً) */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full">
            <div className="flex justify-between"><h3 className="font-bold">اختر إيموجي</h3><button onClick={() => setShowEmojiPicker(false)}><FaTimes /></button></div>
            <div className="grid grid-cols-8 gap-2 mt-4">
              {['😀','😊','😍','🥰','😎','🤔','😢','😂','❤️','👍','🙏','🔥','⭐','🎉','💬','📷','🔊','📍','✅','❌'].map(emo => <button key={emo} onClick={() => handleEmojiSelect(emo)} className="text-2xl hover:bg-gray-100 p-2 rounded">{emo}</button>)}
            </div>
          </div>
        </div>
      )}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full">
            <div className="flex justify-between"><h3 className="font-bold">رفع ملف</h3><button onClick={() => setShowFileUpload(false)}><FaTimes /></button></div>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = ''; }} className="mt-4 w-full" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoomPage;

// client/src/pages/DirectChatPage.jsx
// ✅ النسخة النهائية - تفتح كل محادثة بشكل مستقل بناءً على ثنائية (المستخدم الحالي، الطرف الآخر)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, ArrowLeft, User, MessageCircle, RefreshCw, Smile, Image, Paperclip, Mic, Bell, CheckCircle2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const API_BASE = 'https://tourist-app-api.onrender.com';
const SOCKET_URL = 'https://tourist-app-api.onrender.com';
const DELETED_TICKETS_KEY = 'guide_deleted_tickets';

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

const addDeletedTicket = (ticketId) => {
  const stored = localStorage.getItem(DELETED_TICKETS_KEY);
  let deletedSet = stored ? new Set(JSON.parse(stored)) : new Set();
  deletedSet.add(String(ticketId));
  localStorage.setItem(DELETED_TICKETS_KEY, JSON.stringify([...deletedSet]));
};

const isTicketDeleted = (ticketId) => {
  const stored = localStorage.getItem(DELETED_TICKETS_KEY);
  if (!stored) return false;
  const deletedSet = new Set(JSON.parse(stored));
  return deletedSet.has(String(ticketId));
};

const convertToNumericId = async (userId, token) => {
  if (!userId) return null;
  if (!isNaN(Number(userId))) return Number(userId);
  try {
    const res = await fetch(`${API_BASE}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.user) {
      if (data.user.old_id) return Number(data.user.old_id);
      if (data.user.id && !isNaN(Number(data.user.id))) return Number(data.user.id);
    }
  } catch (err) {
    console.warn('Failed to convert user ID:', err);
  }
  return null;
};

const DirectChatPage = ({ setPage, lang = 'ar', user: propUser }) => {
  const [recipientName, setRecipientName] = useState(lang === 'ar' ? 'المرشد' : 'Guide');
  const [recipientId, setRecipientId] = useState(null);
  const [recipientNumericId, setRecipientNumericId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [initError, setInitError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState(propUser);
  const [notificationSent, setNotificationSent] = useState(false);
  const [guideOnline, setGuideOnline] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isGuide, setIsGuide] = useState(false);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pollingRef = useRef(null);
  const textareaRef = useRef(null);
  const joinedRoomRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (propUser) { setUser(propUser); return; }
    const raw = localStorage.getItem('touristAppUser') || localStorage.getItem('user');
    if (raw) { 
      try { 
        const parsed = JSON.parse(raw);
        setUser(parsed);
        if (parsed.role === 'guide' || parsed.type === 'guide') setIsGuide(true);
      } catch (e) { console.error(e); } 
    }
  }, [propUser]);

  const markTicketAsRead = useCallback(async () => {
    if (!ticketId || isTicketDeleted(ticketId)) return;
    try {
      const token = getToken();
      await fetch(`${API_BASE}/api/support/tickets/${ticketId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    } catch (err) {}
  }, [ticketId]);

  const loadMessages = useCallback(async (tId) => {
    if (!tId || isTicketDeleted(tId)) return;
    setLoadingMessages(true);
    try {
      const data = await authFetch(`/api/support/tickets/${tId}/messages`);
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages.map((m) => ({
          id: m.id,
          message: m.message,
          is_from_user: m.is_from_user,
          created_at: m.created_at,
          sender_name: m.sender_name,
          sender_id: m.sender_id,
          read: m.read || false,
        })));
      } else setMessages([]);
    } catch (e) { 
      console.error('loadMessages error:', e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const notifyViaSocket = useCallback((message, isFromUser = true) => {
    if (socketRef.current?.connected && ticketId && !isTicketDeleted(ticketId)) {
      socketRef.current.emit('new_message', {
        ticketId: ticketId,
        message: message,
        senderId: user?.id,
        senderName: user?.fullName || user?.name,
        senderRole: isGuide ? 'guide' : 'tourist',
        createdAt: new Date().toISOString()
      });
      return true;
    }
    return false;
  }, [ticketId, user?.id, user?.fullName, user?.name, isGuide]);

  const deleteCurrentConversation = async () => {
    if (!ticketId) return toast.error(lang === 'ar' ? 'لا توجد محادثة' : 'No conversation');
    if (deleting) return;
    if (!window.confirm(lang === 'ar' ? 'حذف المحادثة؟' : 'Delete conversation?')) return;
    setDeleting(true);
    try {
      const token = getToken();
      await fetch(`${API_BASE}/api/support/tickets/${ticketId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      addDeletedTicket(ticketId);
      socketRef.current?.emit('leave_ticket_room', { ticketId: String(ticketId) });
      localStorage.removeItem('directChatParams');
      window.dispatchEvent(new CustomEvent('refreshDirectChats'));
      toast.success(lang === 'ar' ? 'تم الحذف' : 'Deleted');
      setPage('notifications');
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Delete failed');
    } finally { setDeleting(false); }
  };

  // استعادة معاملات المحادثة من localStorage
  useEffect(() => {
    if (!user) return;
    const paramsStr = localStorage.getItem('directChatParams');
    if (!paramsStr) {
      setPage('notifications');
      return;
    }
    try {
      const params = JSON.parse(paramsStr);
      if (!params.recipientId && params.recipientId !== 0) throw new Error('No recipientId');
      if (String(params.recipientId) === String(user.id)) {
        toast.error(lang === 'ar' ? 'لا يمكن فتح محادثة مع نفسك' : 'Cannot chat with yourself');
        setPage('notifications');
        return;
      }
      if (params.ticketId && isTicketDeleted(params.ticketId)) {
        toast.error(lang === 'ar' ? 'المحادثة محذوفة' : 'Deleted conversation');
        setPage('notifications');
        return;
      }
      setRecipientId(params.recipientId);
      setRecipientName(params.recipientName || (lang === 'ar' ? (isGuide ? 'السائح' : 'المرشد') : (isGuide ? 'Tourist' : 'Guide')));
      if (params.ticketId) {
        setTicketId(params.ticketId);
        loadMessages(params.ticketId);
        markTicketAsRead();
        setLoading(false);
      }
      const token = getToken();
      convertToNumericId(params.recipientId, token).then(numId => numId && setRecipientNumericId(numId));
    } catch (err) {
      console.error(err);
      setPage('notifications');
    }
  }, [user, lang, setPage, loadMessages, markTicketAsRead, isGuide]);

  // تهيئة التذكرة إذا لم تكن موجودة (للمستخدم الذي يبدأ المحادثة)
  useEffect(() => {
    if (!user || !recipientId || ticketId) return;
    const init = async () => {
      setLoading(true);
      let numericRecipientId = recipientNumericId;
      if (!numericRecipientId) {
        const token = getToken();
        numericRecipientId = await convertToNumericId(recipientId, token);
        if (!numericRecipientId) {
          setErrorMessage(lang === 'ar' ? 'معرف المستخدم غير صالح' : 'Invalid user ID');
          setInitError(true);
          setLoading(false);
          return;
        }
        setRecipientNumericId(numericRecipientId);
      }
      
      try {
        const actualUserId = String(user.id);
        const recipientUserId = String(numericRecipientId); // قد يكون رقميًا أو نصيًا، نحوله لنص
        // البحث عن تذكرة موجودة تجمع بين المستخدم الحالي والطرف الآخر
        const ticketsData = await authFetch(`/api/support/tickets?status=open`);
        let existing = null;
        if (ticketsData.success && Array.isArray(ticketsData.tickets)) {
          existing = ticketsData.tickets.find((t) => {
            if (t.type !== 'guide_chat') return false;
            if (isTicketDeleted(t.id)) return false;

            // دالة مساعدة للتحقق من وجود مستخدم في التذكرة (بأي من الحقول)
            const isUserInTicket = (userId, ticket) => {
              if (ticket.user_id && String(ticket.user_id) === userId) return true;
              if (ticket.metadata?.guideId && String(ticket.metadata.guideId) === userId) return true;
              if (ticket.metadata?.touristId && String(ticket.metadata.touristId) === userId) return true;
              if (ticket.metadata?.created_by_id && String(ticket.metadata.created_by_id) === userId) return true;
              if (ticket.metadata?.participants && Array.isArray(ticket.metadata.participants) && 
                  ticket.metadata.participants.some(p => String(p) === userId)) return true;
              if (ticket.assigned_to && String(ticket.assigned_to) === userId) return true;
              return false;
            };

            const currentUserInTicket = isUserInTicket(actualUserId, t);
            const recipientInTicket = isUserInTicket(recipientUserId, t);

            // يجب أن يكون كلا المستخدمين موجودين في التذكرة
            return currentUserInTicket && recipientInTicket;
          });
        }
        if (existing) {
          setTicketId(existing.id);
          await loadMessages(existing.id);
          await markTicketAsRead();
          const currentParams = JSON.parse(localStorage.getItem('directChatParams') || '{}');
          currentParams.ticketId = existing.id;
          localStorage.setItem('directChatParams', JSON.stringify(currentParams));
          // انضمام إلى الغرفة فوراً
          if (socketRef.current?.connected) {
            socketRef.current.emit('join_ticket_room', { ticketId: String(existing.id) });
            joinedRoomRef.current = true;
          }
        } else {
          // إنشاء تذكرة جديدة
          const subject = isGuide 
            ? `${lang === 'ar' ? 'محادثة مع السائح' : 'Chat with tourist'}: ${recipientName}`
            : `${lang === 'ar' ? 'محادثة مع المرشد' : 'Chat with guide'}: ${recipientName}`;
          const initialMessage = isGuide
            ? (lang === 'ar' ? `بدأ المرشد ${user.fullName || user.name} محادثة جديدة معك` : `Guide ${user.fullName || user.name} started a new chat with you`)
            : (lang === 'ar' ? `بدأ المستخدم ${user.fullName || user.name} محادثة جديدة معك` : `User ${user.fullName || user.name} started a new chat with you`);
          
          const createPayload = {
            user_id: isGuide ? numericRecipientId : actualUserId,
            subject: subject,
            type: 'guide_chat',
            priority: 'high',
            message: initialMessage,
            metadata: {
              guideId: isGuide ? actualUserId : numericRecipientId,
              touristId: isGuide ? numericRecipientId : actualUserId,
              guideName: isGuide ? user.fullName || user.name : recipientName,
              touristName: isGuide ? recipientName : user.fullName || user.name,
              created_by: actualUserId,
              created_by_name: user.fullName || user.name,
              participants: [actualUserId, String(numericRecipientId)], // لتسهيل البحث مستقبلاً
              status: 'waiting_for_response'
            },
          };
          const createData = await authFetch('/api/support/tickets', {
            method: 'POST',
            body: JSON.stringify(createPayload),
          });
          if (createData.success && createData.ticket) {
            const newTicketId = createData.ticket.id;
            setTicketId(newTicketId);
            setMessages([{
              id: Date.now(),
              message: lang === 'ar' ? `مرحباً! بدء المحادثة مع ${recipientName}. سيتم إعلامه.` : `Hello! Starting conversation with ${recipientName}.`,
              is_from_user: false,
              created_at: new Date().toISOString(),
              sender_name: 'System',
              sender_id: 'system',
            }]);
            const currentParams = JSON.parse(localStorage.getItem('directChatParams') || '{}');
            currentParams.ticketId = newTicketId;
            localStorage.setItem('directChatParams', JSON.stringify(currentParams));
            // إعلام الطرف الآخر عبر WebSocket
            setTimeout(() => notifyViaSocket(initialMessage), 500);
            // انضمام إلى الغرفة
            if (socketRef.current?.connected) {
              socketRef.current.emit('join_ticket_room', { ticketId: String(newTicketId) });
              joinedRoomRef.current = true;
            }
          } else {
            throw new Error(createData.message || 'Failed to create ticket');
          }
        }
      } catch (err) {
        console.error('Init error:', err);
        setErrorMessage(err.message);
        setInitError(true);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, recipientId, recipientNumericId, recipientName, lang, ticketId, loadMessages, markTicketAsRead, notifyViaSocket, isGuide]);

  // باقي الكود (Socket.IO, sendMessage, UI) كما هو دون تغيير
  // Socket.IO – التسجيل والاستماع للرسائل الجديدة (مع دعم التحديث الفوري لجميع المشاركين)
  useEffect(() => {
    if (!user?.id || !recipientId) return;
    const socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;
    joinedRoomRef.current = false;

    socket.on('connect', () => {
      console.log('✅ Socket connected');
      socket.emit('register', { userId: user.id, role: isGuide ? 'guide' : 'user' });
      if (ticketId && !isTicketDeleted(ticketId) && !joinedRoomRef.current) {
        socket.emit('join_ticket_room', { ticketId: String(ticketId) });
        joinedRoomRef.current = true;
      }
    });

    socket.on('user_online', ({ userId }) => {
      if (String(userId) === String(recipientId) || (recipientNumericId && String(userId) === String(recipientNumericId))) {
        setGuideOnline(true);
        toast.success(lang === 'ar' ? 'الطرف الآخر متصل الآن!' : 'Other party is online!');
      }
    });

    socket.on('user_offline', ({ userId }) => {
      if (String(userId) === String(recipientId) || (recipientNumericId && String(userId) === String(recipientNumericId))) {
        setGuideOnline(false);
      }
    });

    // استقبال رسالة جديدة من أي طرف مشارك
    socket.on('new_message', (data) => {
      const incomingTicketId = String(data.ticketId);
      const currentTicketId = ticketId ? String(ticketId) : null;

      if (incomingTicketId === currentTicketId && String(data.senderId) !== String(user?.id)) {
        // رسالة لهذه المحادثة المفتوحة
        const newMsg = {
          id: data.messageId || Date.now(),
          message: data.message,
          is_from_user: false,
          created_at: data.created_at || new Date().toISOString(),
          sender_name: data.senderName || (lang === 'ar' ? (isGuide ? 'السائح' : 'المرشد') : (isGuide ? 'Tourist' : 'Guide')),
          sender_id: data.senderId,
          read: false,
        };
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        scrollToBottom();
        window.dispatchEvent(new CustomEvent('refreshDirectChats'));
        window.dispatchEvent(new CustomEvent('update_last_message', {
          detail: { ticketId: data.ticketId, lastMessage: data.message, lastMessageTime: data.created_at }
        }));
      } 
      else if (incomingTicketId !== currentTicketId) {
        // رسالة لمحادثة أخرى: تحديث القائمة وإشعار للمستخدم
        console.log(`📬 New message for ticket ${incomingTicketId}. Refreshing chat list.`);
        window.dispatchEvent(new CustomEvent('refreshDirectChats'));
        if (currentTicketId !== incomingTicketId) {
          toast.success(lang === 'ar' ? `رسالة جديدة من ${data.senderName || (isGuide ? 'السائح' : 'المرشد')}` : `New message from ${data.senderName || (isGuide ? 'Tourist' : 'Guide')}`, { duration: 4000 });
        }
      }
    });

    // تحديث آخر رسالة للمحادثة (مفيد لتحديث القوائم)
    socket.on('update_last_message', (data) => {
      if (data.ticketId === ticketId) {
        // تحديث آخر رسالة في الواجهة الحالية
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const lastMsg = { ...prev[prev.length-1], message: data.lastMessage, created_at: data.lastMessageTime };
          return [...prev.slice(0, -1), lastMsg];
        });
      }
      window.dispatchEvent(new CustomEvent('refreshDirectChats'));
    });

    // انضمام إلى غرفة التذكرة عند إنشائها من الطرف الآخر
    socket.on('ticket_created', ({ ticketId: newTicketId, participants }) => {
      if (participants && participants.includes(user?.id)) {
        if (!ticketId || String(ticketId) !== String(newTicketId)) {
          console.log(`🆕 New ticket ${newTicketId} created for this user, joining room.`);
          socket.emit('join_ticket_room', { ticketId: String(newTicketId) });
          // تحديث المعاملات المحلية إذا كانت هذه الصفحة مفتوحة
          const currentParams = JSON.parse(localStorage.getItem('directChatParams') || '{}');
          if (currentParams.recipientId && !currentParams.ticketId) {
            currentParams.ticketId = newTicketId;
            localStorage.setItem('directChatParams', JSON.stringify(currentParams));
            setTicketId(newTicketId);
            loadMessages(newTicketId);
          }
          window.dispatchEvent(new CustomEvent('refreshDirectChats'));
        }
      }
    });

    // محاولة الانضمام للغرفة إذا تأخر ticketId
    if (ticketId && socket.connected && !joinedRoomRef.current && !isTicketDeleted(ticketId)) {
      socket.emit('join_ticket_room', { ticketId: String(ticketId) });
      joinedRoomRef.current = true;
    }

    return () => {
      if (socket) {
        if (ticketId) socket.emit('leave_ticket_room', { ticketId: String(ticketId) });
        socket.disconnect();
      }
    };
  }, [user?.id, recipientId, recipientNumericId, lang, ticketId, scrollToBottom, isGuide, loadMessages]);

  // Polling احتياطي للمحادثات غير المحذوفة (كل 5 ثوانٍ)
  useEffect(() => {
    if (!ticketId || isTicketDeleted(ticketId)) return;
    const fetchMessages = async () => {
      if (!sending && !loadingMessages) await loadMessages(ticketId);
    };
    pollingRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollingRef.current);
  }, [ticketId, sending, loadingMessages, loadMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !ticketId || isTicketDeleted(ticketId)) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const tempId = `temp_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, message: text, is_from_user: true,
      created_at: new Date().toISOString(),
      sender_name: user?.fullName || user?.name,
      sender_id: user?.id,
      status: 'sending',
    }]);
    scrollToBottom();
    try {
      await authFetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
      notifyViaSocket(text);
      window.dispatchEvent(new CustomEvent('refreshDirectChats', {
        detail: { ticketId, lastMessage: text, updatedAt: new Date().toISOString() }
      }));
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleTextareaChange = (e) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const mins = Math.floor((Date.now() - date) / 60000);
    if (mins < 1) return lang === 'ar' ? 'الآن' : 'Now';
    if (mins < 60) return lang === 'ar' ? `${mins} د` : `${mins}m`;
    return date.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-green-600" size={32} /></div>;
  if (initError) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      <div className="text-center p-6 bg-white rounded-2xl shadow-xl max-w-sm w-full">
        <MessageCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">{lang === 'ar' ? 'فشل فتح المحادثة' : 'Failed to open chat'}</h3>
        <p className="text-gray-600 mb-6 text-sm">{errorMessage}</p>
        <button onClick={() => setPage('notifications')} className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">{lang === 'ar' ? 'العودة إلى الإشعارات' : 'Back to Notifications'}</button>
      </div>
    </div>
  );

  const isInputDisabled = loading || sending || loadingMessages || initError;
  const showLoading = loading || (loadingMessages && messages.length === 0);

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 pt-20" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 shadow-md flex items-center gap-3 flex-shrink-0">
        <button onClick={() => setPage('notifications')} className="p-2 hover:bg-white/20 rounded-full transition"><ArrowLeft size={22} /></button>
        <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0"><User size={20} /></div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold truncate text-lg">{recipientName}</h2>
          <div className="flex items-center gap-2 text-xs">
            {guideOnline ? (
              <span className="text-green-200 flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>{lang === 'ar' ? 'متصل الآن' : 'Online'}</span>
            ) : (
              <span className="text-white/70 flex items-center gap-1"><Bell size={10} />{notificationSent ? (lang === 'ar' ? '✓ تم إشعار الطرف الآخر' : '✓ Notified') : (lang === 'ar' ? 'سيتم إشعار الطرف الآخر' : 'Will notify')}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {ticketId && !isTicketDeleted(ticketId) && (
            <button onClick={deleteCurrentConversation} disabled={deleting} className="p-2 hover:bg-white/20 rounded-full transition disabled:opacity-50">
              {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
          )}
          <button onClick={() => ticketId && !isTicketDeleted(ticketId) && loadMessages(ticketId)} className="p-2 hover:bg-white/20 rounded-full transition"><RefreshCw size={18} /></button>
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {showLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <Loader2 className="animate-spin text-green-600" size={36} />
            <p className="text-sm">{lang === 'ar' ? 'جاري تحميل المحادثة...' : 'Loading...'}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <MessageCircle size={56} className="opacity-40" />
            <p className="font-medium">{lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
            <p className="text-sm text-center opacity-70 max-w-xs">{lang === 'ar' ? 'اكتب رسالتك أدناه لبدء المحادثة' : 'Write below to start'}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.is_from_user ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              {!msg.is_from_user && msg.sender_name !== 'System' && (
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center ml-2 self-end flex-shrink-0">
                  <User size={16} className="text-green-700" />
                </div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
                msg.is_from_user
                  ? 'bg-green-600 text-white rounded-br-sm'
                  : msg.sender_name === 'System'
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-bl-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-sm'
              }`}>
                {!msg.is_from_user && msg.sender_name && msg.sender_name !== 'System' && (
                  <p className="text-xs font-semibold mb-1 text-green-600 dark:text-green-400">{msg.sender_name}</p>
                )}
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                <div className={`flex items-center gap-1 mt-1 justify-end text-xs ${msg.is_from_user ? 'text-green-100' : 'text-gray-400'}`}>
                  <span>{formatTime(msg.created_at)}</span>
                  {msg.status === 'sending' && <Loader2 size={10} className="animate-spin" />}
                  {msg.status === 'sent' && <CheckCircle2 size={10} className="text-green-300" />}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-4 pt-3 pb-8 flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-4 mb-2 px-2">
          <button className="p-1.5 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors"><Smile size={24} /></button>
          <button className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"><Image size={24} /></button>
          <button className="p-1.5 text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors"><Paperclip size={24} /></button>
          <button className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"><Mic size={24} /></button>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            placeholder={lang === 'ar' ? 'اكتب رسالتك...' : 'Write your message...'}
            rows={1}
            className="flex-1 px-4 py-3 border dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-base leading-relaxed min-h-[52px] max-h-[120px] overflow-y-auto"
            disabled={isInputDisabled}
            style={{ height: '52px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending || loading || loadingMessages || initError || (ticketId && isTicketDeleted(ticketId))}
            className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition disabled:opacity-40 flex-shrink-0 shadow-md min-w-[52px] min-h-[52px] flex items-center justify-center"
          >
            {sending ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 px-2">
          <p className="text-[11px] text-gray-400">{lang === 'ar' ? '↵ للإرسال • Shift + ↵ لسطر جديد' : '↵ to send • Shift + ↵ for new line'}</p>
          <p className="text-[11px] text-green-500 flex items-center gap-1"><Bell size={10} />{guideOnline ? (lang === 'ar' ? 'الطرف الآخر متصل - إشعار فوري' : 'Other party online - instant delivery') : (lang === 'ar' ? 'سيصل إشعار عند اتصال الطرف الآخر' : 'Notification when other party connects')}</p>
        </div>
      </div>
    </div>
  );
};

export default DirectChatPage;

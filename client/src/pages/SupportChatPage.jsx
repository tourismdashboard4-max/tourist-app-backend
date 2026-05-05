// client/src/pages/SupportChatPage.jsx
// ✅ الإصدار المطور – محادثة دعم مباشرة (بدون قائمة تذاكر)
// عند النقر على أيقونة الدعم، يتم فتح المحادثة مباشرة (إنشاء تذكرة جديدة إذا لم توجد تذكرة مفتوحة)
// يدعم فتح تذكرة محددة عبر localStorage (selectedSupportTicketId)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  MessageCircle, Send, Loader2, ArrowLeft, 
  Headphones, Trash2, RefreshCw, CheckCircle2, Bell
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const API_BASE = 'https://tourist-app-api.onrender.com';
const DELETED_SUPPORT_TICKETS_KEY = 'deleted_support_tickets';

const SupportChatPage = ({ setPage, lang = 'ar' }) => {
  const { user } = useAuth();

  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [supportStatus, setSupportStatus] = useState('online');
  const [initialTicketId, setInitialTicketId] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pollingRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current)
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  useEffect(() => { if (messages.length > 0) scrollToBottom(); }, [messages]);

  const handleBack = () => setPage('notifications');

  // دوال الحذف المحلي لتذكرة الدعم
  const getDeletedTickets = useCallback(() => {
    const stored = localStorage.getItem(DELETED_SUPPORT_TICKETS_KEY);
    if (!stored) return new Set();
    try { return new Set(JSON.parse(stored)); } catch { return new Set(); }
  }, []);

  const addDeletedTicket = useCallback((ticketId) => {
    const current = getDeletedTickets();
    current.add(String(ticketId));
    localStorage.setItem(DELETED_SUPPORT_TICKETS_KEY, JSON.stringify([...current]));
    setActiveTicket(null);
    setMessages([]);
    toast.success(lang === 'ar' ? 'تم حذف محادثة الدعم' : 'Support conversation deleted');
    // 🔄 إرسال حدث لتحديث قائمة المحادثات المباشرة
    window.dispatchEvent(new CustomEvent('refreshDirectChats'));
    setPage('notifications');
  }, [getDeletedTickets, lang, setPage]);

  // جلب أو إنشاء تذكرة دعم نشطة للمستخدم الحالي
  // إذا تم توفير preferredTicketId، نحاول فتح تلك التذكرة أولاً
  const fetchOrCreateActiveTicket = useCallback(async (preferredTicketId = null) => {
    if (!user?.id) return null;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');

      // 1) إذا كان هناك معرف مفضل، حاول جلب تلك التذكرة مباشرة
      if (preferredTicketId) {
        const ticketRes = await fetch(`${API_BASE}/api/support/tickets/${preferredTicketId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const ticketData = await ticketRes.json();
        if (ticketData.success && ticketData.ticket) {
          const ticket = ticketData.ticket;
          // التأكد أن التذكرة تخص المستخدم ومن نوع عام/دعم ومفتوحة وغير محذوفة محلياً
          const deletedSet = getDeletedTickets();
          if ((ticket.type === 'general' || ticket.type === 'support') &&
              ticket.user_id === user.id &&
              ticket.status !== 'closed' &&
              !deletedSet.has(String(ticket.id))) {
            setActiveTicket(ticket);
            return ticket;
          }
        }
        // إذا فشل جلب التذكرة المفضلة (مثلاً محذوفة أو لا تخص المستخدم)، نواصل للخطوة العادية
      }

      // 2) جلب جميع تذاكر الدعم المفتوحة للمستخدم
      const response = await fetch(`${API_BASE}/api/support/tickets?status=open`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'API error');

      const deletedSet = getDeletedTickets();
      // تصفية تذاكر الدعم (general/support) التي تخص المستخدم وغير المحذوفة
      const userSupportTickets = data.tickets.filter(ticket => 
        (ticket.type === 'general' || ticket.type === 'support') &&
        ticket.user_id === user.id &&
        !deletedSet.has(String(ticket.id))
      );
      // ترتيب تنازلي حسب التاريخ، نأخذ أحدث تذكرة مفتوحة
      userSupportTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      let ticket = userSupportTickets[0];

      if (!ticket) {
        // إنشاء تذكرة دعم جديدة
        const createResponse = await api.createSupportTicket({
          user_id: user.id,
          subject: lang === 'ar' ? 'محادثة دعم فوري' : 'Instant Support Chat',
          type: 'general',
          priority: 'normal'
        });
        if (createResponse.success && createResponse.ticket) {
          ticket = createResponse.ticket;
          toast.success(lang === 'ar' ? 'تم فتح محادثة الدعم' : 'Support chat opened');
          // 🔄 إرسال حدث لتحديث قائمة المحادثات المباشرة (عند إنشاء تذكرة جديدة)
          window.dispatchEvent(new CustomEvent('refreshDirectChats'));
        } else {
          throw new Error(createResponse.message || 'Failed to create ticket');
        }
      }
      setActiveTicket(ticket);
      return ticket;
    } catch (error) {
      console.error('Error fetching/creating support ticket:', error);
      toast.error(lang === 'ar' ? 'فشل في فتح محادثة الدعم' : 'Failed to open support chat');
      return null;
    }
  }, [user?.id, lang, getDeletedTickets]);

  // تحميل رسائل التذكرة
  const loadMessages = useCallback(async (ticketId) => {
    if (!ticketId) return;
    setLoadingMessages(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages.map(msg => ({
          id: msg.id,
          message: msg.message,
          is_from_user: msg.is_from_user,
          created_at: msg.created_at,
          sender_name: msg.sender_name
        })));
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // إرسال رسالة
  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !activeTicket) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const tempId = Date.now();
    setMessages(prev => [...prev, {
      id: tempId,
      message: text,
      is_from_user: true,
      created_at: new Date().toISOString(),
      sender_name: user?.fullName || user?.name || (lang === 'ar' ? 'أنت' : 'You'),
      status: 'sending'
    }]);
    scrollToBottom();

    try {
      const response = await api.sendSupportMessage(activeTicket.id, text);
      if (response && response.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
        // إشعار للمسؤولين
        const token = localStorage.getItem('token');
        if (token) {
          await fetch(`${API_BASE}/api/notifications/admin-message`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              ticketId: activeTicket.id,
              message: text,
              userName: user?.fullName || user?.name
            })
          }).catch(err => console.error);
        }
        // 🔄 إرسال حدث لتحديث قائمة المحادثات المباشرة (بعد إرسال رسالة ناجحة)
        window.dispatchEvent(new CustomEvent('refreshDirectChats'));
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send');
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  // حذف المحادثة (تذكرة الدعم)
  const deleteConversation = async () => {
    if (!activeTicket) return;
    if (!window.confirm(lang === 'ar' ? 'حذف محادثة الدعم نهائياً؟' : 'Delete support conversation permanently?')) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      let serverDeleted = false;
      try {
        const delRes = await fetch(`${API_BASE}/api/support/tickets/${activeTicket.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (delRes.ok) serverDeleted = true;
      } catch (e) { console.warn('DELETE failed', e); }
      if (!serverDeleted) {
        try {
          const patchRes = await fetch(`${API_BASE}/api/support/tickets/${activeTicket.id}/status`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'closed' })
          });
          if (patchRes.ok) serverDeleted = true;
        } catch (e) { console.warn('PATCH failed', e); }
      }
      addDeletedTicket(activeTicket.id);
      toast.success(serverDeleted
        ? (lang === 'ar' ? 'تم حذف محادثة الدعم' : 'Support chat deleted')
        : (lang === 'ar' ? 'تم إخفاء المحادثة محلياً' : 'Chat hidden locally'));
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const refreshMessages = () => {
    if (activeTicket) loadMessages(activeTicket.id);
  };

  // قراءة المعرف المحفوظ من localStorage عند تحميل المكون
  useEffect(() => {
    const savedTicketId = localStorage.getItem('selectedSupportTicketId');
    if (savedTicketId) {
      localStorage.removeItem('selectedSupportTicketId'); // تنظيف بعد القراءة
      setInitialTicketId(savedTicketId);
    }
  }, []);

  // التهيئة الأولية: جلب أو إنشاء التذكرة (مع مراعاة المعرف المفضل) ثم تحميل الرسائل
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const ticket = await fetchOrCreateActiveTicket(initialTicketId);
      if (ticket) {
        await loadMessages(ticket.id);
      }
      setLoading(false);
    };
    if (user) init();
  }, [user, initialTicketId, fetchOrCreateActiveTicket, loadMessages]);

  // تحديث دوري للرسائل (Polling)
  useEffect(() => {
    if (activeTicket && !loading) {
      pollingRef.current = setInterval(() => {
        if (!sending) loadMessages(activeTicket.id);
      }, 5000);
      return () => clearInterval(pollingRef.current);
    }
  }, [activeTicket, loading, sending, loadMessages]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const diff = Math.floor((Date.now() - new Date(dateString)) / 60000);
    if (diff < 1) return lang === 'ar' ? 'الآن' : 'Now';
    if (diff < 60) return `${diff} ${lang === 'ar' ? 'د' : 'm'}`;
    return new Date(dateString).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <p className="text-gray-300 mb-4">{lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first'}</p>
          <button onClick={() => setPage('profile')} className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg">
            {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  if (loading && !activeTicket) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900">
        <Loader2 className="animate-spin text-teal-400" size={32} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="p-2 hover:bg-white/20 rounded-xl transition">
                <ArrowLeft size={22} className="text-white" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  supportStatus === 'online' ? 'bg-green-500' : 'bg-gray-500'
                }`}></span>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">{lang === 'ar' ? 'الدعم الفني' : 'Technical Support'}</h1>
                <p className="text-xs text-white/80">{supportStatus === 'online' ? (lang === 'ar' ? 'متصل الآن' : 'Online') : (lang === 'ar' ? 'غير متصل' : 'Offline')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refreshMessages} className="p-2 hover:bg-white/20 rounded-full transition"><RefreshCw size={18} className="text-white" /></button>
              <button onClick={deleteConversation} disabled={deleting} className="p-2 hover:bg-red-500/20 rounded-full transition disabled:opacity-50">
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} className="text-white/80" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* منطقة المحادثة – بدون قائمة تذاكر */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* منطقة عرض الرسائل */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loadingMessages && messages.length === 0 ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-teal-400" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center p-8 text-white/50">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-40" />
              <p>{lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
              <p className="text-sm mt-2">{lang === 'ar' ? 'اكتب رسالتك أدناه للتواصل مع فريق الدعم' : 'Type your message below to contact support'}</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.is_from_user ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.is_from_user ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-white/20 text-white rounded-bl-sm'}`}>
                  {!msg.is_from_user && msg.sender_name && <div className="text-xs opacity-80 mb-1">{msg.sender_name}</div>}
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <div className={`text-[10px] mt-1 ${msg.is_from_user ? 'text-right text-teal-100' : 'text-left text-white/50'}`}>
                    {formatTime(msg.created_at)}
                    {msg.status === 'sending' && <Loader2 size={10} className="inline ml-1 animate-spin" />}
                    {msg.status === 'sent' && <CheckCircle2 size={10} className="inline ml-1" />}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* منطقة الإدخال */}
        <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm border-t border-white/20 p-4">
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={lang === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
              rows={1}
              className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-teal-400 resize-none text-sm"
              disabled={sending}
              style={{ height: '44px' }}
            />
            <button onClick={sendMessage} disabled={!newMessage.trim() || sending} className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-50">
              {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
          <div className="flex justify-between items-center mt-2 px-2">
            <p className="text-xs text-white/40">{lang === 'ar' ? '↵ للإرسال • Shift+↵ لسطر جديد' : 'Enter to send • Shift+Enter for new line'}</p>
            <p className="text-xs text-teal-300 flex items-center gap-1"><Bell size={10} /> {lang === 'ar' ? 'سيتم إشعار فريق الدعم' : 'Support team will be notified'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportChatPage;

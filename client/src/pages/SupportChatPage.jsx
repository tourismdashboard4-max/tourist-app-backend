// client/src/pages/SupportChatPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, Send, Loader2, Phone, Mail, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const SupportChatPage = ({ setPage, lang = 'ar' }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [supportStatus, setSupportStatus] = useState('online');
  const [typing, setTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // ✅ دالة الرجوع إلى صفحة الإشعارات
  const handleBack = () => {
    console.log('🔙 [SupportChat] Returning to notifications page');
    setPage('notifications');
  };

  // دالة للتحقق من صحة التذكرة
  const validateTicketOwnership = async (ticketId) => {
    try {
      console.log('🔍 [SupportChat] Validating ticket:', ticketId, 'for user:', user.id);
      
      const response = await api.getSupportTickets({ id: ticketId });
      console.log('🔍 [SupportChat] Ticket details:', response);
      
      if (response.success && response.tickets && response.tickets.length > 0) {
        const ticket = response.tickets[0];
        const ticketUserId = ticket.user_id;
        
        if (ticketUserId !== user.id) {
          console.error('❌❌❌ TICKET MISMATCH DETECTED!');
          return false;
        }
        
        console.log('✅ [SupportChat] Ticket ownership verified');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [SupportChat] Error validating ticket:', error);
      return true;
    }
  };

  // تحميل التذكرة أو إنشاؤها
  useEffect(() => {
    const loadOrCreateTicket = async () => {
      setLoading(true);
      try {
        // ✅ قراءة ticketId من localStorage إذا كان موجوداً
        const savedTicketId = localStorage.getItem('selectedTicketId');
        if (savedTicketId) {
          console.log('📤 Loading specific ticket from localStorage:', savedTicketId);
          localStorage.removeItem('selectedTicketId');
          
          // التحقق من صحة التذكرة
          const ticketResponse = await api.getSupportTicket(savedTicketId);
          if (ticketResponse.success && ticketResponse.ticket) {
            setConversationId(savedTicketId);
            await loadMessages(savedTicketId);
            setLoading(false);
            return;
          }
        }
        
        console.log('🔍 [SupportChat] Loading ticket for user:', user?.id);
        
        const ticketsResponse = await api.getSupportTickets({ 
          user_id: user.id,
          status: 'open'
        });
        
        console.log('📥 [SupportChat] Tickets response:', ticketsResponse);
        
        if (ticketsResponse.success && ticketsResponse.tickets && ticketsResponse.tickets.length > 0) {
          const ticket = ticketsResponse.tickets[0];
          
          if (ticket.user_id !== user.id) {
            console.error('❌ Ticket belongs to different user, creating new...');
            await createNewTicket();
            return;
          }
          
          console.log('✅ [SupportChat] Using existing ticket ID:', ticket.id);
          setConversationId(ticket.id);
          await loadMessages(ticket.id);
        } else {
          console.log('🆕 [SupportChat] No open ticket found, creating new one...');
          await createNewTicket();
        }
      } catch (error) {
        console.error('❌ [SupportChat] Error loading ticket:', error);
        setMessages([
          {
            id: 1,
            message: lang === 'ar' 
              ? 'مرحباً بك في الدعم الفني! كيف يمكنني مساعدتك اليوم؟'
              : 'Welcome to support! How can I help you today?',
            is_from_user: false,
            created_at: new Date().toISOString(),
            sender_name: lang === 'ar' ? 'فريق الدعم' : 'Support Team'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadOrCreateTicket();
    }
  }, [user]);

  // تحميل الرسائل
  const loadMessages = async (ticketId) => {
    try {
      console.log('📥 [SupportChat] Loading messages for ticket:', ticketId);
      
      const response = await api.getSupportMessages(ticketId);
      console.log('📥 [SupportChat] Messages response:', response);
      
      if (response.success && response.messages) {
        const formattedMessages = response.messages.map(msg => ({
          id: msg.id,
          message: msg.message,
          is_from_user: msg.is_from_user,
          created_at: msg.created_at,
          sender_name: msg.sender_name
        }));
        console.log('✅ [SupportChat] Loaded', formattedMessages.length, 'messages');
        setMessages(formattedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ [SupportChat] Error loading messages:', error);
    }
  };

  // إنشاء تذكرة جديدة
  const createNewTicket = async () => {
    try {
      console.log('🆕 [SupportChat] Creating new ticket for user:', user.id);
      
      const response = await api.createSupportTicket({
        subject: lang === 'ar' ? 'طلب دعم جديد' : 'New Support Request',
        type: 'general',
        priority: 'normal',
        user_id: user.id,
        email: user.email,
        fullName: user.fullName || user.name
      });
      
      console.log('📥 [SupportChat] Create ticket response:', response);
      
      if (response.success && response.ticket) {
        console.log('✅ [SupportChat] Created ticket ID:', response.ticket.id);
        setConversationId(response.ticket.id);
        
        setMessages([
          {
            id: Date.now(),
            message: lang === 'ar' 
              ? 'مرحباً بك في الدعم الفني! كيف يمكنني مساعدتك اليوم؟'
              : 'Welcome to support! How can I help you today?',
            is_from_user: false,
            created_at: new Date().toISOString(),
            sender_name: lang === 'ar' ? 'فريق الدعم' : 'Support Team'
          }
        ]);
      }
    } catch (error) {
      console.error('❌ [SupportChat] Error creating ticket:', error);
      throw error;
    }
  };

  // ✅ إرسال رسالة مع إشعار للمسؤولين (إشعار واحد لكل محادثة)
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    console.log('📤 [SupportChat] Sending message:', messageText);
    
    setNewMessage('');
    setSending(true);
    
    const tempMessage = {
      id: Date.now(),
      message: messageText,
      is_from_user: true,
      created_at: new Date().toISOString(),
      sender_name: user?.fullName || user?.name || 'أنت',
      status: 'sending'
    };
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      let response;
      let currentTicketId = conversationId;
      
      if (conversationId) {
        response = await api.sendSupportMessage(conversationId, messageText);
      } else {
        const ticketResponse = await api.createSupportTicket({
          subject: lang === 'ar' ? 'طلب دعم جديد' : 'New Support Request',
          type: 'general',
          priority: 'normal',
          user_id: user.id,
          email: user.email
        });
        
        if (ticketResponse.success && ticketResponse.ticket) {
          currentTicketId = ticketResponse.ticket.id;
          setConversationId(currentTicketId);
          response = await api.sendSupportMessage(currentTicketId, messageText);
        } else {
          throw new Error('Failed to create ticket');
        }
      }
      
      if (response && response.success) {
        setMessages(prev => 
          prev.map(m => m.id === tempMessage.id 
            ? { ...m, status: 'sent' } 
            : m
          )
        );
        
        // ✅ إرسال إشعار للمسؤولين (يتم إنشاء إشعار واحد فقط لكل محادثة)
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            console.log('⚠️ No token found, skipping admin notification');
            return;
          }
          
          // إرسال إشعار للمسؤولين
          const adminIds = [3, 4, 5]; // معرفات المسؤولين
          for (const adminId of adminIds) {
            await fetch('https://tourist-app-api.onrender.com/api/notifications/admin-message', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: user.id,
                ticketId: currentTicketId,
                message: messageText,
                userName: user?.fullName || user?.name
              })
            });
          }
          console.log('📤 Sent notification to admins');
        } catch (notifError) {
          console.error('Error sending admin notification:', notifError);
        }
        
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ [SupportChat] Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // محاكاة كتابة الدعم
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1]?.is_from_user && !sending) {
      setTyping(true);
      const timer = setTimeout(() => {
        setTyping(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, sending]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return lang === 'ar' ? 'الآن' : 'Just now';
    if (minutes < 60) return `${minutes} ${lang === 'ar' ? 'دقيقة' : 'min'}`;
    if (hours < 24) return `${hours} ${lang === 'ar' ? 'ساعة' : 'hr'}`;
    if (days < 7) return `${days} ${lang === 'ar' ? 'يوم' : 'day'}`;
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <p className="text-gray-300 mb-4">يرجى تسجيل الدخول أولاً</p>
          <button 
            onClick={() => setPage('profile')} 
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition shadow-lg"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 overflow-hidden">
      {/* Header - تم تعديل زر الرجوع */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-white/20 rounded-xl transition"
              >
                <ArrowLeft size={22} className="text-white" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  supportStatus === 'online' ? 'bg-green-500' : 
                  supportStatus === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                }`}></span>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">
                  {lang === 'ar' ? 'الدعم الفني' : 'Support'}
                </h1>
                <p className="text-xs text-white/80">
                  {supportStatus === 'online' 
                    ? (lang === 'ar' ? 'متصل الآن' : 'Online now')
                    : supportStatus === 'away'
                      ? (lang === 'ar' ? 'غائب حالياً' : 'Away')
                      : (lang === 'ar' ? 'غير متصل' : 'Offline')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-white/20 rounded-xl transition">
                <Phone size={18} className="text-white" />
              </button>
              <button className="p-1.5 hover:bg-white/20 rounded-xl transition">
                <Mail size={18} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-teal-400 text-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-white/50 mx-auto mb-2" />
            <p className="text-white/70 text-base">
              {lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}
            </p>
            <p className="text-white/50 text-sm mt-1">
              {lang === 'ar' 
                ? 'اكتب رسالتك لتبدأ المحادثة'
                : 'Type your message to start the conversation'}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={msg.id || idx} 
              className={`flex ${msg.is_from_user ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${msg.is_from_user ? 'order-2' : 'order-1'}`}>
                <div className={`rounded-2xl px-3 py-2 ${
                  msg.is_from_user
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                    : 'bg-white/20 text-white shadow-sm'
                }`}>
                  {!msg.is_from_user && msg.sender_name && (
                    <div className="text-xs opacity-80 mb-1">
                      {msg.sender_name}
                    </div>
                  )}
                  <p className="text-base whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
                <div className={`text-xs text-white/50 mt-1 ${msg.is_from_user ? 'text-left' : 'text-right'}`}>
                  {formatTime(msg.created_at)}
                  {msg.is_from_user && msg.status === 'sending' && (
                    <span className="ml-1">⏳</span>
                  )}
                  {msg.is_from_user && msg.status === 'sent' && (
                    <span className="ml-1">✓</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* مؤشر كتابة الدعم */}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white/20 rounded-2xl px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* ✅ إدخال الرسالة - ثابت في أسفل الصفحة (تم إزالة التحويل) */}
      <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm border-t border-white/20">
        <div className="px-4 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={lang === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
              className="flex-1 px-5 py-3 border border-white/30 rounded-xl bg-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all text-base"
              disabled={sending}
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-5 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl transition-all disabled:opacity-50 hover:from-teal-600 hover:to-cyan-600 hover:scale-105 active:scale-95 shadow-md flex items-center justify-center"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <Send size={22} />
              )}
            </button>
          </div>
          <p className="text-sm text-center text-white/60 mt-2">
            {lang === 'ar' 
              ? 'فريق الدعم يرد عادةً خلال دقائق'
              : 'Support team usually responds within minutes'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportChatPage;

// client/src/pages/AdminSupportPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FaArrowLeft, FaSpinner, FaEnvelope, FaUser, 
  FaClock, FaPaperPlane, FaTimesCircle, FaCheckCircle, 
  FaExclamationCircle, FaSearch, FaEye, FaReply,
  FaHeadset, FaUsers, FaChartLine, FaCheckDouble,
  FaFilter, FaTrash, FaArchive, FaStar, FaPhone,
  FaMailBulk, FaCalendarAlt, FaTag, FaFlag,
  FaChevronRight, FaChevronLeft,
  FaTicketAlt  // ✅ أضف أيقونة التذكرة
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AdminSupportPage = ({ setPage }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const lang = language;
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const replyInputRef = useRef(null);

  // إحصائيات التذاكر
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    urgent: tickets.filter(t => t.priority === 'high' && t.status === 'open').length
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (selectedTicket && replyInputRef.current) {
      setTimeout(() => {
        replyInputRef.current?.focus();
      }, 300);
    }
  }, [selectedTicket]);

  const t = (key) => {
    const texts = {
      ar: {
        title: 'تذاكر الدعم',
        subtitle: 'إدارة تذاكر الدعم والرد على المستخدمين',
        back: 'رجوع',
        noTickets: 'لا توجد تذاكر حالياً',
        from: 'من',
        date: 'التاريخ',
        subject: 'الموضوع',
        message: 'الرسالة',
        reply: 'رد',
        replyMessage: 'الرد على التذكرة',
        sendReply: 'إرسال الرد',
        yourReply: 'ردك',
        replyPlaceholder: 'اكتب ردك هنا...',
        status: 'الحالة',
        open: 'مفتوحة',
        closed: 'مغلقة',
        inProgress: 'قيد المعالجة',
        urgent: 'عاجل',
        search: 'بحث',
        allTickets: 'كل التذاكر',
        unread: 'غير مقروءة',
        replySent: 'تم إرسال الرد بنجاح',
        replyError: 'فشل إرسال الرد',
        typeHere: 'اكتب هنا...',
        send: 'إرسال',
        messages: 'رسائل',
        loading: 'جاري التحميل...',
        cancel: 'إلغاء',
        stats: 'الإحصائيات',
        total: 'الإجمالي',
        urgentTickets: 'عاجل',
        inProgressTickets: 'قيد المعالجة',
        closedTickets: 'مغلقة',
        openTickets: 'مفتوحة',
        hideSidebar: 'إخفاء القائمة',
        showSidebar: 'إظهار القائمة'
      },
      en: {
        title: 'Support Tickets',
        subtitle: 'Manage support tickets and reply to users',
        back: 'Back',
        noTickets: 'No tickets yet',
        from: 'From',
        date: 'Date',
        subject: 'Subject',
        message: 'Message',
        reply: 'Reply',
        replyMessage: 'Reply to Ticket',
        sendReply: 'Send Reply',
        yourReply: 'Your Reply',
        replyPlaceholder: 'Type your reply here...',
        status: 'Status',
        open: 'Open',
        closed: 'Closed',
        inProgress: 'In Progress',
        urgent: 'Urgent',
        search: 'Search',
        allTickets: 'All Tickets',
        unread: 'Unread',
        replySent: 'Reply sent successfully',
        replyError: 'Failed to send reply',
        typeHere: 'Type here...',
        send: 'Send',
        messages: 'Messages',
        loading: 'Loading...',
        cancel: 'Cancel',
        stats: 'Statistics',
        total: 'Total',
        urgentTickets: 'Urgent',
        inProgressTickets: 'In Progress',
        closedTickets: 'Closed',
        openTickets: 'Open',
        hideSidebar: 'Hide sidebar',
        showSidebar: 'Show sidebar'
      }
    };
    return texts[lang][key] || key;
  };

  const fetchTicketMessages = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('📤 Fetching messages for ticket:', ticketId);
      
      const response = await fetch(`https://tourist-app-api.onrender.com/api/support/tickets/${ticketId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.messages) {
        const sortedMessages = [...data.messages].sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
        setMessages(sortedMessages);
        console.log('✅ Messages loaded:', sortedMessages.length);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      setMessages([]);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('https://tourist-app-api.onrender.com/api/support/admin/tickets', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.tickets && data.tickets.length > 0) {
        const userTicketsMap = new Map();
        
        data.tickets.forEach(ticket => {
          const userId = ticket.user_id;
          if (!userTicketsMap.has(userId) || new Date(ticket.created_at) > new Date(userTicketsMap.get(userId).created_at)) {
            userTicketsMap.set(userId, ticket);
          }
        });
        
        const uniqueTickets = Array.from(userTicketsMap.values());
        
        const formattedTickets = uniqueTickets.map(ticket => ({
          ...ticket,
          user_name: ticket.user_name || `مستخدم ${ticket.user_id}`
        }));
        
        setTickets(formattedTickets);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('❌ Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'support') {
      fetchTickets();
    } else {
      toast.error('غير مصرح. يرجى تسجيل الدخول كمسؤول');
      setPage('profile');
    }
  }, [user]);

  useEffect(() => {
    const selectedTicketId = localStorage.getItem('selectedTicketId');
    
    if (selectedTicketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === parseInt(selectedTicketId));
      if (ticket) {
        setSelectedTicket(ticket);
        fetchTicketMessages(ticket.id);
      }
      localStorage.removeItem('selectedTicketId');
    }
  }, [tickets]);

  const handleSendReply = async () => {
    if (!selectedTicket) {
      toast.error('لم يتم اختيار تذكرة');
      return;
    }
    
    if (!replyText.trim()) {
      toast.error('الرجاء كتابة الرد');
      return;
    }

    setSendingReply(true);
    try {
      const token = localStorage.getItem('token');
      const ticketId = selectedTicket.id;
      const message = replyText.trim();
      
      const response = await fetch(`https://tourist-app-api.onrender.com/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(t('replySent'));
        const newMessage = {
          id: Date.now(),
          message: message,
          is_from_user: false,
          created_at: new Date().toISOString(),
          sender_name: user?.fullName || user?.name || 'الدعم الفني'
        };
        setMessages(prev => [...prev, newMessage]);
        setReplyText('');
        
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id ? { ...t, status: 'in_progress' } : t
        ));
        
        scrollToBottom();
      } else {
        toast.error(data.message || t('replyError'));
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error?.message || t('replyError'));
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadge = (status, priority) => {
    if (priority === 'high' && status === 'open') {
      return {
        icon: <FaFlag className="text-red-400" />,
        text: t('urgent'),
        color: 'bg-red-500/20 text-red-400 border-red-500/30'
      };
    }
    
    switch (status) {
      case 'open':
        return {
          icon: <FaClock className="text-yellow-400" />,
          text: t('open'),
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
      case 'in_progress':
        return {
          icon: <FaSpinner className="text-blue-400" />,
          text: t('inProgress'),
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        };
      case 'closed':
        return {
          icon: <FaCheckCircle className="text-green-400" />,
          text: t('closed'),
          color: 'bg-green-500/20 text-green-400 border-green-500/30'
        };
      default:
        return {
          icon: <FaClock className="text-gray-400" />,
          text: t('open'),
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        };
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'open') return ticket.status === 'open';
    if (filter === 'closed') return ticket.status === 'closed';
    if (filter === 'in_progress') return ticket.status === 'in_progress';
    return true;
  }).filter(ticket => 
    ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.user_id?.toString().includes(searchTerm)
  );

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return date.toLocaleDateString('ar-EG');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 flex items-center justify-center">
        <FaSpinner className="animate-spin text-teal-400 text-4xl" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header مع أيقونة التذكرة */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPage('profile')}
                className="p-2 hover:bg-white/20 rounded-xl transition"
              >
                <FaArrowLeft className="text-white text-xl" />
              </button>
              <div className="flex items-center gap-3">
                {/* ✅ أيقونة التذكرة هنا */}
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <FaTicketAlt className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">{t('title')}</h1>
                  <p className="text-xs text-white/80">{t('subtitle')}</p>
                </div>
              </div>
            </div>
            
            {/* بطاقات الإحصائيات */}
            <div className="flex gap-2">
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1 text-center">
                <div className="text-lg font-bold text-white">{stats.total}</div>
                <div className="text-[10px] text-white/70">{t('total')}</div>
              </div>
              <div className="bg-yellow-500/20 backdrop-blur rounded-lg px-3 py-1 text-center">
                <div className="text-lg font-bold text-yellow-400">{stats.open}</div>
                <div className="text-[10px] text-white/70">{t('openTickets')}</div>
              </div>
              <div className="bg-red-500/20 backdrop-blur rounded-lg px-3 py-1 text-center">
                <div className="text-lg font-bold text-red-400">{stats.urgent}</div>
                <div className="text-[10px] text-white/70">{t('urgentTickets')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* باقي الكود كما هو... */}
      <div className="flex h-[calc(100vh-60px)]">
        {/* Sidebar - قائمة التذاكر */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur-sm border-l border-white/20 flex-shrink-0 overflow-hidden"
            >
              <div className="w-80 h-full flex flex-col">
                {/* Search and Filter */}
                <div className="p-4 border-b border-white/20">
                  <div className="relative mb-3">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      placeholder={t('search')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-8 pl-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div className="flex gap-1">
                    {[
                      { key: 'all', label: t('allTickets'), icon: FaEnvelope },
                      { key: 'open', label: t('open'), icon: FaClock },
                      { key: 'in_progress', label: t('inProgress'), icon: FaSpinner },
                      { key: 'closed', label: t('closed'), icon: FaCheckCircle }
                    ].map(status => {
                      const Icon = status.icon;
                      return (
                        <button
                          key={status.key}
                          onClick={() => setFilter(status.key)}
                          className={`flex-1 px-2 py-1 rounded-lg text-xs transition flex items-center justify-center gap-1 ${
                            filter === status.key
                              ? 'bg-teal-500 text-white'
                              : 'text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <Icon size={10} />
                          <span>{status.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* قائمة التذاكر */}
                <div className="flex-1 overflow-y-auto">
                  {filteredTickets.length === 0 ? (
                    <div className="p-8 text-center">
                      {/* ✅ أيقونة التذكرة في حالة عدم وجود تذاكر */}
                      <FaTicketAlt className="text-3xl text-white/30 mx-auto mb-2" />
                      <p className="text-white/50 text-sm">{t('noTickets')}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {filteredTickets.map((ticket) => {
                        const statusBadge = getStatusBadge(ticket.status, ticket.priority);
                        return (
                          <motion.div
                            key={ticket.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => openTicket(ticket)}
                            className={`p-3 cursor-pointer transition hover:bg-white/10 ${
                              selectedTicket?.id === ticket.id ? 'bg-white/15 border-r-2 border-r-teal-400' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {/* ✅ أيقونة التذكرة في كل بطاقة */}
                                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center">
                                  <FaTicketAlt className="text-white text-xs" />
                                </div>
                                <div>
                                  <h3 className="text-white font-medium text-sm">
                                    {ticket.user_name}
                                  </h3>
                                </div>
                              </div>
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] ${statusBadge.color}`}>
                                {statusBadge.icon}
                                <span>{statusBadge.text}</span>
                              </div>
                            </div>
                            
                            <p className="text-white/70 text-xs mb-1 line-clamp-2">
                              {ticket.subject}
                            </p>
                            
                            <div className="flex items-center gap-2 text-[10px] text-white/40">
                              <FaClock size={8} />
                              <span>{formatTime(ticket.created_at)}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* باقي الكود (Main Chat Area) كما هو... */}
        <div className="flex-1 flex flex-col">
          {/* زر إظهار/إخفاء القائمة */}
          <div className="p-3 flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition text-white"
            >
              {sidebarOpen ? <FaChevronRight /> : <FaChevronLeft />}
              <span className="sr-only">{sidebarOpen ? t('hideSidebar') : t('showSidebar')}</span>
            </button>
            {selectedTicket && (
              <div className="flex items-center gap-2 text-white">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center">
                  <FaTicketAlt size={12} />
                </div>
                <div>
                  <h2 className="text-sm font-bold">{selectedTicket.user_name}</h2>
                  <p className="text-[10px] text-white/50">تذكرة #{selectedTicket.id}</p>
                </div>
              </div>
            )}
          </div>

          {/* منطقة المحادثة */}
          {selectedTicket ? (
            <div className="flex-1 flex flex-col mx-2 mb-2 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
              {/* الرسائل */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <FaTicketAlt className="text-3xl text-white/30 mx-auto mb-2" />
                    <p className="text-white/50 text-sm">لا توجد رسائل بعد</p>
                    <p className="text-white/30 text-xs">كن أول من يرد على هذه التذكرة</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.is_from_user ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[70%] ${msg.is_from_user ? 'order-1' : 'order-2'}`}>
                        <div className={`rounded-2xl p-3 ${
                          msg.is_from_user
                            ? 'bg-gray-200 text-gray-800'
                            : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                        }`}>
                          {!msg.is_from_user && (
                            <div className="text-xs opacity-80 mb-1 flex items-center gap-1">
                              <FaHeadset size={10} />
                              <span>الدعم الفني</span>
                            </div>
                          )}
                          {msg.is_from_user && (
                            <div className="text-xs opacity-70 mb-1 text-gray-500">
                              {msg.sender_name || 'المستخدم'}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                        <div className={`text-[10px] text-white/40 mt-1 ${msg.is_from_user ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* منطقة الرد */}
              <div className="p-3 border-t border-white/20 bg-white/5">
                <div className="flex gap-2">
                  <textarea
                    ref={replyInputRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={t('replyPlaceholder')}
                    rows="2"
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 text-sm focus:outline-none focus:border-teal-400 transition resize-none"
                    disabled={sendingReply}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                  >
                    {sendingReply ? (
                      <FaSpinner className="animate-spin" size={16} />
                    ) : (
                      <>
                        <FaPaperPlane size={14} />
                        <span className="hidden sm:inline text-sm">{t('sendReply')}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-white/40 text-center mt-2 flex items-center justify-center gap-1">
                  <FaReply size={8} />
                  اضغط Enter للإرسال، Shift+Enter لسطر جديد
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaTicketAlt className="text-2xl text-white/40" />
                </div>
                <p className="text-white/60 text-sm">اختر تذكرة من القائمة لعرض تفاصيلها والرد عليها</p>
                <p className="text-white/30 text-xs mt-1">جميع التذاكر متاحة للمراجعة والرد</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportPage;

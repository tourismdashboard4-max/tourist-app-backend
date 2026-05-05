 // client/src/pages/SupportMessagesPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FaArrowLeft, 
  FaReply, 
  FaSpinner,
  FaEnvelope,
  FaUser,
  FaClock,
  FaPaperPlane,
  FaTimesCircle,
  FaCheckCircle,
  FaExclamationCircle,
  FaSearch,
  FaEye,
  FaTrashAlt
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://tourist-app-api.onrender.com';

const SupportMessagesPage = ({ setPage }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const lang = language;
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, open, in_progress, closed
  const [searchTerm, setSearchTerm] = useState('');
  
  const socketRef = useRef(null);

  const t = (key) => {
    const texts = {
      ar: {
        title: 'تذاكر الدعم الفني',
        subtitle: 'إدارة واستعراض تذاكر المستخدمين',
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
        delete: 'حذف',
        deleteConfirm: 'هل أنت متأكد من حذف هذه التذكرة؟ لا يمكن التراجع عن هذا الإجراء.',
        deleteSuccess: 'تم حذف التذكرة بنجاح',
        deleteError: 'فشل حذف التذكرة',
        markInProgress: 'تم تغيير الحالة إلى قيد المعالجة',
        closeTicket: 'إغلاق التذكرة',
        ticketClosed: 'تم إغلاق التذكرة'
      },
      en: {
        title: 'Support Tickets',
        subtitle: 'Manage and view user support tickets',
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
        delete: 'Delete',
        deleteConfirm: 'Are you sure you want to delete this ticket? This action cannot be undone.',
        deleteSuccess: 'Ticket deleted successfully',
        deleteError: 'Failed to delete ticket',
        markInProgress: 'Status changed to In Progress',
        closeTicket: 'Close Ticket',
        ticketClosed: 'Ticket closed'
      }
    };
    return texts[lang][key] || key;
  };

  // جلب قائمة التذاكر
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/support/admin/tickets');
      if (response.data.success) {
        // تحسين عرض اسم المستخدم إذا كان متاحاً
        const enrichedTickets = response.data.tickets.map(ticket => ({
          ...ticket,
          user_name: ticket.user_name || ticket.user?.name || ticket.user?.email || `User ${ticket.user_id}`
        }));
        setTickets(enrichedTickets);
      } else {
        // بيانات تجريبية للاختبار
        setTickets([
          {
            id: 3,
            user_id: 2,
            user_name: 'Ahmed Mohamed',
            subject: 'Payment Issue',
            status: 'open',
            priority: 'high',
            created_at: new Date().toISOString(),
            messages_count: 1
          },
          {
            id: 2,
            user_id: 2,
            user_name: 'Sara Ali',
            subject: 'طلب دعم جديد',
            status: 'open',
            priority: 'normal',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            messages_count: 7
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('فشل تحميل التذاكر');
    } finally {
      setLoading(false);
    }
  }, []);

  // جلب رسائل التذكرة
  const fetchTicketMessages = useCallback(async (ticketId) => {
    try {
      const response = await api.get(`/support/tickets/${ticketId}/messages`);
      if (response.data.success) {
        setMessages(response.data.messages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('فشل تحميل الرسائل');
      setMessages([]);
    }
  }, []);

  // إرسال رد
  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error('الرجاء كتابة الرد');
      return;
    }

    setSendingReply(true);
    try {
      const response = await api.post(`/support/admin/tickets/${selectedTicket.id}/reply`, {
        message: replyText
      });

      if (response.data.success) {
        toast.success(t('replySent'));
        await fetchTicketMessages(selectedTicket.id);
        setReplyText('');
        
        // تحديث حالة التذكرة في القائمة إلى "قيد المعالجة" إذا كانت مفتوحة
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id && t.status === 'open' 
            ? { ...t, status: 'in_progress' } 
            : t
        ));
        
        // تحديث التذكرة المحددة أيضاً
        if (selectedTicket.status === 'open') {
          setSelectedTicket(prev => ({ ...prev, status: 'in_progress' }));
        }
        
        // إشعار للمستخدم عبر socket (اختياري)
        if (socketRef.current) {
          socketRef.current.emit('admin-replied', {
            ticketId: selectedTicket.id,
            userId: selectedTicket.user_id,
            message: replyText
          });
        }
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(t('replyError'));
    } finally {
      setSendingReply(false);
    }
  };

  // حذف التذكرة
  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    
    setDeletingId(ticketId);
    try {
      const response = await api.delete(`/support/admin/tickets/${ticketId}`);
      if (response.data.success) {
        toast.success(t('deleteSuccess'));
        // إزالة التذكرة من القائمة
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        // إذا كانت التذكرة المحددة هي المحذوفة، أغلق التفاصيل
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(null);
          setMessages([]);
        }
      } else {
        throw new Error(response.data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error(t('deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  // إغلاق التذكرة (تغيير الحالة إلى closed)
  const handleCloseTicket = async (ticketId) => {
    try {
      const response = await api.patch(`/support/admin/tickets/${ticketId}/status`, {
        status: 'closed'
      });
      if (response.data.success) {
        toast.success(t('ticketClosed'));
        // تحديث القائمة والتذكرة المحددة
        setTickets(prev => prev.map(t => 
          t.id === ticketId ? { ...t, status: 'closed' } : t
        ));
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(prev => ({ ...prev, status: 'closed' }));
        }
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error('فشل إغلاق التذكرة');
    }
  };

  // تحديث القائمة عند استلام إشعار جديد عبر socket
  useEffect(() => {
    fetchTickets();
    
    // إعداد socket للاستماع إلى التذاكر الجديدة
    const token = localStorage.getItem('token');
    if (token && user?.role === 'admin') {
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      });
      socketRef.current = socket;
      
      socket.on('connect', () => {
        console.log('Socket connected for admin');
        socket.emit('admin-connected', { adminId: user.id });
      });
      
      socket.on('new_ticket', (newTicket) => {
        toast.success(`تذكرة جديدة من ${newTicket.user_name}`);
        fetchTickets(); // إعادة تحميل القائمة
      });
      
      socket.on('new_message_from_user', (data) => {
        if (selectedTicket?.id === data.ticketId) {
          fetchTicketMessages(data.ticketId);
        }
        // تحديث عداد الرسائل في القائمة
        setTickets(prev => prev.map(t => 
          t.id === data.ticketId 
            ? { ...t, messages_count: (t.messages_count || 0) + 1 }
            : t
        ));
        toast.info(`رسالة جديدة من مستخدم في التذكرة #${data.ticketId}`);
      });
      
      return () => {
        socket.disconnect();
      };
    }
  }, [fetchTickets, user, selectedTicket]);

  const getStatusBadge = (status, priority) => {
    // الأولوية العالية تظهر فقط إذا كانت التذكرة مفتوحة أو قيد المعالجة
    const showUrgent = priority === 'high' && (status === 'open' || status === 'in_progress');
    
    if (showUrgent) {
      return {
        icon: <FaExclamationCircle className="text-red-400" />,
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
          icon: <FaCheckCircle className="text-blue-400" />,
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

  // فلترة التذاكر
  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'open') return ticket.status === 'open';
    if (filter === 'closed') return ticket.status === 'closed';
    if (filter === 'in_progress') return ticket.status === 'in_progress';
    return true;
  }).filter(ticket => 
    ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 py-8 px-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setPage('notifications')}
            className="p-2 hover:bg-white/20 rounded-xl transition"
          >
            <FaArrowLeft className="text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-white/60 text-sm">{t('subtitle')}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-teal-400"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'in_progress', 'closed'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm transition ${
                  filter === status
                    ? 'bg-teal-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {t(status === 'all' ? 'allTickets' : status)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* قائمة التذاكر */}
          <div className="lg:col-span-1">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <FaSpinner className="animate-spin text-teal-400 text-3xl" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
                <FaEnvelope className="text-5xl text-white/30 mx-auto mb-3" />
                <p className="text-white/60">{t('noTickets')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => {
                  const statusBadge = getStatusBadge(ticket.status, ticket.priority);
                  const isDeleting = deletingId === ticket.id;
                  return (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => openTicket(ticket)}
                      className={`bg-white/10 backdrop-blur-sm rounded-2xl p-4 border cursor-pointer transition hover:bg-white/15 ${
                        selectedTicket?.id === ticket.id ? 'border-teal-400/50 bg-white/15' : 'border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                              {ticket.user_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-sm">{ticket.user_name}</h3>
                              <p className="text-white/50 text-xs">ID: {ticket.user_id}</p>
                            </div>
                          </div>
                          
                          <h4 className="text-white font-medium text-sm mb-1">{ticket.subject}</h4>
                          
                          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <FaClock />
                              {new Date(ticket.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                            </span>
                            {ticket.messages_count > 0 && (
                              <span className="flex items-center gap-1">
                                <FaEnvelope className="text-[10px]" />
                                {ticket.messages_count} {t('messages')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs ${statusBadge.color}`}>
                            {statusBadge.icon}
                            <span>{statusBadge.text}</span>
                          </div>
                          {/* زر الحذف */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTicket(ticket.id);
                            }}
                            disabled={isDeleting}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition text-white/40 hover:text-red-400"
                          >
                            {isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrashAlt size={14} />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* تفاصيل التذكرة والرد */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
                {/* رأس التذكرة */}
                <div className="p-4 border-b border-white/20 bg-white/5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h2 className="text-white font-bold text-lg">{selectedTicket.subject}</h2>
                      <p className="text-white/50 text-sm flex items-center gap-2 mt-1">
                        <FaUser className="text-xs" />
                        {selectedTicket.user_name}
                        <span className="mx-1">•</span>
                        <FaClock className="text-xs" />
                        {new Date(selectedTicket.created_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {selectedTicket.status !== 'closed' && (
                        <button
                          onClick={() => handleCloseTicket(selectedTicket.id)}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition"
                        >
                          {t('closeTicket')}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="p-2 hover:bg-white/20 rounded-lg transition"
                      >
                        <FaTimesCircle className="text-white/70" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* الرسائل */}
                <div className="p-4 h-96 overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-white/50">
                      لا توجد رسائل بعد
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isAdmin = !msg.is_from_user; // افترض أن is_from_user = true للمستخدم
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[80%] ${isAdmin ? 'order-1' : 'order-2'}`}>
                            <div className={`rounded-2xl p-3 ${
                              isAdmin
                                ? 'bg-white/20 text-white'
                                : 'bg-teal-500 text-white'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                            </div>
                            <div className="text-xs text-white/40 mt-1 flex items-center gap-2">
                              <span>{new Date(msg.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                              {isAdmin && <span className="bg-teal-600/40 px-1.5 py-0.5 rounded-full text-[10px]">مرشد</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* منطقة الرد - تظهر فقط إذا كانت التذكرة غير مغلقة */}
                {selectedTicket.status !== 'closed' ? (
                  <div className="p-4 border-t border-white/20 bg-white/5">
                    <label className="text-white/70 text-sm mb-2 block">{t('yourReply')}</label>
                    <div className="flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t('replyPlaceholder')}
                        rows="3"
                        className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-teal-400 transition resize-none"
                      />
                      <button
                        onClick={handleSendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {sendingReply ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaPaperPlane />
                        )}
                        <span className="hidden sm:inline">{t('sendReply')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-white/20 bg-white/5 text-center text-white/50 text-sm">
                    هذه التذكرة مغلقة. لا يمكن إضافة ردود جديدة.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
                <FaEye className="text-5xl text-white/30 mx-auto mb-3" />
                <p className="text-white/60">اختر تذكرة لعرض تفاصيلها والرد عليها</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportMessagesPage;

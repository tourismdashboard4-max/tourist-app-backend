// client/src/pages/SupportMessagesPage.jsx
import React, { useState, useEffect } from 'react';
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
  FaEye
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

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
  const [filter, setFilter] = useState('all'); // all, open, in_progress, closed
  const [searchTerm, setSearchTerm] = useState('');

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
        cancel: 'إلغاء'
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
        cancel: 'Cancel'
      }
    };
    return texts[lang][key] || key;
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // استخدام مسار المسؤول لجلب كل التذاكر
      const response = await api.get('/support/admin/tickets');
      if (response.data.success) {
        setTickets(response.data.tickets);
      } else {
        // بيانات تجريبية
        setTickets([
          {
            id: 3,
            user_id: 2,
            user_name: 'moohmd15nasib@icloud.com',
            subject: 'Payment Issue',
            status: 'open',
            priority: 'high',
            created_at: new Date().toISOString(),
            messages_count: 1
          },
          {
            id: 2,
            user_id: 2,
            user_name: 'moohmd15nasib@icloud.com',
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
  };

  const fetchTicketMessages = async (ticketId) => {
    try {
      const response = await api.get(`/support/tickets/${ticketId}/messages`);
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('فشل تحميل الرسائل');
    }
  };

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
        // تحديث حالة التذكرة في القائمة
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id ? { ...t, status: 'in_progress' } : t
        ));
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(t('replyError'));
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadge = (status, priority) => {
    if (priority === 'high' && status === 'open') {
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
          <div className="flex gap-2">
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
                        
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs ${statusBadge.color}`}>
                          {statusBadge.icon}
                          <span>{statusBadge.text}</span>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-white font-bold text-lg">{selectedTicket.subject}</h2>
                      <p className="text-white/50 text-sm flex items-center gap-2 mt-1">
                        <FaUser className="text-xs" />
                        {selectedTicket.user_name}
                        <span className="mx-1">•</span>
                        <FaClock className="text-xs" />
                        {new Date(selectedTicket.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <FaTimesCircle className="text-white/70" />
                    </button>
                  </div>
                </div>

                {/* الرسائل */}
                <div className="p-4 h-96 overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-white/50">
                      لا توجد رسائل بعد
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_from_user ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${msg.is_from_user ? 'order-2' : 'order-1'}`}>
                          <div className={`rounded-2xl p-3 ${
                            msg.is_from_user
                              ? 'bg-teal-500 text-white'
                              : 'bg-white/20 text-white'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                          <div className="text-xs text-white/40 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* منطقة الرد */}
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

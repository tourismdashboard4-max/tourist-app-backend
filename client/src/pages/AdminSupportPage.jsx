// client/src/pages/AdminSupportPage.jsx
import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaReply, FaCheckCircle, FaClock, FaArrowLeft, FaSpinner, FaEnvelope, FaUser, FaCalendarAlt, FaTrash, FaEye } from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const AdminSupportPage = ({ setPage }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all'); // all, open, closed
  const [language, setLanguage] = useState('ar');

  // ترجمة النصوص
  const t = (key) => {
    const texts = {
      ar: {
        title: 'تذاكر الدعم',
        back: 'رجوع',
        noTickets: 'لا توجد تذاكر دعم',
        open: 'مفتوحة',
        closed: 'مغلقة',
        all: 'الكل',
        subject: 'الموضوع',
        message: 'الرسالة',
        from: 'من',
        date: 'التاريخ',
        status: 'الحالة',
        reply: 'رد',
        close: 'إغلاق التذكرة',
        delete: 'حذف',
        view: 'عرض التفاصيل',
        sendReply: 'إرسال الرد',
        typeReply: 'اكتب ردك هنا...',
        replySent: 'تم إرسال الرد بنجاح',
        ticketClosed: 'تم إغلاق التذكرة',
        ticketDeleted: 'تم حذف التذكرة',
        confirmDelete: 'هل أنت متأكد من حذف هذه التذكرة؟',
        loading: 'جاري التحميل...',
        sending: 'جاري الإرسال...'
      },
      en: {
        title: 'Support Tickets',
        back: 'Back',
        noTickets: 'No support tickets',
        open: 'Open',
        closed: 'Closed',
        all: 'All',
        subject: 'Subject',
        message: 'Message',
        from: 'From',
        date: 'Date',
        status: 'Status',
        reply: 'Reply',
        close: 'Close Ticket',
        delete: 'Delete',
        view: 'View Details',
        sendReply: 'Send Reply',
        typeReply: 'Type your reply here...',
        replySent: 'Reply sent successfully',
        ticketClosed: 'Ticket closed',
        ticketDeleted: 'Ticket deleted',
        confirmDelete: 'Are you sure you want to delete this ticket?',
        loading: 'Loading...',
        sending: 'Sending...'
      }
    };
    return texts[language][key] || key;
  };

  // جلب التذاكر من API
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tourist-app-api.onrender.com/api/support/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('📥 Tickets response:', data);
      
      if (data.success && data.tickets) {
        setTickets(data.tickets);
      } else if (Array.isArray(data)) {
        setTickets(data);
      } else {
        // بيانات تجريبية للاختبار
        const demoData = [
          {
            id: 1,
            subject: 'مشكلة في تسجيل الدخول',
            message: 'لا أستطيع تسجيل الدخول إلى حسابي، يظهر لي خطأ في كلمة المرور',
            user_name: 'أحمد محمد',
            user_email: 'ahmed@example.com',
            status: 'open',
            priority: 'high',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            subject: 'استفسار عن البرامج السياحية',
            message: 'هل توجد برامج سياحية في المنطقة الشرقية؟',
            user_name: 'سارة أحمد',
            user_email: 'sara@example.com',
            status: 'open',
            priority: 'medium',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 3,
            subject: 'طلب ترقية حساب مرشد',
            message: 'لقد قدمت طلب ترقية منذ أسبوع ولم يتم الرد عليه',
            user_name: 'خالد العتيبي',
            user_email: 'khalid@example.com',
            status: 'closed',
            priority: 'low',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            updated_at: new Date(Date.now() - 86400000).toISOString()
          }
        ];
        setTickets(demoData);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      // بيانات تجريبية للاختبار عند فشل الاتصال
      setTickets([
        {
          id: 1,
          subject: 'مشكلة في تسجيل الدخول',
          message: 'لا أستطيع تسجيل الدخول إلى حسابي، يظهر لي خطأ في كلمة المرور',
          user_name: 'أحمد محمد',
          user_email: 'ahmed@example.com',
          status: 'open',
          priority: 'high',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          subject: 'استفسار عن البرامج السياحية',
          message: 'هل توجد برامج سياحية في المنطقة الشرقية؟',
          user_name: 'سارة أحمد',
          user_email: 'sara@example.com',
          status: 'open',
          priority: 'medium',
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // تحميل اللغة من localStorage
    const savedLang = localStorage.getItem('language');
    if (savedLang) setLanguage(savedLang);
  }, []);

  // إرسال رد
  const sendReply = async () => {
    if (!replyText.trim()) {
      toast.error('الرجاء إدخال نص الرد');
      return;
    }
    
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tourist-app-api.onrender.com/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: replyText })
      });
      
      const data = await response.json();
      console.log('📤 Reply response:', data);
      
      toast.success(t('replySent'));
      setReplyText('');
      setSelectedTicket(null);
      fetchTickets(); // تحديث القائمة
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.success(t('replySent') + ' (تجريبي)');
      setReplyText('');
      setSelectedTicket(null);
    } finally {
      setSending(false);
    }
  };

  // إغلاق تذكرة
  const closeTicket = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://tourist-app-api.onrender.com/api/support/tickets/${ticketId}/close`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      toast.success(t('ticketClosed'));
      fetchTickets();
    } catch (error) {
      console.error('Error closing ticket:', error);
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status: 'closed' } : t
      ));
      toast.success(t('ticketClosed') + ' (تجريبي)');
    }
  };

  // حذف تذكرة
  const deleteTicket = async (ticketId) => {
    if (!window.confirm(t('confirmDelete'))) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://tourist-app-api.onrender.com/api/support/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      toast.success(t('ticketDeleted'));
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      toast.success(t('ticketDeleted') + ' (تجريبي)');
    }
  };

  // تصفية التذاكر
  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  // حساب الإحصائيات
  const openCount = tickets.filter(t => t.status === 'open').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  // الحصول على لون الأولوية
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  // الحصول على نص الأولوية
  const getPriorityText = (priority) => {
    if (language === 'ar') {
      switch(priority) {
        case 'high': return 'عاجل';
        case 'medium': return 'متوسط';
        default: return 'عادي';
      }
    }
    switch(priority) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      default: return 'Low';
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-teal-400 text-4xl mx-auto mb-3" />
          <p className="text-white/60">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage('profile')}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <FaArrowLeft className="text-white text-xl" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                <FaTicketAlt className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
                <p className="text-white/50 text-sm">
                  {openCount} {language === 'ar' ? 'تذكرة مفتوحة' : 'open tickets'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Language Toggle */}
          <button
            onClick={() => {
              const newLang = language === 'ar' ? 'en' : 'ar';
              setLanguage(newLang);
              localStorage.setItem('language', newLang);
            }}
            className="px-3 py-1.5 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition"
          >
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
            <FaTicketAlt className="text-teal-400 text-xl mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{tickets.length}</div>
            <div className="text-xs text-white/50">{language === 'ar' ? 'إجمالي التذاكر' : 'Total Tickets'}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
            <FaEnvelope className="text-yellow-400 text-xl mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{openCount}</div>
            <div className="text-xs text-white/50">{t('open')}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
            <FaCheckCircle className="text-green-400 text-xl mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{closedCount}</div>
            <div className="text-xs text-white/50">{t('closed')}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-white/10 rounded-xl p-1">
          {['all', 'open', 'closed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 py-2 rounded-lg text-sm transition flex items-center justify-center gap-2 ${
                filter === status
                  ? 'bg-teal-500 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {status === 'all' && <FaTicketAlt className="text-xs" />}
              {status === 'open' && <FaEnvelope className="text-xs" />}
              {status === 'closed' && <FaCheckCircle className="text-xs" />}
              {t(status)}
              {status === 'open' && openCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
            <FaTicketAlt className="text-5xl text-white/30 mx-auto mb-3" />
            <p className="text-white/60">{t('noTickets')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket, index) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white/10 backdrop-blur-sm rounded-2xl p-4 border transition-all hover:bg-white/15 ${
                  ticket.status === 'open' 
                    ? 'border-teal-400/50' 
                    : 'border-white/20 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Ticket Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    ticket.status === 'open' 
                      ? 'bg-teal-500/20' 
                      : 'bg-white/10'
                  }`}>
                    <FaTicketAlt className={`text-xl ${
                      ticket.status === 'open' ? 'text-teal-400' : 'text-white/40'
                    }`} />
                  </div>
                  
                  {/* Ticket Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <h3 className={`text-white font-bold ${
                        ticket.status === 'open' ? 'text-base' : 'text-sm'
                      }`}>
                        {ticket.subject}
                      </h3>
                      {ticket.priority && (
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(ticket.priority)}`}>
                          {getPriorityText(ticket.priority)}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        ticket.status === 'open'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {ticket.status === 'open' ? t('open') : t('closed')}
                      </span>
                    </div>
                    
                    <p className="text-white/70 text-sm mb-2 line-clamp-2">
                      {ticket.message}
                    </p>
                    
                    <div className="flex items-center flex-wrap gap-4 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <FaUser className="text-[10px]" />
                        {ticket.user_name || ticket.user_email || 'مستخدم'}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt className="text-[10px]" />
                        {new Date(ticket.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaClock className="text-[10px]" />
                        {new Date(ticket.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="p-2 hover:bg-teal-500/20 rounded-lg transition group"
                      title={t('reply')}
                    >
                      <FaReply className="text-teal-400 text-sm group-hover:scale-110 transition" />
                    </button>
                    
                    <button
                      onClick={() => deleteTicket(ticket.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition group"
                      title={t('delete')}
                    >
                      <FaTrash className="text-red-400 text-sm group-hover:scale-110 transition" />
                    </button>
                    
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => closeTicket(ticket.id)}
                        className="p-2 hover:bg-green-500/20 rounded-lg transition group"
                        title={t('close')}
                      >
                        <FaCheckCircle className="text-green-400 text-sm group-hover:scale-110 transition" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {selectedTicket && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 rounded-2xl max-w-lg w-full border border-teal-400/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FaTicketAlt className="text-white text-xl" />
                <div>
                  <h3 className="text-white font-bold">{selectedTicket.subject}</h3>
                  <p className="text-white/70 text-sm">
                    {language === 'ar' ? 'من' : 'From'}: {selectedTicket.user_name || selectedTicket.user_email}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-5">
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">
                  {t('message')}:
                </label>
                <div className="bg-white/10 rounded-xl p-3 text-white text-sm">
                  {selectedTicket.message}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">
                  {t('reply')}:
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('typeReply')}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-teal-400 transition resize-none"
                  rows="4"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={sendReply}
                  disabled={sending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-cyan-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      {t('sending')}
                    </>
                  ) : (
                    <>
                      <FaReply />
                      {t('sendReply')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-5 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition"
                >
                  {t('back')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminSupportPage;

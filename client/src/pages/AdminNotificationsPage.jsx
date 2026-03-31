// client/src/pages/AdminNotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FaArrowLeft, FaSpinner, FaEnvelope, FaCheckCircle, 
  FaTimesCircle, FaTrash, FaReply, FaUserPlus,
  FaClock, FaEye, FaArchive, FaBell, FaComment,
  FaCheck, FaTimes, FaEdit, FaFlag
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const AdminNotificationsPage = ({ setPage }) => {
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const lang = language;
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [processingId, setProcessingId] = useState(null);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [incompleteMessage, setIncompleteMessage] = useState('');

  const t = (key) => {
    const texts = {
      ar: {
        title: 'إشعارات الإدارة',
        subtitle: 'إدارة طلبات الترقية وتذاكر الدعم',
        back: 'رجوع',
        noNotifications: 'لا توجد إشعارات',
        unread: 'غير مقروءة',
        read: 'مقروءة',
        archived: 'مؤرشفة',
        all: 'الكل',
        markAsRead: 'تحديد كمقروء',
        delete: 'حذف',
        archive: 'أرشفة',
        approve: 'موافقة',
        reject: 'رفض',
        incomplete: 'استكمال',
        reply: 'رد',
        view: 'عرض',
        chat: 'محادثة',
        upgradeRequest: 'طلب ترقية',
        supportTicket: 'تذكرة دعم',
        sending: 'جاري الإرسال...',
        rejectReason: 'سبب الرفض',
        incompleteMessage: 'ملاحظات الاستكمال',
        confirmReject: 'تأكيد الرفض',
        confirmIncomplete: 'تأكيد الاستكمال',
        cancel: 'إلغاء',
        confirm: 'تأكيد'
      },
      en: {
        title: 'Admin Notifications',
        subtitle: 'Manage upgrade requests and support tickets',
        back: 'Back',
        noNotifications: 'No notifications',
        unread: 'Unread',
        read: 'Read',
        archived: 'Archived',
        all: 'All',
        markAsRead: 'Mark as read',
        delete: 'Delete',
        archive: 'Archive',
        approve: 'Approve',
        reject: 'Reject',
        incomplete: 'Incomplete',
        reply: 'Reply',
        view: 'View',
        chat: 'Chat',
        upgradeRequest: 'Upgrade Request',
        supportTicket: 'Support Ticket',
        sending: 'Sending...',
        rejectReason: 'Rejection Reason',
        incompleteMessage: 'Completion Notes',
        confirmReject: 'Confirm Rejection',
        confirmIncomplete: 'Confirm Incomplete',
        cancel: 'Cancel',
        confirm: 'Confirm'
      }
    };
    return texts[lang][key] || key;
  };

  // ✅ جلب طلبات الترقية من الـ API - المسار الصحيح
  const fetchUpgradeRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tourist-app-api.onrender.com/api/upgrade/upgrade-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('📥 Upgrade requests response:', data);
      if (data.success && data.requests) {
        setUpgradeRequests(data.requests);
        // تحويل طلبات الترقية إلى إشعارات (إشعار واحد لكل طلب)
        const upgradeNotifications = data.requests
          .filter(req => req.status === 'pending')
          .map(req => ({
            id: `upgrade_${req.id}`,
            type: 'upgrade_request',
            related_id: req.id,
            title: 'طلب ترقية جديد',
            message: `${req.full_name || `مستخدم ${req.user_id}`} تقدم بطلب ترقية إلى مرشد سياحي`,
            priority: 'high',
            status: 'unread',
            created_at: req.created_at,
            metadata: { userId: req.user_id, fullName: req.full_name },
            data: { userId: req.user_id, requestId: req.id }
          }));
        
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNotifs = upgradeNotifications.filter(n => !existingIds.has(n.id));
          return [...newNotifs, ...prev];
        });
        setUnreadCount(prev => prev + upgradeNotifications.length);
      }
    } catch (error) {
      console.error('Error fetching upgrade requests:', error);
    }
  };

  // ✅ جلب إشعارات المسؤول المجمعة (إشعار واحد لكل مستخدم)
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tourist-app-api.onrender.com/api/notifications/admin-grouped', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('📥 Grouped notifications response:', data);
      
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
      toast.error('فشل تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'support') {
      fetchNotifications();
      fetchUpgradeRequests();
    } else {
      toast.error('غير مصرح');
      setPage('profile');
    }
  }, [user, filter]);

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://tourist-app-api.onrender.com/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true, status: 'read' } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success(t('markAsRead'));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://tourist-app-api.onrender.com/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success(t('delete'));
    } catch (error) {
      console.error('Error deleting notification:', error);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  // ✅ دالة معالجة الإجراءات مع نوافذ تأكيد - المسار الصحيح
  const handleAction = async (notification, action) => {
    if (action === 'approve') {
      if (window.confirm('هل أنت متأكد من الموافقة على طلب الترقية؟')) {
        setProcessingId(notification.id);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`https://tourist-app-api.onrender.com/api/upgrade/upgrade-requests/${notification.related_id}/approve`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              notes: 'تمت الموافقة من قبل المسؤول' 
            })
          });
          const data = await response.json();
          if (data.success) {
            toast.success('✅ تمت الموافقة على طلب الترقية');
            
            // تحديث المستخدم في السياق إذا كان نفس المستخدم
            if (user?.id === notification.metadata?.userId) {
              const updatedUser = { ...user, role: 'guide', guide_status: 'approved' };
              if (updateUser) updateUser(updatedUser);
              localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
            }
            
            await markAsRead(notification.id);
            await fetchUpgradeRequests();
            await fetchNotifications();
          } else {
            toast.error(data.message || 'فشل الموافقة');
          }
        } catch (error) {
          console.error('Error approving:', error);
          toast.error('حدث خطأ أثناء الموافقة');
        } finally {
          setProcessingId(null);
        }
      }
    } else if (action === 'reject') {
      setSelectedRequest(notification);
      setShowRejectModal(true);
    } else if (action === 'incomplete') {
      setSelectedRequest(notification);
      setShowIncompleteModal(true);
    } else if (notification.type === 'support_ticket' || notification.type === 'support_message') {
      if (action === 'view' || action === 'reply') {
        const ticketId = notification.data?.ticketId || notification.related_id;
        if (ticketId) {
          localStorage.setItem('selectedTicketId', ticketId);
          setPage('admin-support');
        } else {
          setPage('admin-support');
        }
      }
      await markAsRead(notification.id);
    }
  };

  // تأكيد الرفض
  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('الرجاء إدخال سبب الرفض');
      return;
    }
    
    setProcessingId(selectedRequest?.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tourist-app-api.onrender.com/api/upgrade/upgrade-requests/${selectedRequest.related_id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('❌ تم رفض طلب الترقية');
        await markAsRead(selectedRequest.id);
        await fetchUpgradeRequests();
        await fetchNotifications();
      } else {
        toast.error(data.message || 'فشل الرفض');
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('حدث خطأ أثناء الرفض');
    } finally {
      setProcessingId(null);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedRequest(null);
    }
  };

  // تأكيد استكمال البيانات
  const confirmIncomplete = async () => {
    if (!incompleteMessage.trim()) {
      toast.error('الرجاء إدخال ملاحظات الاستكمال');
      return;
    }
    
    setProcessingId(selectedRequest?.id);
    try {
      const userId = selectedRequest?.metadata?.userId;
      if (userId) {
        const token = localStorage.getItem('token');
        await fetch(`https://tourist-app-api.onrender.com/api/notifications`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            title: 'طلب استكمال بيانات الترقية',
            message: `الرجاء استكمال البيانات التالية: ${incompleteMessage}`,
            type: 'upgrade_incomplete',
            data: JSON.stringify({ requestId: selectedRequest.related_id, message: incompleteMessage })
          })
        });
        toast.success('📝 تم إرسال طلب استكمال البيانات');
        await markAsRead(selectedRequest.id);
        await fetchNotifications();
      } else {
        toast.error('لم يتم العثور على معرف المستخدم');
      }
    } catch (error) {
      console.error('Error sending incomplete:', error);
      toast.error('حدث خطأ أثناء إرسال طلب الاستكمال');
    } finally {
      setProcessingId(null);
      setShowIncompleteModal(false);
      setIncompleteMessage('');
      setSelectedRequest(null);
    }
  };

  const getIcon = (type, notification) => {
    if (type === 'upgrade_request') return <FaUserPlus className="text-purple-400" />;
    if (type === 'support_ticket' || type === 'support_message') return <FaEnvelope className="text-blue-400" />;
    if (type === 'chat') return <FaComment className="text-green-400" />;
    return <FaBell className="text-gray-400" />;
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-500/20 text-red-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  if (loading && notifications.length === 0 && upgradeRequests.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 flex items-center justify-center">
        <FaSpinner className="animate-spin text-teal-400 text-4xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setPage('profile')}
            className="p-2 hover:bg-white/20 rounded-xl transition"
          >
            <FaArrowLeft className="text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-white/60 text-sm">
              {unreadCount > 0 ? `${unreadCount} ${t('unread')}` : t('subtitle')}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-white/10 rounded-xl p-1">
          {['all', 'unread', 'read', 'archived'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 py-2 rounded-lg text-sm transition ${
                filter === status
                  ? 'bg-teal-500 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {t(status)}
              {status === 'unread' && unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 rounded-full text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 && upgradeRequests.filter(r => r.status === 'pending').length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
            <FaBell className="text-5xl text-white/30 mx-auto mb-3" />
            <p className="text-white/60">{t('noNotifications')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* عرض طلبات الترقية كإشعارات */}
            {upgradeRequests.filter(r => r.status === 'pending').map((req) => (
              <motion.div
                key={`upgrade_${req.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-teal-400/50 bg-white/15"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <FaUserPlus className="text-purple-400" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-sm">طلب ترقية جديد</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">عاجل</span>
                    </div>
                    <p className="text-white/70 text-sm mb-2">
                      {req.full_name || `مستخدم ${req.user_id}`} تقدم بطلب ترقية إلى مرشد سياحي
                    </p>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <FaClock />
                        {new Date(req.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/10 flex-wrap">
                  <button
                    onClick={() => handleAction({ type: 'upgrade_request', related_id: req.id, id: `upgrade_${req.id}`, metadata: { userId: req.user_id } }, 'approve')}
                    disabled={processingId === `upgrade_${req.id}`}
                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition flex items-center gap-1"
                  >
                    {processingId === `upgrade_${req.id}` ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                    {t('approve')}
                  </button>
                  <button
                    onClick={() => handleAction({ type: 'upgrade_request', related_id: req.id, id: `upgrade_${req.id}`, metadata: { userId: req.user_id } }, 'reject')}
                    disabled={processingId === `upgrade_${req.id}`}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition flex items-center gap-1"
                  >
                    {processingId === `upgrade_${req.id}` ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                    {t('reject')}
                  </button>
                  <button
                    onClick={() => handleAction({ type: 'upgrade_request', related_id: req.id, id: `upgrade_${req.id}`, metadata: { userId: req.user_id } }, 'incomplete')}
                    disabled={processingId === `upgrade_${req.id}`}
                    className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm transition flex items-center gap-1"
                  >
                    {processingId === `upgrade_${req.id}` ? <FaSpinner className="animate-spin" /> : <FaEdit />}
                    {t('incomplete')}
                  </button>
                </div>
              </motion.div>
            ))}
            
            {/* الإشعارات المجمعة (إشعار واحد لكل مستخدم) */}
            {notifications
              .filter(n => {
                if (filter === 'all') return true;
                if (filter === 'unread') return !n.is_read;
                if (filter === 'read') return n.is_read;
                if (filter === 'archived') return n.status === 'archived';
                return true;
              })
              .map((notification) => {
                const isUnread = !notification.is_read;
                const userName = notification.data?.userName || notification.title?.replace('رسالة جديدة من ', '') || 'مستخدم';
                const lastMessage = notification.data?.lastMessage || notification.message;
                const messageCount = notification.data?.messageCount || 1;
                
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white/10 backdrop-blur-sm rounded-2xl p-4 border transition cursor-pointer ${
                      isUnread ? 'border-teal-400/50 bg-white/15' : 'border-white/20'
                    }`}
                    onClick={() => handleAction(notification, 'view')}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <FaEnvelope className="text-blue-400" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-white font-bold text-sm ${isUnread && 'font-bold'}`}>
                            {userName}
                          </h3>
                          {messageCount > 1 && (
                            <span className="px-2 py-0.5 bg-teal-500/30 text-teal-300 text-xs rounded-full">
                              {messageCount} رسائل
                            </span>
                          )}
                        </div>
                        <p className="text-white/70 text-sm mb-2 line-clamp-2">
                          {lastMessage}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <FaClock />
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-2 hover:bg-white/20 rounded-lg transition"
                            title={t('markAsRead')}
                          >
                            <FaEye className="text-white/60 text-sm" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition"
                          title={t('delete')}
                        >
                          <FaTrash className="text-red-400 text-sm" />
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(notification, 'reply');
                        }}
                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition flex items-center gap-1"
                      >
                        <FaReply />
                        {t('reply')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(notification, 'view');
                        }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition flex items-center gap-1"
                      >
                        <FaEye />
                        {t('view')}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">{t('confirmReject')}</h3>
            </div>
            <div className="p-6">
              <label className="block text-white/70 mb-2">{t('rejectReason')}</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-red-400"
                rows="3"
                placeholder="الرجاء إدخال سبب الرفض..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={confirmReject}
                  disabled={processingId === selectedRequest?.id}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  {processingId === selectedRequest?.id ? <FaSpinner className="animate-spin mx-auto" /> : t('confirm')}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedRequest(null);
                  }}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incomplete Modal */}
      {showIncompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowIncompleteModal(false)}>
          <div className="bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-4 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">{t('confirmIncomplete')}</h3>
            </div>
            <div className="p-6">
              <label className="block text-white/70 mb-2">{t('incompleteMessage')}</label>
              <textarea
                value={incompleteMessage}
                onChange={(e) => setIncompleteMessage(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
                rows="3"
                placeholder="الرجاء إدخال ملاحظات استكمال البيانات..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={confirmIncomplete}
                  disabled={processingId === selectedRequest?.id}
                  className="flex-1 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                >
                  {processingId === selectedRequest?.id ? <FaSpinner className="animate-spin mx-auto" /> : t('confirm')}
                </button>
                <button
                  onClick={() => {
                    setShowIncompleteModal(false);
                    setIncompleteMessage('');
                    setSelectedRequest(null);
                  }}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationsPage;

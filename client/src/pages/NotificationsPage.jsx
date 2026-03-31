// client/src/pages/NotificationsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FaArrowLeft, 
  FaBell, 
  FaCalendarCheck, 
  FaWallet, 
  FaComments, 
  FaStar, 
  FaInfoCircle,
  FaSpinner,
  FaCheckDouble,
  FaEye,
  FaTrash,
  FaUser,
  FaHeadset,
  FaCheck,
  FaExclamationTriangle,
  FaFire,
  FaLock,
  FaUnlock,
  FaMoneyBillWave,
  FaCreditCard,
  FaMapMarkerAlt,
  FaRoute,
  FaClock,
  FaUsers,
  FaPlusCircle,
  FaQuestionCircle,
  FaPhoneAlt,
  FaAmbulance,
  FaShieldAlt,
  FaExclamationCircle,
  FaBellSlash,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaRegBell,
  FaRegCheckCircle,
  FaRegClock,
  FaRegCalendarAlt,
  FaUserPlus
} from 'react-icons/fa';
import { MdEmergency, MdSupportAgent, MdWarning, MdDangerous } from 'react-icons/md';
import { GiPoliceBadge, GiFireBottle, GiFirstAidKit, GiSiren } from 'react-icons/gi';
import { IoIosWarning } from 'react-icons/io';
import { RiAlarmWarningFill } from 'react-icons/ri';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import './NotificationsPage.css';

const NotificationsPage = ({ setPage }) => {
  const { theme, darkMode } = useTheme();
  const { language } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const timeoutRef = useRef(null);
  const notificationsContainerRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [openingSupport, setOpeningSupport] = useState(false);
  const [hasSupportChat, setHasSupportChat] = useState(false);
  const [supportCheckDone, setSupportCheckDone] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  // نصوص متعددة اللغات
  const texts = {
    ar: {
      title: 'الإشعارات',
      back: 'رجوع',
      unread: 'لديك {count} إشعار غير مقروء',
      unread_plural: 'لديك {count} إشعارات غير مقروءة',
      markAll: 'تحديد الكل مقروء',
      all: 'الكل',
      unreadFilter: 'غير مقروء',
      read: 'مقروء',
      noNotifications: 'لا توجد إشعارات',
      noUnread: 'لا توجد إشعارات غير مقروءة',
      loading: 'جاري التحميل...',
      markAsRead: 'تحديد كمقروء',
      delete: 'حذف',
      support: 'الدعم الفني',
      emergency: 'طوارئ',
      callEmergency: 'اتصل بالطوارئ',
      opening: 'جاري الفتح...',
      sessionExpired: 'انتهت الجلسة. سيتم تحويلك إلى صفحة تسجيل الدخول...',
      confirmDelete: 'هل أنت متأكد من حذف هذا الإشعار؟',
      successMarkAll: 'تم تحديث جميع الإشعارات كمقروءة',
      errorGeneric: 'حدث خطأ. يرجى المحاولة مرة أخرى',
      loadingSession: 'جاري تحميل بيانات الجلسة...',
      notLoggedIn: 'لم تقم بتسجيل الدخول',
      loginPrompt: 'الرجاء تسجيل الدخول لعرض الإشعارات الخاصة بك',
      login: 'تسجيل الدخول',
      prev: 'السابق',
      next: 'التالي',
      page: 'صفحة {current} من {total}',
      supportChat: 'محادثة دعم',
      newSupport: 'محادثة دعم جديدة',
      emergencyHotline: '911',
      police: 'شرطة',
      ambulance: 'إسعاف',
      fire: 'دفاع مدني',
      types: {
        BOOKING_CONFIRMED: 'تأكيد حجز',
        BOOKING_CANCELLED: 'إلغاء حجز',
        BOOKING_COMPLETED: 'اكتمال حجز',
        PAYMENT_RECEIVED: 'دفعة مستلمة',
        PAYMENT_SENT: 'دفعة مرسلة',
        WITHDRAWAL_REQUEST: 'طلب سحب',
        WITHDRAWAL_APPROVED: 'موافقة على السحب',
        WITHDRAWAL_REJECTED: 'رفض طلب السحب',
        NEW_MESSAGE: 'رسالة جديدة',
        NEW_GUIDE_REQUEST: 'طلب مرشد جديد',
        GUIDE_APPROVED: 'موافقة طلب مرشد',
        GUIDE_REJECTED: 'رفض طلب مرشد',
        UPGRADE_REQUEST: 'طلب ترقية',
        UPGRADE_APPROVED: 'موافقة ترقية',
        UPGRADE_REJECTED: 'رفض ترقية',
        SYSTEM: 'إشعار نظام',
        EMERGENCY_ALERT: 'تنبيه طارئ',
        PROMOTION: 'عرض ترويجي',
        REMINDER: 'تذكير',
        SUPPORT_MESSAGE: 'رسالة دعم',
        SUPPORT_RESPONSE: 'رد من الدعم'
      }
    },
    en: {
      title: 'Notifications',
      back: 'Back',
      unread: 'You have {count} unread notification',
      unread_plural: 'You have {count} unread notifications',
      markAll: 'Mark all as read',
      all: 'All',
      unreadFilter: 'Unread',
      read: 'Read',
      noNotifications: 'No notifications',
      noUnread: 'No unread notifications',
      loading: 'Loading...',
      markAsRead: 'Mark as read',
      delete: 'Delete',
      support: 'Support',
      emergency: 'Emergency',
      callEmergency: 'Call Emergency',
      opening: 'Opening...',
      sessionExpired: 'Session expired. Redirecting to login...',
      confirmDelete: 'Are you sure you want to delete this notification?',
      successMarkAll: 'All notifications marked as read',
      errorGeneric: 'An error occurred. Please try again.',
      loadingSession: 'Loading session...',
      notLoggedIn: 'Not Logged In',
      loginPrompt: 'Please login to view your notifications',
      login: 'Login',
      prev: 'Previous',
      next: 'Next',
      page: 'Page {current} of {total}',
      supportChat: 'Support Chat',
      newSupport: 'New Support Chat',
      emergencyHotline: '911',
      police: 'Police',
      ambulance: 'Ambulance',
      fire: 'Civil Defense',
      types: {
        BOOKING_CONFIRMED: 'Booking Confirmed',
        BOOKING_CANCELLED: 'Booking Cancelled',
        BOOKING_COMPLETED: 'Booking Completed',
        PAYMENT_RECEIVED: 'Payment Received',
        PAYMENT_SENT: 'Payment Sent',
        WITHDRAWAL_REQUEST: 'Withdrawal Request',
        WITHDRAWAL_APPROVED: 'Withdrawal Approved',
        WITHDRAWAL_REJECTED: 'Withdrawal Rejected',
        NEW_MESSAGE: 'New Message',
        NEW_GUIDE_REQUEST: 'New Guide Request',
        GUIDE_APPROVED: 'Guide Request Approved',
        GUIDE_REJECTED: 'Guide Request Rejected',
        UPGRADE_REQUEST: 'Upgrade Request',
        UPGRADE_APPROVED: 'Upgrade Approved',
        UPGRADE_REJECTED: 'Upgrade Rejected',
        SYSTEM: 'System Notification',
        EMERGENCY_ALERT: 'Emergency Alert',
        PROMOTION: 'Promotion',
        REMINDER: 'Reminder',
        SUPPORT_MESSAGE: 'Support Message',
        SUPPORT_RESPONSE: 'Support Response'
      }
    }
  };

  const t = texts[language];

  // أيقونات الإشعارات حسب النوع
  const getNotificationIcon = (type) => {
    const icons = {
      BOOKING_CONFIRMED: <FaRegCalendarAlt className="icon-teal" />,
      BOOKING_CANCELLED: <FaTimes className="icon-red" />,
      BOOKING_COMPLETED: <FaRegCheckCircle className="icon-teal" />,
      PAYMENT_RECEIVED: <FaMoneyBillWave className="icon-teal" />,
      PAYMENT_SENT: <FaCreditCard className="icon-cyan" />,
      WITHDRAWAL_REQUEST: <FaWallet className="icon-cyan" />,
      WITHDRAWAL_APPROVED: <FaCheck className="icon-teal" />,
      WITHDRAWAL_REJECTED: <FaExclamationTriangle className="icon-red" />,
      NEW_MESSAGE: <FaComments className="icon-cyan" />,
      NEW_GUIDE_REQUEST: <FaUsers className="icon-purple" />,
      GUIDE_APPROVED: <FaCheck className="icon-teal" />,
      GUIDE_REJECTED: <FaExclamationTriangle className="icon-red" />,
      UPGRADE_REQUEST: <FaUserPlus className="icon-purple" />,
      UPGRADE_APPROVED: <FaCheck className="icon-teal" />,
      UPGRADE_REJECTED: <FaExclamationTriangle className="icon-red" />,
      SYSTEM: <FaInfoCircle className="icon-gray" />,
      EMERGENCY_ALERT: <RiAlarmWarningFill className="icon-red emergency-icon-pulse" />,
      PROMOTION: <FaStar className="icon-yellow" />,
      REMINDER: <FaRegClock className="icon-cyan" />,
      SUPPORT_MESSAGE: <MdSupportAgent className="icon-teal" />,
      SUPPORT_RESPONSE: <FaHeadset className="icon-cyan" />
    };
    return icons[type] || <FaRegBell className="icon-gray" />;
  };

  // ✅ معالج النقر على الإشعار - المعدل لدعم المسؤول وفتح المحادثة الصحيحة
  const handleNotificationClick = (notification) => {
    // تحديد الإشعار كمقروء إذا لم يكن مقروءاً
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    console.log('🔍 Notification clicked:', { 
      id: notification.id, 
      type: notification.type, 
      title: notification.title,
      action_url: notification.action_url,
      data: notification.data
    });
    
    // ✅ معالجة إشعارات طلبات الترقية (للمسؤولين)
    if (notification.type === 'upgrade_request' || 
        notification.type === 'NEW_GUIDE_REQUEST' || 
        notification.type === 'UPGRADE_REQUEST') {
      console.log('📤 Opening upgrade requests page (admin-upgrade-requests)');
      setPage('admin-upgrade-requests');
      return;
    }
    
    // ✅ معالجة إشعارات استكمال بيانات الترقية
    if (notification.type === 'upgrade_incomplete') {
      console.log('📤 Opening upgrade status page');
      setPage('upgrade-status');
      return;
    }
    
    // ✅ معالجة إشعارات الموافقة على الترقية
    if (notification.type === 'upgrade_approved') {
      console.log('📤 Opening profile page after approval');
      setPage('profile');
      return;
    }
    
    // ✅ معالجة إشعارات رفض الترقية
    if (notification.type === 'upgrade_rejected') {
      console.log('📤 Opening upgrade status page');
      setPage('upgrade-status');
      return;
    }
    
    // ✅ معالجة إشعارات الدعم - فتح المحادثة الصحيحة للمسؤول أو المستخدم
    if (notification.type === 'support_message' || 
        notification.type === 'SUPPORT_MESSAGE' ||
        notification.type === 'support_reply' ||
        notification.type === 'SUPPORT_RESPONSE') {
      
      // محاولة استخراج ticketId من data
      let ticketId = null;
      try {
        const data = typeof notification.data === 'string' 
          ? JSON.parse(notification.data) 
          : notification.data;
        ticketId = data?.ticketId;
        console.log('📤 Extracted ticketId from notification:', ticketId);
      } catch (e) {
        console.error('Error parsing notification data:', e);
      }
      
      // محاولة استخراج ticketId من action_url
      if (!ticketId && notification.action_url) {
        const match = notification.action_url.match(/\d+/);
        if (match) ticketId = match[0];
      }
      
      // ✅ تحديد الصفحة المناسبة حسب دور المستخدم
      const isAdmin = user?.role === 'admin' || user?.role === 'support';
      
      if (ticketId) {
        console.log('📤 Opening support for ticket:', ticketId);
        // تخزين ticketId في localStorage لاستخدامه في صفحة الدعم
        localStorage.setItem('selectedTicketId', ticketId);
        
        if (isAdmin) {
          // ✅ للمسؤول - فتح صفحة الدعم الإدارية
          setPage('admin-support');
        } else {
          // للمستخدم العادي - فتح صفحة محادثة الدعم
          setPage('support-chat');
        }
      } else {
        console.log('📤 Opening support page');
        if (isAdmin) {
          setPage('admin-support');
        } else {
          setPage('support');
        }
      }
      return;
    }
    
    // معالجة إشعارات الطوارئ
    if (notification.type === 'EMERGENCY_ALERT') {
      openEmergency();
      return;
    }
    
    // معالجة الإشعارات الأخرى - استخدام action_url إذا موجود
    if (notification.action_url) {
      console.log('📤 Opening URL:', notification.action_url);
      if (notification.action_url.includes('/chat/')) {
        setPage('support');
      } else if (notification.action_url.includes('/admin-upgrade-requests')) {
        setPage('admin-upgrade-requests');
      } else if (notification.action_url.includes('/upgrade-status')) {
        setPage('upgrade-status');
      } else if (notification.action_url.includes('/profile')) {
        setPage('profile');
      } else {
        const pageName = notification.action_url.replace(/^\//, '');
        if (pageName && typeof setPage === 'function') {
          setPage(pageName);
        }
      }
    }
  };

  // تنظيف المؤقتات
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Keyboard Events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && setPage) {
        setPage('profile');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPage]);

  // تحميل البيانات الأولية
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      fetchNotifications();
      
      if (!supportCheckDone) {
        checkIfHasSupportChat();
        setSupportCheckDone(true);
      }
    }
  }, [user, isAuthenticated, authLoading, filter, pagination.page]);

  // التحقق من وجود محادثة دعم
  const checkIfHasSupportChat = async () => {
    try {
      const response = await api.getUserConversations();
      if (response.success && response.conversations) {
        const hasSupport = response.conversations.some(
          conv => conv.type === 'support'
        );
        setHasSupportChat(hasSupport);
      }
    } catch (error) {
      console.error('خطأ في التحقق من محادثة الدعم:', error);
    }
  };

  // فتح محادثة دعم
  const openSupportChat = async () => {
    try {
      setOpeningSupport(true);
      
      const conversationsResponse = await api.getUserConversations();
      let existingSupportChat = null;
      
      if (conversationsResponse.success && conversationsResponse.conversations) {
        existingSupportChat = conversationsResponse.conversations.find(
          conv => conv.type === 'support'
        );
      }
      
      if (existingSupportChat) {
        const chatId = existingSupportChat._id || existingSupportChat.id;
        localStorage.setItem('currentSupportChat', chatId);
        toast.success(language === 'ar' ? 'جاري فتح محادثة الدعم...' : 'Opening support chat...');
        
        if (setPage) {
          setPage('support');
        } else {
          window.location.href = '/support';
        }
        setOpeningSupport(false);
        return;
      }
      
      const response = await api.startSupportChat({
        subject: language === 'ar' ? 'استفسار من صفحة الإشعارات' : 'Inquiry from Notifications Page',
        manual: true
      });
      
      if (response.success && response.chat) {
        const chatId = response.chat._id || response.chat.id;
        localStorage.setItem('currentSupportChat', chatId);
        toast.success(language === 'ar' ? 'تم فتح محادثة مع الدعم الفني' : 'Support chat opened');
        
        if (setPage) {
          setPage('support');
        } else {
          window.location.href = '/support';
        }
      } else {
        toast.error(language === 'ar' ? 'فشل فتح محادثة الدعم' : 'Failed to open support chat');
      }
    } catch (error) {
      console.error('Error opening support chat:', error);
      toast.error(t.errorGeneric);
    } finally {
      setOpeningSupport(false);
    }
  };

  // فتح صفحة الطوارئ
  const openEmergency = () => {
    if (setPage) {
      setPage('emergency');
    } else {
      window.location.href = '/emergency';
    }
  };

  // جلب الإشعارات
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filter === 'unread') params.isRead = false;
      if (filter === 'read') params.isRead = true;
      
      const response = await api.getUserNotifications(params);
      
      if (response?.success) {
        const notificationsData = response.notifications || [];
        setNotifications(notificationsData);
        
        setPagination({
          page: response.pagination?.currentPage || 1,
          limit: response.pagination?.itemsPerPage || 20,
          total: response.pagination?.totalItems || 0,
          pages: response.pagination?.totalPages || 1
        });
        
        setStats({
          total: response.pagination?.totalItems || 0,
          unread: response.unreadCount || 0,
          read: (response.pagination?.totalItems || 0) - (response.unreadCount || 0)
        });
        
        setInitialLoadDone(true);
      } else {
        setNotifications([]);
        setStats({ total: 0, unread: 0, read: 0 });
        setInitialLoadDone(true);
      }
    } catch (err) {
      console.error('❌ Error fetching notifications:', err);
      
      if (err.response?.status === 401) {
        setError(t.sessionExpired);
        localStorage.removeItem('touristAppToken');
        localStorage.removeItem('touristAppUser');
        
        timeoutRef.current = setTimeout(() => {
          if (setPage) setPage('login');
          else window.location.href = '/login';
        }, 3000);
      } else {
        setError(t.errorGeneric);
        setInitialLoadDone(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // تحديث إشعار كمقروء
  const markAsRead = async (notificationId) => {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      
      if (response?.success) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        ));
        
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
          read: prev.read + 1
        }));
      }
    } catch (err) {
      console.error('❌ Error marking as read:', err);
      toast.error(t.errorGeneric);
    }
  };

  // تحديث الكل كمقروء
  const markAllAsRead = async () => {
    try {
      const response = await api.markAllNotificationsAsRead();
      
      if (response?.success) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        setStats(prev => ({ total: prev.total, unread: 0, read: prev.total }));
        toast.success(t.successMarkAll);
      }
    } catch (err) {
      console.error('❌ Error marking all as read:', err);
      toast.error(t.errorGeneric);
    }
  };

  // حذف إشعار
  const deleteNotification = async (notificationId) => {
    if (!window.confirm(t.confirmDelete)) return;
    
    try {
      const notification = notifications.find(n => n.id === notificationId);
      const wasUnread = notification && !notification.is_read;
      
      const response = await api.deleteNotification(notificationId);
      
      if (response?.success) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
        setStats(prev => ({
          total: prev.total - 1,
          unread: wasUnread ? prev.unread - 1 : prev.unread,
          read: wasUnread ? prev.read : prev.read - 1
        }));
        toast.success(language === 'ar' ? 'تم حذف الإشعار' : 'Notification deleted');
      }
    } catch (err) {
      console.error('❌ Error deleting notification:', err);
      toast.error(t.errorGeneric);
    }
  };

  // تغيير الصفحة
  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // تنسيق الوقت
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (language === 'ar') {
      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays < 2) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      return date.toLocaleDateString('ar-SA');
    } else {
      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 2) return 'yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString('en-US');
    }
  };

  // حالات التحميل
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900">
        <FaSpinner className="animate-spin text-teal-400 text-2xl" />
        <p className="text-white/70 mt-4">{t.loadingSession}</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900">
        <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md">
          <FaUser className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{t.notLoggedIn}</h2>
          <p className="text-gray-300 mb-6">{t.loginPrompt}</p>
          <button
            onClick={() => setPage('profile')}
            className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition"
          >
            {t.login}
          </button>
        </div>
      </div>
    );
  }

  // الواجهة الرئيسية
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage('profile')}
                className="p-2 hover:bg-white/20 rounded-xl transition"
              >
                <FaChevronRight size={20} className="text-white" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                  <FaBell className="w-5 h-5 text-white" />
                </div>
                {stats.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white">
                    {stats.unread > 9 ? '9+' : stats.unread}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-base font-bold text-white">
                  {t.title}
                </h1>
                <p className="text-xs text-white/80">
                  {stats.unread > 0 
                    ? (stats.unread === 1 ? t.unread.replace('{count}', stats.unread) : t.unread_plural.replace('{count}', stats.unread))
                    : t.noUnread}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.unread > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition flex items-center gap-2"
                >
                  <FaCheckDouble size={14} />
                  <span>{t.markAll}</span>
                </button>
              )}
              
              {/* زر طلبات الترقية للمشرفين */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => setPage('admin-upgrade-requests')}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white text-sm transition flex items-center gap-2"
                >
                  <FaUserPlus size={14} />
                  <span>{language === 'ar' ? 'طلبات الترقية' : 'Upgrade Requests'}</span>
                </button>
              )}
              
              <button
                onClick={openEmergency}
                className="px-3 py-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg text-white text-sm transition flex items-center gap-2"
              >
                <RiAlarmWarningFill size={14} />
                <span>{t.emergency}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* زر الدعم الفني */}
      <div className="px-4 py-3 bg-white/5 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-white/70 text-sm">
              {language === 'ar' ? 'تحتاج مساعدة؟' : 'Need help?'}
            </p>
            <p className="text-white/50 text-xs">
              {language === 'ar' 
                ? 'تواصل مع فريق الدعم الفني'
                : 'Contact support team'}
            </p>
          </div>
          <button
            onClick={openSupportChat}
            disabled={openingSupport}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {openingSupport ? (
              <FaSpinner className="animate-spin" size={16} />
            ) : (
              <FaHeadset size={16} />
            )}
            <span>{openingSupport ? t.opening : t.support}</span>
          </button>
        </div>
      </div>

      {/* التصفية */}
      <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex-shrink-0">
        <div className="flex gap-2">
          {[
            { key: 'all', label: t.all, count: stats.total },
            { key: 'unread', label: t.unreadFilter, count: stats.unread },
            { key: 'read', label: t.read, count: stats.read }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-1.5 rounded-full text-sm transition ${
                filter === key
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* منطقة الإشعارات - مع التمرير */}
      <div 
        ref={notificationsContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <FaSpinner className="animate-spin text-teal-400 text-2xl" />
          </div>
        ) : error ? (
          <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-4 text-center text-red-200">
            <p>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <FaBell className="w-16 h-16 text-white/30 mx-auto mb-3" />
            <p className="text-white/70">
              {filter === 'unread' ? t.noUnread : t.noNotifications}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {notifications
                .filter(n => {
                  if (filter === 'unread') return !n.is_read;
                  if (filter === 'read') return n.is_read;
                  return true;
                })
                .map(notification => {
                  const typeLabel = t.types[notification.type] || notification.type;
                  const isUnread = !notification.is_read;
                  const isEmergency = notification.type === 'EMERGENCY_ALERT';
                  
                  return (
                    <div
                      key={notification.id}
                      className={`bg-white/10 backdrop-blur-sm rounded-xl p-3 transition-all cursor-pointer hover:bg-white/20 border ${
                        isUnread ? 'border-teal-400/50' : 'border-white/10'
                      } ${isEmergency ? 'border-red-500/50' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isEmergency ? 'bg-red-500/20' : 'bg-teal-500/20'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`font-semibold text-sm ${isUnread ? 'text-teal-300' : 'text-white'}`}>
                              {notification.title}
                              {isEmergency && <span className="ml-1 text-red-400">🚨</span>}
                            </h3>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-gray-300 text-sm mt-1">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {typeLabel}
                            </span>
                            <div className="flex items-center gap-2">
                              {isUnread && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="px-2 py-1 text-xs bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-lg transition"
                                >
                                  {t.markAsRead}
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition"
                              >
                                {t.delete}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition disabled:opacity-50"
                >
                  <FaChevronRight /> {t.prev}
                </button>
                
                <span className="text-white/70 text-sm">
                  {t.page.replace('{current}', pagination.page).replace('{total}', pagination.pages)}
                </span>
                
                <button
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1.5 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition disabled:opacity-50"
                >
                  {t.next} <FaChevronLeft />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .emergency-icon-pulse {
          animation: soft-pulse 1s infinite;
        }
        
        @keyframes soft-pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        /* ألوان الأيقونات */
        .icon-teal { color: #14b89a; }
        .icon-cyan { color: #06b6d4; }
        .icon-red { color: #ef4444; }
        .icon-orange { color: #f97316; }
        .icon-blue { color: #3b82f6; }
        .icon-purple { color: #8b5cf6; }
        .icon-yellow { color: #fbbf24; }
        .icon-gray { color: #9ca3af; }
        
        .dark .icon-teal { color: #2dd4bf; }
        .dark .icon-cyan { color: #22d3ee; }
        .dark .icon-purple { color: #a78bfa; }
        .dark .icon-yellow { color: #fcd34d; }
        .dark .icon-gray { color: #d1d5db; }
        .dark .icon-red { color: #f87171; }
        .dark .icon-orange { color: #fb923c; }
        .dark .icon-blue { color: #60a5fa; }
        
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(20, 184, 166, 0.5); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(20, 184, 166, 0.8); }
      `}</style>
    </div>
  );
};

export default NotificationsPage;

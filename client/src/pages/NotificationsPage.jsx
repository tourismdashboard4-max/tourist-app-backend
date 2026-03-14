// client/src/pages/NotificationsPage.jsx (النسخة النهائية مع تحسين معالجة الأخطاء)
import React, { useState, useEffect } from 'react';
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
  FaFilter,
  FaUser,
  FaHeadset,
  FaArrowRight
} from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const NotificationsPage = ({ setPage }) => {
  const { theme, darkMode } = useTheme();
  const { language } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0 });
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [openingSupport, setOpeningSupport] = useState(false);
  const [hasSupportChat, setHasSupportChat] = useState(false);
  const [supportCheckDone, setSupportCheckDone] = useState(false);

  // ============================================
  // 1️⃣ تحميل الإشعارات عند فتح الصفحة
  // ============================================
  useEffect(() => {
    console.log('🔍 NotificationsPage - Auth State:', { 
      isAuthenticated, 
      user: user ? { id: user.id, email: user.email, name: user.fullName || user.name } : null,
      authLoading 
    });

    if (!authLoading) {
      if (isAuthenticated && user) {
        console.log('✅ المستخدم مسجل:', user.email, 'ID:', user.id);
        fetchNotifications();
        fetchStats();
        
        // التحقق من وجود محادثة دعم مرة واحدة فقط
        if (!supportCheckDone) {
          checkIfHasSupportChat();
          setSupportCheckDone(true);
        }
      } else {
        console.log('⏳ لا يوجد مستخدم مسجل - انتظار...');
        setTimeout(() => {
          setLoading(false);
          setInitialLoadDone(true);
        }, 3000);
      }
    }
  }, [user, isAuthenticated, authLoading]);

  // ============================================
  // 2️⃣ التحقق من وجود محادثة دعم (بدون إنشاء)
  // ============================================
  const checkIfHasSupportChat = async () => {
    try {
      console.log('🔍 التحقق من وجود محادثة دعم...');
      const response = await api.getUserConversations();
      
      if (response.success && response.conversations) {
        const hasSupport = response.conversations.some(
          conv => conv.type === 'support' || 
                 conv.participant?.email === 'y7g5mggnbr@privaterelay.appleid.com'
        );
        setHasSupportChat(hasSupport);
        console.log('✅ هل توجد محادثة دعم؟', hasSupport ? 'نعم' : 'لا');
      }
    } catch (error) {
      console.error('❌ خطأ في التحقق من محادثة الدعم:', error);
    }
  };

  // ============================================
  // 3️⃣ فتح محادثة دعم جديدة (فقط عند الضغط على الزر)
  // ============================================
  const openSupportChat = async () => {
    try {
      setOpeningSupport(true);
      console.log('🔄 فتح محادثة دعم جديدة...');
      
      const response = await api.startSupportChat({
        subject: 'استفسار من صفحة الإشعارات',
        manual: true
      });
      
      if (response.success) {
        console.log('✅ تم إنشاء المحادثة بنجاح:', response.chat);
        
        const chatId = response.chat?._id || response.chat?.id;
        if (chatId) {
          localStorage.setItem('currentSupportChat', chatId);
          console.log('💾 تم حفظ معرف المحادثة:', chatId);
        }
        
        toast.success('تم فتح محادثة مع الدعم الفني');
        
        if (setPage) {
          setPage('support-chat');
        } else {
          window.location.href = '/support-chat';
        }
      } else {
        throw new Error(response.message || 'فشل فتح المحادثة');
      }
    } catch (error) {
      console.error('❌ خطأ في فتح محادثة الدعم:', error);
      toast.error('فشل الاتصال بالدعم. يرجى المحاولة مرة أخرى.');
    } finally {
      setOpeningSupport(false);
    }
  };

  // ============================================
  // 4️⃣ جلب الإشعارات (مع تحسين معالجة الأخطاء)
  // ============================================
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {};
      if (filter === 'unread') params.isRead = false;
      if (filter === 'read') params.isRead = true;
      
      console.log('📤 جلب الإشعارات للمستخدم:', user?.id);
      
      const response = await api.getUserNotifications(params);
      console.log('📥 Response from API:', response);
      
      if (response && response.success) {
        let notificationsData = [];
        
        if (response.data?.notifications) {
          notificationsData = response.data.notifications;
        } else if (response.notifications) {
          notificationsData = response.notifications;
        } else if (Array.isArray(response)) {
          notificationsData = response;
        }
        
        console.log(`✅ تم العثور على ${notificationsData.length} إشعار`);
        setNotifications(notificationsData);
        
        const unread = notificationsData.filter(n => !n.isRead && !n.read).length;
        setStats({
          total: notificationsData.length,
          unread: unread,
          read: notificationsData.length - unread
        });
        
        setInitialLoadDone(true);
      } else {
        console.log('⚠️ No notifications found');
        setNotifications([]);
        setStats({ total: 0, unread: 0, read: 0 });
        setInitialLoadDone(true);
      }
    } catch (err) {
      console.error('❌ خطأ في جلب الإشعارات:', err);
      
      // ✅ معالجة خطأ 401 (انتهاء الجلسة)
      if (err.message?.includes('401') || err.response?.status === 401) {
        setError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى');
        
        // تنظيف التخزين المحلي
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // توجيه المستخدم إلى صفحة تسجيل الدخول بعد 3 ثوان
        setTimeout(() => {
          if (setPage) {
            setPage('login');
          } else {
            window.location.href = '/login';
          }
        }, 3000);
      } else {
        setError('حدث خطأ في تحميل الإشعارات');
      }
      setInitialLoadDone(true);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 5️⃣ جلب إحصائيات الإشعارات
  // ============================================
  const fetchStats = async () => {
    try {
      const response = await api.getNotificationStats();
      console.log('📊 Stats response:', response);
      if (response && response.success) {
        setStats(response.data || { total: 0, unread: 0, read: 0 });
      }
    } catch (err) {
      console.error('❌ خطأ في الإحصائيات:', err);
      
      // معالجة خطأ 401 في الإحصائيات
      if (err.message?.includes('401') || err.response?.status === 401) {
        console.log('⚠️ Token expired in stats - will redirect');
        // لا نحتاج لمعالجة إضافية لأن fetchNotifications ستقوم بالتوجيه
      }
    }
  };

  // ============================================
  // 6️⃣ تحديث إشعار كمقروء
  // ============================================
  const markAsRead = async (id) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, isRead: true, read: true } : n
      ));
      setStats(prev => ({
        total: prev.total,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1
      }));
    } catch (err) {
      console.error('❌ خطأ في تحديث الإشعار:', err);
      
      if (err.message?.includes('401') || err.response?.status === 401) {
        setError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى');
        
        setTimeout(() => {
          if (setPage) {
            setPage('login');
          } else {
            window.location.href = '/login';
          }
        }, 3000);
      } else {
        toast.error('فشل تحديث الإشعار');
      }
    }
  };

  // ============================================
  // 7️⃣ تحديث الكل كمقروء
  // ============================================
  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true, read: true })));
      setStats(prev => ({ total: prev.total, unread: 0, read: prev.total }));
      toast.success('تم تحديث جميع الإشعارات كمقروءة');
    } catch (err) {
      console.error('❌ خطأ في تحديث الكل:', err);
      
      if (err.message?.includes('401') || err.response?.status === 401) {
        setError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى');
        
        setTimeout(() => {
          if (setPage) {
            setPage('login');
          } else {
            window.location.href = '/login';
          }
        }, 3000);
      } else {
        toast.error('فشل تحديث الإشعارات');
      }
    }
  };

  // ============================================
  // 8️⃣ حذف إشعار
  // ============================================
  const deleteNotification = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return;
    
    try {
      await api.deleteNotification(id);
      const wasUnread = notifications.find(n => n._id === id)?.isRead === false;
      setNotifications(notifications.filter(n => n._id !== id));
      setStats(prev => ({
        total: prev.total - 1,
        unread: wasUnread ? prev.unread - 1 : prev.unread,
        read: wasUnread ? prev.read : prev.read - 1
      }));
      toast.success('تم حذف الإشعار');
    } catch (err) {
      console.error('❌ خطأ في حذف الإشعار:', err);
      
      if (err.message?.includes('401') || err.response?.status === 401) {
        setError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى');
        
        setTimeout(() => {
          if (setPage) {
            setPage('login');
          } else {
            window.location.href = '/login';
          }
        }, 3000);
      } else {
        toast.error('فشل حذف الإشعار');
      }
    }
  };

  // ============================================
  // 9️⃣ دوال مساعدة
  // ============================================
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'booking': return <FaCalendarCheck style={{ color: theme.primary }} />;
      case 'payment': return <FaWallet style={{ color: theme.primary }} />;
      case 'message': return <FaComments style={{ color: '#9333ea' }} />;
      case 'review': return <FaStar style={{ color: '#eab308' }} />;
      case 'support': return <FaInfoCircle style={{ color: '#3b82f6' }} />;
      default: return <FaInfoCircle style={{ color: theme.textSecondary }} />;
    }
  };

  const getNotificationTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const notifDate = new Date(timestamp);
    const diffMinutes = Math.floor((now - notifDate) / (1000 * 60));
    
    if (language === 'ar') {
      if (diffMinutes < 1) return 'الآن';
      if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
      if (diffMinutes < 1440) return `منذ ${Math.floor(diffMinutes / 60)} ساعة`;
      if (diffMinutes < 2880) return 'أمس';
      return notifDate.toLocaleDateString('ar-SA');
    } else {
      if (diffMinutes < 1) return 'now';
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
      if (diffMinutes < 2880) return 'yesterday';
      return notifDate.toLocaleDateString('en-US');
    }
  };

  const texts = {
    ar: {
      title: 'الإشعارات',
      back: 'رجوع',
      unread: 'لديك {count} إشعار غير مقروء',
      markAll: 'تحديد الكل مقروء',
      all: 'الكل',
      unreadFilter: 'غير مقروء',
      read: 'مقروء',
      noNotifications: 'لا توجد إشعارات',
      noUnread: 'لا توجد إشعارات غير مقروءة',
      loading: 'جاري التحميل...',
      markAsRead: 'تحديد كمقروء',
      delete: 'حذف',
      userInfo: 'مرحباً {name}',
      noUser: 'الرجاء تسجيل الدخول',
      support: 'الدعم الفني',
      opening: 'جاري الفتح...',
      supportDesc: 'تواصل مع فريق الدعم',
      active: 'نشط'
    },
    en: {
      title: 'Notifications',
      back: 'Back',
      unread: 'You have {count} unread notifications',
      markAll: 'Mark all as read',
      all: 'All',
      unreadFilter: 'Unread',
      read: 'Read',
      noNotifications: 'No notifications',
      noUnread: 'No unread notifications',
      loading: 'Loading...',
      markAsRead: 'Mark as read',
      delete: 'Delete',
      userInfo: 'Welcome {name}',
      noUser: 'Please login',
      support: 'Support',
      opening: 'Opening...',
      supportDesc: 'Contact support team',
      active: 'Active'
    }
  };

  const t = texts[language];

  // ============================================
  // 🔟 حالات التحميل
  // ============================================
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <FaSpinner size={48} color={theme.primary} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: theme.textSecondary }}>
          {language === 'ar' ? 'جاري تحميل بيانات الجلسة...' : 'Loading session...'}
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px'
      }}>
        <div style={{
          background: theme.card,
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px',
          boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <FaUser size={64} color={theme.textSecondary} style={{ marginBottom: '20px' }} />
          <h2 style={{ color: theme.text, marginBottom: '10px' }}>
            {language === 'ar' ? 'لم تقم بتسجيل الدخول' : 'Not Logged In'}
          </h2>
          <p style={{ color: theme.textSecondary, marginBottom: '30px' }}>
            {language === 'ar' 
              ? 'الرجاء تسجيل الدخول لعرض الإشعارات الخاصة بك' 
              : 'Please login to view your notifications'}
          </p>
          <button
            onClick={() => setPage('profile')}
            style={{
              background: theme.primary,
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  if (!initialLoadDone && loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <FaSpinner size={48} color={theme.primary} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: theme.textSecondary }}>{t.loading}</p>
      </div>
    );
  }

  // ============================================
  // 1️⃣1️⃣ واجهة المستخدم
  // ============================================
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.background,
      color: theme.text,
      padding: '20px',
      direction: language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* رسالة الخطأ */}
        {error && (
          <div style={{
            background: darkMode ? '#742a2a' : '#f8d7da',
            color: darkMode ? '#fbbf24' : '#721c24',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p>{error}</p>
            {error.includes('انتهت الجلسة') && (
              <button
                onClick={() => setPage('login')}
                style={{
                  background: darkMode ? '#fbbf24' : '#721c24',
                  color: darkMode ? '#000' : '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '5px',
                  marginTop: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        )}

        {/* ✅ الهيدر مع زر الرجوع وزر الدعم */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
          borderRadius: '20px',
          padding: '20px',
          color: 'white',
          marginBottom: '20px'
        }}>
          {/* الصف العلوي - الرجوع والدعم */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            {/* زر الرجوع */}
            <button
              onClick={() => setPage('profile')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 15px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '14px'
              }}
            >
              <FaArrowLeft /> {t.back}
            </button>

            {/* ✅ زر الدعم */}
            <button
              onClick={openSupportChat}
              disabled={openingSupport}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '30px',
                padding: '10px 20px',
                color: 'white',
                cursor: openingSupport ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                opacity: openingSupport ? 0.7 : 1
              }}
            >
              {openingSupport ? (
                <FaSpinner className="fa-spin" />
              ) : (
                <FaHeadset />
              )}
              <span>{openingSupport ? t.opening : t.support}</span>
              {hasSupportChat && !openingSupport && (
                <span style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#4CAF50',
                  borderRadius: '50%',
                  display: 'inline-block',
                  marginLeft: '5px'
                }} />
              )}
            </button>
          </div>

          {/* معلومات المستخدم */}
          <div style={{ marginBottom: '15px' }}>
            <h1 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>{t.title}</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaUser size={12} />
              {user.fullName || user.name || user.email}
            </p>
          </div>
          
          {/* إحصائيات الإشعارات */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                {stats.unread > 0 ? t.unread.replace('{count}', stats.unread) : 'لا توجد إشعارات غير مقروءة'}
              </p>
            </div>
            
            {stats.unread > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px'
                }}
              >
                <FaCheckDouble /> {t.markAll}
              </button>
            )}
          </div>
        </div>

        {/* التصفية */}
        <div style={{
          background: theme.card,
          borderRadius: '16px',
          padding: '15px',
          marginBottom: '20px',
          border: darkMode ? '1px solid #374151' : 'none',
          boxShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '8px 16px',
                borderRadius: '30px',
                border: 'none',
                background: filter === 'all' ? theme.primary : theme.border,
                color: filter === 'all' ? 'white' : theme.textSecondary,
                cursor: 'pointer',
                fontWeight: filter === 'all' ? 'bold' : 'normal'
              }}
            >
              {t.all} ({stats.total})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                padding: '8px 16px',
                borderRadius: '30px',
                border: 'none',
                background: filter === 'unread' ? theme.primary : theme.border,
                color: filter === 'unread' ? 'white' : theme.textSecondary,
                cursor: 'pointer',
                fontWeight: filter === 'unread' ? 'bold' : 'normal'
              }}
            >
              {t.unreadFilter} ({stats.unread})
            </button>
            <button
              onClick={() => setFilter('read')}
              style={{
                padding: '8px 16px',
                borderRadius: '30px',
                border: 'none',
                background: filter === 'read' ? theme.primary : theme.border,
                color: filter === 'read' ? 'white' : theme.textSecondary,
                cursor: 'pointer',
                fontWeight: filter === 'read' ? 'bold' : 'normal'
              }}
            >
              {t.read} ({stats.read})
            </button>
          </div>
        </div>

        {/* قائمة الإشعارات */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <FaSpinner size={48} color={theme.primary} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{
            background: theme.card,
            borderRadius: '20px',
            padding: '60px 20px',
            textAlign: 'center',
            border: darkMode ? '1px solid #374151' : 'none'
          }}>
            <FaBell size={48} color={theme.textSecondary} />
            <h3 style={{ color: theme.text, marginTop: '20px' }}>
              {filter === 'unread' ? t.noUnread : t.noNotifications}
            </h3>
          </div>
        ) : (
          <div style={{
            maxHeight: 'calc(100vh - 280px)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '5px'
          }}>
            {notifications
              .filter(n => {
                if (filter === 'unread') return !n.isRead && !n.read;
                if (filter === 'read') return n.isRead || n.read;
                return true;
              })
              .map(notif => (
                <div
                  key={notif._id}
                  style={{
                    background: theme.card,
                    borderRadius: '16px',
                    padding: '20px',
                    borderRight: (notif.isRead === false || notif.read === false) ? `4px solid ${theme.primary}` : 'none',
                    border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                    position: 'relative',
                    display: 'flex',
                    gap: '15px',
                    transition: 'transform 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (!notif.isRead && !notif.read) {
                      markAsRead(notif._id);
                    }
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: theme.border,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: '16px',
                        color: (notif.isRead === false || notif.read === false) ? theme.primary : theme.text,
                        fontWeight: (notif.isRead === false || notif.read === false) ? 'bold' : 'normal'
                      }}>
                        {notif.title?.[language] || notif.title}
                      </h3>
                      <span style={{ 
                        fontSize: '12px', 
                        color: theme.textSecondary,
                        background: theme.border,
                        padding: '3px 8px',
                        borderRadius: '20px'
                      }}>
                        {getNotificationTime(notif.createdAt)}
                      </span>
                    </div>
                    
                    <p style={{ 
                      margin: '0 0 15px 0', 
                      color: theme.textSecondary,
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}>
                      {notif.message?.[language] || notif.message}
                    </p>

                    <div style={{ 
                      display: 'flex', 
                      gap: '15px',
                      borderTop: `1px solid ${theme.border}`,
                      paddingTop: '12px'
                    }}>
                      {(notif.isRead === false || notif.read === false) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif._id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: theme.primary,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '13px'
                          }}
                        >
                          <FaEye /> {t.markAsRead}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif._id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '13px'
                        }}
                      >
                        <FaTrash /> {t.delete}
                      </button>
                    </div>
                  </div>

                  {(notif.isRead === false || notif.read === false) && (
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      [language === 'ar' ? 'left' : 'right']: '20px',
                      width: '8px',
                      height: '8px',
                      background: theme.primary,
                      borderRadius: '50%'
                    }} />
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

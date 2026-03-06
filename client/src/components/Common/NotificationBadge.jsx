import React, { useState, useEffect, useRef } from 'react';
import { 
  FaBell, 
  FaCheckCircle, 
  FaClock, 
  FaCalendarCheck, 
  FaComments,
  FaWallet,
  FaStar,
  FaInfoCircle,
  FaTimes,
  FaCheckDouble,
  FaEllipsisH,
  FaUser,
  FaUserCheck,
  FaUserTimes,
  FaExclamationTriangle,
  FaGift,
  FaCreditCard
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import socketService from '../../services/socketService';
import toast from 'react-hot-toast';

const NotificationBadge = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
      setupSocket();
      
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setShowDropdown(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        socketService.off('new-notification');
      };
    }
  }, [user]);

  const setupSocket = () => {
    socketService.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast for new notification
      toast.custom((t) => (
        <motion.div
          initial={{ opacity: 0, y: -50, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -50, x: 20 }}
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 border-r-4 border-green-600 cursor-pointer max-w-sm"
          onClick={() => {
            toast.dismiss(t.id);
            handleNotificationClick(notification);
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xl">
              {getNotificationIcon(notification.type, true)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800 dark:text-white text-sm mb-1">
                {notification.title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {getNotificationTime(notification.createdAt)}
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes size={14} />
            </button>
          </div>
        </motion.div>
      ), {
        duration: 5000,
        position: 'top-right',
      });

      // Play sound for new notification (optional)
      // playNotificationSound();
    });

    socketService.on('notification-read', ({ notificationId }) => {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    socketService.on('all-notifications-read', () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    });
  };

  const loadNotifications = async (reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const response = await api.get(`/notifications?page=${currentPage}&limit=20&filter=${filter}`);
      
      if (response.data.success) {
        if (reset) {
          setNotifications(response.data.data);
          setPage(2);
        } else {
          setNotifications(prev => [...prev, ...response.data.data]);
          setPage(prev => prev + 1);
        }
        setHasMore(response.data.hasMore);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('فشل تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadNotifications();
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      toast.success('تم تحديد الكل كمقروء');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (!notifications.find(n => n.id === notificationId)?.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('تم حذف الإشعار');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('فشل حذف الإشعار');
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setShowDropdown(false);

    // Navigate based on notification type
    switch (notification.type) {
      case 'booking':
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_completed':
        navigate(`/bookings/${notification.data?.bookingId}`);
        break;
      case 'message':
        navigate(`/chat/${notification.data?.userId}`);
        break;
      case 'payment':
      case 'wallet_credited':
      case 'withdraw_request':
      case 'withdraw_approved':
      case 'withdraw_rejected':
        navigate('/wallet');
        break;
      case 'review':
        navigate(`/guide/${notification.data?.guideId}`);
        break;
      case 'guide_approved':
      case 'guide_rejected':
        navigate('/guide/dashboard');
        break;
      case 'promotion':
      case 'offer':
        navigate('/programs');
        break;
      case 'system':
      case 'warning':
      case 'suspension':
        navigate('/profile');
        break;
      default:
        if (notification.link) {
          navigate(notification.link);
        }
    }
  };

  const getNotificationIcon = (type, isLarge = false) => {
    const size = isLarge ? 20 : 16;
    const colorClass = isLarge ? '' : 'text-';
    
    switch (type) {
      case 'booking':
      case 'booking_confirmed':
        return <FaCalendarCheck className="text-green-600" size={size} />;
      case 'booking_cancelled':
        return <FaTimes className="text-red-600" size={size} />;
      case 'booking_completed':
        return <FaCheckCircle className="text-blue-600" size={size} />;
      case 'message':
        return <FaComments className="text-purple-600" size={size} />;
      case 'payment':
      case 'wallet_credited':
        return <FaWallet className="text-green-600" size={size} />;
      case 'withdraw_request':
        return <FaClock className="text-orange-600" size={size} />;
      case 'withdraw_approved':
        return <FaCheckCircle className="text-green-600" size={size} />;
      case 'withdraw_rejected':
        return <FaTimes className="text-red-600" size={size} />;
      case 'review':
        return <FaStar className="text-yellow-600" size={size} />;
      case 'guide_approved':
        return <FaUserCheck className="text-green-600" size={size} />;
      case 'guide_rejected':
        return <FaUserTimes className="text-red-600" size={size} />;
      case 'promotion':
      case 'offer':
        return <FaGift className="text-pink-600" size={size} />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-600" size={size} />;
      case 'suspension':
        return <FaUserTimes className="text-red-600" size={size} />;
      default:
        return <FaInfoCircle className="text-gray-600" size={size} />;
    }
  };

  const getNotificationTime = (timestamp) => {
    const now = new Date();
    const notifDate = new Date(timestamp);
    const diffMinutes = Math.floor((now - notifDate) / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return notifDate.toLocaleDateString('ar-SA');
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
    loadNotifications(true);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all hover:scale-105"
        aria-label="Notifications"
      >
        <FaBell className="text-xl text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center border-2 border-white dark:border-gray-800 font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
            style={{ maxHeight: 'calc(100vh - 100px)' }}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FaBell size={18} />
                  <h3 className="font-bold">الإشعارات</h3>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition flex items-center gap-1"
                  >
                    <FaCheckDouble size={12} />
                    <span>تحديد الكل مقروء</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              {['all', 'unread', 'read'].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => handleFilterChange(filterType)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filter === filterType
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {filterType === 'all' && 'الكل'}
                  {filterType === 'unread' && 'غير مقروء'}
                  {filterType === 'read' && 'مقروء'}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div 
              className="overflow-y-auto" 
              style={{ maxHeight: '400px' }}
              onScroll={(e) => {
                const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
                if (bottom && hasMore && !loading) {
                  loadMore();
                }
              }}
            >
              {loading && filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-200 border-t-green-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">جاري التحميل...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <FaBell className="text-4xl text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد إشعارات</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {filter === 'unread' ? 'ليس لديك إشعارات غير مقروءة' : 'ستظهر الإشعارات هنا'}
                  </p>
                </div>
              ) : (
                <>
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all relative group ${
                        !notification.read ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        {/* Icon with gradient background */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                          !notification.read ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <div className={!notification.read ? 'text-white' : ''}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className={`font-semibold text-sm truncate ${
                              !notification.read 
                                ? 'text-green-700 dark:text-green-400' 
                                : 'text-gray-800 dark:text-gray-200'
                            }`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              {getNotificationTime(notification.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {/* Metadata Tags */}
                          {notification.data && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {notification.data.amount && (
                                <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
                                  <FaWallet size={10} />
                                  {notification.data.amount} ريال
                                </span>
                              )}
                              {notification.data.status && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  notification.data.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  notification.data.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  notification.data.status === 'confirmed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {notification.data.status === 'completed' && 'مكتمل'}
                                  {notification.data.status === 'pending' && 'معلق'}
                                  {notification.data.status === 'confirmed' && 'مؤكد'}
                                  {notification.data.status === 'cancelled' && 'ملغي'}
                                </span>
                              )}
                              {notification.data.bookingId && (
                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full text-xs">
                                  حجز #{notification.data.bookingId}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition"
                              title="تحديد كمقروء"
                            >
                              <FaCheckDouble size={12} className="text-gray-500" />
                            </button>
                          )}
                          <button
                            onClick={(e) => deleteNotification(notification.id, e)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition"
                            title="حذف"
                          >
                            <FaTimes size={12} className="text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Unread Indicator Bar */}
                      {!notification.read && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-10 bg-green-600 rounded-full"></div>
                      )}
                    </motion.div>
                  ))}

                  {/* Loading More Indicator */}
                  {loading && (
                    <div className="p-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent"></div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 text-center sticky bottom-0">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/notifications');
                  }}
                  className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 font-medium hover:underline transition flex items-center justify-center gap-1 w-full"
                >
                  <span>عرض كل الإشعارات</span>
                  <span>←</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBadge;
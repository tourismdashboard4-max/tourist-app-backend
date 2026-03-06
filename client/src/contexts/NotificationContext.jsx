import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { socket, on, off } = useSocket();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    email: true,
    push: true,
    sms: false,
    booking: true,
    payment: true,
    message: true,
    promotion: false
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      loadNotifications();
      loadPreferences();
      setupSocketListeners();
    }

    return () => {
      off('new-notification');
    };
  }, [isAuthenticated, user]);

  const setupSocketListeners = () => {
    on('new-notification', handleNewNotification);
    on('notification-read', handleNotificationRead);
  };

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // إظهار إشعار toast حسب النوع
    showNotificationToast(notification);
  };

  const handleNotificationRead = ({ notificationId }) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const showNotificationToast = (notification) => {
    const toastTypes = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };

    const type = notification.type === 'error' ? 'error' : 'success';

    toast[type](notification.message, {
      duration: 5000,
      position: 'top-right',
      icon: getNotificationIcon(notification.type),
    });
  };

  const getNotificationIcon = (type) => {
    const icons = {
      booking: '📅',
      payment: '💰',
      message: '💬',
      warning: '⚠️',
      success: '✅',
      error: '❌'
    };
    return icons[type] || '🔔';
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.data.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await api.get('/notifications/preferences');
      if (response.data.success) {
        setPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
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

  const deleteNotification = async (notificationId) => {
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

  const clearAll = async () => {
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
      setUnreadCount(0);
      toast.success('تم مسح جميع الإشعارات');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('فشل مسح الإشعارات');
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      const response = await api.put('/notifications/preferences', newPreferences);
      if (response.data.success) {
        setPreferences(newPreferences);
        toast.success('تم تحديث الإعدادات');
        return { success: true };
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('فشل تحديث الإعدادات');
      return { success: false };
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    preferences,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updatePreferences
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
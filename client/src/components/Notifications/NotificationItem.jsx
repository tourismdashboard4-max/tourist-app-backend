// client/src/components/Notifications/NotificationItem.jsx
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import './NotificationItem.css';

const NotificationItem = ({ notification, onMarkAsRead, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const getIconByType = (type) => {
    switch (type) {
      case 'booking':
        return '📅';
      case 'payment':
        return '💰';
      case 'chat':
        return '💬';
      case 'guide':
        return '👤';
      case 'wallet':
        return '💳';
      case 'promotion':
        return '🎉';
      case 'upgrade':
        return '⭐';
      case 'urgent':
      case 'high':
        return '🔴';
      default:
        return '📢';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'priority-urgent';
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      default:
        return 'priority-low';
    }
  };

  const handleMarkAsRead = (e) => {
    e.stopPropagation();
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
      setIsDeleting(true);
      await onDelete(notification._id);
      setIsDeleting(false);
    }
  };

  const handleNotificationClick = () => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const formatTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ar
      });
    } catch (error) {
      return 'منذ فترة';
    }
  };

  return (
    <div 
      className={`notification-item ${!notification.isRead ? 'unread' : ''} ${getPriorityClass(notification.priority)}`}
      onClick={handleNotificationClick}
      style={{ opacity: isDeleting ? 0.5 : 1 }}
    >
      <div className="notification-icon">
        {getIconByType(notification.type)}
      </div>
      
      <div className="notification-content">
        <div className="notification-header">
          <h4>{notification.title}</h4>
          {!notification.isRead && <span className="new-badge">جديد</span>}
        </div>
        <p className="notification-message">{notification.message}</p>
        <div className="notification-footer">
          <span className="notification-time">
            {formatTime(notification.createdAt)}
          </span>
          {notification.type && (
            <span className="notification-type">
              {notification.type === 'booking' && 'حجز'}
              {notification.type === 'payment' && 'دفع'}
              {notification.type === 'chat' && 'محادثة'}
              {notification.type === 'guide' && 'مرشد'}
              {notification.type === 'wallet' && 'محفظة'}
              {notification.type === 'system' && 'نظام'}
            </span>
          )}
        </div>
      </div>

      <div className="notification-actions">
        {!notification.isRead && (
          <button
            onClick={handleMarkAsRead}
            className="action-btn mark-read-btn"
            title="تحديد كمقروء"
            disabled={isDeleting}
          >
            ✓
          </button>
        )}
        <button
          onClick={handleDelete}
          className="action-btn delete-btn"
          title="حذف"
          disabled={isDeleting}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default NotificationItem;
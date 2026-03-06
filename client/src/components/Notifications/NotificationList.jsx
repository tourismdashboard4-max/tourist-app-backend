// client/src/components/Notifications/NotificationList.jsx
import React from 'react';
import NotificationItem from './NotificationItem';
import './NotificationList.css';

const NotificationList = ({ 
  notifications, 
  onMarkAsRead, 
  onDelete,
  emptyMessage = 'لا توجد إشعارات'
}) => {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="notifications-empty">
        <div className="empty-icon">📭</div>
        <p>{emptyMessage}</p>
        <p className="empty-sub">عندما تصلك إشعارات جديدة ستظهر هنا</p>
      </div>
    );
  }

  // تجميع الإشعارات حسب التاريخ
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {});

  return (
    <div className="notifications-list">
      {Object.entries(groupedNotifications).map(([date, items]) => (
        <div key={date} className="notification-group">
          <div className="notification-group-header">
            <span className="group-date">{date}</span>
            <span className="group-count">{items.length} إشعار</span>
          </div>
          <div className="notification-group-items">
            {items.map(notification => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationList;
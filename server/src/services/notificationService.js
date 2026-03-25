// client/src/pages/AdminNotificationsPage.jsx (أو المكان الذي يعرض إشعارات المسؤول)

// ✅ استخدم هذا الـ endpoint بدلاً من الـ endpoint العادي
const fetchNotifications = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    // استخدام endpoint المجمع للإشعارات
    const response = await fetch('https://tourist-app-api.onrender.com/api/notifications/admin-grouped?page=1&limit=20', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (data.success) {
      // البيانات الآن مجمعة - إشعار واحد لكل مستخدم
      setNotifications(data.notifications);
      setPagination(data.pagination);
      setUnreadCount(data.unreadCount);
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
  } finally {
    setLoading(false);
  }
};

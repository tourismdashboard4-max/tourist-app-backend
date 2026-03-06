import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // جلب بيانات المحفظة - استخدم الرابط العام
      try {
        console.log('📥 Fetching wallet for user:', user.id);
        const walletResponse = await apiService.get(`/api/wallet/public/${user.id}`);
        console.log('📥 Wallet response:', walletResponse.data);
        
        if (walletResponse.data.success) {
          setWallet(walletResponse.data.wallet);
          console.log('✅ Wallet loaded:', walletResponse.data.wallet);
        }
      } catch (err) {
        console.log('No wallet found yet:', err);
      }

      // جلب الإشعارات
      try {
        const notifResponse = await apiService.get(`/api/notifications/${user.id}?limit=10`);
        if (notifResponse.data.success) {
          setNotifications(notifResponse.data.notifications || []);
          setUnreadCount(notifResponse.data.notifications.filter(n => !n.is_read).length);
        }
      } catch (err) {
        console.log('No notifications found:', err);
      }

    } catch (err) {
      setError('حدث خطأ في تحميل البيانات');
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await apiService.put(`/api/notifications/${notificationId}/read`);
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiService.put(`/api/notifications/mark-all-read`, {
        userId: user.id
      });
      
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>جاري تحميل الملف الشخصي...</p>
      </div>
    );
  }

  return (
    <div className="profile-container" dir="rtl">
      {/* ===== رأس الصفحة ===== */}
      <div className="profile-header">
        <div className="profile-avatar">
          <img 
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=3b82f6&color=fff&size=200`} 
            alt={user?.fullName}
          />
        </div>
        <div className="profile-title">
          <h1>{user?.fullName || 'المستخدم'}</h1>
          <p className="profile-email">{user?.email}</p>
          <div className="profile-badges">
            <span className="profile-badge role">{user?.role === 'guide' ? 'مرشد سياحي' : 'سائح'}</span>
            <span className="profile-badge id">رقم المستخدم: {user?.appUserId || 'غير محدد'}</span>
          </div>
        </div>
      </div>

      {/* ===== بطاقة المحفظة في الأعلى ===== */}
      {wallet && (
        <div className="wallet-highlight-card">
          <div className="wallet-highlight-icon">💰</div>
          <div className="wallet-highlight-info">
            <div className="wallet-highlight-label">رصيد المحفظة</div>
            <div className="wallet-highlight-balance">
              <span className="wallet-highlight-amount">{wallet.balance}</span>
              <span className="wallet-highlight-currency">{wallet.currency || 'USD'}</span>
            </div>
            <div className="wallet-highlight-number">
              رقم المحفظة: {wallet.wallet_number}
            </div>
          </div>
          <div className={`wallet-highlight-status ${wallet.status}`}>
            {wallet.status === 'active' ? 'نشطة' : wallet.status}
          </div>
        </div>
      )}

      {/* ===== تبويبات التنقل ===== */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="tab-icon">👤</span>
          الملف الشخصي
        </button>
        <button 
          className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallet')}
        >
          <span className="tab-icon">💰</span>
          تفاصيل المحفظة
          {wallet && (
            <span className="wallet-balance-badge">{wallet.balance} {wallet.currency}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <span className="tab-icon">🔔</span>
          الإشعارات
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </button>
      </div>

      {/* ===== محتوى التبويبات ===== */}
      <div className="profile-content">
        {/* ----- تبويب الملف الشخصي ----- */}
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <div className="info-card">
              <h3>معلومات الحساب</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">الاسم الكامل</span>
                  <span className="info-value">{user?.fullName || 'غير محدد'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">البريد الإلكتروني</span>
                  <span className="info-value">{user?.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">رقم المستخدم</span>
                  <span className="info-value highlight">{user?.appUserId || 'غير محدد'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">تاريخ التسجيل</span>
                  <span className="info-value">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : 'غير محدد'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">آخر تسجيل دخول</span>
                  <span className="info-value">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-SA') : 'غير معروف'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">حالة الحساب</span>
                  <span className={`status-badge ${user?.isActive ? 'active' : 'inactive'}`}>
                    {user?.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            </div>

            {/* عرض سريع للمحفظة داخل الملف الشخصي */}
            {wallet && (
              <div className="quick-wallet-card">
                <h4>محفظتي</h4>
                <div className="quick-wallet-row">
                  <span>رقم المحفظة:</span>
                  <span className="highlight">{wallet.wallet_number}</span>
                </div>
                <div className="quick-wallet-row">
                  <span>الرصيد:</span>
                  <span className="balance">{wallet.balance} {wallet.currency}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----- تبويب تفاصيل المحفظة ----- */}
        {activeTab === 'wallet' && (
          <div className="wallet-tab">
            {wallet ? (
              <>
                <div className="wallet-card">
                  <div className="wallet-header">
                    <h3>تفاصيل المحفظة</h3>
                    <span className={`wallet-status ${wallet.status}`}>
                      {wallet.status === 'active' ? 'نشطة' : wallet.status}
                    </span>
                  </div>
                  
                  <div className="wallet-balance-large">
                    <span className="balance-amount">{wallet.balance}</span>
                    <span className="balance-currency">{wallet.currency || 'USD'}</span>
                  </div>

                  <div className="wallet-details">
                    <div className="detail-item">
                      <span className="detail-label">رقم المحفظة</span>
                      <span className="detail-value highlight">{wallet.wallet_number}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">تاريخ الإنشاء</span>
                      <span className="detail-value">
                        {new Date(wallet.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">آخر تحديث</span>
                      <span className="detail-value">
                        {new Date(wallet.updated_at || wallet.created_at).toLocaleString('ar-SA')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="wallet-actions">
                  <button className="btn-primary" onClick={() => alert('سيتم إضافة ميزة الإيداع قريباً')}>
                    إيداع
                  </button>
                  <button className="btn-secondary" onClick={() => alert('سيتم إضافة ميزة السحب قريباً')}>
                    سحب
                  </button>
                  <button className="btn-outline" onClick={() => alert('عرض سجل المعاملات')}>
                    سجل المعاملات
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>لا توجد محفظة لهذا المستخدم</p>
              </div>
            )}
          </div>
        )}

        {/* ----- تبويب الإشعارات ----- */}
        {activeTab === 'notifications' && (
          <div className="notifications-tab">
            <div className="notifications-header">
              <h3>الإشعارات</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="btn-mark-all">
                  تحديد الكل كمقروء
                </button>
              )}
            </div>

            {notifications.length > 0 ? (
              <div className="notifications-list">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="notification-icon">
                      {notification.title?.includes('مرحباً') ? '👋' : 
                       notification.title?.includes('رصيد') ? '💰' : 
                       notification.title?.includes('حجز') ? '📅' : 
                       notification.title?.includes('سحب') ? '💸' : '🔔'}
                    </div>
                    <div className="notification-content">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {new Date(notification.created_at).toLocaleString('ar-SA')}
                      </span>
                    </div>
                    {!notification.is_read && (
                      <span className="notification-dot"></span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>لا توجد إشعارات</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
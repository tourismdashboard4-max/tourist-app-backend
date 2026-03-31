// client/src/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/apiService';
import './ProfilePage.css';

const ProfilePage = ({ setPage }) => {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  
  // حالات البيانات
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFullWalletNumber, setShowFullWalletNumber] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [creatingWallet, setCreatingWallet] = useState(false);
  
  // حالات تعديل الملف الشخصي
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: '',
    phone: ''
  });
  
  // حالات تغيير الصورة
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // حالات التحقق من رقم الجوال
  const [phoneVerification, setPhoneVerification] = useState({
    step: 'idle', // idle, sending, verify
    newPhone: '',
    code: '',
    timer: 0
  });

  // إحصائيات المحفظة
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalEarned: 0,
    transactionsCount: 0,
    rewardPoints: 0,
    membershipLevel: ''
  });

  // تحميل بيانات المستخدم
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      setEditData({
        fullName: user.fullName || user.name || '',
        phone: user.phone || ''
      });
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // مؤقت إعادة الإرسال
  useEffect(() => {
    if (phoneVerification.timer > 0) {
      const interval = setInterval(() => {
        setPhoneVerification(prev => ({
          ...prev,
          timer: prev.timer - 1
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phoneVerification.timer]);

  // جلب بيانات المستخدم
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. جلب بيانات المحفظة
      try {
        const walletResponse = await api.getWallet(user.id);
        
        if (walletResponse?.data) {
          setWallet(walletResponse.data);
          
          // 2. جلب المعاملات
          try {
            const transactionsResponse = await api.getTransactions(user.id, { limit: 10 });
            if (transactionsResponse?.data?.transactions) {
              const txList = transactionsResponse.data.transactions;
              setTransactions(txList);
              
              // حساب الإحصائيات
              const spent = txList
                .filter(t => t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
              const earned = txList
                .filter(t => t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);
              
              setStats({
                totalSpent: spent,
                totalEarned: earned,
                transactionsCount: txList.length,
                rewardPoints: Math.floor(earned * 0.1),
                membershipLevel: spent > 5000 ? 'ذهبي' : spent > 2000 ? 'فضي' : 'برونزي'
              });
            }
          } catch (transErr) {
            console.error('Error fetching transactions:', transErr);
          }
        } else {
          setWallet(null);
        }
      } catch (walletErr) {
        console.error('Error fetching wallet:', walletErr);
        setWallet(null);
      }

      // 3. جلب الإشعارات
      try {
        const notifResponse = await api.getNotifications({ limit: 10 });
        if (notifResponse?.data?.notifications) {
          setNotifications(notifResponse.data.notifications);
          setUnreadCount(notifResponse.data.unreadCount || 0);
        }
      } catch (notifErr) {
        console.error('Error fetching notifications:', notifErr);
      }

    } catch (err) {
      setError('حدث خطأ في تحميل البيانات');
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // ===== دوال رفع الصورة الشخصية =====
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار صورة فقط');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.uploadAvatar(user.id, formData);
      
      if (response?.data?.success) {
        const avatarUrl = response.data.avatar || response.data.user?.avatar;
        updateUser({ avatar: avatarUrl });
        toast.success('تم تحديث الصورة الشخصية بنجاح');
      } else {
        throw new Error('فشل رفع الصورة');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('فشل تحديث الصورة الشخصية');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ===== دوال التحقق من رقم الجوال =====
  const validatePhone = (phone) => {
    return api.validateSaudiPhone(phone);
  };

  const normalizePhone = (phone) => {
    return api.normalizePhoneNumber(phone);
  };

  const handleSendPhoneOTP = async () => {
    const phone = phoneVerification.newPhone || editData.phone;
    const normalizedPhone = normalizePhone(phone);
    
    if (!phone || !validatePhone(phone)) {
      toast.error('رقم الجوال غير صحيح. مثال: 05xxxxxxxx');
      return;
    }

    setPhoneVerification(prev => ({ ...prev, step: 'sending' }));
    
    try {
      console.log('📤 Sending OTP to:', normalizedPhone);
      const response = await api.sendPhoneVerification(user.id, normalizedPhone);
      
      if (response?.data?.success) {
        setPhoneVerification(prev => ({
          ...prev,
          step: 'verify',
          newPhone: normalizedPhone,
          timer: 60
        }));
        toast.success('تم إرسال رمز التحقق إلى جوالك');
      } else {
        throw new Error(response?.data?.message || 'فشل إرسال رمز التحقق');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'فشل إرسال رمز التحقق');
      setPhoneVerification(prev => ({ ...prev, step: 'idle' }));
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (!phoneVerification.code || phoneVerification.code.length !== 6) {
      toast.error('الرجاء إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    try {
      console.log('📤 Verifying OTP for:', phoneVerification.newPhone);
      const response = await api.verifyPhoneCode(
        user.id,
        phoneVerification.newPhone,
        phoneVerification.code
      );
      
      if (response?.data?.success) {
        const updateResponse = await api.updateUserPhone(user.id, phoneVerification.newPhone);
        
        if (updateResponse?.data?.success) {
          updateUser({ 
            phone: phoneVerification.newPhone,
            phoneVerified: true 
          });
          
          setEditData(prev => ({ ...prev, phone: phoneVerification.newPhone }));
          setPhoneVerification({
            step: 'idle',
            newPhone: '',
            code: '',
            timer: 0
          });
          
          toast.success('✅ تم التحقق من رقم الجوال بنجاح');
        }
      } else {
        throw new Error(response?.data?.message || 'رمز التحقق غير صحيح');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'فشل التحقق من الرمز');
    }
  };

  const handleResendOTP = () => {
    if (phoneVerification.timer > 0) return;
    handleSendPhoneOTP();
  };

  const handleCancelVerification = () => {
    setPhoneVerification({
      step: 'idle',
      newPhone: '',
      code: '',
      timer: 0
    });
  };

  // ===== دوال تحديث الاسم =====
  const handleUpdateName = async () => {
    if (!editData.fullName || editData.fullName.length < 3) {
      toast.error('الاسم يجب أن يكون 3 أحرف على الأقل');
      return;
    }

    try {
      const response = await api.updateUserProfile(user.id, {
        fullName: editData.fullName
      });
      
      if (response?.data?.success) {
        updateUser({ fullName: editData.fullName });
        setIsEditing(false);
        toast.success('تم تحديث الاسم بنجاح');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('فشل تحديث الاسم');
    }
  };

  // ===== دوال المحفظة =====
  const handleCreateWallet = async () => {
    try {
      setCreatingWallet(true);
      const response = await api.createWallet({ userId: user.id });
      
      if (response?.data?.success) {
        toast.success('تم إنشاء المحفظة بنجاح');
        await fetchUserData();
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast.error('حدث خطأ أثناء إنشاء المحفظة');
    } finally {
      setCreatingWallet(false);
    }
  };

  const formatWalletNumber = (walletNumber) => {
    if (!walletNumber) return 'غير متوفر';
    return walletNumber.replace(/(.{4})/g, '$1 ').trim();
  };

  const maskWalletNumber = (walletNumber) => {
    if (!walletNumber) return '•••• •••• •••• ••••';
    const firstFour = walletNumber.substring(0, 4);
    const lastFour = walletNumber.substring(walletNumber.length - 4);
    return `${firstFour} •••• •••• ${lastFour}`;
  };

  const copyWalletNumber = () => {
    if (wallet?.wallet_number) {
      navigator.clipboard.writeText(wallet.wallet_number);
      toast.success('✅ تم نسخ رقم المحفظة');
    }
  };

  // ===== دوال الإشعارات =====
  const markAsRead = async (notificationId) => {
    try {
      const response = await api.markNotificationAsRead(notificationId);
      if (response?.data?.success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.markAllNotificationsAsRead();
      if (response?.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        toast.success('تم تحديد الكل كمقروء');
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // ===== دوال المحفظة =====
  const handleDeposit = () => {
    toast.success('سيتم إضافة ميزة الإيداع قريباً');
  };

  const handleWithdraw = () => {
    toast.success('سيتم إضافة ميزة السحب قريباً');
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>جاري تحميل الملف الشخصي...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="profile-container" dir="rtl">
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>مرحباً بك</h3>
          <p>يرجى تسجيل الدخول لعرض الملف الشخصي</p>
          <button 
            className="btn-primary"
            onClick={() => window.location.href = '/login'}
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  // ✅ التحقق من صلاحيات المسؤول والدعم
  const isAdmin = user?.role === 'admin';
  const isSupport = user?.role === 'support';
  const showAdminButtons = isAdmin || isSupport;

  return (
    <div className="profile-container" dir="rtl">
      {/* رأس الصفحة مع الصورة الشخصية */}
      <div className="profile-header">
        <div className="profile-avatar-container" onClick={handleAvatarClick} style={{ position: 'relative', cursor: 'pointer' }}>
          <div className="profile-avatar">
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.name || user?.email || 'User')}&background=3b82f6&color=fff&size=200`} 
              alt={user?.fullName || 'User'}
            />
          </div>
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px'
          }}>
            {uploadingAvatar ? 'جاري الرفع...' : 'تغيير'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
        </div>
        <div className="profile-title">
          <h1>{user?.fullName || user?.name || user?.email?.split('@')[0] || 'المستخدم'}</h1>
          <p className="profile-email">{user?.email}</p>
          <div className="profile-badges">
            <span className="profile-badge role">
              {user?.role === 'guide' ? 'مرشد سياحي' : user?.role === 'admin' ? 'مدير النظام' : user?.role === 'support' ? 'دعم فني' : 'سائح'}
            </span>
            {user?.phoneVerified && (
              <span className="profile-badge verified">✓ موثق</span>
            )}
          </div>
        </div>
      </div>

      {/* ✅ أزرار المسؤول - تستخدم setPage للتنقل */}
      {showAdminButtons && (
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          margin: '20px 0',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={() => setPage('admin-support')}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '15px 20px',
              background: '#10b981',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            🎫 تذاكر الدعم
          </button>
          
          <button 
            onClick={() => setPage('upgrade-requests')}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '15px 20px',
              background: '#8b5cf6',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            ⭐ طلبات الترقية
          </button>
        </div>
      )}

      {/* بطاقة المحفظة */}
      {wallet ? (
        <WalletCard 
          wallet={wallet}
          stats={stats}
          showFullWalletNumber={showFullWalletNumber}
          setShowFullWalletNumber={setShowFullWalletNumber}
          copyWalletNumber={copyWalletNumber}
          formatWalletNumber={formatWalletNumber}
          maskWalletNumber={maskWalletNumber}
        />
      ) : (
        <div className="no-wallet-message">
          <div className="wallet-icon">💰</div>
          <h3>لا توجد محفظة</h3>
          <p>لم يتم إنشاء محفظة لهذا المستخدم بعد</p>
          <button 
            className="btn-primary"
            onClick={handleCreateWallet}
            disabled={creatingWallet}
          >
            {creatingWallet ? 'جاري الإنشاء...' : 'إنشاء محفظة جديدة'}
          </button>
        </div>
      )}

      {/* تبويبات التنقل */}
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
          المحفظة
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

      {/* محتوى التبويبات */}
      <div className="profile-content">
        {activeTab === 'profile' && (
          <ProfileTab 
            user={user}
            editData={editData}
            setEditData={setEditData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            phoneVerification={phoneVerification}
            setPhoneVerification={setPhoneVerification}
            onUpdateName={handleUpdateName}
            onSendOTP={handleSendPhoneOTP}
            onVerifyOTP={handleVerifyPhoneOTP}
            onResendOTP={handleResendOTP}
            onCancelVerification={handleCancelVerification}
            wallet={wallet}
            setActiveTab={setActiveTab}
            logout={logout}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletTab 
            wallet={wallet}
            stats={stats}
            transactions={transactions}
            formatWalletNumber={formatWalletNumber}
            copyWalletNumber={copyWalletNumber}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab 
            notifications={notifications}
            unreadCount={unreadCount}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
          />
        )}
      </div>
    </div>
  );
};

// ===== مكون بطاقة المحفظة =====
const WalletCard = ({ wallet, stats, showFullWalletNumber, setShowFullWalletNumber, copyWalletNumber, formatWalletNumber, maskWalletNumber }) => {
  return (
    <div className="wallet-card">
      <div className="wallet-header">
        <div className="wallet-title">
          <span>💰</span>
          <h3>محفظتي</h3>
        </div>
        <button className="wallet-refresh" onClick={() => window.location.reload()}>
          🔄
        </button>
      </div>
      
      <div className="wallet-balance">
        <div className="balance-amount">
          {wallet?.balance?.toLocaleString() || 0} <span>ريال</span>
        </div>
        <div className="balance-label">الرصيد الحالي</div>
      </div>
      
      <div className="wallet-number" onClick={() => setShowFullWalletNumber(!showFullWalletNumber)}>
        <span className="number-label">رقم المحفظة</span>
        <span className="number-value">
          {showFullWalletNumber ? formatWalletNumber(wallet?.wallet_number) : maskWalletNumber(wallet?.wallet_number)}
        </span>
        <button className="copy-btn" onClick={(e) => { e.stopPropagation(); copyWalletNumber(); }}>
          📋 نسخ
        </button>
      </div>
      
      <div className="wallet-stats">
        <div className="stat-item">
          <div className="stat-value">{stats.transactionsCount}</div>
          <div className="stat-label">معاملات</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.totalEarned.toLocaleString()}</div>
          <div className="stat-label">إجمالي الدخل</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.totalSpent.toLocaleString()}</div>
          <div className="stat-label">إجمالي المصروف</div>
        </div>
      </div>
      
      <div className="reward-info">
        <div className="reward-points">
          ⭐ {stats.rewardPoints || 0} نقطة مكافآت
        </div>
        <div className={`membership-level ${stats.membershipLevel === 'ذهبي' ? 'gold' : stats.membershipLevel === 'فضي' ? 'silver' : 'bronze'}`}>
          {stats.membershipLevel || 'برونزي'}
        </div>
      </div>
    </div>
  );
};

// ===== مكون تبويب الملف الشخصي =====
const ProfileTab = ({ 
  user, editData, setEditData, isEditing, setIsEditing,
  phoneVerification, setPhoneVerification,
  onUpdateName, onSendOTP, onVerifyOTP, onResendOTP, onCancelVerification,
  wallet, setActiveTab, logout
}) => {
  return (
    <div className="profile-tab">
      <div className="info-section">
        <div className="section-title">
          <h3>معلومات شخصية</h3>
          {!isEditing && (
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              ✏️ تعديل
            </button>
          )}
        </div>
        
        <div className="info-row">
          <label>الاسم الكامل</label>
          {isEditing ? (
            <div className="edit-field">
              <input
                type="text"
                value={editData.fullName}
                onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                className="edit-input"
                placeholder="الاسم الكامل"
              />
              <div className="edit-actions">
                <button className="save-btn" onClick={onUpdateName}>حفظ</button>
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>إلغاء</button>
              </div>
            </div>
          ) : (
            <p>{user?.fullName || user?.name || 'غير مضاف'}</p>
          )}
        </div>
        
        <div className="info-row">
          <label>البريد الإلكتروني</label>
          <p>{user?.email}</p>
        </div>
        
        <div className="info-row">
          <label>رقم الجوال</label>
          {phoneVerification.step === 'idle' && (
            <div className="phone-display">
              <p>{user?.phone || 'غير مضاف'}</p>
              {!user?.phone && (
                <button className="verify-phone-btn" onClick={() => setPhoneVerification(prev => ({ ...prev, step: 'sending' }))}>
                  إضافة رقم
                </button>
              )}
              {user?.phone && !user?.phoneVerified && (
                <button className="verify-phone-btn" onClick={() => {
                  setPhoneVerification({ step: 'sending', newPhone: user.phone, code: '', timer: 0 });
                  onSendOTP();
                }}>
                  توثيق
                </button>
              )}
              {user?.phoneVerified && (
                <span className="verified-badge">✓ موثق</span>
              )}
            </div>
          )}
        </div>
        
        {phoneVerification.step === 'sending' && (
          <div className="phone-verification">
            <input
              type="tel"
              value={phoneVerification.newPhone}
              onChange={(e) => setPhoneVerification(prev => ({ ...prev, newPhone: e.target.value }))}
              placeholder="أدخل رقم الجوال (05xxxxxxxx)"
              className="phone-input"
              dir="ltr"
            />
            <button className="send-otp-btn" onClick={onSendOTP}>إرسال رمز التحقق</button>
          </div>
        )}
        
        {phoneVerification.step === 'verify' && (
          <div className="phone-verification">
            <p className="verify-info">تم إرسال رمز التحقق إلى {phoneVerification.newPhone}</p>
            <div className="otp-input-group">
              <input
                type="text"
                maxLength="6"
                value={phoneVerification.code}
                onChange={(e) => setPhoneVerification(prev => ({ ...prev, code: e.target.value }))}
                placeholder="أدخل رمز التحقق (6 أرقام)"
                className="otp-input"
                dir="ltr"
              />
              <button className="verify-btn" onClick={onVerifyOTP}>تحقق</button>
            </div>
            <div className="resend-group">
              <button 
                className="resend-btn" 
                onClick={onResendOTP}
                disabled={phoneVerification.timer > 0}
              >
                {phoneVerification.timer > 0 ? `إعادة الإرسال بعد ${phoneVerification.timer} ثانية` : 'إعادة إرسال الرمز'}
              </button>
              <button className="cancel-btn" onClick={onCancelVerification}>إلغاء</button>
            </div>
          </div>
        )}
      </div>
      
      <div className="info-section">
        <div className="section-title">
          <h3>المحفظة</h3>
        </div>
        <div className="info-row wallet-short">
          <label>رصيد المحفظة</label>
          <p className="wallet-balance-short">{wallet?.balance?.toLocaleString() || 0} ريال</p>
        </div>
        <button className="view-wallet-btn" onClick={() => setActiveTab('wallet')}>
          عرض تفاصيل المحفظة →
        </button>
      </div>
      
      <div className="info-section">
        <div className="section-title">
          <h3>الأمان</h3>
        </div>
        <div className="info-row">
          <label>تسجيل الخروج</label>
          <button className="logout-btn" onClick={logout}>تسجيل الخروج</button>
        </div>
      </div>
    </div>
  );
};

// ===== مكون تبويب المحفظة =====
const WalletTab = ({ wallet, stats, transactions, formatWalletNumber, copyWalletNumber, onDeposit, onWithdraw }) => {
  return (
    <div className="wallet-tab">
      <div className="balance-card">
        <div className="balance-amount-large">
          {wallet?.balance?.toLocaleString() || 0} <span>ريال</span>
        </div>
        <div className="balance-label">الرصيد الحالي</div>
        
        <div className="wallet-number-large" onClick={() => copyWalletNumber()}>
          <span>رقم المحفظة: {formatWalletNumber(wallet?.wallet_number)}</span>
          <button className="copy-icon">📋</button>
        </div>
        
        <div className="action-buttons">
          <button className="deposit-btn" onClick={onDeposit}>إيداع</button>
          <button className="withdraw-btn" onClick={onWithdraw}>سحب</button>
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.transactionsCount}</div>
          <div className="stat-label">إجمالي المعاملات</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalEarned.toLocaleString()}</div>
          <div className="stat-label">إجمالي الدخل</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalSpent.toLocaleString()}</div>
          <div className="stat-label">إجمالي المصروف</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.rewardPoints || 0}</div>
          <div className="stat-label">نقاط المكافآت</div>
        </div>
      </div>
      
      <div className="transactions-section">
        <div className="section-header">
          <h4>آخر المعاملات</h4>
        </div>
        {transactions.length === 0 ? (
          <div className="empty-transactions">
            <p>لا توجد معاملات حتى الآن</p>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((tx, idx) => (
              <div key={tx.id || idx} className={`transaction-item ${tx.amount > 0 ? 'income' : 'expense'}`}>
                <div className="transaction-info">
                  <div className="transaction-title">{tx.description || (tx.amount > 0 ? 'إيداع' : 'سحب')}</div>
                  <div className="transaction-date">{new Date(tx.created_at).toLocaleDateString('ar-EG')}</div>
                </div>
                <div className={`transaction-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                  {tx.amount > 0 ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()} ريال
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== مكون تبويب الإشعارات =====
const NotificationsTab = ({ notifications, unreadCount, markAsRead, markAllAsRead }) => {
  return (
    <div className="notifications-tab">
      <div className="notifications-header">
        <h3>الإشعارات</h3>
        {unreadCount > 0 && (
          <button className="mark-all-read" onClick={markAllAsRead}>
            تحديد الكل كمقروء
          </button>
        )}
      </div>
      
      {notifications.length === 0 ? (
        <div className="empty-notifications">
          <div className="empty-icon">🔔</div>
          <p>لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className="notification-icon">
                {notif.type === 'info' ? 'ℹ️' : notif.type === 'success' ? '✅' : notif.type === 'warning' ? '⚠️' : '🔔'}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notif.title}</div>
                <div className="notification-message">{notif.message}</div>
                <div className="notification-time">
                  {new Date(notif.created_at).toLocaleString('ar-EG')}
                </div>
              </div>
              {!notif.is_read && <div className="unread-dot"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

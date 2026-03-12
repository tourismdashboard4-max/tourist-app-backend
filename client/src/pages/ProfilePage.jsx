// client/src/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/apiService';
import './ProfilePage.css';

const ProfilePage = () => {
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

    // التحقق من حجم الصورة
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    // التحقق من نوع الصورة
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
        // تحديث صورة المستخدم في السياق
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
        // تحديث رقم الجوال في قاعدة البيانات
        const updateResponse = await api.updateUserPhone(user.id, phoneVerification.newPhone);
        
        if (updateResponse?.data?.success) {
          // تحديث المستخدم في السياق
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
              {user?.role === 'guide' ? 'مرشد سياحي' : 'سائح'}
            </span>
            {user?.phoneVerified && (
              <span className="profile-badge verified">✓ موثق</span>
            )}
          </div>
        </div>
      </div>

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

// ===== بطاقة المحفظة =====
const WalletCard = ({ wallet, stats, showFullWalletNumber, setShowFullWalletNumber, copyWalletNumber, formatWalletNumber, maskWalletNumber }) => (
  <motion.div 
    className="wallet-premium-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="wallet-card-header">
      <div className="wallet-title">
        <span className="wallet-icon">💰</span>
        <h3>محفظتي الرقمية</h3>
      </div>
      <span className={`wallet-status-badge ${wallet.status}`}>
        {wallet.status === 'active' ? 'نشطة' : 'غير نشطة'}
      </span>
    </div>

    <div className="wallet-balance-section">
      <span className="wallet-balance-label">الرصيد الحالي</span>
      <div className="wallet-balance-main">
        <span className="wallet-balance-amount">
          {wallet.balance?.toFixed(2)} 
        </span>
        <span className="wallet-balance-currency">{wallet.currency}</span>
      </div>
    </div>

    <div className="wallet-number-section">
      <span className="wallet-number-label">رقم المحفظة</span>
      <div className="wallet-number-display">
        <span className="wallet-number">
          {showFullWalletNumber ? formatWalletNumber(wallet.wallet_number) : maskWalletNumber(wallet.wallet_number)}
        </span>
        <div className="wallet-actions">
          <button className="wallet-action-btn" onClick={() => setShowFullWalletNumber(!showFullWalletNumber)}>
            {showFullWalletNumber ? '👁️' : '👁️‍🗨️'}
          </button>
          <button className="wallet-action-btn" onClick={copyWalletNumber}>📋</button>
        </div>
      </div>
    </div>

    <div className="wallet-stats-grid">
      <div className="wallet-stat-item">
        <span className="stat-label">المعاملات</span>
        <span className="stat-value">{stats.transactionsCount}</span>
      </div>
      <div className="wallet-stat-item">
        <span className="stat-label">المكافآت</span>
        <span className="stat-value">{stats.rewardPoints}</span>
      </div>
      <div className="wallet-stat-item">
        <span className="stat-label">المستوى</span>
        <span className="stat-value level">{stats.membershipLevel || 'عادي'}</span>
      </div>
    </div>
  </motion.div>
);

// ===== تبويب الملف الشخصي =====
const ProfileTab = ({ 
  user, editData, setEditData, isEditing, setIsEditing,
  phoneVerification, setPhoneVerification,
  onUpdateName, onSendOTP, onVerifyOTP, onResendOTP, onCancelVerification,
  wallet, setActiveTab, logout 
}) => (
  <motion.div 
    className="profile-tab"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
  >
    {/* معلومات الحساب الأساسية */}
    <div className="info-card">
      <h3>معلومات الحساب</h3>
      <div className="info-grid">
        <div className="info-item">
          <span className="info-label">البريد الإلكتروني</span>
          <span className="info-value">{user?.email}</span>
        </div>
        
        <div className="info-item">
          <span className="info-label">الاسم</span>
          {isEditing ? (
            <div className="edit-field" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <input
                type="text"
                value={editData.fullName}
                onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                placeholder="الاسم الكامل"
                style={{ flex: 1, padding: '5px', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              <button className="save-btn" onClick={onUpdateName} style={{ padding: '5px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px' }}>حفظ</button>
              <button className="cancel-btn" onClick={() => setIsEditing(false)} style={{ padding: '5px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '5px' }}>إلغاء</button>
            </div>
          ) : (
            <div className="info-value-with-edit" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{user?.fullName || user?.name || 'غير محدد'}</span>
              <button className="edit-btn" onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
            </div>
          )}
        </div>

        <div className="info-item">
          <span className="info-label">رقم الجوال</span>
          <div className="phone-section">
            {phoneVerification.step === 'idle' && (
              <div className="info-value-with-edit" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span>{user?.phone || 'غير مضاف'}</span>
                {user?.phoneVerified && (
                  <span className="verified-badge" style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>✓ موثق</span>
                )}
                <button 
                  className="edit-btn"
                  onClick={() => setPhoneVerification({...phoneVerification, step: 'sending'})}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                >
                  {user?.phone ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            )}

            {phoneVerification.step === 'sending' && (
              <div className="phone-input-group" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <input
                  type="tel"
                  value={phoneVerification.newPhone}
                  onChange={(e) => setPhoneVerification({...phoneVerification, newPhone: e.target.value})}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
                <button className="send-otp-btn" onClick={onSendOTP} style={{ padding: '8px 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px' }}>إرسال الرمز</button>
                <button className="cancel-btn" onClick={onCancelVerification} style={{ padding: '8px 15px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '5px' }}>إلغاء</button>
              </div>
            )}

            {phoneVerification.step === 'verify' && (
              <div className="otp-verify-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p className="otp-message" style={{ margin: 0, color: '#666' }}>تم إرسال الرمز إلى {phoneVerification.newPhone}</p>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={phoneVerification.code}
                    onChange={(e) => setPhoneVerification({
                      ...phoneVerification, 
                      code: e.target.value.replace(/\D/g, '').slice(0, 6)
                    })}
                    placeholder="000000"
                    maxLength="6"
                    className="otp-input"
                    dir="ltr"
                    style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ddd', textAlign: 'center', fontSize: '18px', letterSpacing: '4px' }}
                  />
                  <button className="verify-btn" onClick={onVerifyOTP} style={{ padding: '8px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px' }}>تحقق</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="resend-btn" 
                    onClick={onResendOTP}
                    disabled={phoneVerification.timer > 0}
                    style={{ background: 'none', border: 'none', color: phoneVerification.timer > 0 ? '#999' : '#3b82f6', cursor: phoneVerification.timer > 0 ? 'default' : 'pointer', textDecoration: 'underline' }}
                  >
                    {phoneVerification.timer > 0 
                      ? `إعادة الإرسال بعد ${phoneVerification.timer}ث` 
                      : 'إعادة إرسال الرمز'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="info-item">
          <span className="info-label">تاريخ التسجيل</span>
          <span className="info-value">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : 'غير محدد'}
          </span>
        </div>
      </div>
    </div>

    {/* أرقام فريدة */}
    {(user?.walletNumber || user?.chatId) && (
      <div className="unique-ids-card" style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>الأرقام الخاصة</h4>
        
        {user?.walletNumber && (
          <div className="id-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
            <span className="id-label" style={{ color: '#6b7280' }}>رقم المحفظة:</span>
            <div className="id-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="mono" style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{user.walletNumber}</span>
              <button onClick={() => {
                navigator.clipboard.writeText(user.walletNumber);
                toast.success('تم نسخ رقم المحفظة');
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>📋</button>
            </div>
          </div>
        )}
        
        {user?.chatId && (
          <div className="id-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <span className="id-label" style={{ color: '#6b7280' }}>رقم المراسلة:</span>
            <div className="id-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="mono" style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{user.chatId}</span>
              <button onClick={() => {
                navigator.clipboard.writeText(user.chatId);
                toast.success('تم نسخ رقم المراسلة');
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>📋</button>
            </div>
          </div>
        )}
      </div>
    )}

    {/* رابط سريع للمحفظة */}
    {wallet && (
      <div className="quick-wallet-card" onClick={() => setActiveTab('wallet')} style={{ cursor: 'pointer' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#667eea' }}>
          <span className="quick-wallet-icon">💰</span>
          ملخص المحفظة
        </h4>
        <div className="quick-wallet-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>الرصيد:</span>
          <span className="balance-large" style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
            {wallet.balance} {wallet.currency}
          </span>
        </div>
        <span className="arrow" style={{ fontSize: '20px', color: '#667eea' }}>←</span>
      </div>
    )}

    {/* زر تسجيل الخروج */}
    <button className="logout-btn" onClick={logout} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      تسجيل الخروج
    </button>
  </motion.div>
);

// ===== تبويب المحفظة =====
const WalletTab = ({ wallet, stats, transactions, formatWalletNumber, copyWalletNumber, onDeposit, onWithdraw }) => (
  <motion.div 
    className="wallet-tab"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
  >
    {wallet ? (
      <>
        <div className="wallet-details-card" style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>تفاصيل المحفظة</h3>
          <div className="wallet-detail-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
            <span className="detail-label" style={{ color: '#6b7280' }}>رقم المحفظة:</span>
            <span className="detail-value highlight" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {formatWalletNumber(wallet.wallet_number)}
              <button className="copy-btn-small" onClick={copyWalletNumber} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>📋</button>
            </span>
          </div>
          <div className="wallet-detail-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <span className="detail-label" style={{ color: '#6b7280' }}>تاريخ الإنشاء:</span>
            <span className="detail-value" style={{ color: '#1f2937' }}>
              {new Date(wallet.created_at).toLocaleDateString('ar-SA')}
            </span>
          </div>
        </div>

        {/* إحصائيات */}
        {(stats.totalSpent > 0 || stats.totalEarned > 0) && (
          <div className="wallet-stats-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            {stats.totalSpent > 0 && (
              <div className="stat-card spent" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)', borderRadius: '15px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="stat-card-icon" style={{ fontSize: '30px' }}>💸</span>
                <div>
                  <div className="stat-card-label" style={{ fontSize: '12px', color: '#4b5563' }}>إجمالي المصروف</div>
                  <div className="stat-card-value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>{stats.totalSpent} ريال</div>
                </div>
              </div>
            )}
            {stats.totalEarned > 0 && (
              <div className="stat-card earned" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', borderRadius: '15px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="stat-card-icon" style={{ fontSize: '30px' }}>💰</span>
                <div>
                  <div className="stat-card-label" style={{ fontSize: '12px', color: '#4b5563' }}>إجمالي المكاسب</div>
                  <div className="stat-card-value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>{stats.totalEarned} ريال</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* آخر المعاملات */}
        {transactions.length > 0 && (
          <div className="recent-transactions" style={{ background: 'white', borderRadius: '15px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>آخر المعاملات</h4>
            {transactions.slice(0, 3).map(tx => (
              <div key={tx.id} className="transaction-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
                <span className="transaction-desc" style={{ color: '#1f2937' }}>{tx.description}</span>
                <span className={`transaction-amount ${tx.amount > 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 'bold', color: tx.amount > 0 ? '#10b981' : '#ef4444' }}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} ريال
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="wallet-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
          <button className="btn-primary" onClick={onDeposit} style={{ padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <span className="btn-icon">➕</span>
            إيداع
          </button>
          <button className="btn-secondary" onClick={onWithdraw} style={{ padding: '12px', background: 'white', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <span className="btn-icon">➖</span>
            سحب
          </button>
        </div>
      </>
    ) : (
      <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '15px' }}>
        <div className="empty-icon" style={{ fontSize: '48px', marginBottom: '15px', opacity: '0.5' }}>💰</div>
        <p style={{ color: '#6b7280' }}>لا توجد محفظة</p>
      </div>
    )}
  </motion.div>
);

// ===== تبويب الإشعارات =====
const NotificationsTab = ({ notifications, unreadCount, markAsRead, markAllAsRead }) => (
  <motion.div 
    className="notifications-tab"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
  >
    <div className="notifications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
      <h3 style={{ margin: 0, color: '#1f2937' }}>الإشعارات</h3>
      {unreadCount > 0 && (
        <button className="btn-mark-all" onClick={markAllAsRead} style={{ padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>
          تحديد الكل كمقروء
        </button>
      )}
    </div>

    {notifications.length > 0 ? (
      <div className="notifications-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
            onClick={() => !notification.is_read && markAsRead(notification.id)}
            style={{ padding: '15px', background: notification.is_read ? '#f9fafb' : '#eff6ff', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.3s', position: 'relative' }}
          >
            <div className="notification-content">
              <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#1f2937' }}>{notification.title}</h4>
              <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#6b7280' }}>{notification.message}</p>
              <span className="notification-time" style={{ fontSize: '11px', color: '#9ca3af' }}>
                {new Date(notification.created_at).toLocaleString('ar-SA')}
              </span>
            </div>
            {!notification.is_read && (
              <span className="notification-dot" style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', position: 'absolute', top: '15px', left: '15px' }}></span>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '15px' }}>
        <p style={{ color: '#6b7280' }}>لا توجد إشعارات</p>
      </div>
    )}
  </motion.div>
);

export default ProfilePage;
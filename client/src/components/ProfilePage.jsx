import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera, Edit2, LogOut, Package, Bell, Settings, FileText } from 'lucide-react';
import api from '../services/api';

const API_BASE_URL = 'https://tourist-app-api.onrender.com'; // أو استخدم متغير البيئة

function ProfilePage({ lang, user, setPage, setShowLogin, onLogout, onUpdateUser }) {
  const [userData, setUserData] = useState(user || null);
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileContent, setShowProfileContent] = useState(false);
  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // حالات التحقق من الجوال
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState('idle');
  const [tempPhone, setTempPhone] = useState('');
  const [countdown, setCountdown] = useState(0);

  // تحديث البيانات عند تغيير user prop
  useEffect(() => {
    if (user) {
      setUserData(user);
      setEditData({
        fullName: user.fullName || '',
        phone: user.phone || ''
      });
      let avatarUrl = user.avatar;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        avatarUrl = `${API_BASE_URL}${avatarUrl}`;
      }
      setAvatarPreview(avatarUrl);
    }
  }, [user]);

  // مزامنة localStorage مع userData
  useEffect(() => {
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  }, [userData]);

  // مؤقت إعادة الإرسال
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setShowVerificationInput(false);
    setPhoneVerificationStep('idle');
  };

  useEffect(() => {
    if (!isEditing && userData) {
      setEditData({
        fullName: userData.fullName || '',
        phone: userData.phone || ''
      });
    }
  }, [isEditing, userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  // التحقق من الجوال
  const handleVerifyPhone = async () => {
    const phoneNumber = editData.phone;
    if (!phoneNumber || phoneNumber === 'غير مضاف') {
      alert(lang === 'ar' ? '❌ الرجاء إدخال رقم الجوال أولاً' : '❌ Please enter your phone number first');
      return;
    }
    const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
    if (!saudiPhoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      alert(lang === 'ar' ? '❌ رقم الجوال غير صحيح' : '❌ Invalid phone number');
      return;
    }
    setPhoneVerificationStep('sending');
    setTempPhone(phoneNumber);
    try {
      const response = await api.sendPhoneVerification(userData.id, phoneNumber);
      if (response.success) {
        setPhoneVerificationStep('sent');
        setShowVerificationInput(true);
        setCountdown(60);
        alert(lang === 'ar' ? `📱 تم إرسال رمز التحقق إلى ${phoneNumber}` : `📱 Verification code sent to ${phoneNumber}`);
      } else {
        setPhoneVerificationStep('idle');
        alert(lang === 'ar' ? '❌ فشل إرسال الرمز' : '❌ Failed to send code');
      }
    } catch (error) {
      console.error(error);
      setPhoneVerificationStep('idle');
      alert(lang === 'ar' ? '❌ خطأ في الاتصال' : '❌ Connection error');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 4) {
      alert(lang === 'ar' ? '❌ الرجاء إدخال الرمز' : '❌ Please enter code');
      return;
    }
    setPhoneVerificationStep('verifying');
    try {
      const response = await api.verifyPhoneCode(userData.id, tempPhone, verificationCode);
      if (response.success) {
        const updatedUser = { ...userData, phone: tempPhone, phoneVerified: true };
        setUserData(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        setEditData(prev => ({ ...prev, phone: tempPhone }));
        setPhoneVerificationStep('verified');
        setShowVerificationInput(false);
        alert(lang === 'ar' ? '✅ تم التحقق بنجاح' : '✅ Verified successfully');
      } else {
        setPhoneVerificationStep('sent');
        alert(lang === 'ar' ? '❌ رمز غير صحيح' : '❌ Invalid code');
      }
    } catch (error) {
      console.error(error);
      setPhoneVerificationStep('sent');
      alert(lang === 'ar' ? '❌ خطأ في التحقق' : '❌ Verification error');
    }
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    handleVerifyPhone();
  };

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      const response = await api.updateUserProfile(userData.id, { fullName: editData.fullName });
      if (response.success) {
        const updatedUser = { ...userData, fullName: editData.fullName };
        setUserData(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        setIsEditing(false);
        alert(lang === 'ar' ? '✅ تم تحديث الاسم' : '✅ Name updated');
      }
    } catch (error) {
      console.error(error);
      alert(lang === 'ar' ? '❌ فشل التحديث' : '❌ Update failed');
    } finally {
      setSaveLoading(false);
    }
  };

  // ✅ رفع الصورة (مُصلح)
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'ar' ? '⚠️ حجم الصورة كبير جداً (حد أقصى 2 ميجابايت)' : '⚠️ Image too large (max 2MB)');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert(lang === 'ar' ? '⚠️ الرجاء اختيار صورة' : '⚠️ Please select an image');
      e.target.value = '';
      return;
    }

    // معاينة فورية
    const reader = new FileReader();
    reader.onload = (event) => setAvatarPreview(event.target.result);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('avatar', file);
    setLoading(true);

    try {
      const response = await api.uploadAvatar(userData.id, formData);
      if (response.success && response.avatarUrl) {
        let fullUrl = response.avatarUrl;
        if (!fullUrl.startsWith('http')) {
          fullUrl = `${API_BASE_URL}${fullUrl}`;
        }
        const updatedUser = { ...userData, avatar: fullUrl };
        setUserData(updatedUser);
        setAvatarPreview(fullUrl);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? '✅ تم تحديث الصورة' : '✅ Picture updated');
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error(error);
      alert(lang === 'ar' ? '❌ فشل رفع الصورة' : '❌ Upload failed');
      setAvatarPreview(userData?.avatar || null);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // ✅ حذف الصورة
  const handleDeleteAvatar = async () => {
    if (!confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من حذف الصورة؟' : '⚠️ Delete picture?')) return;
    setLoading(true);
    try {
      const response = await api.deleteAvatar(userData.id);
      if (response.success) {
        const updatedUser = { ...userData, avatar: null };
        setUserData(updatedUser);
        setAvatarPreview(null);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? '✅ تم حذف الصورة' : '✅ Picture deleted');
      }
    } catch (error) {
      console.error(error);
      alert(lang === 'ar' ? '❌ فشل الحذف' : '❌ Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    setUserData(null);
    if (onLogout) onLogout();
    setPage('home');
  };

  const toggleProfileContent = () => setShowProfileContent(!showProfileContent);
  const navigateToSettings = () => setPage('settings');
  const navigateToNotifications = () => setPage('notifications');
  const navigateToMyTrips = () => alert(lang === 'ar' ? '📅 صفحة رحلاتي - قيد التطوير' : '📅 My Trips - Coming soon');

  // عرض الملف الشخصي (القسم المطوي) – نفس الهيكل السابق مع استخدام avatarPreview
  const renderProfileContent = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-4">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 flex items-center justify-between">
        <h3 className="text-white font-bold text-lg">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</h3>
        <button onClick={toggleProfileContent} className="text-white/80 hover:text-white">✕</button>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-gray-800 shadow-md overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt={userData.fullName} className="w-full h-full object-cover" />
              ) : (
                userData.fullName?.charAt(0) || 'U'
              )}
            </div>
            <button
              onClick={() => document.getElementById('avatar-upload').click()}
              className="absolute -bottom-1 -right-1 bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700 transition shadow-md"
              disabled={loading}
            >
              <Camera size={14} />
            </button>
            {avatarPreview && (
              <button
                onClick={handleDeleteAvatar}
                className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-md w-6 h-6 flex items-center justify-center text-xs"
                disabled={loading}
              >
                ✕
              </button>
            )}
            <input type="file" id="avatar-upload" className="hidden" accept="image/jpeg,image/png,image/jpg,image/gif,image/webp" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white">{userData.fullName}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lang === 'ar' ? 'عضو منذ ' : 'Member since '}
              {new Date(userData.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
            </p>
          </div>
        </div>

        {loading && (
          <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
            <div className="inline-flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>{lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}</span>
            </div>
          </div>
        )}

        {/* معلومات الاتصال */}
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Mail size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">{userData.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Phone size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'رقم الجوال' : 'Phone'}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800 dark:text-white">{userData.phone || (lang === 'ar' ? 'غير مضاف' : 'Not added')}</p>
                {userData.phone && userData.phoneVerified && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ {lang === 'ar' ? 'موثق' : 'Verified'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleEditToggle} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-medium">
          <Edit2 size={18} />
          {isEditing ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile')}
        </button>

        {isEditing && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3 border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? 'تعديل البيانات' : 'Edit Data'}</h4>
            <input
              type="text"
              name="fullName"
              value={editData.fullName}
              onChange={handleInputChange}
              placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500"
            />
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="tel"
                  name="phone"
                  value={editData.phone}
                  onChange={handleInputChange}
                  placeholder={lang === 'ar' ? 'رقم الجوال (05xxxxxxxx)' : 'Phone (05xxxxxxxx)'}
                  className="flex-1 p-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                  dir="ltr"
                />
                {editData.phone && editData.phone !== userData.phone && (
                  <button
                    onClick={handleVerifyPhone}
                    disabled={phoneVerificationStep === 'sending' || phoneVerificationStep === 'verifying'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {phoneVerificationStep === 'sending' ? (lang === 'ar' ? 'جاري...' : 'Sending...') : (lang === 'ar' ? 'تحقق' : 'Verify')}
                  </button>
                )}
              </div>
              {showVerificationInput && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? `تم إرسال الرمز إلى ${tempPhone}` : `Code sent to ${tempPhone}`}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder={lang === 'ar' ? 'أدخل الرمز' : 'Enter code'}
                      className="flex-1 p-2 border rounded-lg text-center"
                      maxLength="6"
                    />
                    <button onClick={handleVerifyCode} disabled={phoneVerificationStep === 'verifying'} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                      {phoneVerificationStep === 'verifying' ? '...' : (lang === 'ar' ? 'تأكيد' : 'Confirm')}
                    </button>
                  </div>
                  <div className="mt-2 text-center">
                    <button onClick={handleResendCode} disabled={countdown > 0} className="text-sm text-blue-600 hover:underline disabled:text-gray-400">
                      {countdown > 0 ? (lang === 'ar' ? `إعادة الإرسال بعد ${countdown} ث` : `Resend in ${countdown}s`) : (lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleSaveProfile} disabled={saveLoading} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
              {saveLoading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الاسم' : 'Save Name')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // زائر
  if (!userData) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center ml-4">
              <User size={32} />
            </div>
            <div><h1 className="text-xl font-bold">{lang === 'ar' ? 'زائر' : 'Guest'}</h1><p className="text-white/80">{lang === 'ar' ? 'مستكشف' : 'Explorer'}</p></div>
          </div>
        </div>
        <div className="p-4">
          <button onClick={() => setShowLogin(true)} className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">
            {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  // مستخدم مسجل
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white">
        <h1 className="text-2xl font-bold">{lang === 'ar' ? `مرحباً، ${userData.fullName?.split(' ')[0]}` : `Welcome, ${userData.fullName?.split(' ')[0]}`}</h1>
        <p className="text-white/80 mt-1">{lang === 'ar' ? 'استعرض وأدر حسابك من هنا' : 'View and manage your account'}</p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button onClick={toggleProfileContent} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105 ${showProfileContent ? 'ring-2 ring-green-500' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"><User size={24} className="text-white" /></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
          </button>
          <button onClick={navigateToMyTrips} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center"><Package size={24} className="text-white" /></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'رحلاتي' : 'My Trips'}</span>
          </button>
          <button onClick={navigateToNotifications} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center"><Bell size={24} className="text-white" /></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
          </button>
          <button onClick={navigateToSettings} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center"><Settings size={24} className="text-white" /></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</span>
          </button>
        </div>

        {showProfileContent && renderProfileContent()}

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-4">
          <h3 className="font-bold text-gray-800 dark:text-white mb-3">{lang === 'ar' ? 'المساعدة والدعم' : 'Help & Support'}</h3>
          <div className="space-y-2">
            <button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition">
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-3"><FileText size={18} className="text-purple-600" />{lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</span>
              <span className="text-gray-400">‹</span>
            </button>
          </div>
        </div>

        <button onClick={handleLogout} className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2">
          <LogOut size={18} />{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;

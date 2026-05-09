// client/src/pages/ProfilePage.jsx
// ✅ النسخة النهائية - صفحة ملف شخصي كاملة مثل الإشعارات والإعدادات

import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Mail, Phone, MapPin, Camera, Save, ArrowLeft, 
  Moon, Sun, Bell, Shield, LogOut, ChevronRight, 
  Edit2, CheckCircle, XCircle, AlertCircle, Globe, Lock,
  Star, Users, Clock, DollarSign, MessageCircle, Heart,
  Settings, Package, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/apiService';

const API_BASE = 'https://tourist-app-api.onrender.com';

const ProfilePage = ({ setPage, user: propUser }) => {
  const { user, logout, updateUser, isAuthenticated } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const [currentUser, setCurrentUser] = useState(propUser || user);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addBalanceLoading, setAddBalanceLoading] = useState(false);
  
  // نموذج التعديل
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    location: ''
  });
  
  // توثيق الجوال
  const [phoneVerification, setPhoneVerification] = useState({
    step: 'idle',
    newPhone: '',
    code: '',
    timer: 0
  });

  // جلب إحصائيات المستخدم
  const fetchUserStats = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/users/${currentUser.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // تحديث الإحصائيات إذا لزم الأمر
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      setEditForm({
        full_name: currentUser.full_name || currentUser.fullName || currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        bio: currentUser.bio || '',
        location: currentUser.location || ''
      });
      fetchUserStats();
    }
  }, [currentUser, fetchUserStats]);

  // مؤقت إعادة الإرسال
  useEffect(() => {
    if (phoneVerification.timer > 0) {
      const interval = setInterval(() => {
        setPhoneVerification(p => ({ ...p, timer: p.timer - 1 }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phoneVerification.timer]);

  // رفع صورة الملف الشخصي
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الصورة يجب أن لا يتجاوز 5 ميجابايت' : 'Image size must not exceed 5MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'الرجاء اختيار صورة صالحة' : 'Please select a valid image');
      return;
    }
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.uploadAvatar(currentUser.id, formData);
      if (response.success && response.avatarUrl) {
        let avatarUrl = response.avatarUrl;
        if (!avatarUrl.startsWith('http')) avatarUrl = `${API_BASE}${avatarUrl}`;
        const updatedUser = { ...currentUser, avatar: avatarUrl };
        setCurrentUser(updatedUser);
        if (updateUser) updateUser(updatedUser);
        toast.success(language === 'ar' ? 'تم تحديث الصورة بنجاح' : 'Profile picture updated');
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(language === 'ar' ? 'فشل رفع الصورة' : 'Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  // حفظ التعديلات
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await api.updateUserProfile(currentUser.id, {
        fullName: editForm.full_name,
        phone: editForm.phone,
        bio: editForm.bio,
        location: editForm.location
      });
      
      if (response.success) {
        const updatedUser = { ...currentUser, ...response.user };
        setCurrentUser(updatedUser);
        if (updateUser) updateUser(updatedUser);
        setIsEditing(false);
        toast.success(language === 'ar' ? 'تم تحديث الملف الشخصي' : 'Profile updated');
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || (language === 'ar' ? 'فشل تحديث الملف الشخصي' : 'Update failed'));
    } finally {
      setLoading(false);
    }
  };

  // إضافة رصيد
  const handleAddBalance = async () => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(language === 'ar' ? 'أدخل مبلغاً صحيحاً أكبر من صفر' : 'Enter a valid amount greater than zero');
      return;
    }
    setAddBalanceLoading(true);
    try {
      const response = await api.addBalance(currentUser.id, amount);
      if (response.success) {
        const newBalance = response.newBalance;
        const updatedUser = { ...currentUser, balance: newBalance };
        setCurrentUser(updatedUser);
        if (updateUser) updateUser(updatedUser);
        toast.success(language === 'ar' ? `✅ تمت إضافة ${amount} ريال. الرصيد: ${newBalance}` : `✅ Added ${amount} SAR. Balance: ${newBalance}`);
        setShowAddBalance(false);
        setAddAmount('');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || (language === 'ar' ? 'فشل إضافة الرصيد' : 'Failed to add balance'));
    } finally {
      setAddBalanceLoading(false);
    }
  };

  // توثيق الجوال
  const validatePhone = (phone) => /^(05|5)[0-9]{8}$/.test(phone);
  
  const handleSendOTP = async () => {
    const phone = phoneVerification.newPhone || editForm.phone;
    if (!phone || !validatePhone(phone)) {
      toast.error(language === 'ar' ? 'رقم جوال غير صحيح (05xxxxxxxx)' : 'Invalid phone number');
      return;
    }
    setPhoneVerification(p => ({ ...p, step: 'sending' }));
    try {
      const res = await api.sendPhoneVerification(currentUser.id, phone);
      if (res.success) {
        setPhoneVerification(p => ({ ...p, step: 'verify', newPhone: phone, timer: 60 }));
        toast.success(language === 'ar' ? 'تم إرسال رمز التحقق' : 'Verification code sent');
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      toast.error(err.message);
      setPhoneVerification(p => ({ ...p, step: 'idle' }));
    }
  };

  const handleVerifyOTP = async () => {
    if (!phoneVerification.code || phoneVerification.code.length !== 6) {
      toast.error(language === 'ar' ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter 6-digit code');
      return;
    }
    try {
      const res = await api.verifyPhoneCode(currentUser.id, phoneVerification.newPhone, phoneVerification.code);
      if (res.success) {
        await api.updateUserPhone(currentUser.id, phoneVerification.newPhone);
        const updatedUser = { ...currentUser, phone: phoneVerification.newPhone, phoneVerified: true };
        setCurrentUser(updatedUser);
        if (updateUser) updateUser(updatedUser);
        setEditForm(prev => ({ ...prev, phone: phoneVerification.newPhone }));
        setPhoneVerification({ step: 'idle', newPhone: '', code: '', timer: 0 });
        toast.success(language === 'ar' ? '✅ تم توثيق رقم الجوال' : '✅ Phone verified');
      } else {
        throw new Error(res.message || 'Invalid code');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleResendOTP = () => {
    if (phoneVerification.timer > 0) return;
    handleSendOTP();
  };

  const handleCancelVerification = () => {
    setPhoneVerification({ step: 'idle', newPhone: '', code: '', timer: 0 });
  };

  // تسجيل الخروج
  const handleLogout = async () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من تسجيل الخروج؟' : 'Are you sure you want to logout?')) {
      await logout();
      setPage('home');
      toast.success(language === 'ar' ? 'تم تسجيل الخروج' : 'Logged out');
    }
  };

  // الحصول على الحرف الأول من الاسم
  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  // الحصول على صورة الملف الشخصي
  const getAvatarUrl = () => {
    if (currentUser?.avatar) {
      return currentUser.avatar.startsWith('http') ? currentUser.avatar : `${API_BASE}${currentUser.avatar}`;
    }
    return null;
  };

  const isGuide = currentUser?.role === 'guide' || currentUser?.type === 'guide' || currentUser?.isGuide === true;

  if (!isAuthenticated && !currentUser) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <User className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              {language === 'ar' ? 'غير مسجل الدخول' : 'Not Logged In'}
            </h2>
            <p className="text-white/60 mb-4">
              {language === 'ar' ? 'الرجاء تسجيل الدخول للمتابعة' : 'Please login to continue'}
            </p>
            <button 
              onClick={() => setPage('home')}
              className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
            >
              {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* الرأس */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setPage('home')} 
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">
                  {language === 'ar' ? 'الملف الشخصي' : 'Profile'}
                </h1>
                <p className="text-xs text-white/80">
                  {language === 'ar' ? 'معلومات حسابك' : 'Your account info'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={toggleDarkMode}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                title={language === 'ar' ? (darkMode ? 'الوضع النهاري' : 'الوضع الليلي') : (darkMode ? 'Light mode' : 'Dark mode')}
              >
                {darkMode ? <Sun size={18} className="text-white" /> : <Moon size={18} className="text-white" />}
              </button>
              <button 
                onClick={() => setPage('settings')}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <Settings size={18} className="text-white" />
              </button>
              <button 
                onClick={() => setPage('notifications')}
                className="relative p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <Bell size={18} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* محتوى الصفحة */}
      <div className="flex-1 overflow-y-auto">
        {/* صورة الغلاف */}
        <div className="relative h-32 bg-gradient-to-r from-teal-500 to-emerald-500">
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-white bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center overflow-hidden shadow-lg">
                {getAvatarUrl() ? (
                  <img 
                    src={getAvatarUrl()} 
                    alt={currentUser?.full_name || currentUser?.fullName || currentUser?.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                  />
                ) : (
                  <span className="text-white text-3xl font-bold">
                    {getInitials(currentUser?.full_name || currentUser?.fullName || currentUser?.name)}
                  </span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-teal-600 p-1.5 rounded-full cursor-pointer hover:bg-teal-700 transition shadow-md">
                <Camera size={14} className="text-white" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* معلومات المستخدم */}
        <div className="pt-16 pb-6 px-4">
          <div className="text-center mb-6">
            {isEditing ? (
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="text-xl font-bold text-center bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full name'}
              />
            ) : (
              <h2 className="text-xl font-bold text-white">
                {currentUser?.full_name || currentUser?.fullName || currentUser?.name || (language === 'ar' ? 'مستخدم' : 'User')}
              </h2>
            )}
            <div className="flex items-center justify-center gap-2 mt-1">
              {isGuide ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/30 text-purple-200 rounded-full text-xs">
                  <Star size={12} /> {language === 'ar' ? 'مرشد سياحي' : 'Tour Guide'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/30 text-blue-200 rounded-full text-xs">
                  <User size={12} /> {language === 'ar' ? 'مسافر' : 'Traveler'}
                </span>
              )}
              <span className="text-white/50 text-xs">{currentUser?.email}</span>
            </div>
          </div>

          {/* معلومات الحساب */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden mb-6">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-semibold text-white">{language === 'ar' ? 'معلومات الحساب' : 'Account Info'}</h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-teal-300 hover:text-teal-200 flex items-center gap-1"
                >
                  <Edit2 size={14} /> {language === 'ar' ? 'تعديل' : 'Edit'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="text-sm text-white/60 hover:text-white"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="text-sm text-teal-300 hover:text-teal-200 flex items-center gap-1 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-300 border-t-transparent"></div>
                    ) : (
                      <Save size={14} />
                    )}
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            
            <div className="divide-y divide-white/10">
              {/* البريد الإلكتروني */}
              <div className="p-4 flex items-center gap-3">
                <Mail size={18} className="text-teal-300" />
                <div className="flex-1">
                  <p className="text-xs text-white/50">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                  <p className="text-white">{currentUser?.email}</p>
                </div>
              </div>
              
              {/* رقم الهاتف */}
              <div className="p-4 flex items-center gap-3">
                <Phone size={18} className="text-teal-300" />
                <div className="flex-1">
                  <p className="text-xs text-white/50">{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</p>
                  {isEditing && phoneVerification.step === 'idle' ? (
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder={language === 'ar' ? 'رقم الجوال' : 'Phone number'}
                      />
                      <button
                        onClick={handleSendOTP}
                        className="px-3 py-1 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600"
                      >
                        {language === 'ar' ? 'توثيق' : 'Verify'}
                      </button>
                    </div>
                  ) : phoneVerification.step === 'verify' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={phoneVerification.code}
                          onChange={(e) => setPhoneVerification({ ...phoneVerification, code: e.target.value })}
                          placeholder={language === 'ar' ? 'رمز التحقق' : 'Verification code'}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-center"
                          maxLength={6}
                        />
                        <button
                          onClick={handleVerifyOTP}
                          className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                        >
                          {language === 'ar' ? 'تحقق' : 'Confirm'}
                        </button>
                        <button
                          onClick={handleCancelVerification}
                          className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                      <div className="text-center">
                        <button
                          onClick={handleResendOTP}
                          disabled={phoneVerification.timer > 0}
                          className="text-xs text-teal-300 hover:text-teal-200 disabled:opacity-50"
                        >
                          {phoneVerification.timer > 0 
                            ? (language === 'ar' ? `إعادة الإرسال بعد ${phoneVerification.timer} ث` : `Resend in ${phoneVerification.timer}s`)
                            : (language === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-white">{editForm.phone || (language === 'ar' ? 'غير مضاف' : 'Not added')}</p>
                      {currentUser?.phoneVerified && (
                        <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle size={12} /> {language === 'ar' ? 'موثق' : 'Verified'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* الموقع */}
              <div className="p-4 flex items-center gap-3">
                <MapPin size={18} className="text-teal-300" />
                <div className="flex-1">
                  <p className="text-xs text-white/50">{language === 'ar' ? 'الموقع' : 'Location'}</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder={language === 'ar' ? 'المدينة، الدولة' : 'City, Country'}
                    />
                  ) : (
                    <p className="text-white">{currentUser?.location || (language === 'ar' ? 'غير مضاف' : 'Not added')}</p>
                  )}
                </div>
              </div>
              
              {/* نبذة عني */}
              <div className="p-4 flex items-start gap-3">
                <User size={18} className="text-teal-300 mt-1" />
                <div className="flex-1">
                  <p className="text-xs text-white/50">{language === 'ar' ? 'نبذة عني' : 'Bio'}</p>
                  {isEditing ? (
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={3}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                      placeholder={language === 'ar' ? 'اكتب نبذة عن نفسك...' : 'Write something about yourself...'}
                    />
                  ) : (
                    <p className="text-white text-sm leading-relaxed">
                      {currentUser?.bio || (language === 'ar' ? 'لا توجد نبذة' : 'No bio added')}
                    </p>
                  )}
                </div>
              </div>

              {/* الرصيد */}
              <div className="p-4 flex items-center gap-3">
                <DollarSign size={18} className="text-teal-300" />
                <div className="flex-1">
                  <p className="text-xs text-white/50">{language === 'ar' ? 'الرصيد' : 'Balance'}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold">{currentUser?.balance || 0} ريال</p>
                    <button
                      onClick={() => setShowAddBalance(!showAddBalance)}
                      className="text-xs bg-teal-500/30 text-teal-300 px-2 py-1 rounded-full hover:bg-teal-500/50"
                    >
                      {language === 'ar' ? 'شحن' : 'Add'}
                    </button>
                  </div>
                  {showAddBalance && (
                    <div className="mt-3 p-3 bg-white/5 rounded-lg">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={addAmount}
                          onChange={(e) => setAddAmount(e.target.value)}
                          placeholder={language === 'ar' ? 'المبلغ (ريال)' : 'Amount (SAR)'}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                          min="1"
                          step="1"
                        />
                        <button
                          onClick={handleAddBalance}
                          disabled={addBalanceLoading}
                          className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
                        >
                          {addBalanceLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          ) : (
                            language === 'ar' ? 'تأكيد' : 'Confirm'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* إعدادات سريعة */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden mb-6">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white">{language === 'ar' ? 'إعدادات سريعة' : 'Quick Settings'}</h3>
            </div>
            <div className="divide-y divide-white/10">
              <button 
                onClick={toggleDarkMode}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  {darkMode ? <Sun size={18} className="text-teal-300" /> : <Moon size={18} className="text-teal-300" />}
                  <span className="text-white">{language === 'ar' ? (darkMode ? 'الوضع النهاري' : 'الوضع الليلي') : (darkMode ? 'Light Mode' : 'Dark Mode')}</span>
                </div>
                <ChevronRight size={16} className="text-white/40" />
              </button>
              
              <button 
                onClick={() => setPage('settings')}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <Settings size={18} className="text-teal-300" />
                  <span className="text-white">{language === 'ar' ? 'جميع الإعدادات' : 'All Settings'}</span>
                </div>
                <ChevronRight size={16} className="text-white/40" />
              </button>
              
              <button 
                onClick={() => setPage('notifications')}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-teal-300" />
                  <span className="text-white">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
                </div>
                <ChevronRight size={16} className="text-white/40" />
              </button>

              {isGuide && (
                <button 
                  onClick={() => setPage('guideDashboard')}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-teal-300" />
                    <span className="text-white">{language === 'ar' ? 'لوحة تحكم المرشد' : 'Guide Dashboard'}</span>
                  </div>
                  <ChevronRight size={16} className="text-white/40" />
                </button>
              )}
            </div>
          </div>

          {/* المساعدة والدعم */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden mb-6">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white">{language === 'ar' ? 'المساعدة والدعم' : 'Help & Support'}</h3>
            </div>
            <div className="divide-y divide-white/10">
              <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-teal-300" />
                  <span className="text-white">{language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</span>
                </div>
                <ChevronRight size={16} className="text-white/40" />
              </button>
              <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition">
                <div className="flex items-center gap-3">
                  <MessageCircle size={18} className="text-teal-300" />
                  <span className="text-white">{language === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'}</span>
                </div>
                <ChevronRight size={16} className="text-white/40" />
              </button>
            </div>
          </div>

          {/* زر تسجيل الخروج */}
          <button 
            onClick={handleLogout}
            className="w-full py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 font-medium hover:bg-red-500/30 transition flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

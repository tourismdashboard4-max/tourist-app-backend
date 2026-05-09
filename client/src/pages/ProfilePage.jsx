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
  const [showFullWalletNumber, se// client/src/pages/ProfilePage.jsx
// ✅ النسخة النهائية - مع export default في النهاية

import React, { useState, useEffect } from 'react';
import { User, Edit2, Camera, LogOut, DollarSign, Eye, EyeOff, Shield, CheckCircle, Mail, Phone, Bell, FileText, Package, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/apiService';

const API_BASE_URL = 'https://tourist-app-api.onrender.com';

function ProfilePage({ lang, user, setPage, setShowLogin, onLogout, onUpdateUser }) {
  const [userData, setUserData] = useState(user || null);
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileContent, setShowProfileContent] = useState(false);
  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState('idle');
  const [tempPhone, setTempPhone] = useState('');
  const [countdown, setCountdown] = useState(0);

  // --- إضافة الرصيد ---
  const [balance, setBalance] = useState(user?.balance || 0);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addBalanceLoading, setAddBalanceLoading] = useState(false);
  // -------------------

  useEffect(() => {
    if (user) {
      setUserData(user);
      setEditData({ fullName: user.fullName || '', phone: user.phone || '' });
      let avatarUrl = user.avatar;
      if (avatarUrl && !avatarUrl.startsWith('http')) avatarUrl = `${API_BASE_URL}${avatarUrl}`;
      setAvatarPreview(avatarUrl);
      setBalance(user.balance ?? 0);
    }
  }, [user]);

  useEffect(() => { if (userData) localStorage.setItem('user', JSON.stringify(userData)); }, [userData]);

  useEffect(() => { if (countdown > 0) { const timer = setTimeout(() => setCountdown(countdown - 1), 1000); return () => clearTimeout(timer); } }, [countdown]);

  const handleEditToggle = () => { setIsEditing(!isEditing); setShowVerificationInput(false); setPhoneVerificationStep('idle'); };
  useEffect(() => { if (!isEditing && userData) setEditData({ fullName: userData.fullName || '', phone: userData.phone || '' }); }, [isEditing, userData]);
  const handleInputChange = (e) => { const { name, value } = e.target; setEditData(prev => ({ ...prev, [name]: value })); };

  const handleVerifyPhone = async () => {
    const phoneNumber = editData.phone;
    if (!phoneNumber || phoneNumber === 'غير مضاف') { alert(lang === 'ar' ? '❌ الرجاء إدخال رقم الجوال أولاً' : '❌ Please enter your phone number first'); return; }
    const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
    if (!saudiPhoneRegex.test(phoneNumber.replace(/\s/g, ''))) { alert(lang === 'ar' ? '❌ رقم الجوال غير صحيح' : '❌ Invalid phone number'); return; }
    setPhoneVerificationStep('sending'); setTempPhone(phoneNumber);
    try {
      const response = await api.sendPhoneVerification(userData.id, phoneNumber);
      if (response.success) { setPhoneVerificationStep('sent'); setShowVerificationInput(true); setCountdown(60); alert(lang === 'ar' ? `📱 تم إرسال رمز التحقق إلى ${phoneNumber}` : `📱 Verification code sent to ${phoneNumber}`); }
      else { setPhoneVerificationStep('idle'); alert(lang === 'ar' ? '❌ فشل إرسال الرمز' : '❌ Failed to send code'); }
    } catch (error) { console.error(error); setPhoneVerificationStep('idle'); alert(lang === 'ar' ? '❌ خطأ في الاتصال' : '❌ Connection error'); }
  };
  
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 4) { alert(lang === 'ar' ? '❌ الرجاء إدخال الرمز' : '❌ Please enter code'); return; }
    setPhoneVerificationStep('verifying');
    try {
      const response = await api.verifyPhoneCode(userData.id, tempPhone, verificationCode);
      if (response.success) {
        const updatedUser = { ...userData, phone: tempPhone, phoneVerified: true };
        setUserData(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        setEditData(prev => ({ ...prev, phone: tempPhone }));
        setPhoneVerificationStep('verified'); setShowVerificationInput(false);
        alert(lang === 'ar' ? '✅ تم التحقق بنجاح' : '✅ Verified successfully');
      } else { setPhoneVerificationStep('sent'); alert(lang === 'ar' ? '❌ رمز غير صحيح' : '❌ Invalid code'); }
    } catch (error) { console.error(error); setPhoneVerificationStep('sent'); alert(lang === 'ar' ? '❌ خطأ في التحقق' : '❌ Verification error'); }
  };
  
  const handleResendCode = () => { if (countdown > 0) return; handleVerifyPhone(); };
  
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
    } catch (error) { console.error(error); alert(lang === 'ar' ? '❌ فشل التحديث' : '❌ Update failed'); } finally { setSaveLoading(false); }
  };

  // --- دالة إضافة الرصيد ---
  const handleAddBalance = async () => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(lang === 'ar' ? '⚠️ الرجاء إدخال مبلغ صحيح أكبر من 0' : '⚠️ Please enter a valid amount > 0');
      return;
    }
    setAddBalanceLoading(true);
    try {
      const response = await api.addBalance(userData.id, amount);
      if (response.success) {
        const newBalance = response.newBalance;
        setBalance(newBalance);
        const updatedUser = { ...userData, balance: newBalance };
        setUserData(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? `✅ تمت إضافة ${amount} ريال بنجاح. الرصيد الحالي: ${newBalance}` : `✅ Added ${amount} SAR successfully. New balance: ${newBalance}`);
        setShowAddBalance(false);
        setAddAmount('');
      } else {
        alert(lang === 'ar' ? '❌ فشل إضافة الرصيد' : '❌ Failed to add balance');
      }
    } catch (error) {
      console.error(error);
      alert(lang === 'ar' ? '❌ خطأ في الاتصال' : '❌ Connection error');
    } finally {
      setAddBalanceLoading(false);
    }
  };
  // -------------------------

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert(lang === 'ar' ? '⚠️ حجم الصورة كبير جداً (حد أقصى 2 ميجابايت)' : '⚠️ Image too large (max 2MB)'); e.target.value = ''; return; }
    if (!file.type.startsWith('image/')) { alert(lang === 'ar' ? '⚠️ الرجاء اختيار صورة' : '⚠️ Please select an image'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (event) => setAvatarPreview(event.target.result);
    reader.readAsDataURL(file);
    const formData = new FormData(); formData.append('avatar', file);
    setLoading(true);
    try {
      const response = await api.uploadAvatar(userData.id, formData);
      if (response.success && response.avatarUrl) {
        let fullUrl = response.avatarUrl;
        if (!fullUrl.startsWith('http')) fullUrl = `https://tourist-app-api.onrender.com${fullUrl}`;
        const updatedUser = { ...userData, avatar: fullUrl };
        setUserData(updatedUser); setAvatarPreview(fullUrl);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? '✅ تم تحديث الصورة' : '✅ Picture updated');
      } else throw new Error(response.message || 'Upload failed');
    } catch (error) { console.error(error); alert(lang === 'ar' ? '❌ فشل رفع الصورة' : '❌ Upload failed'); setAvatarPreview(userData?.avatar || null); } finally { setLoading(false); e.target.value = ''; }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من حذف الصورة؟' : '⚠️ Delete picture?')) return;
    setLoading(true);
    try {
      const response = await api.deleteAvatar(userData.id);
      if (response.success) {
        const updatedUser = { ...userData, avatar: null };
        setUserData(updatedUser); setAvatarPreview(null);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? '✅ تم حذف الصورة' : '✅ Picture deleted');
      }
    } catch (error) { console.error(error); alert(lang === 'ar' ? '❌ فشل الحذف' : '❌ Delete failed'); } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('user'); localStorage.removeItem('token'); localStorage.removeItem('userType');
    setUserData(null);
    if (onLogout) onLogout();
    setPage('home');
  };
  
  const toggleProfileContent = () => setShowProfileContent(!showProfileContent);
  const navigateToSettings = () => setPage('settings');
  const navigateToNotifications = () => setPage('notifications');
  const navigateToMyTrips = () => alert(lang === 'ar' ? '📅 صفحة رحلاتي - قيد التطوير' : '📅 My Trips - Coming soon');

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
              {avatarPreview ? <img src={avatarPreview} alt={userData.fullName} className="w-full h-full object-cover" /> : (userData.fullName?.charAt(0) || 'U')}
            </div>
            <button onClick={() => document.getElementById('avatar-upload').click()} className="absolute -bottom-1 -right-1 bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700 transition shadow-md" disabled={loading}><Camera size={14} /></button>
            {avatarPreview && <button onClick={handleDeleteAvatar} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-md w-6 h-6 flex items-center justify-center text-xs" disabled={loading}>✕</button>}
            <input type="file" id="avatar-upload" className="hidden" accept="image/jpeg,image/png,image/jpg,image/gif,image/webp" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white">{userData.fullName}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'عضو منذ ' : 'Member since '}{new Date(userData.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</p>
          </div>
        </div>
        {loading && <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center"><div className="inline-flex items-center gap-2 text-blue-600"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div><span>{lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}</span></div></div>}
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Mail size={16} className="text-green-600 dark:text-green-400" /></div>
            <div className="flex-1"><p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p><p className="text-sm font-medium text-gray-800 dark:text-white">{userData.email}</p></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Phone size={16} className="text-green-600 dark:text-green-400" /></div>
            <div className="flex-1"><p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'رقم الجوال' : 'Phone'}</p><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-800 dark:text-white">{userData.phone || (lang === 'ar' ? 'غير مضاف' : 'Not added')}</p>{userData.phone && userData.phoneVerified && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ {lang === 'ar' ? 'موثق' : 'Verified'}</span>}</div></div>
          </div>
          
          {/* قسم الرصيد */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <DollarSign size={16} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'الرصيد' : 'Balance'}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-800 dark:text-white">{balance} ريال</p>
                <button onClick={() => setShowAddBalance(!showAddBalance)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200">{lang === 'ar' ? 'شحن' : 'Add'}</button>
              </div>
              {showAddBalance && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200">
                  <input type="number" placeholder={lang === 'ar' ? 'المبلغ (ريال)' : 'Amount (SAR)'} value={addAmount} onChange={(e) => setAddAmount(e.target.value)} className="w-full p-2 border rounded-lg mb-2 dark:bg-gray-700" min="1" step="1" />
                  <button onClick={handleAddBalance} disabled={addBalanceLoading} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{addBalanceLoading ? (lang === 'ar' ? 'جاري...' : 'Processing...') : (lang === 'ar' ? 'تأكيد الشحن' : 'Confirm')}</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <button onClick={handleEditToggle} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-medium"><Edit2 size={18} />{isEditing ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile')}</button>
        {isEditing && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3 border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? 'تعديل البيانات' : 'Edit Data'}</h4>
            <input type="text" name="fullName" value={editData.fullName} onChange={handleInputChange} placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500" />
            <div className="space-y-2">
              <div className="flex gap-2"><input type="tel" name="phone" value={editData.phone} onChange={handleInputChange} placeholder={lang === 'ar' ? 'رقم الجوال (05xxxxxxxx)' : 'Phone (05xxxxxxxx)'} className="flex-1 p-3 border rounded-lg dark:bg-gray-700 dark:text-white" dir="ltr" />{editData.phone && editData.phone !== userData.phone && <button onClick={handleVerifyPhone} disabled={phoneVerificationStep === 'sending' || phoneVerificationStep === 'verifying'} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">{phoneVerificationStep === 'sending' ? (lang === 'ar' ? 'جاري...' : 'Sending...') : (lang === 'ar' ? 'تحقق' : 'Verify')}</button>}</div>
              {showVerificationInput && <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? `تم إرسال الرمز إلى ${tempPhone}` : `Code sent to ${tempPhone}`}</p><div className="flex gap-2"><input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder={lang === 'ar' ? 'أدخل الرمز' : 'Enter code'} className="flex-1 p-2 border rounded-lg text-center" maxLength="6" /><button onClick={handleVerifyCode} disabled={phoneVerificationStep === 'verifying'} className="px-4 py-2 bg-green-600 text-white rounded-lg">{phoneVerificationStep === 'verifying' ? '...' : (lang === 'ar' ? 'تأكيد' : 'Confirm')}</button></div><div className="mt-2 text-center"><button onClick={handleResendCode} disabled={countdown > 0} className="text-sm text-blue-600 hover:underline disabled:text-gray-400">{countdown > 0 ? (lang === 'ar' ? `إعادة الإرسال بعد ${countdown} ث` : `Resend in ${countdown}s`) : (lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}</button></div></div>}
            </div>
            <button onClick={handleSaveProfile} disabled={saveLoading} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">{saveLoading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الاسم' : 'Save Name')}</button>
          </div>
        )}
      </div>
    </div>
  );

  if (!userData) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white"><div className="flex items-center mb-4"><div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center ml-4"><User size={32} /></div><div><h1 className="text-xl font-bold">{lang === 'ar' ? 'زائر' : 'Guest'}</h1><p className="text-white/80">{lang === 'ar' ? 'مستكشف' : 'Explorer'}</p></div></div></div>
        <div className="p-4"><button onClick={() => setShowLogin(true)} className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">{lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</button></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white"><h1 className="text-2xl font-bold">{lang === 'ar' ? `مرحباً، ${userData.fullName?.split(' ')[0]}` : `Welcome, ${userData.fullName?.split(' ')[0]}`}</h1><p className="text-white/80 mt-1">{lang === 'ar' ? 'استعرض وأدر حسابك من هنا' : 'View and manage your account'}</p></div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button onClick={toggleProfileContent} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105 ${showProfileContent ? 'ring-2 ring-green-500' : ''}`}><div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"><User size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</span></button>
          <button onClick={navigateToMyTrips} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center"><Package size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'رحلاتي' : 'My Trips'}</span></button>
          <button onClick={navigateToNotifications} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center"><Bell size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span></button>
          <button onClick={navigateToSettings} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center"><Settings size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</span></button>
        </div>
        {showProfileContent && renderProfileContent()}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-4"><h3 className="font-bold text-gray-800 dark:text-white mb-3">{lang === 'ar' ? 'المساعدة والدعم' : 'Help & Support'}</h3><div className="space-y-2"><button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"><span className="text-gray-700 dark:text-gray-300 flex items-center gap-3"><FileText size={18} className="text-purple-600" />{lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</span><span className="text-gray-400">‹</span></button></div></div>
        <button onClick={handleLogout} className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2"><LogOut size={18} />{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</button>
      </div>
    </div>
  );
}

// ✅ أضف هذا السطر في نهاية الملف
export default ProfilePage;tShowFullWalletNumber] = useState(false);
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

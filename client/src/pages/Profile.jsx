// client/src/pages/Profile.jsx
// ✅ نسخة معدلة - إضافة دعم اسم المستخدم (username) القابل للتعديل
// ✅ عرض الاسم الكامل، اسم المستخدم، البريد الإلكتروني، رقم الجوال مع إمكانية تعديل الاسم واسم المستخدم
// ✅ دعم المحفظة والحسابات البنكية والفواتير

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWallet } from '../contexts/WalletContext';
import {
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt,
  FaEdit, FaSave, FaTimes, FaWallet, FaEye, FaEyeSlash,
  FaArrowUp, FaArrowDown, FaSpinner, FaHistory, FaCreditCard,
  FaMoneyBillWave, FaChartLine, FaShieldAlt, FaCheckCircle,
  FaStar, FaUsers, FaBriefcase, FaTachometerAlt, FaCamera, FaTrashAlt,
  FaAt // أيقونة @ لاسم المستخدم
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import api from '../services/apiService';

const API_BASE = 'https://tourist-app-api.onrender.com';

const ProfilePage = () => {
  const { user, updateUser, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const { 
    wallet, 
    transactions, 
    loading: walletLoading,
    deposit,
    withdraw,
    getBalance,
    getCurrency,
    loadWallet,
    loadTransactions
  } = useWallet();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [showBalance, setShowBalance] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  
  // حالة خاصة بالمرشد السياحي
  const [guideStats, setGuideStats] = useState({
    totalRevenue: 0,
    activePrograms: 0,
    totalParticipants: 0,
    loading: false
  });
  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  const lang = language;
  const t = (key) => {
    const texts = {
      ar: {
        profile: 'الملف الشخصي',
        editProfile: 'تعديل الملف',
        save: 'حفظ',
        cancel: 'إلغاء',
        fullName: 'الاسم الكامل',
        username: 'اسم المستخدم',
        email: 'البريد الإلكتروني',
        phone: 'رقم الجوال',
        address: 'العنوان',
        joinDate: 'تاريخ الانضمام',
        wallet: 'المحفظة الرقمية',
        balance: 'الرصيد الحالي',
        deposit: 'إيداع',
        withdraw: 'سحب',
        transactionHistory: 'سجل المعاملات',
        noTransactions: 'لا توجد معاملات بعد',
        amount: 'المبلغ',
        description: 'الوصف',
        date: 'التاريخ',
        type: 'النوع',
        credit: 'إيداع',
        debit: 'سحب',
        confirmDeposit: 'تأكيد الإيداع',
        confirmWithdraw: 'تأكيد السحب',
        enterAmount: 'أدخل المبلغ',
        insufficientBalance: 'الرصيد غير كافٍ',
        depositSuccess: 'تم الإيداع بنجاح',
        withdrawSuccess: 'تم السحب بنجاح',
        info: 'المعلومات الشخصية',
        walletSection: 'المحفظة',
        transactionsSection: 'المعاملات',
        sar: 'ريال سعودي',
        frozenBalance: 'رصيد مجمد',
        totalBalance: 'إجمالي الرصيد',
        stats: 'إحصائيات المحفظة',
        totalDeposits: 'إجمالي الإيداعات',
        totalWithdrawals: 'إجمالي السحوبات',
        guideDashboard: 'لوحة تحكم المرشد',
        guideRevenue: 'إيرادات البرامج',
        activePrograms: 'برامج نشطة',
        totalParticipantsShort: 'إجمالي المشاركين',
        guideStatsTitle: 'إحصائيات البرامج (مرشد)',
        goToDashboard: 'اذهب إلى لوحة التحكم',
        changeAvatar: 'تغيير الصورة',
        deleteAvatar: 'حذف الصورة'
      },
      en: {
        profile: 'Profile',
        editProfile: 'Edit Profile',
        save: 'Save',
        cancel: 'Cancel',
        fullName: 'Full Name',
        username: 'Username',
        email: 'Email',
        phone: 'Phone',
        address: 'Address',
        joinDate: 'Join Date',
        wallet: 'Digital Wallet',
        balance: 'Current Balance',
        deposit: 'Deposit',
        withdraw: 'Withdraw',
        transactionHistory: 'Transaction History',
        noTransactions: 'No transactions yet',
        amount: 'Amount',
        description: 'Description',
        date: 'Date',
        type: 'Type',
        credit: 'Credit',
        debit: 'Debit',
        confirmDeposit: 'Confirm Deposit',
        confirmWithdraw: 'Confirm Withdraw',
        enterAmount: 'Enter amount',
        insufficientBalance: 'Insufficient balance',
        depositSuccess: 'Deposit successful',
        withdrawSuccess: 'Withdrawal successful',
        info: 'Personal Info',
        walletSection: 'Wallet',
        transactionsSection: 'Transactions',
        sar: 'SAR',
        frozenBalance: 'Frozen Balance',
        totalBalance: 'Total Balance',
        stats: 'Wallet Statistics',
        totalDeposits: 'Total Deposits',
        totalWithdrawals: 'Total Withdrawals',
        guideDashboard: 'Guide Dashboard',
        guideRevenue: 'Program Revenue',
        activePrograms: 'Active Programs',
        totalParticipantsShort: 'Total Participants',
        guideStatsTitle: 'Program Statistics (Guide)',
        goToDashboard: 'Go to Dashboard',
        changeAvatar: 'Change Picture',
        deleteAvatar: 'Delete Picture'
      }
    };
    return texts[lang][key] || key;
  };

  // تحميل بيانات المحفظة
  useEffect(() => {
    if (isAuthenticated && user) {
      loadWallet();
      loadTransactions();
    }
  }, [isAuthenticated, user]);

  // تحميل إحصائيات المرشد إذا كان المستخدم مرشداً
  useEffect(() => {
    if (isGuide && user?.id) {
      fetchGuideStats();
    }
  }, [isGuide, user?.id]);

  // تحديث صورة المعاينة عند تغيير user
  useEffect(() => {
    if (user?.avatar_url) {
      const avatarUrl = user.avatar_url.startsWith('http')
        ? user.avatar_url
        : `${API_BASE}${user.avatar_url}`;
      setAvatarPreview(avatarUrl);
    } else {
      setAvatarPreview(null);
    }
  }, [user?.avatar_url]);

  const fetchGuideStats = async () => {
    setGuideStats(prev => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/guides/${user.id}/programs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      let programs = [];
      if (res.ok && data.success && Array.isArray(data.programs)) programs = data.programs;
      else if (Array.isArray(data)) programs = data;
      else if (data.data && Array.isArray(data.data)) programs = data.data;

      const activeProgs = programs.filter(p => p.status === 'active');
      const totalRevenue = activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0);
      const totalParticipants = activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0);
      setGuideStats({
        totalRevenue,
        activePrograms: activeProgs.length,
        totalParticipants,
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch guide stats:', err);
      setGuideStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (user) {
      setEditedUser({
        fullName: user.fullName || user.name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  // حفظ التغييرات (الاسم واسم المستخدم)
  const handleSave = async () => {
    try {
      const updates = {};
      if (editedUser.fullName !== (user.fullName || user.name)) {
        updates.fullName = editedUser.fullName;
      }
      if (editedUser.username !== (user.username || '')) {
        updates.username = editedUser.username;
      }
      
      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      console.log('Saving updates:', updates);
      const response = await api.updateUserProfile(user.id, updates);
      if (response.data.success) {
        const updatedUser = { ...user, ...updates };
        updateUser(updatedUser);
        // تحديث localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.fullName = updatedUser.fullName;
          userObj.username = updatedUser.username;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        toast.success('تم تحديث البيانات بنجاح');
        
        // إذا كان المستخدم مرشداً، إطلاق حدث لتحديث الصفحة الرئيسية
        if (user?.isGuide) {
          window.dispatchEvent(new CustomEvent('guideProfileUpdated', {
            detail: { 
              guideId: user.id, 
              updatedData: { 
                fullName: updates.fullName || user.fullName,
                username: updates.username || user.username,
                avatar_url: user.avatar_url 
              } 
            }
          }));
        }
      } else {
        toast.error(response.data.message || 'فشل تحديث البيانات');
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('حدث خطأ أثناء حفظ التغييرات');
    }
  };

  // رفع الصورة الشخصية
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار ملف صورة صالح');
      return;
    }
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const response = await api.uploadAvatar(user.id, formData);
      if (response.data.success) {
        const newAvatarUrl = response.data.avatarUrl;
        const updatedUser = { ...user, avatar_url: newAvatarUrl };
        updateUser(updatedUser);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.avatar_url = newAvatarUrl;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        toast.success('تم تحديث الصورة الشخصية بنجاح');
        
        // إذا كان المستخدم مرشداً، إطلاق حدث لتحديث الصفحة الرئيسية
        if (user?.isGuide) {
          window.dispatchEvent(new CustomEvent('guideProfileUpdated', {
            detail: { 
              guideId: user.id, 
              updatedData: { 
                fullName: user.fullName,
                username: user.username,
                avatar_url: newAvatarUrl 
              } 
            }
          }));
        }
      } else {
        toast.error(response.data.message || 'فشل رفع الصورة');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // حذف الصورة الشخصية
  const handleDeleteAvatar = async () => {
    if (!window.confirm('هل أنت متأكد من حذف الصورة الشخصية؟')) return;
    setUploadingAvatar(true);
    try {
      const response = await api.deleteAvatar(user.id);
      if (response.data.success) {
        const updatedUser = { ...user, avatar_url: null };
        updateUser(updatedUser);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.avatar_url = null;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        setAvatarPreview(null);
        toast.success('تم حذف الصورة الشخصية');
        
        if (user?.isGuide) {
          window.dispatchEvent(new CustomEvent('guideProfileUpdated', {
            detail: { 
              guideId: user.id, 
              updatedData: { 
                fullName: user.fullName,
                username: user.username,
                avatar_url: null 
              } 
            }
          }));
        }
      } else {
        toast.error(response.data.message || 'فشل حذف الصورة');
      }
    } catch (error) {
      console.error('Avatar delete error:', error);
      toast.error('حدث خطأ أثناء حذف الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // دوال المحفظة
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }
    setProcessing(true);
    const result = await deposit(amount, `إيداع نقدي ${amount} ${getCurrency()}`);
    if (result.success) {
      setDepositAmount('');
      setShowDepositModal(false);
    }
    setProcessing(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }
    if (amount > getBalance()) {
      toast.error(t('insufficientBalance'));
      return;
    }
    setProcessing(true);
    const result = await withdraw(amount, `سحب نقدي ${amount} ${getCurrency()}`);
    if (result.success) {
      setWithdrawAmount('');
      setShowWithdrawModal(false);
    }
    setProcessing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayName = user?.fullName?.trim() || (lang === 'ar' ? 'مستخدم' : 'User');
  const displayUsername = user?.username?.trim();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 flex items-center justify-center">
        <p className="text-white">الرجاء تسجيل الدخول أولاً</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('profile')}</h1>
            <p className="text-white/60 text-sm">{lang === 'ar' ? 'مرحباً' : 'Welcome'} {displayName}</p>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition flex items-center gap-2"
              >
                <FaEdit /> {t('editProfile')}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition flex items-center gap-2"
                >
                  <FaSave /> {t('save')}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition flex items-center gap-2"
                >
                  <FaTimes /> {t('cancel')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* بطاقة الرصيد (محفظة) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 mb-6 shadow-xl"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <FaWallet className="text-white text-2xl" />
              </div>
              <div>
                <p className="text-white/80 text-sm">{t('wallet')}</p>
                <div className="flex items-center gap-2">
                  <span className="text-white text-3xl font-bold">
                    {showBalance ? `${getBalance()} ${getCurrency()}` : '••••••'}
                  </span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-white/70 hover:text-white"
                  >
                    {showBalance ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {wallet?.frozenBalance > 0 && (
                  <p className="text-white/60 text-xs">
                    {t('frozenBalance')}: {wallet.frozenBalance} {getCurrency()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition flex items-center gap-2 backdrop-blur"
              >
                <FaArrowDown /> {t('deposit')}
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition flex items-center gap-2 backdrop-blur"
              >
                <FaArrowUp /> {t('withdraw')}
              </button>
            </div>
          </div>
        </motion.div>

        {/* بطاقة إحصائيات المرشد (تظهر فقط إذا كان المستخدم مرشداً) */}
        {isGuide && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 mb-6 shadow-xl"
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <FaStar className="text-white text-2xl" />
                </div>
                <div>
                  <p className="text-white/80 text-sm">{t('guideStatsTitle')}</p>
                  <div className="flex flex-wrap gap-4 mt-1">
                    <div>
                      <span className="text-white text-xl font-bold">{guideStats.totalRevenue} {getCurrency()}</span>
                      <p className="text-white/60 text-xs">{t('guideRevenue')}</p>
                    </div>
                    <div>
                      <span className="text-white text-xl font-bold">{guideStats.activePrograms}</span>
                      <p className="text-white/60 text-xs">{t('activePrograms')}</p>
                    </div>
                    <div>
                      <span className="text-white text-xl font-bold">{guideStats.totalParticipants}</span>
                      <p className="text-white/60 text-xs">{t('totalParticipantsShort')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/guide-dashboard'}
                className="px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition flex items-center gap-2"
              >
                <FaTachometerAlt /> {t('goToDashboard')}
              </button>
            </div>
          </motion.div>
        )}

        {/* تبويبات */}
        <div className="flex gap-2 mb-6 bg-white/10 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 rounded-lg transition ${activeTab === 'info' ? 'bg-teal-500 text-white' : 'text-white/70 hover:bg-white/10'}`}
          >
            {t('info')}
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 py-2 rounded-lg transition ${activeTab === 'wallet' ? 'bg-teal-500 text-white' : 'text-white/70 hover:bg-white/10'}`}
          >
            {t('walletSection')}
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 rounded-lg transition ${activeTab === 'transactions' ? 'bg-teal-500 text-white' : 'text-white/70 hover:bg-white/10'}`}
          >
            {t('transactionsSection')}
          </button>
        </div>

        {/* المحتوى حسب التبويب */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          {/* تبويب المعلومات الشخصية - يظهر الاسم، اسم المستخدم، البريد، الجوال */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* صورة الملف الشخصي */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-4xl font-bold overflow-hidden shadow-xl">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      displayName?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 flex gap-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-full shadow-lg transition"
                      disabled={uploadingAvatar}
                      title={t('changeAvatar')}
                    >
                      <FaCamera size={14} />
                    </button>
                    {avatarPreview && (
                      <button
                        onClick={handleDeleteAvatar}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition"
                        disabled={uploadingAvatar}
                        title={t('deleteAvatar')}
                      >
                        <FaTrashAlt size={14} />
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    onChange={handleAvatarChange}
                  />
                </div>
                {uploadingAvatar && (
                  <div className="mt-2 flex items-center gap-1 text-white/70 text-sm">
                    <FaSpinner className="animate-spin" /> جاري رفع الصورة...
                  </div>
                )}
              </div>

              {/* الحقول: الاسم، اسم المستخدم، البريد، الجوال، العنوان، تاريخ الانضمام */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/70 text-sm mb-1">{t('fullName')}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.fullName}
                      onChange={(e) => setEditedUser({ ...editedUser, fullName: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-400"
                    />
                  ) : (
                    <p className="text-white text-lg">{displayName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-1 flex items-center gap-1">
                    <FaAt size={12} /> {t('username')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.username}
                      onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-400"
                      placeholder={lang === 'ar' ? 'اختياري' : 'optional'}
                    />
                  ) : (
                    <p className="text-white">{displayUsername || (lang === 'ar' ? '—' : '—')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-1">{t('email')}</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedUser.email}
                      onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-400"
                    />
                  ) : (
                    <p className="text-white">{user.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-1">{t('phone')}</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedUser.phone}
                      onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-400"
                    />
                  ) : (
                    <p className="text-white">{user.phone || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-1">{t('address')}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.address}
                      onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-400"
                    />
                  ) : (
                    <p className="text-white">{user.address || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-1">{t('joinDate')}</label>
                  <p className="text-white">{new Date(user.createdAt || user.created_at || Date.now()).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* تبويب المحفظة (إحصائيات) */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <FaMoneyBillWave className="text-teal-400 text-2xl mx-auto mb-2" />
                  <p className="text-white/60 text-sm">{t('totalDeposits')}</p>
                  <p className="text-white text-xl font-bold">{wallet?.stats?.totalDeposits || 0} {getCurrency()}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <FaArrowUp className="text-red-400 text-2xl mx-auto mb-2" />
                  <p className="text-white/60 text-sm">{t('totalWithdrawals')}</p>
                  <p className="text-white text-xl font-bold">{wallet?.stats?.totalWithdrawals || 0} {getCurrency()}</p>
                </div>
              </div>
              <div className="bg-teal-500/20 rounded-xl p-4 flex items-center gap-3">
                <FaShieldAlt className="text-teal-400 text-2xl" />
                <div>
                  <p className="text-white/80 text-sm">الحماية والأمان</p>
                  <p className="text-white text-xs">جميع معاملاتك مشفرة ومحمية بنظام دفع آمن</p>
                </div>
              </div>
            </div>
          )}

          {/* تبويب سجل المعاملات */}
          {activeTab === 'transactions' && (
            <div>
              {walletLoading ? (
                <div className="flex justify-center py-8"><FaSpinner className="animate-spin text-teal-400 text-2xl" /></div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((tx, idx) => (
                    <motion.div
                      key={tx._id || idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`bg-white/10 rounded-xl p-3 border-r-4 ${tx.type === 'credit' ? 'border-green-400' : 'border-red-400'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            {tx.type === 'credit' ? <FaArrowDown className="text-green-400" /> : <FaArrowUp className="text-red-400" />}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{tx.description}</p>
                            <p className="text-white/40 text-xs">{formatDate(tx.createdAt)}</p>
                          </div>
                        </div>
                        <div className={`font-bold ${tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.type === 'credit' ? '+' : '-'} {tx.amount} {getCurrency()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/50">
                  <FaHistory className="text-3xl mx-auto mb-2" />
                  <p>{t('noTransactions')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal الإيداع */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDepositModal(false)}>
          <div className="bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">{t('confirmDeposit')}</h3>
            </div>
            <div className="p-6">
              <label className="block text-white/70 mb-2">{t('amount')} ({getCurrency()})</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={t('enterAmount')}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-teal-400"
                min="1"
                step="1"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleDeposit}
                  disabled={processing}
                  className="flex-1 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
                >
                  {processing ? <FaSpinner className="animate-spin mx-auto" /> : t('confirm')}
                </button>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal السحب */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowWithdrawModal(false)}>
          <div className="bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">{t('confirmWithdraw')}</h3>
            </div>
            <div className="p-6">
              <label className="block text-white/70 mb-2">{t('amount')} ({getCurrency()})</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={t('enterAmount')}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-red-400"
                min="1"
                step="1"
              />
              <p className="text-white/50 text-xs mt-1">الرصيد المتاح: {getBalance()} {getCurrency()}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleWithdraw}
                  disabled={processing}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  {processing ? <FaSpinner className="animate-spin mx-auto" /> : t('confirm')}
                </button>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

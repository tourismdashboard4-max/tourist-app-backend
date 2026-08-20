// client/src/pages/ProfileDataPage.jsx
// ✅ إصدار معدل – تغيير الاسم بدون OTP، تغيير البريد والجوال يتطلب OTP
// ✅ بعد التحقق من OTP، يتم تحديث البيانات محلياً باستخدام استجابة الخادم مباشرة
// ✅ إضافة useEffect لمزامنة userData مع authUser و propUser
// ✅ إطلاق حدث window.profileUpdated عند نجاح التحديث لإعلام المكونات الأخرى
// ✅ إزالة fetchFreshUserData بعد تحديث الاسم لمنع إعادة الكتابة بالبيانات القديمة

import React, { useState, useEffect } from 'react';
import {
  User, Edit2, Camera, Mail, Phone, ArrowLeft,
  Save, ArrowUpCircle, ArrowDownCircle, Wallet, AlertCircle, Receipt,
  X, CheckCircle, Shield, Clock, TrendingUp, TrendingDown, Ticket, Smartphone, CreditCard,
  Plus, Trash2, Banknote, AtSign
} from 'lucide-react';
import { FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import api from '../services/api';

const API_BASE_URL = 'https://tourist-app-api.onrender.com';

const isApplePayAvailable = () => window.ApplePaySession && ApplePaySession.canMakePayments();
const isSamsungWalletAvailable = () => {
  return typeof window !== 'undefined' && 
    (window.SamsungPay !== undefined || 
     window.SamsungWallet !== undefined ||
     (window.navigator && window.navigator.samsungWallet));
};

const DEPOSIT_CARD = {
  id: 'merchant_visa',
  number: '408859005066386',
  holder: 'HALA MERCHANT 7111',
  type: 'visa',
  isMerchant: true,
  label: { ar: 'بطاقة التاجر (فيزا)', en: 'Merchant Visa Card' }
};

const WITHDRAW_CARD = {
  id: 'merchant_mada',
  number: '9682120052427996',
  holder: 'HALA MERCHANT 3339',
  type: 'mada',
  isMerchant: true,
  label: { ar: 'حساب التاجر (مدى)', en: 'Merchant Mada Account' }
};

function ProfileDataPage({ lang, user: propUser, setPage, onUpdateUser }) {
  const { user: authUser, updateUser } = useAuth();
  const { 
    balance, 
    getBalance, 
    loadWallet, 
    deposit, 
    withdraw, 
    hold,           
    release, 
    loading: walletLoading  
  } = useWallet();
  
  const [userData, setUserData] = useState(propUser || authUser || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ 
    fullName: '', 
    phone: '', 
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // حالة OTP
  const [otpStep, setOtpStep] = useState('idle'); // idle | sending | sent | verifying | verified
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [pendingUpdates, setPendingUpdates] = useState(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isSavingAfterOtp, setIsSavingAfterOtp] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState(''); // 'email' (دائماً بريد)

  // States for modals (wallet, bank accounts, etc.)
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addBalanceLoading, setAddBalanceLoading] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmAmount, setConfirmAmount] = useState(0);
  const [showInvoices, setShowInvoices] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showAddBankAccount, setShowAddBankAccount] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState({ accountName: '', accountNumber: '', bankName: '' });
  const [addingBankAccount, setAddingBankAccount] = useState(false);
  const [selectedWithdrawAccount, setSelectedWithdrawAccount] = useState(null);

  const currentLoggedInUser = authUser || (() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  })();
  const isOwnProfile = currentLoggedInUser?.id === userData?.id;
  const isGuide = userData?.type === 'guide' || userData?.role === 'guide' || userData?.isGuide === true;

  // ====================== Effects ======================
  
  // 🔥 مزامنة userData مع authUser و propUser عند تغيرهما
  useEffect(() => {
    const sourceUser = propUser || authUser;
    if (sourceUser && (!userData || sourceUser.id === userData.id)) {
      setUserData(prev => {
        if (!prev || prev.id === sourceUser.id) {
          return { ...prev, ...sourceUser };
        }
        return prev;
      });
    }
  }, [authUser, propUser]);

  useEffect(() => {
    if (isOwnProfile && userData?.id) loadWallet();
  }, [isOwnProfile, userData?.id]);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!userData?.id || !isOwnProfile) return;
      try {
        const stored = localStorage.getItem(`user_bank_accounts_${userData.id}`);
        if (stored) {
          const accounts = JSON.parse(stored);
          setBankAccounts(accounts);
          if (accounts.length > 0 && !selectedWithdrawAccount) {
            setSelectedWithdrawAccount(accounts[0]);
          }
        } else {
          setBankAccounts([]);
        }
      } catch (error) {
        console.error('Failed to fetch bank accounts:', error);
        setBankAccounts([]);
      }
    };
    fetchBankAccounts();
  }, [userData?.id, isOwnProfile]);

  useEffect(() => {
    if (userData?.id && isOwnProfile) {
      if (bankAccounts.length) {
        localStorage.setItem(`user_bank_accounts_${userData.id}`, JSON.stringify(bankAccounts));
      } else {
        localStorage.removeItem(`user_bank_accounts_${userData.id}`);
      }
    }
  }, [bankAccounts, userData?.id, isOwnProfile]);

  // 🔥 دالة جلب بيانات محدثة – لن يتم استدعاؤها بعد تغيير الاسم مباشرة
  const fetchFreshUserData = async (skipUpdate = false) => {
    if (!userData?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/${userData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-cache'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const freshUser = data.user;
          const updatedUser = { ...userData, ...freshUser };
          setUserData(updatedUser);
          if (!skipUpdate && updateUser && isOwnProfile) {
            // فقط نحدث إذا كان هناك تغيير فعلي في الاسم
            if (updatedUser.fullName !== userData.fullName) {
              updateUser(updatedUser);
            }
          }
          if (isOwnProfile) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const userObj = JSON.parse(storedUser);
              userObj.fullName = updatedUser.fullName;
              userObj.avatar_url = updatedUser.avatar_url;
              userObj.username = updatedUser.username;
              userObj.email = updatedUser.email;
              localStorage.setItem('user', JSON.stringify(userObj));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch fresh user data:', error);
    }
  };

  // ⚠️ تم تعطيل جلب البيانات التلقائي عند تحميل المكون لتجنب التضارب
  // useEffect(() => {
  //   if (userData?.id) fetchFreshUserData();
  // }, [userData?.id]);

  useEffect(() => {
    if (userData?.avatar_url) {
      const avatarUrl = userData.avatar_url.startsWith('http') 
        ? userData.avatar_url 
        : `${API_BASE_URL}${userData.avatar_url}`;
      setAvatarPreview(avatarUrl);
    } else {
      setAvatarPreview(null);
    }
  }, [userData?.avatar_url]);

  // ====================== Handlers ======================
  const handleEditToggle = () => { 
    if (!isOwnProfile) return;
    setIsEditing(!isEditing); 
    setUpdateSuccess(false);
    setShowOtpInput(false);
    setOtpStep('idle');
    setOtpCode('');
    setPendingUpdates(null);
    setOtpSentTo('');
    if (!isEditing && userData) {
      setEditData({
        fullName: userData.fullName || '',
        phone: userData.phone || '',
        email: userData.email || ''
      });
    }
  };
  
  useEffect(() => { 
    if (!isEditing && userData && isOwnProfile) {
      setEditData({ 
        fullName: userData.fullName || '', 
        phone: userData.phone || '',
        email: userData.email || ''
      });
    }
  }, [isEditing, userData, isOwnProfile]);
  
  const handleInputChange = (e) => { 
    const { name, value } = e.target; 
    setEditData(prev => ({ ...prev, [name]: value })); 
  };

  // ============================================================
  // ✅ MAIN SAVE PROFILE - تغيير الاسم بدون OTP، البريد والجوال يحتاجان OTP
  // ============================================================
  const handleSaveProfile = async () => {
    if (!isOwnProfile) return;
    if (saveLoading || isSavingAfterOtp) {
      console.log('⏳ Save already in progress, ignoring...');
      return;
    }

    console.log('🔍 [handleSaveProfile] Starting...');
    console.log('🔍 Current userData:', userData);
    console.log('🔍 editData:', editData);

    const profileUpdates = {};
    let hasProfileChanges = false;
    let isEmailChange = false;
    let isPhoneChange = false;
    let isNameChange = false;

    // الاسم
    const newFullName = editData.fullName?.trim() || '';
    const currentFullName = userData.fullName?.trim() || '';
    if (newFullName !== currentFullName) {
      profileUpdates.full_name = newFullName;
      hasProfileChanges = true;
      isNameChange = true;
      console.log('✅ Name changed from:', currentFullName, 'to:', newFullName);
    }

    // البريد الإلكتروني
    const newEmail = editData.email?.trim() || '';
    const oldEmail = userData.email?.trim() || '';
    if (newEmail.toLowerCase() !== oldEmail.toLowerCase()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        toast.error(lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format');
        return;
      }
      profileUpdates.email = newEmail;
      hasProfileChanges = true;
      isEmailChange = true;
      console.log('✅ Email changed from:', oldEmail, 'to:', newEmail);
    }

    // رقم الجوال
    const rawPhone = editData.phone || '';
    const cleanPhone = rawPhone.replace(/[^\d+]/g, '').trim();
    const currentPhone = userData.phone || '';
    if (cleanPhone !== currentPhone) {
      if (cleanPhone !== '' || currentPhone !== '') {
        const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
        if (!saudiPhoneRegex.test(cleanPhone)) {
          toast.error(lang === 'ar' ? 'رقم الجوال غير صحيح' : 'Invalid phone number');
          return;
        }
        profileUpdates.phone = cleanPhone;
        hasProfileChanges = true;
        isPhoneChange = true;
        console.log('✅ Phone changed from:', userData.phone, 'to:', cleanPhone);
      }
    }

    if (!hasProfileChanges) {
      toast(lang === 'ar' ? 'لا توجد تغييرات لحفظها' : 'No changes to save', { icon: 'ℹ️' });
      setIsEditing(false);
      return;
    }

    console.log('📦 Profile updates:', profileUpdates);
    console.log('📦 isNameChange:', isNameChange, 'isEmailChange:', isEmailChange, 'isPhoneChange:', isPhoneChange);

    // ✅ إذا كان التغيير فقط في الاسم (بدون تغيير البريد أو الجوال)
    if (isNameChange && !isEmailChange && !isPhoneChange) {
      console.log('🔄 تغيير الاسم فقط - سيتم التحديث بدون OTP');
      setSaveLoading(true);
      try {
        const profileResult = await api.updateUserProfile(userData.id, profileUpdates);
        console.log('📥 Server response (name only):', JSON.stringify(profileResult, null, 2));
        if (!profileResult.success) {
          throw new Error(profileResult.message || 'فشل تحديث الملف الشخصي');
        }
        // تحديث البيانات من استجابة الخادم
        let updatedUser = { ...userData };
        if (profileResult.user) {
          const serverUser = profileResult.user;
          updatedUser = {
            ...userData,
            fullName: serverUser.full_name || userData.fullName,
            email: serverUser.email || userData.email,
            phone: serverUser.phone || userData.phone,
            avatar_url: serverUser.avatar_url || userData.avatar_url,
          };
        } else {
          if (profileUpdates.full_name !== undefined) {
            updatedUser.fullName = profileUpdates.full_name;
          }
        }
        console.log('✅ Updated user data from server:', updatedUser);
        
        // تحديث الحالة المحلية
        setUserData(updatedUser);
        setUpdateSuccess(true);
        setIsEditing(false);
        setShowOtpInput(false);
        setOtpStep('verified');
        setOtpCode('');
        setPendingUpdates(null);
        setOtpSentTo('');
        
        // تحديث السياق و localStorage
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        
        // تحديث localStorage يدوياً (ضمان)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.fullName = updatedUser.fullName;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        
        toast.success(lang === 'ar' ? '✅ تم تحديث البيانات بنجاح' : '✅ Profile updated successfully');
        
        // 🔥 إطلاق حدث لتحديث المكونات الأخرى
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { 
            userId: userData.id, 
            updatedData: updatedUser 
          }
        }));

        // 🔥 لا نقوم بجلب البيانات من الخادم مرة أخرى لتجنب إعادة الكتابة بالبيانات القديمة
        // fetchFreshUserData(true); // تم إلغاء استدعاء هذه الدالة
        
        setSaveLoading(false);
        return;
      } catch (error) {
        console.error('❌ Error updating name:', error);
        toast.error(error.message || (lang === 'ar' ? 'فشل تحديث الاسم' : 'Failed to update name'));
        setSaveLoading(false);
        return;
      }
    }

    // ✅ إذا كان هناك تغيير في البريد أو الجوال (يتطلب OTP)
    // نتبع التدفق الأصلي
    setPendingUpdates(profileUpdates);
    setShowOtpInput(true);
    setSaveLoading(true);

    try {
      if (isEmailChange && oldEmail) {
        console.log(`📤 Step 1: Sending OTP to old email: ${oldEmail}`);
        setOtpStep('sending_old');
        setOtpSentTo('email_old');
        const response = await api.sendOTP(oldEmail, 'verify_old_email');
        if (response && response.success) {
          setOtpStep('sent_old');
          setOtpCountdown(60);
          toast.success(
            lang === 'ar'
              ? `✅ تم إرسال رمز التحقق إلى بريدك الحالي ${oldEmail} لتأكيد الهوية`
              : `✅ Verification code sent to your current email ${oldEmail} to confirm identity`,
            { duration: 6000 }
          );
        } else {
          throw new Error(response?.message || 'فشل إرسال رمز التحقق إلى البريد الحالي');
        }
      } else if (oldEmail) {
        console.log(`📤 Sending OTP to current email: ${oldEmail} for identity verification`);
        setOtpStep('sending');
        setOtpSentTo('email');
        const response = await api.sendOTP(oldEmail, 'profile_update');
        if (response && response.success) {
          setOtpStep('sent');
          setOtpCountdown(60);
          toast.success(
            lang === 'ar'
              ? `✅ تم إرسال رمز التحقق إلى بريدك ${oldEmail} لتأكيد التغييرات`
              : `✅ Verification code sent to your email ${oldEmail} to confirm changes`,
            { duration: 6000 }
          );
        } else {
          throw new Error(response?.message || 'فشل إرسال رمز التحقق إلى البريد');
        }
      } else {
        throw new Error(lang === 'ar' ? 'لا يوجد بريد إلكتروني مسجل لإرسال رمز التحقق' : 'No registered email to send verification code');
      }
    } catch (error) {
      console.error('❌ OTP send error:', error);
      setOtpStep('idle');
      setShowOtpInput(false);
      toast.error(
        lang === 'ar'
          ? '❌ ' + (error.message || 'حدث خطأ أثناء إرسال رمز التحقق')
          : '❌ ' + (error.message || 'Error sending verification code')
      );
    } finally {
      setSaveLoading(false);
    }
  };

  // ============================================================
  // ✅ التحقق من OTP وتطبيق التغييرات (مع دعم الخطوتين للبريد)
  // ============================================================
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) {
      toast.error(lang === 'ar' ? 'الرجاء إدخال الرمز' : 'Please enter the code');
      return;
    }
    if (!pendingUpdates) {
      toast.error(lang === 'ar' ? 'لا توجد تغييرات معلقة' : 'No pending changes');
      return;
    }

    const isOldStep = otpStep === 'sent_old' || otpStep === 'verifying_old';
    const isNewStep = otpStep === 'sent_new' || otpStep === 'verifying_new';
    const isSingleStep = otpStep === 'sent' || otpStep === 'verifying';

    setOtpStep(prev => {
      if (prev === 'sent_old' || prev === 'verifying_old') return 'verifying_old';
      if (prev === 'sent_new' || prev === 'verifying_new') return 'verifying_new';
      if (prev === 'sent' || prev === 'verifying') return 'verifying';
      return prev;
    });

    setIsSavingAfterOtp(true);

    try {
      let verifyResult = null;
      const profileUpdates = { ...pendingUpdates };
      const oldEmail = userData.email?.trim() || '';
      const newEmail = profileUpdates.email || oldEmail;

      // الخطوة 1: التحقق من البريد القديم (إذا كنا في وضع تغيير البريد)
      if (isOldStep && oldEmail) {
        console.log(`🔐 Verifying old email OTP for: ${oldEmail}`);
        verifyResult = await api.verifyOTP(oldEmail, otpCode, 'verify_old_email');
        if (!verifyResult || !verifyResult.success) {
          throw new Error(verifyResult?.message || 'رمز التحقق من البريد الحالي غير صحيح');
        }
        console.log(`✅ Old email verified. Now sending OTP to new email: ${newEmail}`);
        setOtpStep('sending_new');
        setOtpSentTo('email_new');
        setOtpCode('');
        const response = await api.sendOTP(newEmail, 'verify_new_email');
        if (response && response.success) {
          setOtpStep('sent_new');
          setOtpCountdown(60);
          toast.success(
            lang === 'ar'
              ? `✅ تم إرسال رمز التحقق إلى بريدك الجديد ${newEmail} لتأكيد الملكية`
              : `✅ Verification code sent to your new email ${newEmail} to confirm ownership`,
            { duration: 6000 }
          );
        } else {
          throw new Error(response?.message || 'فشل إرسال رمز التحقق إلى البريد الجديد');
        }
        setIsSavingAfterOtp(false);
        return;
      }

      // الخطوة 2: التحقق من البريد الجديد (في حالة تغيير البريد)
      if (isNewStep && newEmail) {
        console.log(`🔐 Verifying new email OTP for: ${newEmail}`);
        verifyResult = await api.verifyOTP(newEmail, otpCode, 'verify_new_email');
        if (!verifyResult || !verifyResult.success) {
          throw new Error(verifyResult?.message || 'رمز التحقق من البريد الجديد غير صحيح');
        }
        console.log(`✅ New email verified. Applying updates...`);
        console.log('📤 Sending data to server:', JSON.stringify(profileUpdates));
        const profileResult = await api.updateUserProfile(userData.id, profileUpdates);
        console.log('📥 Server response:', JSON.stringify(profileResult, null, 2));
        if (!profileResult.success) {
          throw new Error(profileResult.message || 'فشل تحديث الملف الشخصي');
        }
        // تحديث البيانات من استجابة الخادم
        let updatedUser = { ...userData };
        if (profileResult.user) {
          const serverUser = profileResult.user;
          updatedUser = {
            ...userData,
            fullName: serverUser.full_name || userData.fullName,
            email: serverUser.email || userData.email,
            phone: serverUser.phone || userData.phone,
            avatar_url: serverUser.avatar_url || userData.avatar_url,
          };
        } else {
          if (profileUpdates.full_name !== undefined) {
            updatedUser.fullName = profileUpdates.full_name;
          }
          if (profileUpdates.email) updatedUser.email = profileUpdates.email;
          if (profileUpdates.phone) updatedUser.phone = profileUpdates.phone;
        }
        console.log('✅ Updated user data from server:', updatedUser);
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        // تحديث localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.fullName = updatedUser.fullName;
          if (updatedUser.email) userObj.email = updatedUser.email;
          if (updatedUser.phone) userObj.phone = updatedUser.phone;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        toast.success(lang === 'ar' ? '✅ تم تحديث البيانات بنجاح' : '✅ Profile updated successfully');
        setUpdateSuccess(true);
        setIsEditing(false);
        setShowOtpInput(false);
        setOtpStep('verified');
        setOtpCode('');
        setPendingUpdates(null);
        setOtpSentTo('');
        // لا نستدعي fetchFreshUserData هنا لتجنب إعادة الكتابة
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { 
            userId: userData.id, 
            updatedData: updatedUser 
          }
        }));
        setIsSavingAfterOtp(false);
        return;
      }

      // الخطوة الفردية (تغيير الجوال فقط أو الاسم+الجوال معاً): تحقق من البريد الحالي
      if (isSingleStep && oldEmail) {
        console.log(`🔐 Verifying OTP for: ${oldEmail}`);
        verifyResult = await api.verifyOTP(oldEmail, otpCode, 'profile_update');
        if (!verifyResult || !verifyResult.success) {
          throw new Error(verifyResult?.message || 'رمز التحقق غير صحيح');
        }
        console.log(`✅ OTP verified. Applying updates...`);
        console.log('📤 Sending data to server:', JSON.stringify(profileUpdates));
        const profileResult = await api.updateUserProfile(userData.id, profileUpdates);
        console.log('📥 Server response:', JSON.stringify(profileResult, null, 2));
        if (!profileResult.success) {
          throw new Error(profileResult.message || 'فشل تحديث الملف الشخصي');
        }
        let updatedUser = { ...userData };
        if (profileResult.user) {
          const serverUser = profileResult.user;
          updatedUser = {
            ...userData,
            fullName: serverUser.full_name || userData.fullName,
            email: serverUser.email || userData.email,
            phone: serverUser.phone || userData.phone,
            avatar_url: serverUser.avatar_url || userData.avatar_url,
          };
        } else {
          if (profileUpdates.full_name !== undefined) {
            updatedUser.fullName = profileUpdates.full_name;
          }
          if (profileUpdates.email) updatedUser.email = profileUpdates.email;
          if (profileUpdates.phone) updatedUser.phone = profileUpdates.phone;
        }
        console.log('✅ Updated user data from server:', updatedUser);
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.fullName = updatedUser.fullName;
          if (updatedUser.email) userObj.email = updatedUser.email;
          if (updatedUser.phone) userObj.phone = updatedUser.phone;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        toast.success(lang === 'ar' ? '✅ تم تحديث البيانات بنجاح' : '✅ Profile updated successfully');
        setUpdateSuccess(true);
        setIsEditing(false);
        setShowOtpInput(false);
        setOtpStep('verified');
        setOtpCode('');
        setPendingUpdates(null);
        setOtpSentTo('');
        // لا نستدعي fetchFreshUserData هنا
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { 
            userId: userData.id, 
            updatedData: updatedUser 
          }
        }));
        setIsSavingAfterOtp(false);
        return;
      }

      throw new Error('خطأ في تدفق التحقق');
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      if (otpStep === 'verifying_old') setOtpStep('sent_old');
      else if (otpStep === 'verifying_new') setOtpStep('sent_new');
      else if (otpStep === 'verifying') setOtpStep('sent');
      const errorMsg = error.message || (lang === 'ar' ? 'فشل التحقق من الرمز' : 'Verification failed');
      toast.error(errorMsg);
      setIsSavingAfterOtp(false);
    }
  };

  // ============================================================
  // ✅ إعادة إرسال الرمز (حسب الخطوة الحالية)
  // ============================================================
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;

    const oldEmail = userData.email?.trim() || '';
    const newEmail = pendingUpdates?.email || oldEmail;

    setOtpStep(prev => {
      if (prev === 'sent_old' || prev === 'verifying_old') return 'sending_old';
      if (prev === 'sent_new' || prev === 'verifying_new') return 'sending_new';
      if (prev === 'sent' || prev === 'verifying') return 'sending';
      return prev;
    });

    try {
      let response = null;
      if (otpStep === 'sent_old' || otpStep === 'verifying_old') {
        response = await api.sendOTP(oldEmail, 'verify_old_email');
        if (response && response.success) {
          setOtpStep('sent_old');
          setOtpCountdown(60);
          toast.success(lang === 'ar' ? '✅ تم إعادة إرسال رمز التحقق إلى بريدك الحالي' : '✅ Resent code to your current email');
        } else {
          throw new Error(response?.message || 'فشل إعادة الإرسال');
        }
      } else if (otpStep === 'sent_new' || otpStep === 'verifying_new') {
        response = await api.sendOTP(newEmail, 'verify_new_email');
        if (response && response.success) {
          setOtpStep('sent_new');
          setOtpCountdown(60);
          toast.success(lang === 'ar' ? '✅ تم إعادة إرسال رمز التحقق إلى بريدك الجديد' : '✅ Resent code to your new email');
        } else {
          throw new Error(response?.message || 'فشل إعادة الإرسال');
        }
      } else if (otpStep === 'sent' || otpStep === 'verifying') {
        response = await api.sendOTP(oldEmail, 'profile_update');
        if (response && response.success) {
          setOtpStep('sent');
          setOtpCountdown(60);
          toast.success(lang === 'ar' ? '✅ تم إعادة إرسال رمز التحقق إلى بريدك' : '✅ Resent code to your email');
        } else {
          throw new Error(response?.message || 'فشل إعادة الإرسال');
        }
      } else {
        toast.error(lang === 'ar' ? 'لا توجد وجهة لإعادة الإرسال' : 'No destination to resend');
        return;
      }
    } catch (error) {
      console.error('Resend error:', error);
      if (otpStep === 'sending_old') setOtpStep('sent_old');
      else if (otpStep === 'sending_new') setOtpStep('sent_new');
      else if (otpStep === 'sending') setOtpStep('sent');
      toast.error(error.message || (lang === 'ar' ? 'فشل إعادة الإرسال' : 'Resend failed'));
    }
  };

  // ============================================================
  // AVATAR
  // ============================================================
  const handleAvatarChange = async (e) => {
    if (!isOwnProfile) return;
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(lang === 'ar' ? 'حجم الصورة يجب أن لا يتجاوز 2 ميجابايت' : 'Image size must be less than 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error(lang === 'ar' ? 'الرجاء اختيار ملف صورة صالح' : 'Please select a valid image file');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/${userData.id}/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        const updatedUser = { ...userData, avatar_url: data.avatarUrl };
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.avatar_url = data.avatarUrl;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        if (isGuide) {
          window.dispatchEvent(new CustomEvent('guideProfileUpdated', {
            detail: { 
              guideId: userData.id, 
              updatedData: { 
                fullName: userData.fullName,
                avatar_url: data.avatarUrl 
              } 
            }
          }));
        }
        toast.success(lang === 'ar' ? 'تم تحديث الصورة الشخصية بنجاح' : 'Profile picture updated successfully');
      } else {
        toast.error(data.message || (lang === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image'));
      }
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!isOwnProfile) return;
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف الصورة الشخصية؟' : 'Are you sure you want to delete your profile picture?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/${userData.id}/avatar`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAvatarPreview(null);
        const updatedUser = { ...userData, avatar_url: null };
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.avatar_url = null;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        if (isGuide) {
          window.dispatchEvent(new CustomEvent('guideProfileUpdated', {
            detail: { 
              guideId: userData.id, 
              updatedData: { 
                fullName: userData.fullName,
                avatar_url: null 
              } 
            }
          }));
        }
        toast.success(lang === 'ar' ? 'تم حذف الصورة الشخصية' : 'Profile picture deleted');
      } else {
        toast.error(data.message || (lang === 'ar' ? 'فشل حذف الصورة' : 'Failed to delete image'));
      }
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // WALLET / DEPOSIT / WITHDRAW (نفسها دون تغيير)
  // ============================================================
  const handleMerchantDeposit = async (amount) => {
    if (!isOwnProfile) return;
    setAddBalanceLoading(true);
    try {
      await deposit(amount, {
        method: 'merchant_card',
        cardNumber: DEPOSIT_CARD.number,
        cardHolder: DEPOSIT_CARD.holder
      });
      toast.success(
        lang === 'ar' 
          ? `✅ تم إضافة ${amount} ريال بنجاح. الرصيد الحالي: ${getBalance()}` 
          : `✅ Added ${amount} SAR successfully. New balance: ${getBalance()}`
      );
      setShowAddBalance(false);
      setAddAmount('');
      await loadWallet();
    } catch (error) {
      console.error(error);
      toast.error(error.message || (lang === 'ar' ? 'فشل الإضافة' : 'Failed to add funds'));
    } finally {
      setAddBalanceLoading(false);
    }
  };

  const handleApplePayDeposit = async (amount) => {
    if (!isOwnProfile) return;
    if (!isApplePayAvailable()) {
      toast.error(lang === 'ar' ? 'Apple Pay غير متوفر على هذا الجهاز' : 'Apple Pay not available');
      return;
    }
    setAddBalanceLoading(true);
    try {
      const token = localStorage.getItem('token');
      const sessionRes = await fetch(`${API_BASE_URL}/api/payments/apple-pay/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount, currency: 'SAR' })
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.message || 'Failed to create Apple Pay session');

      const request = {
        countryCode: 'SA',
        currencyCode: 'SAR',
        supportedNetworks: ['mada', 'visa', 'masterCard'],
        merchantCapabilities: ['supports3DS'],
        total: { label: 'رصيد تطبيق السائح', amount: amount.toString() }
      };

      const session = new ApplePaySession(3, request);
      session.onvalidatemerchant = async (event) => {
        try {
          const validationRes = await fetch(`${API_BASE_URL}/api/payments/apple-pay/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ validationUrl: event.validationURL })
          });
          const merchantSession = await validationRes.json();
          session.completeMerchantValidation(merchantSession);
        } catch (err) {
          session.abort();
          toast.error(lang === 'ar' ? 'فشل التحقق من التاجر' : 'Merchant validation failed');
        }
      };

      session.onpaymentauthorized = async (event) => {
        const paymentData = event.payment.token;
        try {
          const confirmRes = await fetch(`${API_BASE_URL}/api/payments/apple-pay/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ paymentData, amount, userId: userData.id })
          });
          const result = await confirmRes.json();
          if (result.success) {
            await loadWallet();
            toast.success(lang === 'ar' ? `✅ تم إضافة ${amount} ريال عبر Apple Pay. الرصيد الحالي: ${getBalance()}` : `✅ Added ${amount} SAR via Apple Pay. New balance: ${getBalance()}`);
            setShowAddBalance(false);
            setAddAmount('');
            session.completePayment(ApplePaySession.STATUS_SUCCESS);
          } else {
            session.completePayment(ApplePaySession.STATUS_FAILURE);
            toast.error(lang === 'ar' ? 'فشلت عملية الدفع' : 'Payment failed');
          }
        } catch (err) {
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          toast.error(lang === 'ar' ? 'حدث خطأ أثناء تأكيد الدفع' : 'Error confirming payment');
        }
      };
      session.begin();
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'تعذر بدء جلسة Apple Pay' : 'Cannot start Apple Pay session');
    } finally {
      setAddBalanceLoading(false);
    }
  };

  const handleSamsungWalletDeposit = async (amount) => {
    if (!isOwnProfile) return;
    if (!isSamsungWalletAvailable()) {
      toast.error(lang === 'ar' ? 'Samsung Wallet غير متوفر على هذا الجهاز' : 'Samsung Wallet not available');
      return;
    }
    setAddBalanceLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/payments/samsung-pay/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount, userId: userData.id })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await loadWallet();
        toast.success(lang === 'ar' ? `✅ تم إضافة ${amount} ريال عبر Samsung Wallet. الرصيد الحالي: ${getBalance()}` : `✅ Added ${amount} SAR via Samsung Wallet. New balance: ${getBalance()}`);
        setShowAddBalance(false);
        setAddAmount('');
      } else {
        toast.error(data.message || (lang === 'ar' ? 'فشلت عملية الدفع عبر Samsung Wallet' : 'Samsung Wallet payment failed'));
      }
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الدفع عبر Samsung Wallet' : 'Error with Samsung Wallet payment');
    } finally {
      setAddBalanceLoading(false);
    }
  };

  const handleWithdrawToMerchant = async (amount) => {
    if (!isOwnProfile) return;
    setWithdrawLoading(true);
    try {
      await withdraw(amount, {
        method: 'merchant_account',
        cardNumber: WITHDRAW_CARD.number,
        cardHolder: WITHDRAW_CARD.holder
      });
      toast.success(
        lang === 'ar' 
          ? `✅ تم سحب ${amount} ريال بنجاح. الرصيد المتبقي: ${getBalance()}` 
          : `✅ Withdrew ${amount} SAR successfully. Remaining: ${getBalance()}`
      );
      setShowWithdraw(false);
      setWithdrawAmount('');
      await loadWallet();
    } catch (error) {
      console.error(error);
      toast.error(error.message || (lang === 'ar' ? 'فشل السحب' : 'Withdrawal failed'));
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleWithdrawToBankAccount = async (amount, account) => {
    if (!isOwnProfile) return;
    if (!account) {
      toast.error(lang === 'ar' ? 'الرجاء اختيار حساب بنكي للسحب' : 'Please select a bank account');
      return;
    }
    setWithdrawLoading(true);
    try {
      await withdraw(amount, {
        method: 'bank_account',
        accountDetails: account
      });
      toast.success(
        lang === 'ar' 
          ? `✅ تم سحب ${amount} ريال إلى حسابك البنكي بنجاح. الرصيد المتبقي: ${getBalance()}` 
          : `✅ Withdrew ${amount} SAR to your bank account. Remaining: ${getBalance()}`
      );
      setShowWithdraw(false);
      setWithdrawAmount('');
      await loadWallet();
    } catch (error) {
      console.error(error);
      toast.error(error.message || (lang === 'ar' ? 'فشل السحب' : 'Withdrawal failed'));
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleAddBankAccount = async () => {
    if (!isOwnProfile) return;
    if (!newBankAccount.accountName.trim() || !newBankAccount.accountNumber.trim() || !newBankAccount.bankName.trim()) {
      toast.error(lang === 'ar' ? 'الرجاء ملء جميع الحقول' : 'Please fill all fields');
      return;
    }
    setAddingBankAccount(true);
    const newAccount = {
      id: Date.now().toString(),
      ...newBankAccount,
      accountNumber: newBankAccount.accountNumber.trim()
    };
    setBankAccounts(prev => [...prev, newAccount]);
    if (bankAccounts.length === 0) setSelectedWithdrawAccount(newAccount);
    toast.success(lang === 'ar' ? 'تم إضافة الحساب البنكي بنجاح' : 'Bank account added successfully');
    setShowAddBankAccount(false);
    setNewBankAccount({ accountName: '', accountNumber: '', bankName: '' });
    setAddingBankAccount(false);
  };

  const handleDeleteBankAccount = async (accountId) => {
    if (!isOwnProfile) return;
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الحساب؟' : 'Delete this account?')) return;
    setBankAccounts(prev => prev.filter(acc => acc.id !== accountId));
    if (selectedWithdrawAccount?.id === accountId) {
      setSelectedWithdrawAccount(bankAccounts.find(acc => acc.id !== accountId) || null);
    }
    toast.success(lang === 'ar' ? 'تم حذف الحساب' : 'Account deleted');
  };

  const fetchTransactions = async () => {
    if (!isOwnProfile) return;
    if (!userData?.id) return;
    setLoadingTransactions(true);
    try {
      const token = localStorage.getItem('token');
      let transactionsData = [];
      let response = await fetch(`${API_BASE_URL}/api/users/${userData.id}/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let data = await response.json();
      if (response.ok && data.success && Array.isArray(data.transactions)) {
        transactionsData = data.transactions;
      } else {
        const walletRes = await fetch(`${API_BASE_URL}/api/wallet/transactions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const walletData = await walletRes.json();
        if (walletRes.ok && walletData.success && Array.isArray(walletData.transactions)) {
          transactionsData = walletData.transactions;
        } else {
          transactionsData = [];
        }
      }
      setTransactions(transactionsData);
      setShowInvoices(true);
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'فشل تحميل الفواتير' : 'Failed to load invoices');
      setTransactions([]);
      setShowInvoices(true);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const openConfirmModal = (action, amount, method = null, account = null) => {
    if (amount <= 0 || isNaN(amount)) {
      toast.error(lang === 'ar' ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero');
      return;
    }
    if (action === 'withdraw' && amount > getBalance()) {
      toast.error(lang === 'ar' ? `الرصيد غير كافٍ. الرصيد الحالي: ${getBalance()} ريال` : `Insufficient balance. Current: ${getBalance()} SAR`);
      return;
    }
    setConfirmAction(action);
    setConfirmAmount(amount);
    if (action === 'deposit') window.tempDepositMethod = method;
    if (action === 'withdraw') {
      window.tempWithdrawMethod = method;
      window.tempWithdrawAccount = account;
    }
    setShowConfirmModal(true);
  };

  const executeTransaction = async () => {
    setShowConfirmModal(false);
    if (confirmAction === 'deposit') {
      if (window.tempDepositMethod === 'applepay') {
        await handleApplePayDeposit(confirmAmount);
      } else if (window.tempDepositMethod === 'samsungwallet') {
        await handleSamsungWalletDeposit(confirmAmount);
      } else {
        await handleMerchantDeposit(confirmAmount);
      }
      window.tempDepositMethod = null;
    } else if (confirmAction === 'withdraw') {
      if (window.tempWithdrawMethod === 'merchant') {
        await handleWithdrawToMerchant(confirmAmount);
      } else if (window.tempWithdrawMethod === 'bank_specific' && window.tempWithdrawAccount) {
        await handleWithdrawToBankAccount(confirmAmount, window.tempWithdrawAccount);
        window.tempWithdrawAccount = null;
      } else if (selectedWithdrawAccount) {
        await handleWithdrawToBankAccount(confirmAmount, selectedWithdrawAccount);
      } else {
        await handleWithdrawToMerchant(confirmAmount);
      }
      window.tempWithdrawMethod = null;
    }
    setConfirmAction(null);
    setConfirmAmount(0);
  };

  // ====================== Countdown timer ======================
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // ====================== Render ======================
  if (!userData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">{lang === 'ar' ? 'الرجاء تسجيل الدخول' : 'Please login'}</p>
        </div>
      </div>
    );
  }

  const displayName = userData?.fullName?.trim() || (lang === 'ar' ? 'مستخدم' : 'User');
  const displayUsername = userData?.username?.trim() || null;

  const getOtpMessage = () => {
    if (otpStep === 'sent_old' || otpStep === 'verifying_old') {
      return lang === 'ar' 
        ? `✅ تم إرسال رمز التحقق إلى بريدك الحالي (${userData.email}) لتأكيد الهوية`
        : `✅ Verification code sent to your current email (${userData.email}) to confirm identity`;
    }
    if (otpStep === 'sent_new' || otpStep === 'verifying_new') {
      return lang === 'ar'
        ? `✅ تم إرسال رمز التحقق إلى بريدك الجديد (${pendingUpdates?.email || ''}) لتأكيد الملكية`
        : `✅ Verification code sent to your new email (${pendingUpdates?.email || ''}) to confirm ownership`;
    }
    if (otpStep === 'sent' || otpStep === 'verifying') {
      return lang === 'ar'
        ? `✅ تم إرسال رمز التحقق إلى بريدك (${userData.email}) لتأكيد التغييرات`
        : `✅ Verification code sent to your email (${userData.email}) to confirm changes`;
    }
    return '';
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => setPage('profile')} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {isOwnProfile ? (lang === 'ar' ? 'حسابي الشخصي' : 'My Account') : (lang === 'ar' ? 'الملف الشخصي' : 'Profile')}
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="relative h-24 bg-gradient-to-r from-green-500 to-emerald-600"></div>
          <div className="relative px-4 pb-5">
            <div className="flex justify-center -mt-12 mb-3">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 p-1 shadow-xl">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      displayName?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                </div>
                {isOwnProfile && (
                  <>
                    <button onClick={() => document.getElementById('avatar-upload').click()} className="absolute bottom-0 right-0 bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700 transition shadow-md">
                      <Camera size={16} />
                    </button>
                    {avatarPreview && (
                      <button onClick={handleDeleteAvatar} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-md">
                        <X size={12} />
                      </button>
                    )}
                    <input type="file" id="avatar-upload" className="hidden" accept="image/jpeg,image/png,image/jpg,image/gif,image/webp" onChange={handleAvatarChange} />
                  </>
                )}
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{displayName}</h2>
              {displayUsername && (
                <div className="flex items-center justify-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <AtSign size={14} />
                  <span>{displayUsername}</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                <Shield size={12} className="text-green-600" />
                {lang === 'ar' ? 'عضو موثق' : 'Verified Member'} • {lang === 'ar' ? 'انضم في ' : 'Joined '}{new Date(userData.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
              {updateSuccess && (
                <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg flex items-center justify-center gap-2 animate-pulse">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {lang === 'ar' ? `✅ تم تحديث البيانات بنجاح` : `✅ Profile updated`}
                  </span>
                </div>
              )}
            </div>
            {isOwnProfile && (
              <>
                <div className="mt-4">
                  <button onClick={handleEditToggle} className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-sm">
                    <Edit2 size={18} />{isEditing ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile')}
                  </button>
                  {isEditing && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                        </label>
                        <input 
                          type="text" 
                          name="fullName" 
                          value={editData.fullName} 
                          onChange={handleInputChange} 
                          placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} 
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-800" 
                        />
                      </div>
                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                        </label>
                        <input 
                          type="email" 
                          name="email" 
                          value={editData.email} 
                          onChange={handleInputChange} 
                          placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} 
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-800" 
                        />
                      </div>
                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {lang === 'ar' ? 'رقم الجوال' : 'Phone'}
                        </label>
                        <input 
                          type="tel" 
                          name="phone" 
                          value={editData.phone} 
                          onChange={handleInputChange} 
                          placeholder={lang === 'ar' ? 'رقم الجوال' : 'Phone'} 
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-800" 
                        />
                      </div>

                      {/* Save button */}
                      <button 
                        onClick={handleSaveProfile} 
                        disabled={saveLoading || isSavingAfterOtp} 
                        className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                        {saveLoading || isSavingAfterOtp ? (
                          <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> {lang === 'ar' ? 'جاري...' : 'Processing...'}</>
                        ) : (
                          <><Save size={18} /> {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</>
                        )}
                      </button>

                      {/* OTP verification section - يظهر فقط عند الحاجة */}
                      {showOtpInput && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mt-2 border border-blue-200 dark:border-blue-800">
                          <p className="text-sm mb-2 font-medium">{getOtpMessage()}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                            {lang === 'ar'
                              ? '📧 أدخل الرمز لتأكيد التغييرات.'
                              : '📧 Enter the code to confirm changes.'}
                          </p>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={otpCode} 
                              onChange={(e) => setOtpCode(e.target.value)} 
                              placeholder={lang === 'ar' ? 'أدخل الرمز' : 'Enter code'} 
                              className="flex-1 p-2 border rounded-lg text-center dark:bg-gray-800" 
                              maxLength="6" 
                              disabled={isSavingAfterOtp}
                            />
                            <button 
                              onClick={handleVerifyOtp} 
                              disabled={
                                (otpStep === 'verifying_old' || otpStep === 'verifying_new' || otpStep === 'verifying') || 
                                isSavingAfterOtp
                              } 
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              {(otpStep === 'verifying_old' || otpStep === 'verifying_new' || otpStep === 'verifying') || isSavingAfterOtp ? (
                                <FaSpinner className="animate-spin" />
                              ) : (lang === 'ar' ? 'تأكيد' : 'Confirm')}
                            </button>
                          </div>
                          <div className="mt-2 text-center">
                            <button 
                              onClick={handleResendOtp} 
                              disabled={otpCountdown > 0 || isSavingAfterOtp} 
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {otpCountdown > 0 
                                ? (lang === 'ar' ? `إعادة الإرسال بعد ${otpCountdown} ث` : `Resend in ${otpCountdown}s`) 
                                : (lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-2 border-t border-gray-100 dark:border-gray-700 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <AtSign size={12} />
                    {displayUsername ? <span>{displayUsername}</span> : <span>{lang === 'ar' ? 'لم تتم إضافة اسم مستخدم' : 'No username added'}</span>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {isOwnProfile ? (
          <>
            {/* Contact Info */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><Mail size={18} className="text-green-600" /></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                  <p className="text-sm font-medium">{userData.email}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><Phone size={18} className="text-green-600" /></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{lang === 'ar' ? 'رقم الجوال' : 'Phone'}</p>
                  <p className="text-sm font-medium">{userData.phone || (lang === 'ar' ? 'غير مضاف' : 'Not added')}</p>
                </div>
                {userData.phone && userData.phoneVerified && <CheckCircle size={16} className="text-green-500" />}
              </div>

              {/* Wallet Card */}
              <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Wallet size={22} className="text-green-600" />
                      <span className="font-bold text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'محفظتي' : 'My Wallet'}</span>
                    </div>
                    {walletLoading && <FaSpinner className="animate-spin text-green-600" />}
                  </div>
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-500">{lang === 'ar' ? 'الرصيد المتاح' : 'Available Balance'}</p>
                    <p className="text-4xl font-bold text-green-600">{getBalance()} <span className="text-lg">ريال</span></p>
                    {hold > 0 && (
                      <p className="text-xs text-yellow-600 mt-1">
                        {lang === 'ar' ? `رصيد مجمد: ${hold} ريال` : `Held balance: ${hold} SAR`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAddBalance(true)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition transform hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2 shadow-sm">
                      <ArrowDownCircle size={18} className="text-green-600" />
                      <span>{lang === 'ar' ? 'إضافة رصيد' : 'Add Funds'}</span>
                    </button>
                    <button onClick={() => setShowWithdraw(true)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition transform hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2 shadow-sm">
                      <ArrowUpCircle size={18} className="text-red-500" />
                      <span>{lang === 'ar' ? 'سحب الرصيد' : 'Withdraw'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bank Accounts Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Banknote size={18} className="text-green-600" />
                    <span className="font-medium">{lang === 'ar' ? 'حساباتي البنكية' : 'My Bank Accounts'}</span>
                  </div>
                  <button onClick={() => setShowAddBankAccount(true)} className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition flex items-center gap-1">
                    <Plus size={14} /> {lang === 'ar' ? 'إضافة حساب بنكي' : 'Add Account'}
                  </button>
                </div>
                {bankAccounts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {lang === 'ar' ? 'لا توجد حسابات بنكية مضافة' : 'No bank accounts added'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {bankAccounts.map(account => (
                      <div key={account.id} className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{account.accountName}</p>
                          <p className="text-sm text-gray-500">{account.bankName} - {account.accountNumber.slice(-4)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedWithdrawAccount(account)} className={`px-2 py-1 text-xs rounded ${selectedWithdrawAccount?.id === account.id ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {lang === 'ar' ? 'سحب' : 'Withdraw'}
                          </button>
                          <button onClick={() => handleDeleteBankAccount(account.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedWithdrawAccount && (
                  <div className="p-2 text-xs text-red-600 text-center border-t">
                    {lang === 'ar' ? `حساب السحب المختار: ${selectedWithdrawAccount.accountName}` : `Withdrawal account: ${selectedWithdrawAccount.accountName}`}
                  </div>
                )}
              </div>

              {/* Invoices Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Receipt size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{lang === 'ar' ? 'الفواتير والمدفوعات' : 'Invoices & Payments'}</p>
                    <p className="text-xs text-gray-500">{lang === 'ar' ? 'سجل جميع المعاملات المالية والرحلات' : 'All financial transactions and trips'}</p>
                  </div>
                </div>
                <button onClick={fetchTransactions} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                  <Receipt size={16} />
                  <span>{lang === 'ar' ? 'عرض الفواتير' : 'View Invoices'}</span>
                </button>
              </div>
            </div>

            {/* Popups (نفسها دون تغيير) */}
            {showAddBankAccount && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddBankAccount(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Banknote className="text-green-600" /> {lang === 'ar' ? 'إضافة حساب بنكي' : 'Add Bank Account'}</h3>
                    <button onClick={() => setShowAddBankAccount(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button>
                  </div>
                  <input type="text" placeholder={lang === 'ar' ? 'اسم الحساب' : 'Account Name'} value={newBankAccount.accountName} onChange={(e) => setNewBankAccount({...newBankAccount, accountName: e.target.value})} className="w-full p-3 border rounded-xl mb-3 focus:ring-2 focus:ring-green-500 outline-none" />
                  <input type="text" placeholder={lang === 'ar' ? 'رقم الحساب' : 'Account Number'} value={newBankAccount.accountNumber} onChange={(e) => setNewBankAccount({...newBankAccount, accountNumber: e.target.value})} className="w-full p-3 border rounded-xl mb-3 focus:ring-2 focus:ring-green-500 outline-none" />
                  <input type="text" placeholder={lang === 'ar' ? 'اسم البنك' : 'Bank Name'} value={newBankAccount.bankName} onChange={(e) => setNewBankAccount({...newBankAccount, bankName: e.target.value})} className="w-full p-3 border rounded-xl mb-4 focus:ring-2 focus:ring-green-500 outline-none" />
                  <button onClick={handleAddBankAccount} disabled={addingBankAccount} className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition flex items-center justify-center gap-2">
                    {addingBankAccount ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : (lang === 'ar' ? 'إضافة الحساب' : 'Add Account')}
                  </button>
                </div>
              </div>
            )}

            {showAddBalance && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddBalance(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><ArrowDownCircle className="text-green-600" /> {lang === 'ar' ? 'إضافة رصيد' : 'Add Funds'}</h3>
                    <button onClick={() => setShowAddBalance(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button>
                  </div>
                  <input type="number" placeholder={lang === 'ar' ? 'المبلغ (ريال)' : 'Amount (SAR)'} value={addAmount} onChange={(e) => setAddAmount(e.target.value)} className="w-full p-3 border rounded-xl mb-4 focus:ring-2 focus:ring-green-500 outline-none" min="1" step="1" />
                  <div className="space-y-3">
                    {isApplePayAvailable() && (
                      <div className="border rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <button onClick={() => { const amount = parseFloat(addAmount); if (!isNaN(amount) && amount > 0) openConfirmModal('deposit', amount, 'applepay'); else toast.error(lang === 'ar' ? 'المبلغ غير صالح' : 'Invalid amount'); }} disabled={addBalanceLoading} className="w-full flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Smartphone size={22} className="text-black dark:text-white" />
                            <div className="text-right">
                              <p className="font-semibold">Apple Pay</p>
                              <p className="text-xs text-gray-500">{lang === 'ar' ? 'دفع سريع وآمن' : 'Fast & secure'}</p>
                            </div>
                          </div>
                          <span className="text-gray-400">→</span>
                        </button>
                      </div>
                    )}
                    {isSamsungWalletAvailable() && (
                      <div className="border rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <button onClick={() => { const amount = parseFloat(addAmount); if (!isNaN(amount) && amount > 0) openConfirmModal('deposit', amount, 'samsungwallet'); else toast.error(lang === 'ar' ? 'المبلغ غير صالح' : 'Invalid amount'); }} disabled={addBalanceLoading} className="w-full flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Smartphone size={22} className="text-blue-600 dark:text-blue-400" />
                            <div className="text-right">
                              <p className="font-semibold">Samsung Wallet</p>
                              <p className="text-xs text-gray-500">{lang === 'ar' ? 'دفع سريع وآمن' : 'Fast & secure'}</p>
                            </div>
                          </div>
                          <span className="text-gray-400">→</span>
                        </button>
                      </div>
                    )}
                    <div className="border rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <button onClick={() => { const amount = parseFloat(addAmount); if (!isNaN(amount) && amount > 0) openConfirmModal('deposit', amount, 'merchant'); else toast.error(lang === 'ar' ? 'المبلغ غير صالح' : 'Invalid amount'); }} disabled={addBalanceLoading} className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard size={22} className="text-green-600" />
                          <div className="text-right">
                            <p className="font-semibold">{DEPOSIT_CARD.label[lang]}</p>
                            <p className="text-xs text-gray-500">{lang === 'ar' ? 'الدفع باستخدام بطاقة التاجر الرئيسية' : 'Pay using merchant card'}</p>
                          </div>
                        </div>
                        <span className="text-green-600">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showWithdraw && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWithdraw(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><ArrowUpCircle className="text-red-600" /> {lang === 'ar' ? 'سحب رصيد' : 'Withdraw Funds'}</h3>
                    <button onClick={() => setShowWithdraw(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button>
                  </div>
                  <input type="number" placeholder={lang === 'ar' ? 'المبلغ (ريال)' : 'Amount (SAR)'} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full p-3 border rounded-xl mb-2 focus:ring-2 focus:ring-red-500 outline-none" min="1" step="1" max={getBalance()} />
                  <p className="text-xs text-gray-500 mb-4 flex items-center gap-1"><AlertCircle size={12} /> {lang === 'ar' ? `الرصيد المتاح: ${getBalance()} ريال` : `Available: ${getBalance()} SAR`}</p>
                  <div className="space-y-3">
                    <div className="border rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <button onClick={() => { const amount = parseFloat(withdrawAmount); if (!isNaN(amount) && amount > 0) openConfirmModal('withdraw', amount, 'merchant'); else toast.error(lang === 'ar' ? 'المبلغ غير صالح' : 'Invalid amount'); }} disabled={withdrawLoading} className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard size={22} className="text-red-600" />
                          <div className="text-right">
                            <p className="font-semibold">{WITHDRAW_CARD.label[lang]}</p>
                            <p className="text-xs text-gray-500">{lang === 'ar' ? 'سحب إلى حساب التاجر' : 'Withdraw to merchant account'}</p>
                          </div>
                        </div>
                        <span className="text-red-600">→</span>
                      </button>
                    </div>
                    {bankAccounts.length > 0 && (
                      <div className="border rounded-xl p-3">
                        <p className="text-sm font-medium mb-2">{lang === 'ar' ? 'اختر حسابك البنكي للسحب' : 'Select your bank account'}</p>
                        <div className="space-y-2">
                          {bankAccounts.map(acc => (
                            <button key={acc.id} onClick={() => { const amount = parseFloat(withdrawAmount); if (!isNaN(amount) && amount > 0) openConfirmModal('withdraw', amount, 'bank_specific', acc); else toast.error(lang === 'ar' ? 'المبلغ غير صالح' : 'Invalid amount'); }} className="w-full text-right p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition flex justify-between items-center">
                              <span>{acc.accountName} - {acc.bankName}</span>
                              <span className="text-xs text-gray-400">→</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showConfirmModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl">
                  <div className="text-center mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${confirmAction === 'deposit' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {confirmAction === 'deposit' ? <ArrowDownCircle size={32} className="text-green-600" /> : <ArrowUpCircle size={32} className="text-red-600" />}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{confirmAction === 'deposit' ? (lang === 'ar' ? 'تأكيد الإيداع' : 'Confirm Deposit') : (lang === 'ar' ? 'تأكيد السحب' : 'Confirm Withdrawal')}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{confirmAction === 'deposit' ? (lang === 'ar' ? `إضافة ${confirmAmount} ريال` : `Add ${confirmAmount} SAR`) : (lang === 'ar' ? `سحب ${confirmAmount} ريال` : `Withdraw ${confirmAmount} SAR`)}</p>
                    {confirmAction === 'deposit' && window.tempDepositMethod === 'applepay' && (
                      <p className="text-xs text-blue-600 mt-2">Apple Pay</p>
                    )}
                    {confirmAction === 'deposit' && window.tempDepositMethod === 'samsungwallet' && (
                      <p className="text-xs text-blue-600 mt-2">Samsung Wallet</p>
                    )}
                    {confirmAction === 'deposit' && window.tempDepositMethod === 'merchant' && (
                      <p className="text-xs text-green-600 mt-2">{lang === 'ar' ? 'بطاقة التاجر' : 'Merchant Card'}</p>
                    )}
                    {confirmAction === 'withdraw' && window.tempWithdrawMethod === 'merchant' && (
                      <p className="text-xs text-red-600 mt-2">{lang === 'ar' ? 'حساب التاجر' : 'Merchant Account'}</p>
                    )}
                    {confirmAction === 'withdraw' && window.tempWithdrawMethod === 'bank_specific' && window.tempWithdrawAccount && (
                      <p className="text-xs text-red-600 mt-2">{lang === 'ar' ? `الحساب البنكي: ${window.tempWithdrawAccount.accountName}` : `Bank account: ${window.tempWithdrawAccount.accountName}`}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={executeTransaction} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">{lang === 'ar' ? 'تأكيد' : 'Confirm'}</button>
                    <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                  </div>
                </div>
              </div>
            )}

            {showInvoices && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowInvoices(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Receipt size={20} className="text-green-600" /> {lang === 'ar' ? 'سجل المعاملات' : 'Transaction History'}</h3>
                    <button onClick={() => setShowInvoices(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
                  </div>
                  <div className="overflow-y-auto p-4 max-h-[60vh]">
                    {loadingTransactions ? (
                      <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div><p className="mt-2 text-gray-500">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p></div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500"><Receipt size={48} className="mx-auto mb-2 opacity-50" /><p>{lang === 'ar' ? 'لا توجد معاملات' : 'No transactions'}</p></div>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((tx, idx) => {
                          let icon = null, colorClass = '';
                          if (tx.type === 'deposit') { icon = <TrendingDown size={14} className="text-green-600" />; colorClass = 'text-green-600'; }
                          else if (tx.type === 'withdraw') { icon = <TrendingUp size={14} className="text-red-600" />; colorClass = 'text-red-600'; }
                          else if (tx.type === 'booking' || tx.type === 'trip') { icon = <Ticket size={14} className="text-blue-600" />; colorClass = 'text-blue-600'; }
                          else { icon = <Receipt size={14} className="text-gray-500" />; colorClass = 'text-gray-500'; }
                          return (
                            <div key={idx} className="p-3 border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800">
                              <div className="flex justify-between items-start">
                                <div><p className="font-medium flex items-center gap-1">{icon} {tx.description || (tx.type === 'deposit' ? (lang === 'ar' ? 'إيداع' : 'Deposit') : tx.type === 'withdraw' ? (lang === 'ar' ? 'سحب' : 'Withdrawal') : (lang === 'ar' ? 'حجز رحلة' : 'Booking'))}</p><p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock size={12} /> {new Date(tx.createdAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</p></div>
                                <div className={`font-bold flex items-center gap-1 ${colorClass}`}>{tx.type === 'deposit' ? '+' : tx.type === 'withdraw' ? '-' : ''}{tx.amount ? tx.amount : tx.price} ريال</div>
                              </div>
                              {tx.balanceAfter && <div className="text-xs text-gray-500 mt-2">{lang === 'ar' ? 'الرصيد بعد العملية:' : 'Balance after:'} {tx.balanceAfter} ريال</div>}
                              {tx.programName && <div className="text-xs text-gray-500 mt-1">{lang === 'ar' ? 'البرنامج:' : 'Program:'} {tx.programName}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <button onClick={() => setShowInvoices(false)} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">{lang === 'ar' ? 'إغلاق' : 'Close'}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
            <User size={48} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">{lang === 'ar' ? 'هذا هو الملف الشخصي العام' : 'This is the public profile'}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">{displayName}</p>
            {displayUsername && (
              <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
                <AtSign size={14} /> {displayUsername}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-3">{lang === 'ar' ? 'المعلومات الإضافية مخفية لأسباب الخصوصية' : 'Additional information is hidden for privacy'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileDataPage;

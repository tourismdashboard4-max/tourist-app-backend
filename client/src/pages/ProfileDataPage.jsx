// client/src/pages/ProfileDataPage.jsx
// ✅ تحسين كامل: حفظ التعديل وعرض رسالة نجاح فورية
// ✅ Apple Pay + Samsung Wallet + بطاقة التاجر
// ✅ إضافة حسابات بنكية لجميع المستخدمين للسحب
// ✅ دعم كامل للمستخدم العادي والمرشد

import React, { useState, useEffect } from 'react';
import {
  User, Edit2, Camera, Mail, Phone, ArrowLeft,
  Save, ArrowUpCircle, ArrowDownCircle, Wallet, AlertCircle, Receipt,
  X, CheckCircle, Shield, Clock, TrendingUp, TrendingDown, Ticket, Smartphone, CreditCard,
  Plus, Trash2, Banknote, AtSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/apiService';

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
  holder: 'HALA MERCHANT ',
  type: 'visa',
  isMerchant: true,
  label: { ar: 'بطاقة التاجر (فيزا)', en: 'Merchant Visa Card' }
};

const WITHDRAW_CARD = {
  id: 'merchant_mada',
  number: '9682120052427996',
  holder: 'HALA MERCHANT ',
  type: 'mada',
  isMerchant: true,
  label: { ar: 'حساب التاجر (مدى)', en: 'Merchant Mada Account' }
};

function ProfileDataPage({ lang, user: propUser, setPage, onUpdateUser }) {
  const { user: authUser, updateUser } = useAuth();
  const [userData, setUserData] = useState(propUser || authUser || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState('idle');
  const [tempPhone, setTempPhone] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [balance, setBalance] = useState(propUser?.balance || authUser?.balance || 0);
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
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const currentLoggedInUser = authUser || (() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  })();
  const isOwnProfile = currentLoggedInUser?.id === userData?.id;
  const isGuide = userData?.type === 'guide' || userData?.role === 'guide' || userData?.isGuide === true;

  // تحميل الحسابات البنكية
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

  // جلب أحدث بيانات المستخدم
  const fetchFreshUserData = async () => {
    if (!userData?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/${userData.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const freshUser = data.user;
          const updatedUser = { ...userData, ...freshUser };
          setUserData(updatedUser);
          if (updateUser && isOwnProfile) updateUser(updatedUser);
          if (isOwnProfile) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const userObj = JSON.parse(storedUser);
              userObj.fullName = updatedUser.fullName;
              userObj.avatar_url = updatedUser.avatar_url;
              userObj.username = updatedUser.username;
              localStorage.setItem('user', JSON.stringify(userObj));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch fresh user data:', error);
    }
  };

  useEffect(() => {
    if (userData?.id) fetchFreshUserData();
  }, [userData?.id]);

  // تحميل الصورة الشخصية
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

  // دوال الملف الشخصي
  const handleEditToggle = () => { 
    if (!isOwnProfile) return;
    setIsEditing(!isEditing); 
    setShowVerificationInput(false); 
    setPhoneVerificationStep('idle');
    setUpdateSuccess(false);
  };
  
  useEffect(() => { 
    if (!isEditing && userData && isOwnProfile) 
      setEditData({ 
        fullName: userData.fullName || '', 
        phone: userData.phone || ''
      }); 
  }, [isEditing, userData, isOwnProfile]);
  
  const handleInputChange = (e) => { 
    const { name, value } = e.target; 
    setEditData(prev => ({ ...prev, [name]: value })); 
  };
  
  const handleVerifyPhone = async () => {
    if (!isOwnProfile) return;
    const phoneNumber = editData.phone;
    if (!phoneNumber || phoneNumber === 'غير مضاف') { toast.error(lang === 'ar' ? 'الرجاء إدخال رقم الجوال أولاً' : 'Please enter your phone number first'); return; }
    const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
    if (!saudiPhoneRegex.test(phoneNumber.replace(/\s/g, ''))) { toast.error(lang === 'ar' ? 'رقم الجوال غير صحيح' : 'Invalid phone number'); return; }
    setPhoneVerificationStep('sending'); setTempPhone(phoneNumber);
    try {
      const response = await api.sendPhoneVerification(userData.id, phoneNumber);
      if (response.success) { setPhoneVerificationStep('sent'); setShowVerificationInput(true); setCountdown(60); toast.success(lang === 'ar' ? `تم إرسال رمز التحقق إلى ${phoneNumber}` : `Verification code sent to ${phoneNumber}`); }
      else { setPhoneVerificationStep('idle'); toast.error(lang === 'ar' ? 'فشل إرسال الرمز' : 'Failed to send code'); }
    } catch (error) { console.error(error); setPhoneVerificationStep('idle'); toast.error(lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error'); }
  };
  
  const handleVerifyCode = async () => {
    if (!isOwnProfile) return;
    if (!verificationCode || verificationCode.length < 4) { toast.error(lang === 'ar' ? 'الرجاء إدخال الرمز' : 'Please enter code'); return; }
    setPhoneVerificationStep('verifying');
    try {
      const response = await api.verifyPhoneCode(userData.id, tempPhone, verificationCode);
      if (response.success) {
        const updatedUser = { ...userData, phone: tempPhone, phoneVerified: true };
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        setEditData(prev => ({ ...prev, phone: tempPhone }));
        setPhoneVerificationStep('verified'); setShowVerificationInput(false);
        toast.success(lang === 'ar' ? 'تم التحقق بنجاح' : 'Verified successfully');
      } else { setPhoneVerificationStep('sent'); toast.error(lang === 'ar' ? 'رمز غير صحيح' : 'Invalid code'); }
    } catch (error) { console.error(error); setPhoneVerificationStep('sent'); toast.error(lang === 'ar' ? 'خطأ في التحقق' : 'Verification error'); }
  };
  
  const handleResendCode = () => { if (countdown > 0) return; handleVerifyPhone(); };
  
  // ✅ دالة حفظ الملف الشخصي المحسنة مع رسالة نجاح فورية
  const handleSaveProfile = async () => {
    if (!isOwnProfile) return;
    setSaveLoading(true);
    setUpdateSuccess(false);
    try {
      const response = await api.updateUserProfile(userData.id, { 
        fullName: editData.fullName
      });
      if (response.success) {
        const updatedUser = { ...userData, fullName: editData.fullName };
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.fullName = editData.fullName;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        if (isGuide) {
          window.dispatchEvent(new CustomEvent('guideProfileUpdated', {
            detail: { 
              guideId: userData.id, 
              updatedData: { 
                fullName: editData.fullName,
                avatar_url: userData.avatar_url 
              } 
            }
          }));
        }
        // ✅ إظهار رسالة نجاح فورية مع اسم المستخدم الجديد
        setUpdateSuccess(true);
        toast.success(
          lang === 'ar' 
            ? `✅ تم تحديث الاسم بنجاح إلى "${editData.fullName}"` 
            : `✅ Name updated successfully to "${editData.fullName}"`,
          { duration: 4000 }
        );
        setIsEditing(false);
      } else {
        toast.error(response.message || (lang === 'ar' ? 'فشل تحديث البيانات' : 'Failed to update data'));
      }
    } catch (error) { 
      console.error(error); 
      toast.error(lang === 'ar' ? 'فشل التحديث' : 'Update failed'); 
    } finally { 
      setSaveLoading(false); 
    }
  };

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

  // دوال الإيداع والسحب (كما هي)
  const handleMerchantDeposit = async (amount) => {
    if (!isOwnProfile) return;
    setAddBalanceLoading(true);
    try {
      const response = await api.depositWithCard(userData.id, amount, DEPOSIT_CARD.number, DEPOSIT_CARD.holder);
      if (response.success) {
        const newBalance = response.newBalance;
        setBalance(newBalance);
        const updatedUser = { ...userData, balance: newBalance };
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        toast.success(lang === 'ar' ? `✅ تم إضافة ${amount} ريال بنجاح. الرصيد الحالي: ${newBalance}` : `✅ Added ${amount} SAR. New balance: ${newBalance}`);
        setShowAddBalance(false);
        setAddAmount('');
      } else {
        toast.error(response.message || (lang === 'ar' ? 'فشل الإضافة' : 'Failed to add funds'));
      }
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
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
            const newBalance = result.newBalance;
            setBalance(newBalance);
            const updatedUser = { ...userData, balance: newBalance };
            setUserData(updatedUser);
            if (updateUser) updateUser(updatedUser);
            if (onUpdateUser) onUpdateUser(updatedUser);
            session.completePayment(ApplePaySession.STATUS_SUCCESS);
            toast.success(lang === 'ar' ? `✅ تم إضافة ${amount} ريال عبر Apple Pay. الرصيد الحالي: ${newBalance}` : `✅ Added ${amount} SAR via Apple Pay. New balance: ${newBalance}`);
            setShowAddBalance(false);
            setAddAmount('');
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
        const newBalance = data.newBalance;
        setBalance(newBalance);
        const updatedUser = { ...userData, balance: newBalance };
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        toast.success(lang === 'ar' ? `✅ تم إضافة ${amount} ريال عبر Samsung Wallet. الرصيد الحالي: ${newBalance}` : `✅ Added ${amount} SAR via Samsung Wallet. New balance: ${newBalance}`);
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
      const response = await api.withdrawToCard(userData.id, amount, WITHDRAW_CARD.number, WITHDRAW_CARD.holder);
      if (response.success) {
        const newBalance = response.newBalance;
        setBalance(newBalance);
        const updatedUser = { ...userData, balance: newBalance };
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        toast.success(lang === 'ar' ? `✅ تم سحب ${amount} ريال بنجاح. الرصيد المتبقي: ${newBalance}` : `✅ Withdrew ${amount} SAR. Remaining: ${newBalance}`);
        setShowWithdraw(false);
        setWithdrawAmount('');
      } else {
        toast.error(response.message || (lang === 'ar' ? 'فشل السحب' : 'Withdrawal failed'));
      }
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
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
      const response = await api.withdrawToAccount(userData.id, amount, account);
      if (response.success) {
        const newBalance = response.newBalance;
        setBalance(newBalance);
        const updatedUser = { ...userData, balance: newBalance };
        setUserData(updatedUser);
        if (updateUser) updateUser(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        toast.success(lang === 'ar' ? `✅ تم سحب ${amount} ريال إلى حسابك البنكي بنجاح. الرصيد المتبقي: ${newBalance}` : `✅ Withdrew ${amount} SAR to your bank account. Remaining: ${newBalance}`);
        setShowWithdraw(false);
        setWithdrawAmount('');
      } else {
        toast.error(response.message || (lang === 'ar' ? 'فشل السحب' : 'Withdrawal failed'));
      }
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
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

  const openConfirmModal = (action, amount, method = null) => {
    if (amount <= 0 || isNaN(amount)) {
      toast.error(lang === 'ar' ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero');
      return;
    }
    if (action === 'withdraw' && amount > balance) {
      toast.error(lang === 'ar' ? `الرصيد غير كافٍ. الرصيد الحالي: ${balance} ريال` : `Insufficient balance. Current: ${balance} SAR`);
      return;
    }
    setConfirmAction(action);
    setConfirmAmount(amount);
    if (action === 'deposit') window.tempDepositMethod = method;
    if (action === 'withdraw') window.tempWithdrawMethod = method;
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
              {isOwnProfile && userData.email && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{userData.email}</p>
              )}
              <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                <Shield size={12} className="text-green-600" />
                {lang === 'ar' ? 'عضو موثق' : 'Verified Member'} • {lang === 'ar' ? 'انضم في ' : 'Joined '}{new Date(userData.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
              {/* ✅ عرض رسالة نجاح التعديل */}
              {updateSuccess && (
                <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg flex items-center justify-center gap-2 animate-pulse">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    {lang === 'ar' ? `✅ تم تحديث الاسم إلى "${editData.fullName}"` : `✅ Name updated to "${editData.fullName}"`}
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
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                        </label>
                        <input type="email" value={userData.email || ''} disabled className="w-full p-3 border rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {lang === 'ar' ? 'رقم الجوال' : 'Phone'}
                        </label>
                        <div className="flex gap-2">
                          <input type="tel" name="phone" value={editData.phone} onChange={handleInputChange} placeholder={lang === 'ar' ? 'رقم الجوال' : 'Phone'} className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none dark:bg-gray-800" />
                          {editData.phone && editData.phone !== userData.phone && (
                            <button onClick={handleVerifyPhone} disabled={phoneVerificationStep === 'sending' || phoneVerificationStep === 'verifying'} className="px-4 py-2 bg-blue-600 text-white rounded-lg whitespace-nowrap">
                              {phoneVerificationStep === 'sending' ? (lang === 'ar' ? 'جاري...' : 'Sending...') : (lang === 'ar' ? 'تحقق' : 'Verify')}
                            </button>
                          )}
                        </div>
                        {showVerificationInput && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm mb-2">{lang === 'ar' ? `تم إرسال الرمز إلى ${tempPhone}` : `Code sent to ${tempPhone}`}</p>
                            <div className="flex gap-2">
                              <input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder={lang === 'ar' ? 'أدخل الرمز' : 'Enter code'} className="flex-1 p-2 border rounded-lg text-center" maxLength="6" />
                              <button onClick={handleVerifyCode} disabled={phoneVerificationStep === 'verifying'} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                                {phoneVerificationStep === 'verifying' ? '...' : (lang === 'ar' ? 'تأكيد' : 'Confirm')}
                              </button>
                            </div>
                            <div className="mt-2 text-center">
                              <button onClick={handleResendCode} disabled={countdown > 0} className="text-sm text-blue-600">
                                {countdown > 0 ? (lang === 'ar' ? `إعادة الإرسال بعد ${countdown} ث` : `Resend in ${countdown}s`) : (lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={handleSaveProfile} disabled={saveLoading} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
                        {saveLoading ? (
                          <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</>
                        ) : (
                          <><Save size={18} /> {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}</>
                        )}
                      </button>
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
                  </div>
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-500">{lang === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</p>
                    <p className="text-4xl font-bold text-green-600">{balance} <span className="text-lg">ريال</span></p>
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

            {/* Add Bank Account Popup */}
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

            {/* Deposit Popup */}
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

            {/* Withdraw Popup */}
            {showWithdraw && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWithdraw(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><ArrowUpCircle className="text-red-600" /> {lang === 'ar' ? 'سحب رصيد' : 'Withdraw Funds'}</h3>
                    <button onClick={() => setShowWithdraw(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={20} /></button>
                  </div>
                  <input type="number" placeholder={lang === 'ar' ? 'المبلغ (ريال)' : 'Amount (SAR)'} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full p-3 border rounded-xl mb-2 focus:ring-2 focus:ring-red-500 outline-none" min="1" step="1" max={balance} />
                  <p className="text-xs text-gray-500 mb-4 flex items-center gap-1"><AlertCircle size={12} /> {lang === 'ar' ? `الرصيد المتاح: ${balance} ريال` : `Available: ${balance} SAR`}</p>
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
                            <button key={acc.id} onClick={() => { window.tempWithdrawAccount = acc; const amount = parseFloat(withdrawAmount); if (!isNaN(amount) && amount > 0) openConfirmModal('withdraw', amount, 'bank_specific'); else toast.error(lang === 'ar' ? 'المبلغ غير صالح' : 'Invalid amount'); }} className="w-full text-right p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition flex justify-between items-center">
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

            {/* Confirmation Modal */}
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

            {/* Invoices Modal */}
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

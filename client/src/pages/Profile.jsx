// client/src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWallet } from '../contexts/WalletContext';
import {
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt,
  FaEdit, FaSave, FaTimes, FaWallet, FaEye, FaEyeSlash,
  FaArrowUp, FaArrowDown, FaSpinner, FaHistory, FaCreditCard,
  FaMoneyBillWave, FaChartLine, FaShieldAlt, FaCheckCircle
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

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
  const [activeTab, setActiveTab] = useState('info'); // info, wallet, transactions

  const lang = language;
  const t = (key) => {
    const texts = {
      ar: {
        profile: 'الملف الشخصي',
        editProfile: 'تعديل الملف',
        save: 'حفظ',
        cancel: 'إلغاء',
        fullName: 'الاسم الكامل',
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
        totalWithdrawals: 'إجمالي السحوبات'
      },
      en: {
        profile: 'Profile',
        editProfile: 'Edit Profile',
        save: 'Save',
        cancel: 'Cancel',
        fullName: 'Full Name',
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
        totalWithdrawals: 'Total Withdrawals'
      }
    };
    return texts[lang][key] || key;
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadWallet();
      loadTransactions();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (user) {
      setEditedUser({
        fullName: user.fullName || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      const updated = { ...user, ...editedUser };
      updateUser(updated);
      toast.success('تم تحديث الملف الشخصي');
      setIsEditing(false);
    } catch (error) {
      toast.error('فشل التحديث');
    }
  };

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
            <p className="text-white/60 text-sm">مرحباً {user.fullName || user.name}</p>
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
          {/* تبويب المعلومات الشخصية */}
          {activeTab === 'info' && (
            <div className="space-y-4">
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
                    <p className="text-white text-lg">{user.fullName || user.name || '—'}</p>
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

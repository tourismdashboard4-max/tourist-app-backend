// client/src/contexts/WalletContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalBookings: 0,
    totalFees: 0,
  });

  // جلب بيانات المحفظة
  const loadWallet = async () => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    try {
      // ✅ تصحيح: إزالة /api المكررة
      const response = await api.get('/wallet/me');
      if (response.data.success) {
        setWallet(response.data.data || response.data.wallet);
        const walletData = response.data.data || response.data.wallet;
        if (walletData?.stats) {
          setStats(walletData.stats);
        }
      } else {
        console.warn('Failed to load wallet:', response.data.message);
        setWallet(null);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  };

  // جلب سجل المعاملات
  const loadTransactions = async (page = 1, limit = 20) => {
    if (!isAuthenticated || !user) return;
    try {
      // ✅ تصحيح: إزالة /api المكررة وتصحيح طريقة إرسال params
      const response = await api.get('/wallet/transactions', { 
        params: { page, limit } 
      });
      if (response.data.success) {
        setTransactions(response.data.data || response.data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  // إيداع مبلغ
  const deposit = async (amount, description = 'إيداع في المحفظة', referenceId = null) => {
    if (!amount || amount <= 0) {
      toast.error('المبلغ غير صالح');
      return { success: false };
    }
    setLoading(true);
    try {
      // ✅ تصحيح: إزالة /api المكررة
      const response = await api.post('/wallet/deposit', {
        amount,
        description,
        referenceId,
      });
      if (response.data.success) {
        setWallet(response.data.data || response.data.wallet);
        await loadTransactions(1, 20);
        toast.success(`تم إيداع ${amount} ريال بنجاح`);
        return { success: true, transaction: response.data.transaction };
      } else {
        toast.error(response.data.message || 'فشل الإيداع');
        return { success: false };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'حدث خطأ أثناء الإيداع';
      toast.error(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // سحب مبلغ
  const withdraw = async (amount, description = 'سحب من المحفظة', referenceId = null) => {
    if (!amount || amount <= 0) {
      toast.error('المبلغ غير صالح');
      return { success: false };
    }
    if (wallet && wallet.balance < amount) {
      toast.error('الرصيد غير كافٍ');
      return { success: false };
    }
    setLoading(true);
    try {
      // ✅ تصحيح: إزالة /api المكررة
      const response = await api.post('/wallet/withdraw', {
        amount,
        description,
        referenceId,
      });
      if (response.data.success) {
        setWallet(response.data.data || response.data.wallet);
        await loadTransactions(1, 20);
        toast.success(`تم سحب ${amount} ريال بنجاح`);
        return { success: true, transaction: response.data.transaction };
      } else {
        toast.error(response.data.message || 'فشل السحب');
        return { success: false };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'حدث خطأ أثناء السحب';
      toast.error(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // طلب سحب للمرشدين
  const requestWithdraw = async (amount, bankAccount) => {
    if (!user || user.type !== 'guide') {
      toast.error('فقط المرشدين يمكنهم سحب الأموال');
      return { success: false };
    }
    return withdraw(amount, `طلب سحب إلى حساب ${bankAccount.accountNumber}`, null);
  };

  // دفع حجز
  const payBooking = async (bookingId, amount) => {
    return withdraw(amount, `دفع قيمة الحجز #${bookingId}`, bookingId);
  };

  // دوال مساعدة للرصيد
  const getBalance = () => wallet?.balance || 0;
  const getFrozenBalance = () => wallet?.frozenBalance || wallet?.frozen_balance || 0;
  const getTotalBalance = () => (wallet?.balance || 0) + (wallet?.frozenBalance || wallet?.frozen_balance || 0);
  const getCurrency = () => wallet?.currency || 'SAR';

  useEffect(() => {
    if (isAuthenticated && user) {
      loadWallet();
      loadTransactions();
    } else {
      setWallet(null);
      setTransactions([]);
      setStats({
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalBookings: 0,
        totalFees: 0,
      });
    }
  }, [isAuthenticated, user?.id]);

  const value = {
    wallet,
    transactions,
    loading,
    stats,
    loadWallet,
    loadTransactions,
    deposit,
    withdraw,
    requestWithdraw,
    payBooking,
    getBalance,
    getFrozenBalance,
    getTotalBalance,
    getCurrency,
    hasWallet: !!wallet,
    isGuide: user?.type === 'guide',
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

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
    totalFees: 0
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      loadWallet();
      loadTransactions();
    }
  }, [isAuthenticated, user]);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/wallet/${user.id}`);
      if (response.data.success) {
        setWallet(response.data.data);
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast.error('فشل تحميل بيانات المحفظة');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (limit = 50) => {
    try {
      const response = await api.get(`/wallet/${user.id}/transactions?limit=${limit}`);
      if (response.data.success) {
        setTransactions(response.data.data.transactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const deposit = async (amount, paymentMethod = 'CARD') => {
    try {
      setLoading(true);
      const response = await api.post('/wallet/deposit', {
        userId: user.id,
        amount,
        paymentMethod
      });

      if (response.data.success) {
        await loadWallet();
        await loadTransactions();
        toast.success(`تم إيداع ${amount} ريال بنجاح`);
        return { success: true, transaction: response.data.transaction };
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل الإيداع');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const requestWithdraw = async (amount, bankAccount) => {
    if (!user || user.type !== 'guide') {
      toast.error('فقط المرشدين يمكنهم سحب الأموال');
      return { success: false };
    }

    try {
      setLoading(true);
      const response = await api.post('/wallet/withdraw-request', {
        userId: user.id,
        amount,
        bankAccount
      });

      if (response.data.success) {
        await loadWallet();
        toast.success('تم تقديم طلب السحب بنجاح');
        return { success: true, requestId: response.data.requestId };
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل طلب السحب');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const payBooking = async (bookingId, amount) => {
    try {
      setLoading(true);
      const response = await api.post('/wallet/pay-booking', {
        userId: user.id,
        bookingId,
        amount
      });

      if (response.data.success) {
        await loadWallet();
        await loadTransactions();
        toast.success('تم دفع الحجز بنجاح');
        return { success: true };
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل دفع الحجز');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const getBalance = () => {
    return wallet?.balance || 0;
  };

  const getFrozenBalance = () => {
    return wallet?.frozenBalance || 0;
  };

  const getTotalBalance = () => {
    return (wallet?.balance || 0) + (wallet?.frozenBalance || 0);
  };

  const value = {
    wallet,
    transactions,
    loading,
    stats,
    loadWallet,
    loadTransactions,
    deposit,
    requestWithdraw,
    payBooking,
    getBalance,
    getFrozenBalance,
    getTotalBalance,
    hasWallet: !!wallet,
    isGuide: user?.type === 'guide'
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
// client/src/context/WalletContext.jsx — النسخة النهائية المُصلحة
// ✅ استخدام /wallet/:userId بدلاً من /wallet/me
// ✅ تصحيح تمرير params إلى api.get
// ✅ تصحيح استخراج response.data
// ✅ معالجة 404 من /wallet/transactions (إذا لم يكن موجوداً)
// ✅ عدم إظهار أخطاء console في وضع الضيف

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // ============================================
  // جلب بيانات المحفظة — يستخدم /wallet/:userId
  // ============================================
  const loadWallet = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    setLoading(true);
    try {
      // ✅ تصحيح 1: استخدام user.id بدلاً من /me
      const response = await api.get(`/wallet/${user.id}`);
      
      // ✅ تصحيح 2: api.get يرجع { data }, لذا response.data = body
      const body = response.data;
      
      if (body?.success) {
        const walletData = body.wallet || body.data;
        setWallet(walletData);
        if (walletData?.stats) {
          setStats(walletData.stats);
        }
      } else {
        // المحفظة غير موجودة — حالة طبيعية لمستخدم جديد
        console.log('ℹ️ No wallet yet for user:', user.id);
        setWallet(null);
      }
    } catch (error) {
      // 404 = محفظة غير موجودة (طبيعي)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log('ℹ️ Wallet not found (user may be new)');
        setWallet(null);
      } else {
        console.error('❌ Error loading wallet:', error.message);
        setWallet(null);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // ============================================
  // جلب سجل المعاملات
  // ============================================
  const loadTransactions = useCallback(async (page = 1, limit = 20) => {
    if (!isAuthenticated || !user?.id) return;

    try {
      // ✅ تصحيح 3: تمرير { page, limit } مباشرة (بدون wrapper)
      const response = await api.get(`/wallet/${user.id}/transactions`, { page, limit });
      
      const body = response.data;
      if (body?.success) {
        setTransactions(body.transactions || body.data || []);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      // 404 = endpoint غير موجود بعد في الـ Backend
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log('ℹ️ Transactions endpoint not yet available');
      } else {
        console.error('❌ Error loading transactions:', error.message);
      }
      setTransactions([]);
    }
  }, [isAuthenticated, user?.id]);

  // ============================================
  // إيداع مبلغ
  // ============================================
  const deposit = async (amount, description = 'إيداع في المحفظة', referenceId = null) => {
    if (!amount || amount <= 0) {
      toast.error('المبلغ غير صالح');
      return { success: false };
    }
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return { success: false };
    }

    setLoading(true);
    try {
      const response = await api.post(`/wallet/${user.id}/deposit`, {
        amount,
        description,
        referenceId,
      });
      
      const body = response.data;
      if (body?.success) {
        setWallet(body.wallet || body.data);
        await loadTransactions(1, 20);
        toast.success(`تم إيداع ${amount} ريال بنجاح`);
        return { success: true, transaction: body.transaction };
      } else {
        toast.error(body?.message || 'فشل الإيداع');
        return { success: false };
      }
    } catch (error) {
      const message = error.message || 'حدث خطأ أثناء الإيداع';
      toast.error(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // سحب مبلغ
  // ============================================
  const withdraw = async (amount, description = 'سحب من المحفظة', referenceId = null) => {
    if (!amount || amount <= 0) {
      toast.error('المبلغ غير صالح');
      return { success: false };
    }
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return { success: false };
    }
    if (wallet && wallet.balance < amount) {
      toast.error('الرصيد غير كافٍ');
      return { success: false };
    }

    setLoading(true);
    try {
      const response = await api.post(`/wallet/${user.id}/withdraw`, {
        amount,
        description,
        referenceId,
      });
      
      const body = response.data;
      if (body?.success) {
        setWallet(body.wallet || body.data);
        await loadTransactions(1, 20);
        toast.success(`تم سحب ${amount} ريال بنجاح`);
        return { success: true, transaction: body.transaction };
      } else {
        toast.error(body?.message || 'فشل السحب');
        return { success: false };
      }
    } catch (error) {
      const message = error.message || 'حدث خطأ أثناء السحب';
      toast.error(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // طلب سحب للمرشدين
  // ============================================
  const requestWithdraw = async (amount, bankAccount) => {
    if (!user || user.type !== 'guide') {
      toast.error('فقط المرشدين يمكنهم سحب الأموال');
      return { success: false };
    }
    return withdraw(amount, `طلب سحب إلى حساب ${bankAccount?.accountNumber || ''}`, null);
  };

  // ============================================
  // دفع حجز
  // ============================================
  const payBooking = async (bookingId, amount) => {
    return withdraw(amount, `دفع قيمة الحجز #${bookingId}`, bookingId);
  };

  // ============================================
  // Helpers
  // ============================================
  const getBalance = () => wallet?.balance || 0;
  const getFrozenBalance = () => wallet?.frozenBalance || wallet?.frozen_balance || 0;
  const getTotalBalance = () => (wallet?.balance || 0) + (wallet?.frozenBalance || wallet?.frozen_balance || 0);
  const getCurrency = () => wallet?.currency || 'SAR';

  // ============================================
  // تحميل تلقائي عند تسجيل الدخول
  // ============================================
  useEffect(() => {
    if (isAuthenticated && user?.id) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

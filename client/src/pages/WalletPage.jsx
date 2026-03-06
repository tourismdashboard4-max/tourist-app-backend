import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  FaWallet, 
  FaArrowUp, 
  FaArrowDown, 
  FaHistory, 
  FaCreditCard,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaDownload
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const WalletPage = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankAccount, setBankAccount] = useState({
    bankName: '',
    accountNumber: '',
    iban: '',
    accountHolder: ''
  });
  const [activeTab, setActiveTab] = useState('balance');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const response = await api.get(`/wallet/${user.id}`);
      if (response.data.success) {
        setWallet(response.data.data);
      }

      const transResponse = await api.get(`/wallet/${user.id}/transactions?limit=20`);
      if (transResponse.data.success) {
        setTransactions(transResponse.data.data.transactions);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast.error('فشل تحميل بيانات المحفظة');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || depositAmount < 10) {
      toast.error('الرجاء إدخال مبلغ صحيح (10 ريال على الأقل)');
      return;
    }

    try {
      const response = await api.post('/wallet/deposit', {
        amount: parseFloat(depositAmount)
      });

      if (response.data.success) {
        toast.success('تم إيداع المبلغ بنجاح');
        setShowDeposit(false);
        setDepositAmount('');
        loadWalletData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل الإيداع');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || withdrawAmount < 100) {
      toast.error('الحد الأدنى للسحب 100 ريال');
      return;
    }

    if (withdrawAmount > wallet?.balance) {
      toast.error('الرصيد غير كافٍ');
      return;
    }

    if (!bankAccount.bankName || !bankAccount.accountNumber || !bankAccount.iban) {
      toast.error('يرجى إكمال بيانات الحساب البنكي');
      return;
    }

    try {
      const response = await api.post('/wallet/withdraw-request', {
        amount: parseFloat(withdrawAmount),
        bankAccount
      });

      if (response.data.success) {
        toast.success('تم تقديم طلب السحب بنجاح');
        setShowWithdraw(false);
        setWithdrawAmount('');
        loadWalletData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل طلب السحب');
    }
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'DEPOSIT': return <FaArrowUp className="text-green-500" />;
      case 'WITHDRAW': return <FaArrowDown className="text-red-500" />;
      case 'BOOKING': return <FaWallet className="text-blue-500" />;
      case 'FEE': return <FaCreditCard className="text-orange-500" />;
      default: return <FaHistory className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'COMPLETED':
        return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
          <FaCheckCircle size={12} /> مكتمل
        </span>;
      case 'PENDING':
        return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs">
          <FaClock size={12} /> قيد الانتظار
        </span>;
      case 'FAILED':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs">
          <FaTimesCircle size={12} /> فشل
        </span>;
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-l from-green-600 to-emerald-600 rounded-2xl p-8 text-white mb-8 shadow-lg"
        >
          <h1 className="text-3xl font-bold mb-2">محفظتي</h1>
          <p className="text-green-100">إدارة رصيدك ومعاملاتك المالية بكل أمان وشفافية</p>
        </motion.div>

        {/* Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-8 mb-8 shadow-lg"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FaWallet className="text-green-600 text-xl" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">الرصيد الحالي</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {wallet?.balance || 0} <span className="text-lg font-normal text-gray-500">ريال</span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 text-sm">
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-gray-500">رصيد مجمد: </span>
                  <span className="font-bold text-gray-700">{wallet?.frozen || 0} ريال</span>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-gray-500">الحد اليومي: </span>
                  <span className="font-bold text-gray-700">{wallet?.dailyLimit || 5000} ريال</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={() => setShowDeposit(true)}
                className="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <FaArrowUp /> إيداع
              </button>
              
              {user?.type === 'guide' && (
                <button
                  onClick={() => setShowWithdraw(true)}
                  className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <FaArrowDown /> سحب
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Deposit Modal */}
        {showDeposit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">إيداع في المحفظة</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ (ريال)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  min="10"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">الحد الأدنى: 10 ريال</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDeposit}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
                >
                  تأكيد
                </button>
                <button
                  onClick={() => {
                    setShowDeposit(false);
                    setDepositAmount('');
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">طلب سحب</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ (ريال)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  min="100"
                  max={wallet?.balance}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  الحد الأدنى: 100 ريال | الرصيد المتاح: {wallet?.balance} ريال
                </p>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-gray-700 mb-3">بيانات الحساب البنكي</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">اسم البنك</label>
                    <input
                      type="text"
                      value={bankAccount.bankName}
                      onChange={(e) => setBankAccount({...bankAccount, bankName: e.target.value})}
                      placeholder="مثال: البنك الأهلي السعودي"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">رقم الحساب</label>
                    <input
                      type="text"
                      value={bankAccount.accountNumber}
                      onChange={(e) => setBankAccount({...bankAccount, accountNumber: e.target.value})}
                      placeholder="أدخل رقم الحساب"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">IBAN</label>
                    <input
                      type="text"
                      value={bankAccount.iban}
                      onChange={(e) => setBankAccount({...bankAccount, iban: e.target.value})}
                      placeholder="SA00 0000 0000 0000 0000 0000"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">صاحب الحساب</label>
                    <input
                      type="text"
                      value={bankAccount.accountHolder}
                      onChange={(e) => setBankAccount({...bankAccount, accountHolder: e.target.value})}
                      placeholder="الاسم كما في البطاقة البنكية"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded-xl mb-4">
                <p className="text-sm text-yellow-800">
                  ⏱️ سيتم مراجعة طلب السحب خلال 24-72 ساعة عمل
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleWithdraw}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                >
                  تقديم الطلب
                </button>
                <button
                  onClick={() => {
                    setShowWithdraw(false);
                    setWithdrawAmount('');
                    setBankAccount({
                      bankName: '',
                      accountNumber: '',
                      iban: '',
                      accountHolder: ''
                    });
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-6 py-3 rounded-t-xl font-bold transition ${
              activeTab === 'balance' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الرصيد
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-t-xl font-bold transition ${
              activeTab === 'history' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            سجل المعاملات
          </button>
        </div>

        {/* Transactions History */}
        {activeTab === 'history' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">آخر المعاملات</h3>
              <button className="flex items-center gap-2 text-green-600 hover:text-green-700">
                <FaDownload /> تصدير
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <FaHistory className="text-5xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد معاملات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">
                          {transaction.description || 'معاملة مالية'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-left">
                      <p className={`font-bold ${
                        transaction.type === 'DEPOSIT' ? 'text-green-600' :
                        transaction.type === 'WITHDRAW' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {transaction.type === 'DEPOSIT' ? '+' : '-'} {transaction.amount} ريال
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WalletPage;
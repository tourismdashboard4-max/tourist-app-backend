// client/src/pages/UpgradeStatusPage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaCheckCircle, 
  FaClock, 
  FaTimesCircle, 
  FaArrowLeft,
  FaIdCard
} from 'react-icons/fa';
import api from '../services/apiService';

const UpgradeStatusPage = ({ setPage }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل حالة الطلب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setPage('profile')}
            className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <FaArrowLeft className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            حالة طلب الترقية
          </h1>
        </div>

        {!user?.isGuide && !user?.guideStatus ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center"
          >
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaIdCard className="text-blue-600 dark:text-blue-400" size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
              كن مرشداً سياحياً
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              شارك بخبراتك واربح من خلال تقديم جولات سياحية للمستخدمين. سجل الآن وانضم إلى فريق المرشدين المعتمدين.
            </p>

            <button
              onClick={() => setPage('upgrade-to-guide')}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
            >
              تقديم طلب ترقية
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-6 text-center bg-yellow-50 dark:bg-yellow-900/20">
              <div className="mb-4">
                <FaClock className="text-yellow-500" size={64} />
              </div>
              <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">
                طلب الترقية قيد المراجعة
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                شكراً لتقديمك طلب الترقية. فريقنا يقوم بمراجعة طلبك حالياً وسنقوم بإشعارك فور الانتهاء من المراجعة.
              </p>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setPage('profile')}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition"
              >
                العودة للملف الشخصي
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default UpgradeStatusPage;
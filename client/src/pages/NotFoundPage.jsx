import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../router/routes.config';
import { Home, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFoundPage = ({ lang = 'ar' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-xl"
        >
          404
        </motion.div>

        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          {lang === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {lang === 'ar' 
            ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها'
            : 'Sorry, the page you are looking for does not exist or has been moved'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={ROUTES.HOME}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <Home size={20} />
            <span>{lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-xl font-medium hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30 transition flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>{lang === 'ar' ? 'رجوع' : 'Go Back'}</span>
          </button>
        </div>

        {/* Suggestions */}
        <div className="mt-12">
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            {lang === 'ar' ? 'قد تكون مهتماً بـ:' : 'You might be interested in:'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to={ROUTES.PROGRAMS} className="text-sm text-green-600 hover:text-green-700 dark:text-green-400">
              {lang === 'ar' ? 'البرامج السياحية' : 'Tour Programs'}
            </Link>
            <Link to={ROUTES.GUIDES} className="text-sm text-green-600 hover:text-green-700 dark:text-green-400">
              {lang === 'ar' ? 'المرشدين' : 'Guides'}
            </Link>
            <Link to={ROUTES.EXPLORE} className="text-sm text-green-600 hover:text-green-700 dark:text-green-400">
              {lang === 'ar' ? 'استكشف' : 'Explore'}
            </Link>
            <Link to={ROUTES.CONTACT} className="text-sm text-green-600 hover:text-green-700 dark:text-green-400">
              {lang === 'ar' ? 'اتصل بنا' : 'Contact Us'}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
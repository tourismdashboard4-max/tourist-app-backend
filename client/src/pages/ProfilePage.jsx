// client/src/pages/ProfilePage.jsx
// ✅ صفحة تحتوي على 4 أزرار (الملف الشخصي، رحلاتي، الإشعارات، الإعدادات) + زر تسجيل الخروج

import React from 'react';
import { User, Package, Bell, Settings, ArrowLeft, FileText, LogOut } from 'lucide-react';

function ProfilePage({ lang, user, setPage, setShowLogin, onLogout }) {
  // إذا لم يكن المستخدم مسجلاً، نعرض شاشة تسجيل الدخول
  if (!user) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center ml-4">
              <User size={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold">{lang === 'ar' ? 'زائر' : 'Guest'}</h1>
              <p className="text-white/80">{lang === 'ar' ? 'مستكشف' : 'Explorer'}</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <button onClick={() => setShowLogin(true)} className="w-full py-3 bg-green-600 text-white rounded-xl">
            {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  // دوال التنقل
  const navigateToProfileData = () => setPage('profileData');
  const navigateToMyTrips = () => alert(lang === 'ar' ? '📅 صفحة رحلاتي - قيد التطوير' : '📅 My Trips - Coming soon');
  const navigateToNotifications = () => setPage('notifications');
  const navigateToSettings = () => setPage('settings');

  const handleLogout = () => {
    if (onLogout) onLogout();
    else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setPage('home');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
      {/* الهيدر مع زر العودة */}
      <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-4 text-white flex items-center gap-3">
        <button onClick={() => setPage('home')} className="p-1 hover:bg-white/20 rounded-lg transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{lang === 'ar' ? 'الحساب' : 'Account'}</h1>
      </div>

      <div className="p-4">
        {/* شبكة الأزرار الأربعة */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={navigateToProfileData}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2"
          >
            <User size={24} className="text-green-600" />
            <span className="text-sm font-medium">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
          </button>

          <button
            onClick={navigateToMyTrips}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2"
          >
            <Package size={24} className="text-blue-600" />
            <span className="text-sm font-medium">{lang === 'ar' ? 'رحلاتي' : 'My Trips'}</span>
          </button>

          <button
            onClick={navigateToNotifications}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2"
          >
            <Bell size={24} className="text-yellow-600" />
            <span className="text-sm font-medium">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
          </button>

          <button
            onClick={navigateToSettings}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2"
          >
            <Settings size={24} className="text-purple-600" />
            <span className="text-sm font-medium">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</span>
          </button>
        </div>

        {/* قسم المساعدة والدعم */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-4">
          <h3 className="font-bold mb-3">{lang === 'ar' ? 'المساعدة والدعم' : 'Help & Support'}</h3>
          <button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded-lg transition">
            <span className="flex items-center gap-3">
              <FileText size={18} className="text-purple-600" />
              {lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
            </span>
            <span>‹</span>
          </button>
        </div>

        {/* زر تسجيل الخروج */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;

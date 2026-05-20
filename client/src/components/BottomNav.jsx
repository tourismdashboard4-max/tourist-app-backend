// client/src/components/BottomNav.jsx
// ✅ نسخة مستقلة ونظيفة - تفتح صفحة الملف الشخصي كاملة (بدون قائمة منسدلة)

import React from 'react';
import { Home, Navigation, Heart, Users, User, Shield } from 'lucide-react';

function BottomNav({ current, setCurrent, lang, user, unreadCount = 0, setShowLogin }) {
  const isGuideUser = user?.type === "guide" || user?.role === 'guide' || user?.isGuide === true;

  const items = isGuideUser ? [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home" },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore" },
    { key: "favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites" },
    { key: "guideDashboard", icon: Shield, label: lang === "ar" ? "لوحتي" : "Dashboard" },
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile" }
  ] : [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home" },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore" },
    { key: "favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites" },
    { key: "guides", icon: Users, label: lang === "ar" ? "المرشدين" : "Guides" },
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile" }
  ];

  const handleClick = (key) => {
    console.log(`🔘 [BottomNav] clicked: ${key}`);
    if (key === 'explore' && !user) {
      alert(lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً' : 'Please login');
      setShowLogin && setShowLogin(true);
      return;
    }
    // ✅ الملف الشخصي: فتح صفحة كاملة
    if (key === 'profile') {
      if (user) {
        setCurrent('profile');
      } else {
        setShowLogin && setShowLogin(true);
      }
      return;
    }
    setCurrent(key);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white border-t border-gray-200 flex justify-around py-3 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        {items.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={`flex flex-col items-center justify-center w-16 ${
              current === key ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <Icon size={24} className="mb-1" />
            <span className="text-xs font-medium">{label}</span>
            {current === key && <div className="w-1 h-1 bg-green-600 dark:bg-green-400 rounded-full mt-1" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export default BottomNav;

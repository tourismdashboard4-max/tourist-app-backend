// client/src/components/BottomNav.jsx
import React from 'react';
import { Home, Navigation, Heart, Users, User, Shield } from 'lucide-react';

function BottomNav({ current, setCurrent, lang, user, unreadCount = 0, setShowLogin }) {
  const isGuideUser = user?.type === "guide" || user?.role === 'guide' || user?.isGuide === true || user?.guide_status === 'approved';
  
  const navItems = isGuideUser ? [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home", requiresAuth: false },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore", requiresAuth: true },
    { key: "favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites", requiresAuth: true },
    { key: "guideDashboard", icon: Shield, label: lang === "ar" ? "لوحتي" : "My Dashboard", requiresAuth: true },
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile", requiresAuth: false } // ✅ profile يفتح صفحة كاملة
  ] : [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home", requiresAuth: false },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore", requiresAuth: true },
    { key: "favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites", requiresAuth: true },
    { key: "guides", icon: Users, label: lang === "ar" ? "المرشدين" : "Guides", requiresAuth: false },
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile", requiresAuth: false } // ✅ profile يفتح صفحة كاملة
  ];

  const handleClick = (key) => {
    const item = navItems.find(i => i.key === key);
    if (item?.requiresAuth && !user) {
      if (setShowLogin) setShowLogin(true);
      else alert(lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً' : 'Please login first');
      return;
    }
    // ✅ الانتقال المباشر إلى الصفحة (بما فيها profile)
    setCurrent(key);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white border-t border-gray-200 flex justify-around py-3 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => handleClick(item.key)}
              className={`flex flex-col items-center justify-center w-16 ${
                current === item.key
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Icon size={24} className="mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
              {current === item.key && (
                <div className="w-1 h-1 bg-green-600 dark:bg-green-400 rounded-full mt-1"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BottomNav;

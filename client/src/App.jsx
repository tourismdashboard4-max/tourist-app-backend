import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import './index.css';
import mapboxgl from "mapbox-gl";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import { 
  Home, Settings, Star, Heart, Navigation, Bell, User, 
  Search,  // ✅ موجودة مرة واحدة فقط
  Calendar, MapPin, Users, Sun, Moon, MessageCircle, 
  CheckCircle, XCircle, Phone, FileText, Send, Plus, 
  Archive, Shield, Package, Target, MapPinned, Mail,     
  Edit2, LogOut, Camera, Save, X 
} from "lucide-react";
import api from './services/api';
import LoginPage from './components/Auth/LoginPage';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import NotificationsPage from './pages/NotificationsPage'; 
import { AuthProvider } from './contexts/AuthContext';




// Mapbox token - استخدم هذا التوكن
mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw";
const LOCALES = {
  en: {
    appName: "Al-Sa'eh",
    welcome: "Welcome",
    search: "Search destination...",
    explore: "Explore",
    nearby: "Nearby",
    favorites: "Favorites",
    events: "Events",
    guides: "Guides",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    login: "Sign in",
    darkMode: "Dark mode",
    language: "Language",
    transportMode: "Transportation",
    driving: "Driving",
    walking: "Walking",
    cycling: "Cycling",
    selectDestination: "Select destination",
    startTrip: "Start trip",
    distance: "Distance",
    duration: "Duration",
    selected: "Selected",
    guideLogin: "Guide Login",
    registerAsGuide: "Register as Tourist Guide",
    guideRegistration: "Guide Registration",
    civilId: "Civil ID Number",
    licenseNumber: "License Number",
    licenseFile: "Professional License",
    uploadLicense: "Upload License",
    guideStatus: "Guide Status",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    addProgram: "Add Program",
    myPrograms: "My Programs",
    programName: "Program Name",
    programDescription: "Program Description",
    programLocation: "Program Location",
    programPrice: "Program Price",
    programDuration: "Program Duration",
    activateProgram: "Activate Program",
    deactivateProgram: "Deactivate Program",
    messages: "Messages",
    support: "Support",
    sendMessage: "Send Message",
    newMessage: "New Message",
    to: "To",
    message: "Message",
    chatWith: "Chat with",
    typeMessage: "Type message here...",
    locationSharing: "Location Sharing",
    enableLocation: "Enable Location",
    disableLocation: "Disable Location",
    myRequests: "My Requests",
    archiveTrips: "Archived Trips",
    ratings: "Ratings",
    completed: "Completed",
    active: "Active",
    pendingApproval: "Pending Approval",
    nearbyPrograms: "Nearby Programs",
    myTours: "My Tours",
    guideDashboard: "Guide Dashboard",
    userTrips: "My Trips",
  },
  ar: {
    appName: "السائح",
    welcome: "مرحباً",
    search: "ابحث عن وجهة...",
    explore: "استكشف",
    nearby: "قريب منك",
    favorites: "المفضلة",
    events: "الفعاليات",
    guides: "المرشدين",
    profile: "صفحتي",
    settings: "الإعدادات",
    logout: "تسجيل خروج",
    login: "تسجيل الدخول",
    darkMode: "الوضع الليلي",
    language: "اللغة",
    transportMode: "وسيلة النقل",
    driving: "سيارة",
    walking: "مشي",
    cycling: "دراجة",
    selectDestination: "اختر وجهة",
    startTrip: "ابدأ الرحلة",
    distance: "المسافة",
    duration: "المدة",
    selected: "المختار",
    guideLogin: "دخول مرشد",
    registerAsGuide: "التسجيل كمرشد سياحي",
    guideRegistration: "تسجيل مرشد سياحي",
    civilId: "رقم الهوية الوطنية",
    licenseNumber: "رقم وثيقة مزاولة المهنة",
    licenseFile: "وثيقة مزاولة المهنة",
    uploadLicense: "رفع وثيقة مزاولة المهنة",
    guideStatus: "حالة المرشد",
    pending: "قيد المراجعة",
    approved: "موافق عليه",
    rejected: "مرفوض",
    addProgram: "إضافة برنامج",
    myPrograms: "برامجي",
    programName: "اسم البرنامج",
    programDescription: "وصف البرنامج",
    programLocation: "موقع البرنامج",
    programPrice: "سعر البرنامج",
    programDuration: "مدة البرنامج",
    activateProgram: "تفعيل البرنامج",
    deactivateProgram: "إيقاف البرنامج",
    messages: "الرسائل",
    support: "الدعم",
    sendMessage: "إرسال رسالة",
    newMessage: "رسالة جديدة",
    to: "إلى",
    message: "الرسالة",
    chatWith: "محادثة مع",
    typeMessage: "اكتب رسالة هنا...",
    locationSharing: "مشاركة الموقع",
    enableLocation: "تفعيل الموقع",
    disableLocation: "إيقاف الموقع",
    myRequests: "طلباتي",
    archiveTrips: "رحلاتي المؤرشفة",
    ratings: "التقييمات",
    completed: "مكتمل",
    active: "نشط",
    pendingApproval: "بانتظار الموافقة",
    nearbyPrograms: "البرامج القريبة",
    myTours: "جولاتي",
    guideDashboard: "لوحة المرشد",
    userTrips: "رحلاتي",
  },
};

// ===================== 📱 Bottom Navigation Bar (معدل) =====================
function BottomNav({ current, setCurrent, lang, user }) {
  const navItems = user?.type === "guide" ? [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home" },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore" },
    { key: "guideDashboard", icon: Users, label: lang === "ar" ? "لوحتي" : "My Dashboard" },
    { key: "messages", icon: MessageCircle, label: lang === "ar" ? "الرسائل" : "Messages" },
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile" },
  ] : [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home" },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore" },
    { key: "favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites" },
    { key: "guides", icon: Users, label: lang === "ar" ? "المرشدين" : "Guides" },
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile" },
  ];

  // ✅ دالة للحصول على الحرف الأول من الاسم
  const getInitial = () => {
    if (!user) return null;
    if (user.fullName) return user.fullName.charAt(0).toUpperCase();
    if (user.name) return user.name.charAt(0).toUpperCase();
    return null;
  };

  // ✅ دالة عرض أيقونة الملف الشخصي
  const getProfileIcon = () => {
    if (!user) return <User size={24} className="mb-1" />;
    
    if (user.avatar) {
      return (
        <img 
          src={user.avatar} 
          alt="profile" 
          className="w-6 h-6 rounded-full object-cover mb-1"
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = `<div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs mb-1">${getInitial() || 'U'}</div>`;
          }}
        />
      );
    }
    
    return (
      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs mb-1">
        {getInitial() || 'U'}
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 z-50 shadow-lg dark:bg-gray-800 dark:border-gray-700">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => {
              // ✅ منع الزوار من الوصول للخريطة
              if (!user && item.key === 'explore') {
                alert(lang === 'ar' 
                  ? 'الرجاء تسجيل الدخول أولاً للوصول للخريطة' 
                  : 'Please login first to access the map'
                );
                return;
              }
              setCurrent(item.key);
            }}
            className={`flex flex-col items-center justify-center w-16 ${
              current === item.key 
                ? "text-green-600 dark:text-green-400" 
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {item.key === 'profile' ? getProfileIcon() : <Icon size={24} className="mb-1" />}
            <span className="text-xs font-medium">{item.label}</span>
            {current === item.key && (
              <div className="w-1 h-1 bg-green-600 dark:bg-green-400 rounded-full mt-1"></div>
            )}
          </button>
        );
      })}
    </div>
  );
}
// ===================== 📍 Home Page (معدلة) =====================
function HomePage({ lang, user, setPage, dark, setDark, locationEnabled, setLocationEnabled }) {
  const t = (k) => LOCALES[lang][k] || k;
  
  return (
    <div className="h-full overflow-y-auto pb-20 bg-gray-50 dark:bg-gray-900">
      {/* Header with user info */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{t("welcome")}</h1>
            <p className="text-white/90">{user?.name || t("appName")}</p>
            {user?.type === "guide" && (
              <div className="flex items-center mt-1">
                <Shield className="w-4 h-4 ml-1" />
                <span className="text-sm">مرشد سياحي موثق</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDark(!dark)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="relative">
              <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center">
                <Bell size={20} />
              </button>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t("search")}
            className="w-full p-3 pr-10 rounded-xl bg-white/20 backdrop-blur-sm placeholder-white/70 border border-white/30 focus:outline-none focus:border-white focus:bg-white/30 transition"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t("explore")}</h2>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {/* ✅ زر الخريطة المعدل - يظهر تنبيه للزوار */}
          <button 
            onClick={() => {
              if (!user) {
                alert(lang === 'ar' 
                  ? 'الرجاء تسجيل الدخول أولاً للوصول للخريطة' 
                  : 'Please login first to access the map'
                );
                return;
              }
              setPage("explore");
            }}
            className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
              <MapPin className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <span className="text-xs font-medium dark:text-gray-200">الخريطة</span>
          </button>
          
          <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
              <Package className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <span className="text-xs font-medium dark:text-gray-200">{t("nearbyPrograms")}</span>
          </div>
          
          <button 
            onClick={() => setPage(user?.type === "guide" ? "guideDashboard" : "guides")}
            className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-2">
              <Users className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <span className="text-xs font-medium dark:text-gray-200">
              {user?.type === "guide" ? t("guideDashboard") : t("guides")}
            </span>
          </button>
          
          <button 
            onClick={() => setPage("profile")}
            className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-2">
              {user?.type === "guide" ? 
                <Archive className="text-orange-600 dark:text-orange-400" size={24} /> :
                <Heart className="text-orange-600 dark:text-orange-400" size={24} />
              }
            </div>
            <span className="text-xs font-medium dark:text-gray-200">
              {user?.type === "guide" ? t("archiveTrips") : t("favorites")}
            </span>
          </button>
        </div>

        {/* Nearby Programs - تظهر للجميع */}
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t("nearbyPrograms")}</h2>
        
        {!user ? (
          /* للزوار: عرض البرامج الوهمية */
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm hover:shadow-md transition">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 ml-3 flex items-center justify-center">
                  <Target className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 dark:text-white">جولة تاريخية في الدرعية</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">مرشد: محمد العتيبي</p>
                  <div className="flex items-center mt-1">
                    <Star size={14} className="text-yellow-500 fill-current" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">4.8 (24 تقييم)</span>
                    <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded mr-2">2 كم</span>
                  </div>
                </div>
                <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">
                  {t("startTrip")}
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* للمستخدمين المسجلين: برامج حقيقية */
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-green-100 dark:border-green-900">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      {lang === 'ar' ? 'جولة في المسار التاريخي' : 'Historical Route Tour'}
                    </h3>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">150 ريال</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {lang === 'ar' ? 'مرشد: أحمد العتيبي' : 'Guide: Ahmed Al-Otaibi'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-xs text-gray-600 dark:text-gray-300 mr-1">4.9</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">1.2 كم</span>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                      {lang === 'ar' ? '3 ساعات' : '3 hours'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-green-100 dark:border-green-900">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      {lang === 'ar' ? 'رحلة سفاري الصحراء' : 'Desert Safari Adventure'}
                    </h3>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">250 ريال</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {lang === 'ar' ? 'مرشدة: سارة الحربي' : 'Guide: Sarah Al-Harbi'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-xs text-gray-600 dark:text-gray-300 mr-1">4.7</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">3.5 كم</span>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                      {lang === 'ar' ? '5 ساعات' : '5 hours'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-green-100 dark:border-green-900">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      {lang === 'ar' ? 'جولة طبيعية في المنتزه' : 'Nature Park Tour'}
                    </h3>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">100 ريال</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {lang === 'ar' ? 'مرشد: خالد الزهراني' : 'Guide: Khalid Al-Zahrani'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-xs text-gray-600 dark:text-gray-300 mr-1">4.8</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">0.8 كم</span>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                      {lang === 'ar' ? 'ساعتان' : '2 hours'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== 🗺️ Explore/Map Page (معدلة مع شرط منع الزوار وإضافة الإشعارات) =====================
function ExplorePage({ lang, mapContainerRef, setPage, transport, setTransport, user, programs, setPrograms, unreadCount }) {
  const t = (k) => LOCALES[lang][k] || k;
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // ✅ إذا كان المستخدم غير مسجل، نعرض رسالة بدلاً من الخريطة
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {lang === 'ar' ? 'الخريطة متاحة للأعضاء فقط' : 'Map Available for Members Only'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {lang === 'ar' 
              ? 'سجل دخول أو أنشئ حساب جديد للاستفادة من جميع ميزات التطبيق بما في ذلك الخريطة التفاعلية والبرامج القريبة'
              : 'Login or create a new account to access all app features including interactive maps and nearby programs'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setPage('profile')}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition transform hover:scale-105 shadow-md"
            >
              {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </button>
            <button
              onClick={() => setPage('home')}
              className="w-full py-3 border-2 border-green-600 text-green-600 rounded-xl font-medium hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30 transition"
            >
              {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ برامج وهمية للزوار فقط (لن يتم استخدامها هنا لأن user موجود)
  const defaultPrograms = [
    { 
      id: 1, 
      name_ar: "جولة تاريخية في الدرعية", 
      name_en: "Historical Tour in Diriyah", 
      guide_name: "محمد العتيبي",
      coords: [46.713, 24.774],
      price: 150,
      duration: "3 ساعات",
      rating: 4.8,
      distance: 1.2,
      active: true
    },
    { 
      id: 2, 
      name_ar: "مغامرة الصحراء", 
      name_en: "Desert Adventure", 
      guide_name: "أميرة الحربي",
      coords: [46.720, 24.770],
      price: 250,
      duration: "5 ساعات",
      rating: 4.9,
      distance: 3.5,
      active: true
    },
    { 
      id: 3, 
      name_ar: "جولة طبيعية في المنتزه", 
      name_en: "Nature Tour in Park", 
      guide_name: "خالد الزهراني",
      coords: [46.725, 24.779],
      price: 100,
      duration: "2 ساعة",
      rating: 4.7,
      distance: 0.8,
      active: true
    },
    { 
      id: 4, 
      name_ar: "رحلة بحرية في الخليج", 
      name_en: "Gulf Sea Trip", 
      guide_name: "فهد الدوسري",
      coords: [46.730, 24.768],
      price: 350,
      duration: "4 ساعات",
      rating: 4.9,
      distance: 5.2,
      active: true
    },
    { 
      id: 5, 
      name_ar: "جولة تراثية في السوق القديم", 
      name_en: "Heritage Old Market Tour", 
      guide_name: "نورة القحطاني",
      coords: [46.715, 24.780],
      price: 120,
      duration: "2 ساعة",
      rating: 4.7,
      distance: 1.8,
      active: true
    }
  ];

  // ✅ برامج حقيقية للمستخدمين المسجلين (من API)
  const realPrograms = programs || [];

  // ✅ للمستخدمين المسجلين، نستخدم البرامج الحقيقية فقط
  const allPrograms = realPrograms;

  useEffect(() => {
    if (mapContainerRef.current) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([longitude, latitude]);
            
            const map = new mapboxgl.Map({
              container: mapContainerRef.current,
              style: "mapbox://styles/mapbox/streets-v12",
              center: [longitude, latitude],
              zoom: 13
            });
            
            setMapInstance(map);
            
            // علامة موقع المستخدم
            new mapboxgl.Marker({ color: "green" })
              .setLngLat([longitude, latitude])
              .setPopup(new mapboxgl.Popup().setText(lang === "ar" ? "موقعك الحالي" : "Your location"))
              .addTo(map);

            // إضافة علامات البرامج النشطة فقط
            allPrograms.filter(p => p.active !== false).forEach((program) => {
              const marker = new mapboxgl.Marker({ 
                color: program.guide_name === user?.name ? "purple" : "blue" 
              })
                .setLngLat(program.coords)
                .setPopup(new mapboxgl.Popup().setHTML(
                  lang === "ar" 
                    ? `<div style="text-align:right; padding:8px;">
                        <strong>${program.name_ar}</strong><br/>
                        <span>المرشد: ${program.guide_name}</span><br/>
                        <span>السعر: ${program.price} ريال</span><br/>
                        <span>المدة: ${program.duration}</span><br/>
                        <span>التقييم: ⭐ ${program.rating}</span>
                      </div>` 
                    : `<div style="padding:8px;">
                        <strong>${program.name_en}</strong><br/>
                        <span>Guide: ${program.guide_name}</span><br/>
                        <span>Price: ${program.price} SAR</span><br/>
                        <span>Duration: ${program.duration}</span><br/>
                        <span>Rating: ⭐ ${program.rating}</span>
                      </div>`
                ))
                .addTo(map);
              
              marker.getElement().addEventListener("click", () => { 
                setSelectedProgram(program); 
                setTripInfo(null); 
              });
            });
          },
          () => {
            const defaultCenter = [46.713, 24.774];
            const map = new mapboxgl.Map({
              container: mapContainerRef.current,
              style: "mapbox://styles/mapbox/streets-v12",
              center: defaultCenter,
              zoom: 12
            });
            
            setMapInstance(map);
          }
        );
      }
    }
    
    return () => {
      if (mapInstance) {
        mapInstance.remove();
        setMapInstance(null);
      }
    };
  }, [user, programs]);

  const startTrip = async () => {
    if (!mapInstance || !userLocation || !selectedProgram) return;

    const directions = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: "metric",
      profile: `mapbox/${transport}`,
      interactive: false
    });
    
    mapInstance.addControl(directions, "top-left");
    directions.setOrigin(userLocation);
    directions.setDestination(selectedProgram.coords);

    directions.on("route", (e) => {
      const route = e.route && e.route[0];
      if (route) {
        const distanceKm = (route.distance / 1000).toFixed(2);
        const durationMin = Math.round(route.duration / 60);
        setTripInfo({ distanceKm, durationMin });
      }
    });
  };

  const requestProgram = (program) => {
    if (!user) {
      alert(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return;
    }
    
    // إضافة طلب برنامج
    const request = {
      id: Date.now(),
      programId: program.id,
      programName: lang === "ar" ? program.name_ar : program.name_en,
      guideName: program.guide_name,
      userId: user.id,
      userName: user.name,
      status: 'pending',
      date: new Date().toISOString(),
      price: program.price
    };
    
    console.log('Program request:', request);
    
    alert(lang === 'ar' 
      ? 'تم إرسال طلب المشاركة في البرنامج. سيتم التواصل معك من قبل المرشد.' 
      : 'Program participation request sent. The guide will contact you.'
    );
  };

  return (
    <div className="h-full relative">
      {/* شريط علوي مع اسم المستخدم */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {/* صورة المستخدم */}
            <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center ml-3">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={24} className="text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.name}</h1>
              <p className="text-white/90 flex items-center">
                <MapPin className="w-4 h-4 ml-1" />
                {lang === 'ar' ? 'استكشف البرامج القريبة منك' : 'Explore nearby programs'}
              </p>
            </div>
          </div>
          
          {/* ✅ الأزرار العلوية - هنا تم إضافة زر الإشعارات */}
          <div className="flex items-center gap-2">
            {/* زر العودة للصفحة الرئيسية */}
            <button 
              onClick={() => setPage('home')}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
              title={lang === 'ar' ? 'الرئيسية' : 'Home'}
            >
              <Home size={20} />
            </button>
            
            {/* زر التحديث */}
            <button 
              onClick={() => window.location.reload()}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
              title={lang === 'ar' ? 'تحديث' : 'Refresh'}
            >
              <span className="text-lg">🔄</span>
            </button>
            
            {/* ✅ زر الإشعارات - تم إضافته هنا */}
            {user && (
              <button 
                onClick={() => setPage("notifications")}
                className="relative p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
                title={lang === 'ar' ? 'الإشعارات' : 'Notifications'}
              >
                <Bell size={20} />
                {/* عداد الإشعارات - يظهر إذا كان هناك إشعارات غير مقروءة */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* حقل البحث */}
        <div className="relative">
          <Search className="absolute right-3 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('search')}
            className="w-full p-3 pr-10 rounded-xl bg-white/20 placeholder-white/70 border border-white/30 focus:outline-none focus:border-white text-white"
          />
        </div>

        {/* إظهار عدد البرامج المتاحة */}
        <div className="mt-3 text-xs text-white/80">
          {lang === 'ar' 
            ? `📌 ${allPrograms.length} برنامج متاح` 
            : `📌 ${allPrograms.length} programs available`}
        </div>
      </div>

      {/* الخريطة */}
      <div className="h-[calc(100vh-200px)] w-full">
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>

      {/* تفاصيل البرنامج المحدد */}
      {selectedProgram && (
        <div className="absolute bottom-24 left-4 right-4 z-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border-2 border-green-500">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg dark:text-white">
                  {lang === "ar" ? selectedProgram.name_ar : selectedProgram.name_en}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {lang === "ar" ? "المرشد:" : "Guide:"} {selectedProgram.guide_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm mr-1">{selectedProgram.rating}</span>
                  </div>
                  <span className="text-sm text-gray-500">{selectedProgram.price} ريال</span>
                  <span className="text-sm text-gray-500">{selectedProgram.duration}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProgram(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                ✕
              </button>
            </div>
            
            {tripInfo && (
              <div className="text-sm mt-1 text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded mb-3">
                {t('distance')}: {tripInfo.distanceKm} كم — {t('duration')}: {tripInfo.durationMin} دقيقة
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <select 
                  value={transport} 
                  onChange={(e) => setTransport(e.target.value)} 
                  className="border rounded-md px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="driving">{t('driving')}</option>
                  <option value="walking">{t('walking')}</option>
                  <option value="cycling">{t('cycling')}</option>
                </select>
                <button 
                  onClick={startTrip}
                  className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition"
                >
                  {t('startTrip')}
                </button>
              </div>
              
              {user?.type !== 'guide' && (
                <button 
                  onClick={() => requestProgram(selectedProgram)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
                >
                  {lang === "ar" ? "طلب المشاركة" : "Request to Join"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== 💬 نظام المراسلة الداخلية =====================
function ChatSystem({ user, lang, setPage }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: "guide", text: "مرحباً، كيف يمكنني مساعدتك؟", time: "10:30", senderName: "محمد العتيبي" },
    { id: 2, sender: "user", text: "أريد معرفة تفاصيل جولة المنتزه", time: "10:32", senderName: "أحمد" },
    { id: 3, sender: "guide", text: "بالتأكيد، الجولة تبدأ الساعة 4 عصراً", time: "10:33", senderName: "محمد العتيبي" },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const newMsg = {
      id: messages.length + 1,
      sender: user?.type === "guide" ? "guide" : "user",
      text: newMessage,
      time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      senderName: user?.name || "مستخدم"
    };
    
    setMessages([...messages, newMsg]);
    setNewMessage("");
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700 flex items-center">
        <button onClick={() => setPage("home")} className="ml-3">
          <span className="text-2xl text-gray-600 dark:text-gray-300">‹</span>
        </button>
        <MessageCircle className="text-green-600 ml-2" size={24} />
        <h3 className="font-bold text-lg dark:text-white">
          {lang === "ar" ? "نظام المراسلة" : "Messaging System"}
        </h3>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs rounded-lg p-3 ${
                  msg.sender === "user"
                    ? "bg-green-500 text-white rounded-br-none"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-sm"
                }`}
              >
                {msg.sender !== "user" && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{msg.senderName}</div>
                )}
                <div>{msg.text}</div>
                <div className={`text-xs mt-1 ${msg.sender === "user" ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={lang === "ar" ? "اكتب رسالة هنا..." : "Type a message..."}
              className="flex-1 border dark:border-gray-600 rounded-lg px-4 py-3 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== 📋 صفحة تسجيل المرشد =====================
function GuideRegistrationPage({ lang, onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    fullName: '',
    civilId: '',
    licenseNumber: '',
    email: '',
    phone: '',
    experience: '',
    specialties: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const registrationData = {
        ...formData,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      console.log('Guide Registration Data:', registrationData);
      
      alert(lang === 'ar' 
        ? 'تم إرسال طلب التسجيل بنجاح! سيتم مراجعته من قبل الإدارة.'
        : 'Registration submitted successfully!'
      );
      
      if (onSubmit) onSubmit(registrationData);
    } catch (error) {
      console.error('Registration error:', error);
      alert(lang === 'ar' ? 'حدث خطأ في التسجيل' : 'Registration error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20 p-4">
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 mr-4"
        >
          <span className="text-xl dark:text-white">‹</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {lang === 'ar' ? 'التسجيل كمرشد سياحي' : 'Register as Tourist Guide'}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            {lang === 'ar' ? 'متطلبات التسجيل' : 'Registration Requirements'}
          </h3>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
            <li>{lang === 'ar' ? 'رقم الهوية الوطنية السعودية' : 'Saudi National ID number'}</li>
            <li>{lang === 'ar' ? 'وثيقة مزاولة مهنة المرشد السياحي' : 'Tourist guide license document'}</li>
            <li>{lang === 'ar' ? 'بريد إلكتروني صالح' : 'Valid email address'}</li>
            <li>{lang === 'ar' ? 'رقم هاتف للتواصل' : 'Contact phone number'}</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder={lang === 'ar' ? 'الاسم ثلاثي' : 'Full name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'رقم الهوية الوطنية' : 'Civil ID Number'}
              </label>
              <input
                type="text"
                required
                value={formData.civilId}
                onChange={(e) => setFormData({ ...formData, civilId: e.target.value })}
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder={lang === 'ar' ? '10 أرقام' : '10 digits'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'رقم وثيقة مزاولة المهنة' : 'License Number'}
              </label>
              <input
                type="text"
                required
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder={lang === 'ar' ? 'رقم الرخصة' : 'License number'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'رقم الجوال' : 'Phone Number'}
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="+966500000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'سنوات الخبرة' : 'Years of Experience'}
              </label>
              <input
                type="number"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder={lang === 'ar' ? 'عدد السنوات' : 'Number of years'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {lang === 'ar' ? 'التخصصات' : 'Specialties'}
            </label>
            <textarea
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder={lang === 'ar' ? 'مثل: التاريخ، الطبيعة، الرياضة...' : 'e.g., History, Nature, Sports...'}
              rows="2"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {isSubmitting 
                ? (lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                : (lang === 'ar' ? 'إرسال طلب التسجيل' : 'Submit Registration')
              }
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 border dark:border-gray-600 rounded-xl font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== 🗺️ لوحة تحكم المرشد =====================
function GuideDashboard({ lang, guide, setPage, user, setUserPrograms }) {
  const [programs, setPrograms] = useState([
    { id: 1, name: "جولة تاريخية في الدرعية", status: "active", participants: 15, revenue: 4500, location: [46.713, 24.774], price: 150, duration: "3 ساعات", maxParticipants: 20 },
    { id: 2, name: "مغامرة الصحراء", status: "inactive", participants: 0, revenue: 0, location: [46.720, 24.770], price: 250, duration: "5 ساعات", maxParticipants: 15 },
  ]);
  
  const [requests, setRequests] = useState([
    { id: 1, userName: "أحمد محمد", programName: "جولة تاريخية في الدرعية", status: "pending", date: "2024-03-15" },
    { id: 2, userName: "سارة عبدالله", programName: "مغامرة الصحراء", status: "approved", date: "2024-03-14" },
  ]);
  
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: "",
    description: "",
    location: "",
    price: "",
    duration: "",
    maxParticipants: "",
  });

  const toggleProgramStatus = (id) => {
    const updatedPrograms = programs.map(program => 
      program.id === id 
        ? { ...program, status: program.status === "active" ? "inactive" : "active" }
        : program
    );
    setPrograms(updatedPrograms);
    
    if (setUserPrograms) {
      setUserPrograms(updatedPrograms.filter(p => p.status === "active").map(p => ({
        id: p.id,
        name_ar: p.name,
        name_en: p.name,
        guide_name: user?.name || guide?.name || "مرشد",
        coords: p.location,
        price: p.price,
        duration: p.duration,
        rating: 4.8,
        distance: 2.5,
        active: p.status === "active"
      })));
    }
  };

  const handleAddProgram = () => {
    if (!newProgram.name.trim()) return;
    
    const program = {
      id: programs.length + 1,
      ...newProgram,
      status: "active",
      participants: 0,
      revenue: 0,
      location: [46.713 + (Math.random() * 0.02), 24.774 + (Math.random() * 0.02)]
    };
    
    const updatedPrograms = [...programs, program];
    setPrograms(updatedPrograms);
    setNewProgram({
      name: "",
      description: "",
      location: "",
      price: "",
      duration: "",
      maxParticipants: "",
    });
    setShowAddProgram(false);
    
    if (setUserPrograms) {
      setUserPrograms(updatedPrograms.filter(p => p.status === "active").map(p => ({
        id: p.id,
        name_ar: p.name,
        name_en: p.name,
        guide_name: user?.name || guide?.name || "مرشد",
        coords: p.location,
        price: p.price,
        duration: p.duration,
        rating: 4.8,
        distance: 2.5,
        active: p.status === "active"
      })));
    }
  };

  const updateRequestStatus = (requestId, newStatus) => {
    setRequests(requests.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    ));
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">لوحة تحكم المرشد</h1>
            <p className="opacity-90">{guide?.name || "مرشد سياحي"}</p>
            <div className="flex items-center mt-2">
              <CheckCircle className="w-5 h-5 ml-1" />
              <span className="text-sm">حساب موثق</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{programs.filter(p => p.status === "active").length}</div>
            <div className="text-sm opacity-90">برنامج نشط</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {programs.reduce((sum, p) => sum + p.participants, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">مشاركين</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {programs.reduce((sum, p) => sum + p.revenue, 0)} ريال
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">إجمالي الإيرادات</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {requests.filter(r => r.status === "pending").length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">طلبات جديدة</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">طلبات المشاركة</h2>
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded text-sm">
            {requests.filter(r => r.status === "pending").length} قيد الانتظار
          </span>
        </div>
        
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">{request.userName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{request.programName}</p>
                  <p className="text-xs text-gray-500">{request.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    request.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                    request.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {request.status === "pending" ? "بانتظار الموافقة" :
                     request.status === "approved" ? "موافق عليه" : "مكتمل"}
                  </span>
                  
                  {request.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateRequestStatus(request.id, "approved")}
                        className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/50 transition"
                      >
                        موافقة
                      </button>
                      <button
                        onClick={() => updateRequestStatus(request.id, "rejected")}
                        className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                      >
                        رفض
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">برامجي السياحية</h2>
          <button
            onClick={() => setShowAddProgram(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
          >
            <Plus className="w-4 h-4 ml-1" />
            {lang === "ar" ? "إضافة برنامج" : "Add Program"}
          </button>
        </div>

        <div className="space-y-4">
          {programs.map((program) => (
            <div key={program.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white ml-2">{program.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      program.status === "active" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {program.status === "active" ? "نشط" : "متوقف"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-sm">
                      <div className="text-gray-500">السعر</div>
                      <div className="font-medium">{program.price} ريال</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-500">المدة</div>
                      <div className="font-medium">{program.duration}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-gray-500">المشاركين</div>
                      <div className="font-medium">{program.participants}/{program.maxParticipants}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 mr-4">
                  <button
                    onClick={() => toggleProgramStatus(program.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      program.status === "active"
                        ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                    } transition`}
                  >
                    {program.status === "active" ? "إيقاف" : "تفعيل"}
                  </button>
                  <button
                    onClick={() => setPage("messages")}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition"
                  >
                    الرسائل
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold dark:text-white">{lang === "ar" ? "إضافة برنامج جديد" : "Add New Program"}</h3>
              <button onClick={() => setShowAddProgram(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder={lang === "ar" ? "اسم البرنامج" : "Program Name"}
                value={newProgram.name}
                onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
              <textarea
                placeholder={lang === "ar" ? "وصف البرنامج" : "Program Description"}
                value={newProgram.description}
                onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                rows="3"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={lang === "ar" ? "الموقع" : "Location"}
                  value={newProgram.location}
                  onChange={(e) => setNewProgram({...newProgram, location: e.target.value})}
                  className="p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <input
                  type="number"
                  placeholder={lang === "ar" ? "السعر (ريال)" : "Price (SAR)"}
                  value={newProgram.price}
                  onChange={(e) => setNewProgram({...newProgram, price: e.target.value})}
                  className="p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <input
                  type="text"
                  placeholder={lang === "ar" ? "المدة (ساعات)" : "Duration (hours)"}
                  value={newProgram.duration}
                  onChange={(e) => setNewProgram({...newProgram, duration: e.target.value})}
                  className="p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <input
                  type="number"
                  placeholder={lang === "ar" ? "العدد الأقصى" : "Max Participants"}
                  value={newProgram.maxParticipants}
                  onChange={(e) => setNewProgram({...newProgram, maxParticipants: e.target.value})}
                  className="p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-3">
                <button
                  onClick={handleAddProgram}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                >
                  {lang === "ar" ? "إضافة البرنامج" : "Add Program"}
                </button>
                <button
                  onClick={() => setShowAddProgram(false)}
                  className="px-6 py-3 border dark:border-gray-600 rounded-lg font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== 👨‍🏫 صفحة المرشدين =====================
function GuidesPage({ lang, onGuideLogin, onGuideRegister, user }) {
  // بيانات المرشدين الوهميين - تظهر فقط للزوار
  const sampleGuides = [
    { 
      id: 1, 
      name: lang === "ar" ? "محمد العتيبي" : "Mohammed Al-Otaibi", 
      rating: 4.9, 
      phone: "+966500000001", 
      specialties: ["تاريخ", "تراث"], 
      verified: true,
      programs: 5,
      distance: 1.2,
      reviews: 24,
      licenseNumber: "TRL-1234-5678"
    },
    { 
      id: 2, 
      name: lang === "ar" ? "العنود نسيب" : "AlAnoud Naseeb", 
      rating: 4.8, 
      phone: "+966500000002", 
      specialties: ["طبيعة", "مغامرات", "تخييم"], 
      verified: true,
      programs: 7,
      distance: 2.8,
      reviews: 31,
      licenseNumber: "TRL-8765-4321"
    },
    { 
      id: 3, 
      name: lang === "ar" ? "أميرة الحربي" : "Amira Al-Harbi", 
      rating: 4.8, 
      phone: "+966500000003", 
      specialties: ["طبيعة", "مغامرات"], 
      verified: true,
      programs: 3,
      distance: 3.5,
      reviews: 18,
      licenseNumber: "TRL-5678-1234"
    }
  ];

  // ✅ بيانات المرشدين الحقيقين - فارغة حالياً (سيتم ملؤها من API لاحقاً)
  const [realGuides, setRealGuides] = useState([]);

  const t = (k) => LOCALES?.[lang]?.[k] || k;

  // التحقق من وجود LOCALES
  if (!LOCALES) {
    console.error('LOCALES is not defined');
    return <div>خطأ في تحميل الترجمة</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      {/* عنوان الصفحة مع أزرار الدخول */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {lang === "ar" ? "المرشدين السياحيين" : "Tourist Guides"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {lang === "ar" 
              ? `${!user ? sampleGuides.length : realGuides.length} مرشد معتمد` 
              : `${!user ? sampleGuides.length : realGuides.length} Verified Guides`}
          </p>
        </div>
        
        {/* أزرار الدخول للمرشدين - تظهر فقط للمستخدمين العاديين */}
        {(!user || user?.type !== "guide") && (
          <div className="flex gap-2">
            <button 
              onClick={onGuideLogin} 
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-md flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="font-medium">{t("guideLogin") || "دخول مرشد"}</span>
            </button>
            <button 
              onClick={onGuideRegister} 
              className="px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30 transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">{t("registerAsGuide") || "التسجيل كمرشد"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ✅ شرط العرض: إذا كان المستخدم غير مسجل اعرض الوهميين، وإذا كان مسجل اعرض الحقيقيين */}
      {!user ? (
        /* 🟢 عرض المرشدين الوهميين للزوار فقط */
        <>
          {/* شريط البحث */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={lang === "ar" ? "ابحث عن مرشد بالاسم أو التخصص..." : "Search guides by name or specialty..."}
                className="w-full p-3 pr-10 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* بطاقات المرشدين الوهميين */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleGuides.map((guide) => (
              <div 
                key={guide.id} 
                className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700"
              >
                {/* رأس البطاقة - صورة المرشد والمعلومات الأساسية */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                        {guide.name?.split(" ")[0]?.[0] || 'م'}
                      </div>
                      {guide.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white dark:border-gray-800">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="mr-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg">
                          {guide.name}
                        </h3>
                        {guide.verified && (
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                            موثق
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 mr-1">
                            {guide.rating}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                          ({guide.reviews || 0} تقييم)
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {guide.programs} برامج
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* التخصصات */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {guide.specialties?.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium border border-green-100 dark:border-green-800"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                {/* معلومات إضافية - المسافة وعدد البرامج */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center">
                    <MapPinned className="w-4 h-4 ml-1 text-green-600 dark:text-green-400" />
                    <span>{guide.distance} كم من موقعك</span>
                  </div>
                  <div className="flex items-center">
                    <Package className="w-4 h-4 ml-1 text-green-600 dark:text-green-400" />
                    <span>{guide.programs} برنامج سياحي</span>
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex gap-3">
                  <a
                    href={`https://wa.me/${guide.phone?.replace(/[+]/g, "")}?text=${encodeURIComponent(
                      lang === "ar" 
                        ? `السلام عليكم ${guide.name}، أرغب في الاستفسار عن البرامج السياحية المتاحة` 
                        : `Hello ${guide.name}, I would like to inquire about available tour programs`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-3 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm text-center hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">{lang === "ar" ? "محادثة واتساب" : "WhatsApp"}</span>
                  </a>
                  <button className="flex-1 px-3 py-2.5 border-2 border-green-600 text-green-600 rounded-lg text-sm hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30 transition-all flex items-center justify-center gap-2 font-medium">
                    <Package className="w-4 h-4" />
                    <span>{lang === "ar" ? "عرض البرامج" : "View Programs"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ✅ قسم دعوة المرشدين - يظهر فقط للزوار */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {lang === "ar" ? "انضم إلى فريق المرشدين المعتمدين" : "Join Our Verified Guides Team"}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-2 max-w-2xl">
                  {lang === "ar" 
                    ? "احصل على فرصة لعرض برامجك السياحية على آلاف المستخدمين وزد دخلك من خلال منصتنا"
                    : "Get the opportunity to showcase your tour programs to thousands of users and increase your income through our platform"}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" /> توثيق فوري
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-green-500" /> آلاف العملاء
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-green-500" /> عمولة 0%
                  </span>
                </div>
              </div>
              <button
                onClick={onGuideRegister}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 font-bold shadow-lg flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                <span>{lang === "ar" ? "سجل الآن مجاناً" : "Register Now Free"}</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* 🟢 عرض رسالة للمستخدمين المسجلين - لا يوجد مرشدين حقيقيين بعد */
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-lg">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {lang === "ar" ? "مرحباً بك في منصة المرشدين" : "Welcome to Guides Platform"}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            {lang === "ar" 
              ? "المستخدمين المسجلين لا يمكنهم رؤية المرشدين الوهميين. يرجى الانتظار حتى يتم إضافة مرشدين حقيقيين."
              : "Registered users cannot see demo guides. Please wait for real guides to be added."}
          </p>
        </div>
      )}
    </div>
  );
}


// ===================== ⭐ Favorites Page =====================
function FavoritesPage({ lang }) {
  const t = (k) => LOCALES[lang][k] || k;
  
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">{t("favorites")}</h1>
      
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-start">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 ml-4"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white">منتزه الورد</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">حديقة عامة</p>
                  </div>
                  <button className="text-red-500 hover:text-red-600 transition">
                    <Heart size={20} className="fill-current" />
                  </button>
                </div>
                <div className="flex items-center mt-2">
                  <MapPin size={14} className="text-gray-400 ml-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">الرياض، حي العليا</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center">
                    <Star size={14} className="text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-700 dark:text-gray-200 mr-1">4.7</span>
                  </div>
                  <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">
                    الذهاب
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== 📅 Events Page =====================
function EventsPage({ lang }) {
  const t = (k) => LOCALES[lang][k] || k;
  
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">{t("events")}</h1>
      
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
            <div className="h-40 bg-gradient-to-r from-blue-500 to-teal-400"></div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg dark:text-white">مهرجان الربيع {i}</h3>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">مباشر</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">فعالية سنوية في منتزه المدينة مع أنشطة ترفيهية</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <Calendar size={14} className="ml-1" />
                  <span className="text-xs">15 مارس 2024</span>
                </div>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition">
                  حجز
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== 👤 Profile Page (معدلة مع إصلاح زر التعديل وإضافة التحقق من الجوال والإشعارات) =====================
function ProfilePage({ lang, user, setPage, setShowLogin, onLogout }) {
  const t = (k) => LOCALES[lang][k] || k;
  
  const [userData, setUserData] = useState(user || null);
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileContent, setShowProfileContent] = useState(false);
  const [editData, setEditData] = useState({
    fullName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // حالات للتحقق من رقم الجوال
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState('idle');
  const [tempPhone, setTempPhone] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (userData) {
      setEditData({
        fullName: userData.fullName || '',
        phone: userData.phone || ''
      });
    }
  }, [userData]);

  // مؤقت إعادة إرسال الرمز
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setShowVerificationInput(false);
    setPhoneVerificationStep('idle');
  };

  useEffect(() => {
    if (!isEditing && userData) {
      setEditData({
        fullName: userData.fullName || '',
        phone: userData.phone || ''
      });
    }
  }, [isEditing, userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  // دالة التحقق من رقم الجوال وإرسال رمز التحقق
  const handleVerifyPhone = async () => {
    const phoneNumber = editData.phone;
    
    if (!phoneNumber || phoneNumber === 'غير مضاف') {
      alert(lang === 'ar' ? '❌ الرجاء إدخال رقم الجوال أولاً' : '❌ Please enter your phone number first');
      return;
    }

    // التحقق من صيغة الرقم السعودي
    const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
    if (!saudiPhoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      alert(lang === 'ar' 
        ? '❌ رقم الجوال غير صحيح. الرجاء إدخال رقم سعودي صحيح (مثال: 05xxxxxxxx أو +9665xxxxxxxx)' 
        : '❌ Invalid phone number. Please enter a valid Saudi number (e.g., 05xxxxxxxx or +9665xxxxxxxx)');
      return;
    }

    setPhoneVerificationStep('sending');
    setTempPhone(phoneNumber);

    try {
      // إرسال طلب التحقق إلى API
      const response = await api.sendPhoneVerification(userData.id, phoneNumber);
      
      if (response.success) {
        setPhoneVerificationStep('sent');
        setShowVerificationInput(true);
        setCountdown(60);
        alert(lang === 'ar' 
          ? `📱 تم إرسال رمز التحقق إلى الرقم ${phoneNumber}` 
          : `📱 Verification code sent to ${phoneNumber}`);
      } else {
        setPhoneVerificationStep('idle');
        alert(lang === 'ar' 
          ? '❌ فشل إرسال رمز التحقق. الرجاء المحاولة لاحقاً' 
          : '❌ Failed to send verification code. Please try again later');
      }
    } catch (error) {
      console.error('Error sending verification:', error);
      setPhoneVerificationStep('idle');
      alert(lang === 'ar' 
        ? '❌ خطأ في الاتصال بالخادم' 
        : '❌ Server connection error');
    }
  };

  // دالة التحقق من الرمز
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 4) {
      alert(lang === 'ar' ? '❌ الرجاء إدخال رمز التحقق' : '❌ Please enter verification code');
      return;
    }

    setPhoneVerificationStep('verifying');

    try {
      const response = await api.verifyPhoneCode(userData.id, tempPhone, verificationCode);
      
      if (response.success) {
        const updatedUser = { ...userData, phone: tempPhone, phoneVerified: true };
        localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        
        setEditData(prev => ({ ...prev, phone: tempPhone }));
        
        setPhoneVerificationStep('verified');
        setShowVerificationInput(false);
        
        alert(lang === 'ar' 
          ? '✅ تم التحقق من رقم الجوال بنجاح!' 
          : '✅ Phone number verified successfully!');
      } else {
        setPhoneVerificationStep('sent');
        alert(lang === 'ar' 
          ? '❌ رمز التحقق غير صحيح' 
          : '❌ Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setPhoneVerificationStep('sent');
      alert(lang === 'ar' 
        ? '❌ خطأ في التحقق' 
        : '❌ Verification error');
    }
  };

  // دالة إعادة إرسال الرمز
  const handleResendCode = () => {
    if (countdown > 0) return;
    handleVerifyPhone();
  };

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      const response = await api.updateUserProfile(userData.id, {
        fullName: editData.fullName
      });
      
      if (response.success) {
        const updatedUser = { ...userData, fullName: editData.fullName };
        localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        setIsEditing(false);
        alert('✅ تم تحديث الاسم بنجاح');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('❌ فشل تحديث الملف الشخصي');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. الرجاء اختيار صورة أقل من 2 ميجابايت');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار صورة فقط');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setLoading(true);
    try {
      const response = await api.uploadAvatar(userData.id, formData);
      if (response.success) {
        const updatedUser = { ...userData, avatar: response.avatar };
        localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        alert('✅ تم تحديث الصورة بنجاح');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('❌ فشل تحديث الصورة');
    } finally {
      setLoading(false);
    }
  };

  // دالة تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem('touristAppUser');
    localStorage.removeItem('touristAppToken');
    localStorage.removeItem('userType');
    setUserData(null);
    if (onLogout) onLogout();
    setPage('home');
  };

  // دالة لفتح وإغلاق الملف الشخصي
  const toggleProfileContent = () => {
    setShowProfileContent(!showProfileContent);
  };

  // ===================== دوال التنقل المهمة =====================
  const navigateToSettings = () => {
    setPage('settings');
  };

  // ✅ تم تعديل هذه الدالة - الآن تنتقل لصفحة الإشعارات بدلاً من التنبيه
  const navigateToNotifications = () => {
    setPage('notifications');
  };

  const navigateToMyTrips = () => {
    alert('📅 صفحة رحلاتي - قيد التطوير');
  };

  // عرض الملف الشخصي كامل
  const renderProfileContent = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-4">
      {/* رأس الملف الشخصي مع زر إغلاق */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 flex items-center justify-between">
        <h3 className="text-white font-bold text-lg">الملف الشخصي</h3>
        <button 
          onClick={toggleProfileContent}
          className="text-white/80 hover:text-white transition"
        >
          ✕
        </button>
      </div>
      
      <div className="p-5">
        {/* الصورة الشخصية والاسم */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-gray-800 shadow-md overflow-hidden">
              {userData.avatar ? (
                <img 
                  src={userData.avatar} 
                  alt={userData.fullName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                userData.fullName?.charAt(0) || 'U'
              )}
            </div>
            
            <button 
              onClick={() => document.getElementById('avatar-upload').click()}
              className="absolute -bottom-1 -right-1 bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700 transition shadow-md"
              disabled={loading}
            >
              <Camera size={14} />
            </button>
            
            <input 
              type="file" 
              id="avatar-upload" 
              className="hidden" 
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>
          
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white">
              {userData.fullName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              عضو منذ {new Date(userData.createdAt).toLocaleDateString('ar-SA')}
            </p>
          </div>
        </div>

        {/* معلومات الاتصال */}
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Mail size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">البريد الإلكتروني</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white">{userData.email}</p>
            </div>
          </div>
          
          {/* قسم رقم الجوال مع حالة التحقق */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Phone size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">رقم الجوال</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {userData.phone || 'غير مضاف'}
                </p>
                {userData.phone && userData.phoneVerified && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    ✓ موثق
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* زر تعديل الملف الشخصي */}
        <button
          onClick={handleEditToggle}
          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Edit2 size={18} />
          {isEditing ? 'إلغاء' : 'تعديل الملف الشخصي'}
        </button>

        {/* واجهة التعديل مع التحقق من رقم الجوال */}
        {isEditing && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3 border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">تعديل البيانات</h4>
            
            {/* تعديل الاسم */}
            <input
              type="text"
              name="fullName"
              value={editData.fullName}
              onChange={handleInputChange}
              placeholder="الاسم الكامل"
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            
            {/* تعديل رقم الجوال مع زر التحقق */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="tel"
                  name="phone"
                  value={editData.phone}
                  onChange={handleInputChange}
                  placeholder="رقم الجوال (مثال: 05xxxxxxxx)"
                  className="flex-1 p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  dir="ltr"
                />
                
                {editData.phone && editData.phone !== userData.phone && (
                  <button
                    onClick={handleVerifyPhone}
                    disabled={phoneVerificationStep === 'sending' || phoneVerificationStep === 'verifying'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {phoneVerificationStep === 'sending' ? 'جاري الإرسال...' : 'تحقق'}
                  </button>
                )}
              </div>

              {/* حقل إدخال رمز التحقق */}
              {showVerificationInput && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    تم إرسال رمز التحقق إلى {tempPhone}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="أدخل رمز التحقق"
                      className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:text-white text-center"
                      maxLength="6"
                    />
                    <button
                      onClick={handleVerifyCode}
                      disabled={phoneVerificationStep === 'verifying'}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {phoneVerificationStep === 'verifying' ? '...' : 'تأكيد'}
                    </button>
                  </div>
                  
                  {/* زر إعادة الإرسال مع عداد */}
                  <div className="mt-2 text-center">
                    <button
                      onClick={handleResendCode}
                      disabled={countdown > 0}
                      className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      {countdown > 0 
                        ? `إعادة الإرسال بعد ${countdown} ثانية` 
                        : 'إعادة إرسال الرمز'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* زر حفظ التغييرات (للاسم فقط) */}
            <button
              onClick={handleSaveProfile}
              disabled={saveLoading}
              className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
            >
              {saveLoading ? 'جاري الحفظ...' : 'حفظ الاسم'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // إذا كان المستخدم غير مسجل (زائر)
  if (!userData) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center ml-4">
              <User size={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold">زائر</h1>
              <p className="text-white/80">مستكشف</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <button 
            onClick={() => setShowLogin(true)}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  // مستخدم مسجل - اعرض واجهة الحساب
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
      {/* رأس الصفحة مع اسم المستخدم */}
      <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white">
        <h1 className="text-2xl font-bold">مرحباً، {userData.fullName?.split(' ')[0]}</h1>
        <p className="text-white/80 mt-1">استعرض وأدر حسابك من هنا</p>
      </div>

      <div className="p-4">
        {/* قائمة أيقونات الحساب */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* أيقونة الملف الشخصي */}
          <button
            onClick={toggleProfileContent}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105 ${showProfileContent ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <User size={24} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الملف الشخصي</span>
          </button>

          {/* أيقونة رحلاتي */}
          <button
            onClick={navigateToMyTrips}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
              <Package size={24} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">رحلاتي</span>
          </button>

          {/* ✅ أيقونة الإشعارات - الآن تعمل بشكل صحيح */}
          <button
            onClick={navigateToNotifications}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Bell size={24} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الإشعارات</span>
          </button>

          {/* أيقونة الإعدادات */}
          <button
            onClick={navigateToSettings}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
              <Settings size={24} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الإعدادات</span>
          </button>
        </div>

        {/* عرض الملف الشخصي عند الضغط على الأيقونة */}
        {showProfileContent && renderProfileContent()}

        {/* قسم المساعدة والدعم */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-4">
            <h3 className="font-bold text-gray-800 dark:text-white mb-3">المساعدة والدعم</h3>
             <div className="space-y-2">
             {/* ✅ زر الأسئلة الشائعة فقط - تم إزالة زر الدعم */}
            <button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition">
           <span className="text-gray-700 dark:text-gray-300 flex items-center gap-3">
          <FileText size={18} className="text-purple-600" />
         الأسئلة الشائعة
       </span>
      <span className="text-gray-400">‹</span>
    </button>
  </div>
</div>

        {/* زر تسجيل الخروج */}
        <button 
          onClick={handleLogout}
          className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

// ===================== ⚙️ Settings Page =====================
function SettingsPage({ lang, dark, setDark, setLang, setPage, locationEnabled, setLocationEnabled }) {
  const t = (k) => LOCALES[lang][k] || k;
  
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => setPage("profile")}
          className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm ml-4"
        >
          <span className="text-xl dark:text-white">‹</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t("settings")}</h1>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white">{t("darkMode")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">مريح للعين في الإضاءة المنخفضة</p>
            </div>
            <button 
              onClick={() => setDark(!dark)}
              className={`w-12 h-6 rounded-full relative transition-colors ${dark ? "bg-green-600" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${dark ? "right-0.5" : "left-0.5"}`}></div>
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white">{t("locationSharing")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">مشاركة موقعك لعرض البرامج القريبة</p>
            </div>
            <button 
              onClick={() => setLocationEnabled(!locationEnabled)}
              className={`w-12 h-6 rounded-full relative transition-colors ${locationEnabled ? "bg-green-600" : "bg-gray-300"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${locationEnabled ? "right-0.5" : "left-0.5"}`}></div>
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-800 dark:text-white">{t("language")}</h3>
            <select 
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-medium text-gray-800 dark:text-white mb-3">حول التطبيق</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between w-full p-2">
              <span className="text-gray-700 dark:text-gray-300">الإصدار</span>
              <span className="text-gray-500 dark:text-gray-400">1.0.0</span>
            </div>
            <button className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition">
              <span className="text-gray-700 dark:text-gray-300">الشروط والأحكام</span>
              <span className="text-gray-400">‹</span>
            </button>
            <button className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition">
              <span className="text-gray-700 dark:text-gray-300">سياسة الخصوصية</span>
              <span className="text-gray-400">‹</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

 // ===================== 📱 Main App Component =====================
export function TouristAppPrototype() {
  const [lang, setLang] = useState("ar");
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState(null);
  const [guide, setGuide] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showGuideLogin, setShowGuideLogin] = useState(false);
  const [showGuideRegistration, setShowGuideRegistration] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [page, setPage] = useState("home");
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [userPrograms, setUserPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const mapContainerRef = useRef(null);

  // ✅ متغير وضع الاختبار
  const [isTestMode, setIsTestMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // ✅ دالة تسجيل الدخول الناجح (جديدة)
  const handleLoginSuccess = (response) => {
    setUser({ ...response.user, type: 'user' });
    localStorage.setItem('touristAppUser', JSON.stringify(response.user));
    localStorage.setItem('touristAppToken', response.token);
    localStorage.setItem('userType', 'user');
    setShowLogin(false);
    
    alert(lang === 'ar' 
      ? `👋 مرحباً ${response.user.fullName || response.user.name}! تم تسجيل الدخول بنجاح`
      : `👋 Welcome ${response.user.fullName || response.user.name}! Login successful`
    );
  };

  useEffect(() => { 
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; 
    document.documentElement.lang = lang;
    
    if (dark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("bg-gray-900");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("bg-gray-900");
    }
    
    // التحقق من وجود مستخدم مخزن
    const savedUser = localStorage.getItem('touristAppUser');
    const savedToken = localStorage.getItem('touristAppToken');
    const savedUserType = localStorage.getItem('userType');
    
    if (savedUser && savedToken && !isTestMode) {
      // التحقق من صحة التوكن مع السيرفر
      api.verifyToken(savedToken)
        .then((response) => {
          if (response.valid) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            if (savedUserType === 'guide') {
              setGuide(parsedUser);
              // تحميل برامج المرشد
              loadGuidePrograms(parsedUser.id, savedToken);
            }
          } else {
            // توكن غير صالح - تسجيل خروج
            localStorage.removeItem('touristAppUser');
            localStorage.removeItem('touristAppToken');
            localStorage.removeItem('userType');
          }
        })
        .catch(() => {
          // خطأ في الاتصال - نستخدم البيانات المخزنة مؤقتاً
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          if (savedUserType === 'guide') {
            setGuide(parsedUser);
          }
        });
    } else if (savedUser && isTestMode) {
      // وضع الاختبار - نستخدم البيانات المخزنة مباشرة
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (savedUserType === 'guide') {
        setGuide(parsedUser);
      }
    }
  }, [lang, dark, isTestMode]);

  // ✅ تحميل برامج المرشد
  const loadGuidePrograms = async (guideId, token) => {
    try {
      const programs = await api.getGuidePrograms(guideId, token);
      setUserPrograms(programs);
    } catch (error) {
      console.error('Error loading guide programs:', error);
    }
  };

  // ✅ تبديل وضع الاختبار
  const toggleTestMode = () => {
    const newMode = !isTestMode;
    setIsTestMode(newMode);
    
    // تسجيل خروج تلقائي
    setUser(null);
    setGuide(null);
    localStorage.removeItem('touristAppUser');
    localStorage.removeItem('touristAppToken');
    localStorage.removeItem('userType');
    
    alert(lang === 'ar'
      ? `🔄 تم التبديل إلى ${newMode ? 'وضع الاختبار' : 'وضع الإنتاج'} وتم تسجيل الخروج`
      : `🔄 Switched to ${newMode ? 'Test Mode' : 'Production Mode'} and logged out`
    );
    
    setPage("home");
  };

  const handleGuideLogin = () => {
    setShowGuideLogin(true);
  };

  const handleGuideRegister = () => {
    setShowGuideRegistration(true);
  };

  // ✅ دالة تسجيل دخول المرشد
  const handleGuideLoginForm = async (formData) => {
    setIsLoading(true);
    
    try {
      if (isTestMode) {
        console.log('🧪 وضع الاختبار: تسجيل دخول مرشد');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockGuide = {
          id: Date.now().toString(),
          name: formData.licenseNumber === "TRL-1234-5678" ? "محمد العتيبي" : 
                formData.licenseNumber === "TRL-8765-4321" ? "العنود نسيب" : "أميرة الحربي",
          email: formData.email,
          licenseNumber: formData.licenseNumber,
          type: "guide",
          phone: "+966500000000",
          status: "approved",
          verified: true,
          rating: 4.8,
          programsCount: 12,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.licenseNumber)}&background=10b981&color=fff`,
          permissions: ['create_tours', 'manage_bookings', 'chat_with_users']
        };
        
        setUser(mockGuide);
        setGuide(mockGuide);
        localStorage.setItem('touristAppUser', JSON.stringify(mockGuide));
        localStorage.setItem('userType', 'guide');
        
        alert(lang === 'ar' 
          ? `🧪 وضع الاختبار: مرحباً ${mockGuide.name}`
          : `🧪 Test Mode: Welcome ${mockGuide.name}`
        );
        
      } else {
        console.log('🔴 وضع الإنتاج: جاري تسجيل دخول المرشد');
        
        const response = await api.guideLogin(
          formData.licenseNumber,
          formData.email,
          formData.password
        );
        
        const { user: guideUser, token } = response;
        const guideWithType = { ...guideUser, type: 'guide' };
        
        setUser(guideWithType);
        setGuide(guideWithType);
        localStorage.setItem('touristAppUser', JSON.stringify(guideWithType));
        localStorage.setItem('touristAppToken', token);
        localStorage.setItem('userType', 'guide');
        
        if (guideWithType.id && token) {
          await loadGuidePrograms(guideWithType.id, token);
        }
        
        alert(lang === 'ar' 
          ? `✅ مرحباً ${guideWithType.fullName || guideWithType.name}، تم تسجيل دخولك بنجاح`
          : `✅ Welcome ${guideWithType.fullName || guideWithType.name}, login successful`
        );
      }
      
      setShowGuideLogin(false);
      setPage("guideDashboard");
      
    } catch (error) {
      console.error('Guide login error:', error);
      alert(lang === 'ar' 
        ? `❌ فشل تسجيل الدخول: ${error.message}` 
        : `❌ Login failed: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ دالة تسجيل مرشد جديد
  const handleGuideRegistrationSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      if (isTestMode) {
        console.log('🧪 Guide registration submitted:', data);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        alert(lang === 'ar' 
          ? '🧪 وضع الاختبار: تم إرسال طلب التسجيل التجريبي'
          : '🧪 Test Mode: Demo registration submitted'
        );
        
      } else {
        console.log('🔴 جاري إرسال طلب تسجيل مرشد جديد');
        
        const response = await api.guideRegister(data);
        
        alert(lang === 'ar' 
          ? `✅ تم إرسال طلب التسجيل بنجاح! رقم الطلب: ${response.requestId || ''}\nسيتم مراجعة طلبك من قبل الإدارة خلال 24 ساعة`
          : `✅ Registration submitted successfully! Request ID: ${response.requestId || ''}\nYour request will be reviewed within 24 hours`
        );
      }
      
      setShowGuideRegistration(false);
      
    } catch (error) {
      console.error('Registration error:', error);
      alert(lang === 'ar' 
        ? `❌ فشل إرسال الطلب: ${error.message}` 
        : `❌ Registration failed: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ دالة تسجيل الخروج
  const handleLogout = () => {
    setUser(null);
    setGuide(null);
    setUserPrograms([]);
    localStorage.removeItem('touristAppUser');
    localStorage.removeItem('touristAppToken');
    localStorage.removeItem('userType');
    setPage('home');
    
    alert(lang === 'ar' 
      ? '👋 تم تسجيل الخروج بنجاح' 
      : '👋 Logged out successfully'
    );
  };

  const t = (k) => LOCALES[lang][k] || k;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      
      {/* شريط وضع التطوير */}
      {isTestMode && (
        <div className="bg-yellow-500 text-white text-center py-1 px-4 text-xs font-medium flex items-center justify-center gap-2">
          <span className="animate-pulse">🧪</span>
          <span>
            {lang === 'ar' ? 'وضع الاختبار التجريبي - بيانات وهمية' : 'Test Mode - Demo Data'}
          </span>
          <button 
            onClick={toggleTestMode}
            className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs transition"
          >
            {lang === 'ar' ? 'التبديل للإنتاج' : 'Switch to Production'}
          </button>
        </div>
      )}
      
{/* المحتوى الرئيسي */}
<div className="flex-1 overflow-hidden relative">
  {/* للتتبع - معرفة قيمة page الحالية */}
  {console.log('🔄 Current page in App:', page)}
  
  {page === "home" && (
    <HomePage 
      lang={lang} 
      user={user} 
      setPage={setPage} 
      dark={dark}
      setDark={setDark}
      locationEnabled={locationEnabled}
      setLocationEnabled={setLocationEnabled}
    />
  )}
  
  {page === "explore" && (
    <ExplorePage 
      lang={lang} 
      mapContainerRef={mapContainerRef}
      setPage={setPage}
      user={user}
      programs={userPrograms}
    />
  )}
  
  {/* ===== صفحة الإشعارات ===== */}
  {page === "notifications" && (
    <NotificationsPage 
      setPage={setPage} 
    />
  )}
  
  
  {page === "favorites" && <FavoritesPage lang={lang} />}
  
  {page === "events" && <EventsPage lang={lang} />}
  
  {page === "guides" && (
    <GuidesPage 
      lang={lang} 
      onGuideLogin={handleGuideLogin}
      onGuideRegister={handleGuideRegister}
      user={user}
    />
  )}
  
  {page === "guideDashboard" && user?.type === 'guide' && (
    <GuideDashboard 
      lang={lang} 
      guide={guide}
      setPage={setPage}
      user={user}
      setUserPrograms={setUserPrograms}
    />
  )}
  
  {page === "messages" && (
    <ChatSystem 
      user={user}
      lang={lang}
      setPage={setPage}
    />
  )}
  
  {page === "profile" && (
    <ProfilePage 
      lang={lang} 
      user={user} 
      setPage={setPage} 
      setShowLogin={setShowLogin}
      onLogout={handleLogout}
    />
  )}
  
  {page === "settings" && (
    <SettingsPage 
      lang={lang} 
      dark={dark} 
      setDark={setDark} 
      setLang={setLang} 
      setPage={setPage}
      locationEnabled={locationEnabled}
      setLocationEnabled={setLocationEnabled}
      isTestMode={isTestMode}
      onToggleTestMode={toggleTestMode}
      onLogout={handleLogout}
    />
  )}
</div>

      <BottomNav current={page} setCurrent={setPage} lang={lang} user={user} />

      {/* ✅ نافذة تسجيل الدخول الجديدة - OTP + Email/Password */}
      {showLogin && (
        <LoginPage 
          lang={lang}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      
      {/* نافذة تسجيل دخول المرشدين */}
      {showGuideLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4">
            
            {isTestMode && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <span className="animate-pulse">🧪</span>
                <span>{lang === 'ar' ? 'وضع الاختبار - استخدم بيانات تجريبية' : 'Test Mode - Use demo credentials'}</span>
              </div>
            )}
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {lang === "ar" ? "دخول المرشدين" : "Guide Login"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === "ar" 
                  ? "منطقة خاصة بالمرشدين السياحيين المعتمدين" 
                  : "Authorized tourist guides only"}
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = {
                licenseNumber: e.target.licenseNumber.value,
                email: e.target.email.value,
                password: e.target.password.value,
                rememberMe: e.target.rememberMe?.checked || false
              };
              handleGuideLoginForm(formData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "رقم الرخصة السياحية" : "License Number"}
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    placeholder="TRL-1234-5678"
                    defaultValue={isTestMode ? "TRL-1234-5678" : ""}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "البريد الإلكتروني" : "Email"}
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="guide@example.com"
                    defaultValue={isTestMode ? "guide@example.com" : ""}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "كلمة المرور" : "Password"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    defaultValue={isTestMode ? "Guide1234" : ""}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                      {lang === "ar" ? "تذكرني" : "Remember me"}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-green-600 hover:text-green-700 dark:text-green-400"
                  >
                    {lang === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">🌀</span>
                      <span>{lang === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</span>
                    </>
                  ) : (
                    <>
                      <span>🔐</span>
                      <span>{lang === "ar" ? "دخول لوحة المرشد" : "Access Guide Dashboard"}</span>
                    </>
                  )}
                </button>

                <div className="text-center space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGuideLogin(false);
                      setShowGuideRegistration(true);
                    }}
                    className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
                  >
                    {lang === "ar" ? "ليس لديك حساب؟ سجل كمرشد" : "Don't have an account? Register"}
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowGuideLogin(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                      {lang === "ar" ? "رجوع" : "Back"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تسجيل مرشد جديد */}
      {showGuideRegistration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mx-4">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold dark:text-white">
                {lang === 'ar' ? 'تسجيل مرشد جديد' : 'New Guide Registration'}
              </h3>
              <button 
                onClick={() => setShowGuideRegistration(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto">
              <GuideRegistrationPage
                lang={lang}
                onBack={() => setShowGuideRegistration(false)}
                onSubmit={handleGuideRegistrationSubmit}
                isTestMode={isTestMode}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);

  return showLanding ? (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-500 to-emerald-600 text-white p-4 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <MapPin size={80} />
        </div>
      </motion.div>
      
      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold mb-4"
      >
        السائح
      </motion.h1>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-lg mb-8 max-w-md"
      >
        دليلك الذكي لاكتشاف أجمل الوجهات السياحية
      </motion.p>
      
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={() => setShowLanding(false)}
        className="px-8 py-3 bg-white text-green-700 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-100 transition transform hover:scale-105"
      >
        ابدأ الرحلة
      </motion.button>
    </div>
  ) : (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>  {/* ✅ أضف هذا السطر */}
          <TouristAppPrototype />
        </AuthProvider> {/* ✅ وأغلق القوس هنا */}
      </LanguageProvider>
    </ThemeProvider>
  );
}
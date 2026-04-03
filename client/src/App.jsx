import SupportChatPage from './pages/SupportChatPage';
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import './index.css';
import mapboxgl from "mapbox-gl";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import { 
  Home, Settings, Star, Heart, Navigation, Bell, User, 
  Search, Calendar, MapPin, Users, Sun, Moon, MessageCircle, 
  CheckCircle, XCircle, Phone, FileText, Send, Plus, 
  Archive, Shield, Package, Target, MapPinned, Mail,     
  Edit2, LogOut, Camera, Save, X, ArrowLeft, 
  DollarSign, Clock, Eye, EyeOff, Trash2,
  RefreshCw,      // ✅ لتحديث الخريطة
  Compass,        // ✅ للوحة تحكم المرشد
  Globe,          // ✅ للغة
  ArrowRight,     // ✅ للتنقل
  AlertCircle,    // ✅ للتنبيهات
  ChevronDown,    // ✅ للقوائم المنسدلة
  ChevronUp,      // ✅ للقوائم المنسدلة
  Info,           // ✅ للمعلومات
  Loader2,        // ✅ لمؤشر التحميل
  PlusCircle      // ✅ للإضافة (بديل لـ Plus)
} from "lucide-react";
import api from './services/api';
import LoginPage from './components/Auth/LoginPage';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import NotificationsPage from './pages/NotificationsPage'; 
import { AuthProvider } from './contexts/AuthContext';
import UpgradeToGuidePage from './pages/UpgradeToGuidePage';
import UpgradeStatusPage from './pages/UpgradeStatusPage';
import SupportUpgradeRequestsPage from './pages/SupportUpgradeRequestsPage';
import AdminSupportPage from './pages/AdminSupportPage';
import AdminNotificationsPage from './pages/AdminNotificationsPage';
import AdminUpgradeRequestsPage from './pages/AdminUpgradeRequestsPage';
import EmergencyPage from './pages/EmergencyPage';



// Mapbox token
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
    upgradeToGuide: "Upgrade to Guide",
    upgradeStatus: "Upgrade Status"
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
    upgradeToGuide: "ترقية إلى مرشد",
    upgradeStatus: "حالة الترقية"
  },
};

// ===================== 📱 Bottom Navigation Bar =====================
function BottomNav({ current, setCurrent, lang, user, unreadCount = 0 }) {
  // ✅ التحقق من أن المستخدم مرشد
  const isGuideUser = user?.type === "guide" || 
                      user?.role === 'guide' || 
                      user?.isGuide === true || 
                      user?.guide_status === 'approved';
  
  // ✅ شريط التنقل حسب نوع المستخدم
  const navItems = isGuideUser ? [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home" },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore" },
    { key: "favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites" },     // ❤️ المفضلة
    { key: "guideDashboard", icon: Shield, label: lang === "ar" ? "لوحتي" : "My Dashboard" }, // 🛡️ لوحتي
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile" },
  ] : [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home" },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore" },
    { key: "favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites" },     // ❤️ المفضلة
    { key: "guides", icon: Users, label: lang === "ar" ? "المرشدين" : "Guides" },           // 👥 المرشدين
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile" },
  ];

  const getInitial = () => {
    if (!user) return null;
    if (user.fullName) return user.fullName.charAt(0).toUpperCase();
    if (user.name) return user.name.charAt(0).toUpperCase();
    return null;
  };

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

  // التحقق من صلاحيات المسؤول والدعم
  const isAdmin = user?.role === 'admin';
  const isSupport = user?.role === 'support';
  const showAdminBar = isAdmin || isSupport;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* ✅ شريط أزرار المسؤول - يظهر للمسؤول والدعم */}
      {showAdminBar && (
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 py-2 px-4 flex justify-center gap-3 shadow-lg">
          <button
            onClick={() => setCurrent('adminNotifications')}
            className="relative flex items-center justify-center w-10 h-10 bg-white/20 rounded-full hover:bg-white/30 transition"
            title={lang === 'ar' ? 'الإشعارات' : 'Notifications'}
          >
            <Bell size={18} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setCurrent('adminSupport')}
            className="px-4 py-2 bg-white text-teal-700 rounded-full text-sm font-bold shadow-md hover:bg-gray-100 transition flex items-center gap-2"
          >
            📧 {lang === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setCurrent('upgrade-requests')}
              className="px-4 py-2 bg-white text-teal-700 rounded-full text-sm font-bold shadow-md hover:bg-gray-100 transition flex items-center gap-2"
            >
              ⭐ {lang === 'ar' ? 'طلبات الترقية' : 'Upgrade Requests'}
            </button>
          )}
        </div>
      )}
      
      {/* شريط التنقل الأصلي */}
      <div className="bg-white border-t border-gray-200 flex justify-around py-3 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
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
    </div>
  );
}
// ===================== 📍 Home Page (بدون بيانات وهمية) =====================
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
          {/* زر الخريطة */}
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
          
          {/* برامج قريبة */}
          <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
              <Package className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <span className="text-xs font-medium dark:text-gray-200">{t("nearbyPrograms")}</span>
          </div>
          
          {/* المرشدين / لوحة المرشد */}
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
          
          {/* المفضلة / الرحلات المؤرشفة */}
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

        {/* Nearby Programs - تعتمد على API حقيقي */}
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t("nearbyPrograms")}</h2>
        
        {!user ? (
          /* للزوار: رسالة تسجيل دخول */
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {lang === 'ar' 
                ? 'سجل دخول لمشاهدة البرامج القريبة منك' 
                : 'Login to see nearby programs'}
            </p>
            <button
              onClick={() => setPage('profile')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </button>
          </div>
        ) : (
          /* للمستخدمين المسجلين: رسالة انتظار البيانات */
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm">
            <p className="text-gray-600 dark:text-gray-400">
              {lang === 'ar' 
                ? 'جاري تحميل البرامج القريبة...' 
                : 'Loading nearby programs...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== 🗺️ Explore/Map Page =====================
function ExplorePage({ lang, mapContainerRef, setPage, transport, setTransport, user, programs, setPrograms, unreadCount, refreshTrigger }) {
  const t = (k) => LOCALES[lang][k] || k;
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);

  // إذا كان المستخدم غير مسجل
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
            <button onClick={() => setPage('profile')} className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition">
              {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </button>
            <button onClick={() => setPage('home')} className="w-full py-3 border-2 border-green-600 text-green-600 rounded-xl font-medium hover:bg-green-50 transition">
              {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // برامج من API
  const allPrograms = programs || [];
  const displayedPrograms = showMyProgramsOnly 
    ? allPrograms.filter(p => p.guide_id === user?.id)
    : allPrograms;
  
  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  // ✅ تهيئة الخريطة - أضف refreshTrigger هنا
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initMap = (center, zoom = 13) => {
      // إذا كان هناك خريطة موجودة، قم بإزالتها أولاً
      if (mapInstance) {
        mapInstance.remove();
      }
      
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: center,
        zoom: zoom
      });
      setMapInstance(map);
      return map;
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userCoords = [longitude, latitude];
          setUserLocation(userCoords);
          
          const map = initMap(userCoords);
          
          map.on('load', () => {
            // علامة موقع المستخدم
            new mapboxgl.Marker({ color: "green" })
              .setLngLat(userCoords)
              .setPopup(new mapboxgl.Popup().setText(lang === "ar" ? "موقعك الحالي" : "Your location"))
              .addTo(map);

            // إضافة علامات البرامج
            displayedPrograms.forEach((program) => {
              if (program.coords && program.coords.length === 2) {
                const markerColor = program.guide_id === user?.id ? "purple" : "blue";
                new mapboxgl.Marker({ color: markerColor })
                  .setLngLat(program.coords)
                  .setPopup(new mapboxgl.Popup().setHTML(`
                    <div style="text-align:${lang === "ar" ? "right" : "left"}; padding:8px;">
                      <strong>${program.name_ar || program.name}</strong><br/>
                      👤 ${program.guide_name}<br/>
                      💰 ${program.price} ${lang === "ar" ? "ريال" : "SAR"}<br/>
                      ⏱️ ${program.duration}<br/>
                      ⭐ ${program.rating || 4.8}
                    </div>
                  `))
                  .addTo(map);
              }
            });
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          const defaultCenter = [46.713, 24.774];
          const map = initMap(defaultCenter, 12);
          
          map.on('load', () => {
            displayedPrograms.forEach((program) => {
              if (program.coords && program.coords.length === 2) {
                new mapboxgl.Marker({ color: program.guide_id === user?.id ? "purple" : "blue" })
                  .setLngLat(program.coords)
                  .setPopup(new mapboxgl.Popup().setHTML(`
                    <strong>${program.name_ar || program.name}</strong><br/>
                    👤 ${program.guide_name}
                  `))
                  .addTo(map);
              }
            });
          });
        }
      );
    }
    
    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [user, displayedPrograms, refreshTrigger]); // ✅ أضف refreshTrigger هنا

  // تحديث الخريطة عند تغيير refreshTrigger
  useEffect(() => {
    if (refreshTrigger && mapInstance) {
      console.log('🔄 Refreshing map due to program addition...');
      // إعادة تحميل الخريطة
      if (mapInstance) {
        mapInstance.remove();
      }
      // إعادة تهيئة الخريطة
      if (userLocation) {
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: userLocation,
          zoom: 13
        });
        setMapInstance(map);
        
        map.on('load', () => {
          new mapboxgl.Marker({ color: "green" })
            .setLngLat(userLocation)
            .setPopup(new mapboxgl.Popup().setText(lang === "ar" ? "موقعك الحالي" : "Your location"))
            .addTo(map);
            
          displayedPrograms.forEach((program) => {
            if (program.coords && program.coords.length === 2) {
              new mapboxgl.Marker({ color: program.guide_id === user?.id ? "purple" : "blue" })
                .setLngLat(program.coords)
                .setPopup(new mapboxgl.Popup().setHTML(`
                  <strong>${program.name_ar || program.name}</strong><br/>
                  👤 ${program.guide_name}<br/>
                  💰 ${program.price} SAR
                `))
                .addTo(map);
            }
          });
        });
      }
    }
  }, [refreshTrigger]);

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
    
    alert(lang === 'ar' 
      ? 'تم إرسال طلب المشاركة في البرنامج. سيتم التواصل معك من قبل المرشد.' 
      : 'Program participation request sent. The guide will contact you.'
    );
  };

  return (
    <div className="h-full relative">
      {/* شريط علوي */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
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
          
          <div className="flex items-center gap-2">
            <button onClick={() => setPage('home')} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
              <Home size={20} />
            </button>
            <button onClick={() => window.location.reload()} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
              <span className="text-lg">🔄</span>
            </button>
            {user && (
              <button onClick={() => setPage("notifications")} className="relative p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute right-3 top-3.5 text-gray-400" size={20} />
          <input type="text" placeholder={t('search')} className="w-full p-3 pr-10 rounded-xl bg-white/20 placeholder-white/70 border border-white/30 focus:outline-none focus:border-white text-white" />
        </div>

        <div className="mt-3 text-xs text-white/80">
          {lang === 'ar' ? `📌 ${displayedPrograms.length} برنامج متاح` : `📌 ${displayedPrograms.length} programs available`}
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
              <button onClick={() => setSelectedProgram(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">✕</button>
            </div>
            
            {tripInfo && (
              <div className="text-sm mt-1 text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded mb-3">
                {t('distance')}: {tripInfo.distanceKm} كم — {t('duration')}: {tripInfo.durationMin} دقيقة
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <select value={transport} onChange={(e) => setTransport(e.target.value)} className="border rounded-md px-2 py-1 text-sm dark:bg-gray-700 dark:text-white">
                  <option value="driving">{t('driving')}</option>
                  <option value="walking">{t('walking')}</option>
                  <option value="cycling">{t('cycling')}</option>
                </select>
                <button onClick={startTrip} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition">
                  {t('startTrip')}
                </button>
              </div>
              
              {user?.type !== 'guide' && (
                <button onClick={() => requestProgram(selectedProgram)} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition">
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

// ===================== 💬 نظام المراسلة الداخلية (مع API) =====================
function ChatSystem({ user, lang, setPage }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState(null);

  // جلب المحادثات من API
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await api.getUserConversations();
      if (response.success && response.conversations.length > 0) {
        const conversation = response.conversations[0];
        setConversationId(conversation.id);
        fetchMessages(conversation.id);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const response = await api.getConversationMessages(convId);
      if (response.success) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const messageText = newMessage;
    setNewMessage("");
    
    // إضافة الرسالة محلياً فوراً
    const tempMessage = {
      id: Date.now(),
      sender: user?.type === "guide" ? "guide" : "user",
      text: messageText,
      time: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      senderName: user?.name || "مستخدم",
      status: "sending"
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await api.sendTextMessage(conversationId, messageText);
      if (response.success) {
        // تحديث الرسالة بحالة مرسلة
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? { ...msg, status: "sent" } : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? { ...msg, status: "failed" } : msg
      ));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

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
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {lang === "ar" ? "لا توجد رسائل بعد" : "No messages yet"}
            </div>
          ) : (
            messages.map((msg) => (
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
                  <div className={`text-xs mt-1 flex items-center gap-1 ${msg.sender === "user" ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}>
                    <span>{msg.time}</span>
                    {msg.status === "sending" && <span className="animate-pulse">⏳</span>}
                    {msg.status === "sent" && <span>✓</span>}
                    {msg.status === "failed" && <span className="text-red-400">✗</span>}
                  </div>
                </div>
              </div>
            ))
          )}
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
              disabled={!newMessage.trim()}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
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

// ===================== 🗺️ Guide Dashboard =====================
function GuideDashboard({ lang, guide, setPage, user, setUserPrograms, onProgramAdded }) {
  console.log('🎯 GuideDashboard STARTED');
  console.log('user:', user);
  console.log('guide:', guide);
  
  // ✅ التحقق من أن المستخدم مرشد - دعم عدة صيغ
  const isGuideUser = 
    user?.role === 'guide' || 
    user?.type === 'guide' || 
    user?.isGuide === true || 
    user?.guide_status === 'approved' ||
    user?.userType === 'guide' ||
    user?.accountType === 'guide' ||
    (guide && guide.id) || // إذا كان هناك guide object
    (user?.id && user?.id === guide?.id); // إذا كان user هو نفس guide
  
  console.log('✅ isGuideUser:', isGuideUser);
  
  if (!isGuideUser) {
    console.log('❌ User is not a guide');
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {lang === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {lang === 'ar' 
              ? 'هذه الصفحة مخصصة للمرشدين السياحيين فقط.'
              : 'This page is only available for tour guides.'}
          </p>
          <button 
            onClick={() => setPage('profile')} 
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
          >
            {lang === 'ar' ? 'العودة للملف الشخصي' : 'Back to Profile'}
          </button>
        </div>
      </div>
    );
  }

  // ✅ الحصول على معرف المرشد من مصادر مختلفة
  const getGuideId = () => {
    return user?.id || guide?.id || user?.userId || guide?.userId || user?._id || guide?._id;
  };

  const guideId = getGuideId();
  console.log('📌 Guide ID:', guideId);

  // ✅ الحصول على اسم المرشد
  const getGuideName = () => {
    return user?.fullName || user?.name || guide?.fullName || guide?.name || user?.username || "مرشد سياحي";
  };

  const guideName = getGuideName();
  console.log('📌 Guide Name:', guideName);

  // ✅ Load programs from localStorage
  const [programs, setPrograms] = useState(() => {
    const saved = localStorage.getItem(`guide_programs_${guideId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch(e) {
        console.error('Error parsing saved programs:', e);
        return [];
      }
    }
    return [];
  });
  
  const [requests, setRequests] = useState(() => {
    const saved = localStorage.getItem(`guide_requests_${guideId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch(e) {
        console.error('Error parsing saved requests:', e);
        return [];
      }
    }
    return [];
  });
  
  const [loading, setLoading] = useState(false);
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [newProgram, setNewProgram] = useState({
    name: "",
    description: "",
    location: "",
    price: "",
    duration: "",
    maxParticipants: "",
    location_lat: "",
    location_lng: ""
  });

  // ✅ Save programs to localStorage when changed
  useEffect(() => {
    if (programs.length > 0 && guideId) {
      localStorage.setItem(`guide_programs_${guideId}`, JSON.stringify(programs));
    } else if (guideId) {
      localStorage.removeItem(`guide_programs_${guideId}`);
    }
  }, [programs, guideId]);
  
  useEffect(() => {
    if (requests.length > 0 && guideId) {
      localStorage.setItem(`guide_requests_${guideId}`, JSON.stringify(requests));
    } else if (guideId) {
      localStorage.removeItem(`guide_requests_${guideId}`);
    }
  }, [requests, guideId]);

  // ✅ Calculate statistics
  const activeProgs = programs.filter(p => p.status === 'active');
  const totalParticipants = activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0);
  const totalRevenue = activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0);
  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  // ✅ Get coordinates from location using Mapbox Geocoding
  const getCoordinatesFromLocation = async (locationName) => {
    if (!locationName) return null;
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw&limit=1`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng, coords: [lng, lat], place_name: data.features[0].place_name };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  // ✅ Add new program
  const handleAddProgram = async () => {
    if (!newProgram.name.trim()) {
      alert(lang === 'ar' ? '⚠️ الرجاء إدخال اسم البرنامج' : '⚠️ Please enter program name');
      return;
    }
    
    if (!newProgram.location.trim()) {
      alert(lang === 'ar' ? '⚠️ الرجاء إدخال موقع البرنامج' : '⚠️ Please enter program location');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get coordinates from location
      let coordinates = null;
      let locationData = null;
      
      if (newProgram.location) {
        locationData = await getCoordinatesFromLocation(newProgram.location);
        if (locationData) {
          coordinates = locationData.coords;
        }
      }
      
      const program = {
        id: Date.now(),
        name: newProgram.name,
        description: newProgram.description || "",
        status: "active",
        participants: 0,
        revenue: 0,
        location: coordinates || null,
        location_lat: locationData?.lat || null,
        location_lng: locationData?.lng || null,
        price: parseFloat(newProgram.price) || 0,
        duration: newProgram.duration || "غير محدد",
        maxParticipants: parseInt(newProgram.maxParticipants) || 20,
        location_name: newProgram.location,
        guide_name: guideName,
        guide_id: guideId,
        created_at: new Date().toISOString()
      };
      
      const updatedPrograms = [...programs, program];
      setPrograms(updatedPrograms);
      
      // Reset form
      setNewProgram({
        name: "", description: "", location: "", price: "", duration: "", maxParticipants: "", location_lat: "", location_lng: ""
      });
      setShowAddProgram(false);
      
      // ✅ Update user programs for map
      if (setUserPrograms) {
        const allPrograms = [...(setUserPrograms._currentValue || []), ...updatedPrograms.filter(p => p.status === 'active').map(p => ({
          id: p.id,
          name_ar: p.name,
          name_en: p.name,
          guide_name: p.guide_name,
          coords: p.location,
          price: p.price,
          duration: p.duration,
          rating: null,
          distance: null,
          active: true,
          location_name: p.location_name,
          description: p.description,
          maxParticipants: p.maxParticipants,
          currentParticipants: p.participants
        }))];
        setUserPrograms(allPrograms);
      }
      
      if (onProgramAdded) onProgramAdded();
      alert(lang === 'ar' ? '✅ تم إضافة البرنامج بنجاح وسيظهر على الخريطة' : '✅ Program added successfully and will appear on the map');
      
    } catch (error) {
      console.error('Error adding program:', error);
      alert(lang === 'ar' ? '❌ حدث خطأ في إضافة البرنامج' : '❌ Error adding program');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Open edit modal
  const openEditModal = (program) => {
    setEditingProgram(program);
    setNewProgram({
      name: program.name || "",
      description: program.description || "",
      location: program.location_name || program.location || "",
      price: program.price || "",
      duration: program.duration || "",
      maxParticipants: program.maxParticipants || "",
      location_lat: program.location_lat || "",
      location_lng: program.location_lng || ""
    });
    setShowEditModal(true);
  };

  // ✅ Update program
  const handleUpdateProgram = async () => {
    if (!editingProgram) {
      alert(lang === 'ar' ? 'لا يوجد برنامج للتعديل' : 'No program to edit');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get coordinates from new location if changed
      let coordinates = editingProgram.location;
      let locationData = null;
      
      if (newProgram.location !== editingProgram.location_name) {
        locationData = await getCoordinatesFromLocation(newProgram.location);
        if (locationData) {
          coordinates = locationData.coords;
        }
      }
      
      const updatedPrograms = programs.map(p => 
        p.id === editingProgram.id 
          ? { 
              ...p, 
              name: newProgram.name,
              description: newProgram.description,
              price: parseFloat(newProgram.price) || 0,
              duration: newProgram.duration || "غير محدد",
              maxParticipants: parseInt(newProgram.maxParticipants) || 20,
              location_name: newProgram.location,
              location: coordinates,
              location_lat: locationData?.lat || p.location_lat,
              location_lng: locationData?.lng || p.location_lng
            }
          : p
      );
      
      setPrograms(updatedPrograms);
      setShowEditModal(false);
      setEditingProgram(null);
      setNewProgram({
        name: "", description: "", location: "", price: "", duration: "", maxParticipants: "", location_lat: "", location_lng: ""
      });
      
      // ✅ Update user programs for map
      if (setUserPrograms) {
        setUserPrograms(updatedPrograms.filter(p => p.status === 'active').map(p => ({
          id: p.id,
          name_ar: p.name,
          name_en: p.name,
          guide_name: p.guide_name,
          coords: p.location,
          price: p.price,
          duration: p.duration,
          rating: null,
          distance: null,
          active: true,
          location_name: p.location_name,
          description: p.description,
          maxParticipants: p.maxParticipants,
          currentParticipants: p.participants
        })));
      }
      
      if (onProgramAdded) onProgramAdded();
      alert(lang === 'ar' ? '✅ تم تحديث البرنامج بنجاح' : '✅ Program updated successfully');
      
    } catch (error) {
      console.error('Error updating program:', error);
      alert(lang === 'ar' ? '❌ حدث خطأ في تحديث البرنامج' : '❌ Error updating program');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Toggle program status
  const toggleProgramStatus = (id) => {
    const updatedPrograms = programs.map(program => 
      program.id === id 
        ? { ...program, status: program.status === "active" ? "inactive" : "active" }
        : program
    );
    setPrograms(updatedPrograms);
    
    // ✅ Update user programs for map
    if (setUserPrograms) {
      setUserPrograms(updatedPrograms.filter(p => p.status === 'active').map(p => ({
        id: p.id,
        name_ar: p.name,
        name_en: p.name,
        guide_name: p.guide_name,
        coords: p.location,
        price: p.price,
        duration: p.duration,
        rating: null,
        distance: null,
        active: true,
        location_name: p.location_name
      })));
    }
    
    if (onProgramAdded) onProgramAdded();
    const message = updatedPrograms.find(p => p.id === id)?.status === 'active' 
      ? (lang === 'ar' ? '✅ تم تفعيل البرنامج وسيظهر للجميع' : '✅ Program activated and will appear to everyone')
      : (lang === 'ar' ? '⏸ تم إيقاف البرنامج ولن يظهر للجميع' : '⏸ Program deactivated and will not appear');
    alert(message);
  };

  // ✅ Delete program
  const handleDeleteProgram = (id) => {
    if (!confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من حذف هذا البرنامج؟ لا يمكن التراجع عن هذا الإجراء.' : '⚠️ Are you sure you want to delete this program? This action cannot be undone.')) {
      return;
    }
    
    const updatedPrograms = programs.filter(p => p.id !== id);
    setPrograms(updatedPrograms);
    
    // ✅ Update user programs for map
    if (setUserPrograms) {
      setUserPrograms(updatedPrograms.filter(p => p.status === 'active').map(p => ({
        id: p.id,
        name_ar: p.name,
        name_en: p.name,
        guide_name: p.guide_name,
        coords: p.location,
        price: p.price,
        duration: p.duration,
        rating: null,
        distance: null,
        active: true,
        location_name: p.location_name
      })));
    }
    
    if (onProgramAdded) onProgramAdded();
    alert(lang === 'ar' ? '✅ تم حذف البرنامج بنجاح' : '✅ Program deleted successfully');
  };

  // ✅ Update request status
  const updateRequestStatus = (requestId, newStatus) => {
    const updatedRequests = requests.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    );
    setRequests(updatedRequests);
    
    if (newStatus === 'approved') {
      // If approved, update program participants
      const request = requests.find(r => r.id === requestId);
      if (request) {
        const updatedPrograms = programs.map(p => 
          p.name === request.programName 
            ? { ...p, participants: (p.participants || 0) + 1 }
            : p
        );
        setPrograms(updatedPrograms);
      }
    }
  };

  // Add demo request for testing (remove in production)
  useEffect(() => {
    if (requests.length === 0 && guideId && programs.length > 0) {
      const demoRequest = {
        id: Date.now(),
        userName: "أحمد محمد",
        programName: programs[0]?.name || "برنامج سياحي",
        status: "pending",
        date: new Date().toLocaleDateString('ar-EG'),
        created_at: new Date().toISOString()
      };
      setRequests([demoRequest]);
    }
  }, [guideId, programs.length]);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      {/* Back button */}
      <div className="mb-4">
        <button onClick={() => setPage('home')} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 transition">
          <ArrowLeft size={20} />
          <span>{lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
        </button>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{lang === "ar" ? "لوحة تحكم المرشد" : "Guide Dashboard"}</h1>
            <p className="opacity-90 mt-1">{guideName}</p>
            <div className="flex items-center mt-2">
              <CheckCircle className="w-5 h-5 ml-1" />
              <span className="text-sm">{lang === "ar" ? "حساب مرشد معتمد" : "Verified Guide Account"}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{activeProgs.length}</div>
            <div className="text-sm opacity-90">{lang === "ar" ? "برنامج نشط" : "Active Programs"}</div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
          <Users className="w-6 h-6 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{totalParticipants}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{lang === "ar" ? "مشاركين" : "Participants"}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
          <DollarSign className="w-6 h-6 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{totalRevenue} ريال</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{lang === "ar" ? "إجمالي الإيرادات" : "Total Revenue"}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
          <Clock className="w-6 h-6 text-yellow-600 mb-2" />
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{pendingRequests}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{lang === "ar" ? "طلبات جديدة" : "New Requests"}</div>
        </div>
      </div>

      {/* Participation Requests */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{lang === "ar" ? "طلبات المشاركة" : "Participation Requests"}</h2>
          {pendingRequests > 0 && (
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-lg text-sm font-medium">{pendingRequests} {lang === "ar" ? "قيد الانتظار" : "Pending"}</span>
          )}
        </div>
        
        {requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">{lang === "ar" ? "📭 لا توجد طلبات مشاركة حالياً" : "📭 No participation requests yet"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-white">{request.userName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{request.programName}</p>
                    <p className="text-xs text-gray-500">{request.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      request.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      request.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : 
                      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {request.status === "pending" ? (lang === "ar" ? "بانتظار الموافقة" : "Pending") : 
                       request.status === "approved" ? (lang === "ar" ? "موافق عليه" : "Approved") : 
                       (lang === "ar" ? "مكتمل" : "Completed")}
                    </span>
                    
                    {request.status === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => updateRequestStatus(request.id, "approved")} className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 transition font-medium">موافقة</button>
                        <button onClick={() => updateRequestStatus(request.id, "rejected")} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 transition font-medium">رفض</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guide Programs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{lang === "ar" ? "برامجي السياحية" : "My Programs"}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {lang === "ar" 
                ? "📍 البرامج النشطة تظهر تلقائياً على الخريطة الرئيسية" 
                : "📍 Active programs appear automatically on the main map"}
            </p>
          </div>
          <button onClick={() => setShowAddProgram(true)} className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition flex items-center gap-2 shadow-md hover:shadow-lg">
            <Plus className="w-4 h-4" />
            <span className="font-medium">{lang === "ar" ? "إضافة برنامج جديد" : "Add New Program"}</span>
          </button>
        </div>

        {programs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-3 text-lg">{lang === "ar" ? "لا توجد برامج سياحية بعد" : "No tour programs yet"}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              {lang === "ar" 
                ? "أضف برنامجك الأول وسيظهر على الخريطة لجميع المستخدمين" 
                : "Add your first program and it will appear on the map for all users"}
            </p>
            <button onClick={() => setShowAddProgram(true)} className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2 mx-auto shadow-md">
              <Plus className="w-5 h-5" />
              <span className="font-medium">{lang === "ar" ? "➕ أضف برنامجك الأول" : "➕ Add Your First Program"}</span>
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {lang === "ar" ? `📊 لديك ${programs.length} برنامج` : `📊 You have ${programs.length} program(s)`}
              </span>
              <button 
                onClick={() => {
                  if (setUserPrograms) {
                    setUserPrograms(programs.filter(p => p.status === 'active').map(p => ({
                      id: p.id,
                      name_ar: p.name,
                      name_en: p.name,
                      guide_name: p.guide_name,
                      coords: p.location,
                      price: p.price,
                      duration: p.duration,
                      rating: null,
                      distance: null,
                      active: true,
                      location_name: p.location_name
                    })));
                  }
                  alert(lang === 'ar' ? 'تم تحديث الخريطة' : 'Map updated');
                }}
                className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {lang === "ar" ? "تحديث الخريطة" : "Refresh Map"}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {programs.map((program) => (
                <div key={program.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{program.name}</h3>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          program.status === "active" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {program.status === "active" ? (lang === "ar" ? "✓ نشط" : "Active") : (lang === "ar" ? "○ متوقف" : "Inactive")}
                        </span>
                        {program.location && (
                          <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {lang === "ar" ? "يظهر على الخريطة" : "On Map"}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{program.description || (lang === "ar" ? "لا يوجد وصف" : "No description")}</p>
                      
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-sm">
                          <div className="text-gray-500 text-xs">{lang === "ar" ? "السعر" : "Price"}</div>
                          <div className="font-medium text-green-600">{program.price} ريال</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-500 text-xs">{lang === "ar" ? "المدة" : "Duration"}</div>
                          <div className="font-medium">{program.duration}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-500 text-xs">{lang === "ar" ? "المشاركين" : "Participants"}</div>
                          <div className="font-medium">{program.participants || 0}/{program.maxParticipants || 20}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-3 h-3 text-green-600" />
                        <span className="text-xs truncate">{program.location_name || program.location || (lang === "ar" ? "موقع غير محدد" : "Location not specified")}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => toggleProgramStatus(program.id)}
                        className={`px-3 py-1.5 rounded-xl text-sm transition flex items-center gap-1 font-medium ${
                          program.status === "active"
                            ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                        title={program.status === "active" ? (lang === "ar" ? "إيقاف البرنامج (لن يظهر للجميع)" : "Deactivate program") : (lang === "ar" ? "تفعيل البرنامج (سيظهر للجميع)" : "Activate program")}
                      >
                        {program.status === "active" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{program.status === "active" ? (lang === "ar" ? "إيقاف" : "Off") : (lang === "ar" ? "تفعيل" : "On")}</span>
                      </button>
                      
                      <button
                        onClick={() => openEditModal(program)}
                        className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-xl text-sm hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 transition flex items-center gap-1 font-medium"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{lang === "ar" ? "تعديل" : "Edit"}</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProgram(program.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-xl text-sm hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === "ar" ? "حذف" : "Delete"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Program Modal */}
      {showAddProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-white" />
                  <h3 className="text-white font-bold text-xl">{lang === "ar" ? "إضافة برنامج سياحي جديد" : "Add New Tour Program"}</h3>
                </div>
                <button onClick={() => setShowAddProgram(false)} className="text-white/80 hover:text-white transition">
                  <XCircle size={28} />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-2">
                {lang === "ar" 
                  ? '📍 سيظهر هذا البرنامج على الخريطة الرئيسية ليراها جميع المستخدمين ويمكنهم حجزه' 
                  : '📍 This program will appear on the main map for all users to see and book'}
              </p>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "اسم البرنامج *" : "Program Name *"}
                </label>
                <input
                  type="text"
                  placeholder={lang === "ar" ? "مثال: جولة تاريخية في الدرعية" : "e.g., Historical Tour in Diriyah"}
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "وصف البرنامج" : "Program Description"}
                </label>
                <textarea
                  placeholder={lang === "ar" ? "وصف تفصيلي للبرنامج..." : "Detailed program description..."}
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  rows="3"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {lang === "ar" ? "السعر (ريال)" : "Price (SAR)"}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProgram.price}
                    onChange={(e) => setNewProgram({...newProgram, price: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {lang === "ar" ? "المدة" : "Duration"}
                  </label>
                  <input
                    type="text"
                    placeholder="3 ساعات"
                    value={newProgram.duration}
                    onChange={(e) => setNewProgram({...newProgram, duration: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "الموقع *" : "Location *"}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={lang === "ar" ? "الرياض، الدرعية" : "Riyadh, Diriyah"}
                    value={newProgram.location}
                    onChange={(e) => setNewProgram({...newProgram, location: e.target.value})}
                    className="w-full p-3 pl-10 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {lang === "ar" 
                    ? 'سيتم تحديد موقع البرنامج تلقائياً على الخريطة بناءً على العنوان المدخل' 
                    : 'The program location will be automatically marked on the map based on the entered address'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "العدد الأقصى للمشاركين" : "Maximum Participants"}
                </label>
                <input
                  type="number"
                  placeholder="20"
                  value={newProgram.maxParticipants}
                  onChange={(e) => setNewProgram({...newProgram, maxParticipants: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddProgram}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>{lang === "ar" ? "جاري الإضافة..." : "Adding..."}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>{lang === "ar" ? "إضافة البرنامج ونشره على الخريطة" : "Add Program & Publish to Map"}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowAddProgram(false)}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl mt-2">
                <p className="text-xs text-green-700 dark:text-green-400 text-center">
                  🌍 {lang === "ar" 
                    ? 'بعد إضافة البرنامج، سيظهر فوراً على الخريطة الرئيسية ويمكن لجميع المستخدمين رؤيته وحجزه' 
                    : 'After adding the program, it will immediately appear on the main map and all users can see and book it'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Program Modal */}
      {showEditModal && editingProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-6 h-6 text-white" />
                  <h3 className="text-white font-bold text-xl">{lang === "ar" ? "تعديل البرنامج" : "Edit Program"}</h3>
                </div>
                <button onClick={() => {
                  setShowEditModal(false);
                  setEditingProgram(null);
                }} className="text-white/80 hover:text-white transition">
                  <XCircle size={28} />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-2">
                📍 {lang === "ar" 
                  ? 'بعد التعديل، سيتم تحديث البرنامج على الخريطة تلقائياً' 
                  : 'After editing, the program will be automatically updated on the map'}
              </p>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "اسم البرنامج *" : "Program Name *"}
                </label>
                <input
                  type="text"
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "وصف البرنامج" : "Program Description"}
                </label>
                <textarea
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  rows="3"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {lang === "ar" ? "السعر (ريال)" : "Price (SAR)"}
                  </label>
                  <input
                    type="number"
                    value={newProgram.price}
                    onChange={(e) => setNewProgram({...newProgram, price: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {lang === "ar" ? "المدة" : "Duration"}
                  </label>
                  <input
                    type="text"
                    value={newProgram.duration}
                    onChange={(e) => setNewProgram({...newProgram, duration: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "الموقع" : "Location"}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={newProgram.location}
                    onChange={(e) => setNewProgram({...newProgram, location: e.target.value})}
                    className="w-full p-3 pl-10 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "العدد الأقصى" : "Maximum Participants"}
                </label>
                <input
                  type="number"
                  value={newProgram.maxParticipants}
                  onChange={(e) => setNewProgram({...newProgram, maxParticipants: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateProgram}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold hover:from-yellow-700 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>{lang === "ar" ? "جاري الحفظ..." : "Saving..."}</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-5 h-5" />
                      <span>{lang === "ar" ? "حفظ التغييرات وتحديث الخريطة" : "Save Changes & Update Map"}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProgram(null);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
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
function GuidesPage({ lang, user, setPage }) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // جلب المرشدين الحقيقيين من API
  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ جلب المرشدين من API - المسار الصحيح مع /api
      const response = await api.get('/api/guides');
      console.log('📥 Guides response:', response);
      
      if (response.data?.success) {
        // ✅ تنسيق البيانات - تحويل specialties إلى مصفوفة
        const formattedGuides = (response.data.guides || []).map(guide => ({
          id: guide.id,
          name: guide.full_name || guide.name,
          avatar: guide.avatar || null,
          verified: guide.is_verified || guide.guide_verified || false,
          rating: guide.rating || 4.5,
          reviews: guide.reviews_count || 0,
          // ✅ تحويل specialties إلى مصفوفة إذا كانت سلسلة نصية
          specialties: Array.isArray(guide.specialties) 
            ? guide.specialties 
            : (guide.specialties ? guide.specialties.split(',').map(s => s.trim()).filter(s => s) : []),
          distance: guide.distance || (Math.random() * 10 + 1).toFixed(1),
          programs: guide.programs_count || 0,
          userId: guide.user_id || guide.id,
          email: guide.email
        }));
        setGuides(formattedGuides);
        console.log('✅ Guides formatted:', formattedGuides.length);
      } else {
        setGuides([]);
      }
    } catch (error) {
      console.error('Error fetching guides:', error);
      setError(lang === 'ar' ? 'فشل تحميل المرشدين' : 'Failed to load guides');
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  // دالة المراسلة - تبدأ محادثة دعم مع المرشد
  const handleStartChat = async (guide) => {
    if (!user) {
      alert(lang === 'ar' 
        ? 'الرجاء تسجيل الدخول أولاً للمراسلة' 
        : 'Please login first to message');
      return;
    }
    
    try {
      // بدء محادثة دعم جديدة مع المرشد
      const response = await api.startSupportChat({
        userId: guide.userId,
        userName: guide.name,
        subject: `محادثة مع المرشد ${guide.name}`,
        message: `مرحباً ${guide.name}، أود التواصل معك بخصوص جولاتك السياحية`,
        type: 'guide'
      });
      
      if (response.success) {
        // الانتقال إلى صفحة المحادثة
        setPage('support');
      } else {
        alert(lang === 'ar' 
          ? 'فشل بدء المحادثة، يرجى المحاولة لاحقاً' 
          : 'Failed to start chat, please try again later');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert(lang === 'ar' 
        ? 'حدث خطأ في بدء المحادثة' 
        : 'Error starting chat');
    }
  };

  // دالة عرض البرامج
  const handleViewPrograms = (guideId) => {
    if (!user) {
      alert(lang === 'ar' 
        ? 'الرجاء تسجيل الدخول أولاً' 
        : 'Please login first');
      return;
    }
    // حفظ معرف المرشد في localStorage مؤقتاً
    localStorage.setItem('selectedGuideId', guideId);
    // الانتقال إلى صفحة برامج المرشد
    setPage('guidePrograms');
  };

  // ✅ فلترة المرشدين حسب البحث - مع التحقق من أن specialties مصفوفة
  const filteredGuides = guides.filter(guide => 
    guide.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (Array.isArray(guide.specialties) && guide.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      
      {/* عنوان الصفحة */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {lang === "ar" ? "المرشدين السياحيين" : "Tourist Guides"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {filteredGuides.length} {lang === "ar" ? "مرشد معتمد" : "Verified Guides"}
        </p>
      </div>

      {/* شريط البحث */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={lang === "ar" ? "ابحث عن مرشد بالاسم أو التخصص..." : "Search guides by name or specialty..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pr-10 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* عرض الخطأ */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-center">
          {error}
          <button 
            onClick={fetchGuides}
            className="mr-3 underline hover:no-underline"
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* حالة التحميل */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <>
          {/* رسالة عند عدم وجود مرشدين */}
          {filteredGuides.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {searchTerm 
                  ? (lang === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No matching results')
                  : (lang === 'ar' ? 'لا يوجد مرشدين حالياً' : 'No guides available at the moment')}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-green-600 hover:text-green-700 text-sm"
                >
                  {lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                </button>
              )}
            </div>
          )}

          {/* بطاقات المرشدين */}
          {filteredGuides.map((guide) => (
            <div 
              key={guide.id} 
              className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700 mb-4"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden">
                      {guide.avatar ? (
                        <img src={guide.avatar} alt={guide.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{guide.name?.split(" ")[0]?.[0] || 'م'}</span>
                      )}
                    </div>
                    {guide.verified && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white dark:border-gray-800">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="mr-3">
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg">
                      {guide.name}
                    </h3>
                    <div className="flex items-center mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">
                        {guide.rating} ({guide.reviews})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ التخصصات - مع التحقق من أن specialties مصفوفة */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(guide.specialties) && guide.specialties.length > 0 ? (
                    guide.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium border border-green-100 dark:border-green-800"
                      >
                        {specialty}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-xs">
                      {lang === 'ar' ? 'لا توجد تخصصات' : 'No specialties'}
                    </span>
                  )}
                </div>
              </div>

              {/* معلومات إضافية */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center">
                  <MapPinned className="w-4 h-4 ml-1 text-green-600 dark:text-green-400" />
                  <span>{guide.distance} كم</span>
                </div>
                <div className="flex items-center">
                  <Package className="w-4 h-4 ml-1 text-green-600 dark:text-green-400" />
                  <span>{guide.programs} {lang === "ar" ? "برنامج" : "programs"}</span>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleStartChat(guide)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                    user 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 shadow-md' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="font-medium">
                    {user ? (lang === "ar" ? "مراسلة" : "Message") : (lang === "ar" ? "سجل دخول للمراسلة" : "Login to message")}
                  </span>
                </button>

                <button 
                  onClick={() => handleViewPrograms(guide.id)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${
                    user 
                      ? 'border-2 border-green-600 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30 transform hover:scale-105' 
                      : 'border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                  }`}
                  disabled={!user}
                >
                  <Package className="w-4 h-4" />
                  <span className="font-medium">{lang === "ar" ? "البرامج" : "Programs"}</span>
                </button>
              </div>

              {/* رسالة للمستخدمين غير المسجلين */}
              {!user && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                  {lang === 'ar' ? '🔒 سجل دخول للمراسلة وعرض البرامج' : '🔒 Login to message and view programs'}
                </p>
              )}
            </div>
          ))}

          {/* قسم ترحيب للمستخدمين غير المسجلين */}
          {!user && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                  {lang === "ar" ? "مرحباً بك في منصة السائح" : "Welcome to Al-Sa'eh Platform"}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {lang === "ar" 
                    ? "سجل دخول للاستفادة من جميع الميزات والتواصل مع المرشدين"
                    : "Login to access all features and connect with guides"}
                </p>
                
                <button
                  onClick={() => setPage('profile')}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  {lang === "ar" ? "تسجيل الدخول" : "Login"}
                </button>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  {lang === "ar" ? "ليس لديك حساب؟" : "Don't have an account?"}{' '}
                  <button 
                    onClick={() => setPage('profile')}
                    className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
                  >
                    {lang === "ar" ? "إنشاء حساب جديد" : "Create account"}
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* قسم ترقية للمستخدمين المسجلين */}
          {user && !user.isGuide && (
            <div className="mt-6 p-5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-xl">👤</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 dark:text-white">كن مرشداً سياحياً</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    شارك بخبراتك واربح من خلال تقديم جولات سياحية
                  </p>
                </div>
                <button
                  onClick={() => setPage('upgrade-to-guide')}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm hover:from-purple-700 hover:to-pink-700 transition"
                >
                  {lang === "ar" ? "ترقية الحساب" : "Upgrade"}
                </button>
              </div>
            </div>
          )}
        </>
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
  const [showChat, setShowChat] = useState(false);
  const [page, setPage] = useState("home");
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [userPrograms, setUserPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const mapContainerRef = useRef(null);
  
  // ✅ أضف هذه المتغيرات الجديدة
  const [transport, setTransport] = useState("driving");
  const [refreshMap, setRefreshMap] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // ✅ التحقق الشامل من أن المستخدم مرشد
  const isGuide = user?.isGuide === true || 
                  user?.role === 'guide' || 
                  user?.type === 'guide' || 
                  user?.guide_status === 'approved';

  // ✅ خريطة تحويل المعرفات الرقمية إلى UUID
  const uuidMap = {
    '1': 'd93beb84-4e67-4f64-bfe9-d20cc25f8b44',
    '4': '3b9e08b2-fc2d-4bfa-8394-ae52a12e509f',
    '6': '64be64ff-ae41-4eb0-a41f-27de577b6246'
  };

  // ✅ دالة لتحويل ID إلى UUID
  const convertToUUID = (id) => {
    const idStr = String(id);
    if (uuidMap[idStr]) {
      return uuidMap[idStr];
    }
    // إذا كان بالفعل UUID (يحتوي على شرطات)
    if (typeof id === 'string' && id.includes('-') && id.split('-').length === 5) {
      return id;
    }
    return null;
  };

  // ✅ دالة لتحديث الخريطة
  const handleProgramAdded = () => {
    console.log('🔄 Program added, refreshing map...');
    setRefreshMap(prev => !prev);
    if (page === 'explore') {
      toast.success(lang === 'ar' ? '🗺️ تم تحديث الخريطة بالبرامج الجديدة' : '🗺️ Map updated with new programs');
    }
  };

  // ✅ تحميل المستخدم من localStorage عند بدء التطبيق
  useEffect(() => {
    const savedUser = localStorage.getItem('touristAppUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('📦 [App] Loaded user from localStorage:', parsedUser);
        setUser(parsedUser);
        if (parsedUser.isGuide || parsedUser.role === 'guide') {
          setGuide(parsedUser);
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }, []);

  // ✅ مراقبة تغييرات المستخدم
  useEffect(() => {
    console.log('🔍 [App] User state changed:', {
      user,
      isGuide: isGuide,
      role: user?.role,
      type: user?.type,
      guide_status: user?.guide_status,
      page: page
    });
  }, [user, isGuide, page]);
  
  const handleLoginSuccess = (response) => {
    console.log('📥 [App] Login response:', response);
    console.log('📥 [App] response.user.role:', response.user.role);
    console.log('📥 [App] response.user.type:', response.user.type);
    console.log('📥 [App] response.user.isGuide:', response.user.isGuide);
    console.log('📥 [App] response.user.guide_status:', response.user.guide_status);
    
    // ✅ التحقق من أن المستخدم مرشد
    const isUserGuide = response.user.isGuide === true || 
                        response.user.role === 'guide' || 
                        response.user.type === 'guide' || 
                        response.user.guide_status === 'approved';
    
    console.log('📥 [App] isUserGuide:', isUserGuide);
    
    const unifiedUser = {
      id: response.user.id,
      email: response.user.email,
      fullName: response.user.fullName || response.user.name,
      phone: response.user.phone || '',
      phoneVerified: response.user.phoneVerified || false,
      avatar: response.user.avatar || null,
      createdAt: response.user.createdAt,
      walletNumber: response.user.walletNumber,
      chatId: response.user.chatId,
      balance: response.user.balance || 0,
      isGuide: isUserGuide,
      role: isUserGuide ? 'guide' : (response.user.role || 'user'),
      type: isUserGuide ? 'guide' : (response.user.type || 'user'),
      guide_status: response.user.guide_status || null,
      licenseNumber: response.user.licenseNumber || null,
      civilId: response.user.civilId || null,
      specialties: response.user.specialties || null,
      experience: response.user.experience || null,
      guideVerified: response.user.guideVerified || false,
      programsCount: response.user.programsCount || 0,
    };
    
    console.log('✅ [App] User after login:', unifiedUser);
    console.log('✅ [App] Is Guide:', unifiedUser.isGuide);
    console.log('✅ [App] Role:', unifiedUser.role);
    console.log('✅ [App] Type:', unifiedUser.type);
    
    setUser(unifiedUser);
    if (unifiedUser.isGuide) {
      setGuide(unifiedUser);
    }
    
    localStorage.setItem('touristAppUser', JSON.stringify(unifiedUser));
    localStorage.setItem('touristAppToken', response.token);
    localStorage.setItem('userType', unifiedUser.type);
    setShowLogin(false);
    
    alert(lang === 'ar' 
      ? `👋 مرحباً ${unifiedUser.fullName}! تم تسجيل الدخول بنجاح`
      : `👋 Welcome ${unifiedUser.fullName}! Login successful`
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
    
    const savedUser = localStorage.getItem('touristAppUser');
    const savedToken = localStorage.getItem('touristAppToken');
    
    if (savedUser && savedToken && !isTestMode) {
      api.verifyToken(savedToken)
        .then((response) => {
          if (response.valid) {
            const parsedUser = JSON.parse(savedUser);
            console.log('✅ [App] User loaded from storage:', parsedUser);
            setUser(parsedUser);
            if (parsedUser.isGuide) {
              setGuide(parsedUser);
              loadGuidePrograms(parsedUser.id, savedToken);
            }
          } else {
            localStorage.removeItem('touristAppUser');
            localStorage.removeItem('touristAppToken');
            localStorage.removeItem('userType');
          }
        })
        .catch(() => {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          if (parsedUser.isGuide) {
            setGuide(parsedUser);
          }
        });
    } else if (savedUser && isTestMode) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.isGuide) {
        setGuide(parsedUser);
      }
    }
  }, [lang, dark, isTestMode]);

  // ✅ دالة loadGuidePrograms المعدلة - تحويل الرقم إلى UUID تلقائياً
  const loadGuidePrograms = async (guideId, token) => {
    try {
      // تحويل guideId إلى UUID إذا كان رقماً
      let validGuideId = guideId;
      const convertedId = convertToUUID(guideId);
      
      if (convertedId) {
        validGuideId = convertedId;
        console.log(`🔄 Converted guide ID from ${guideId} to UUID: ${validGuideId}`);
      }
      
      console.log(`📤 Loading programs for guide UUID: ${validGuideId}`);
      const response = await api.getGuidePrograms(validGuideId, token);
      
      if (response?.data?.programs) {
        setUserPrograms(response.data.programs);
        console.log(`✅ Loaded ${response.data.programs.length} programs successfully`);
      } else if (response?.programs) {
        setUserPrograms(response.programs);
        console.log(`✅ Loaded ${response.programs.length} programs successfully`);
      } else {
        console.log('⚠️ No programs found from API, checking localStorage...');
        // استخدام localStorage كبديل
        const savedPrograms = localStorage.getItem('public_programs');
        if (savedPrograms) {
          setUserPrograms(JSON.parse(savedPrograms));
          console.log('📦 Loaded programs from localStorage');
        }
      }
    } catch (error) {
      console.error('❌ Error loading guide programs:', error);
      // استخدام localStorage كبديل
      const savedPrograms = localStorage.getItem('public_programs');
      if (savedPrograms) {
        setUserPrograms(JSON.parse(savedPrograms));
        console.log('📦 Using cached programs from localStorage');
      }
    }
  };

  const toggleTestMode = () => {
    const newMode = !isTestMode;
    setIsTestMode(newMode);
    
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

  const handleUserUpdate = (updatedUserData) => {
    console.log('🔄 [App] handleUserUpdate called with:', updatedUserData);
    
    const updatedUser = { ...user, ...updatedUserData };
    
    if (updatedUserData.isGuide === true || 
        updatedUserData.role === 'guide' || 
        updatedUserData.type === 'guide' || 
        updatedUserData.guide_status === 'approved') {
      updatedUser.type = 'guide';
      updatedUser.isGuide = true;
      updatedUser.role = 'guide';
    }
    
    console.log('🔄 [App] Updated user:', updatedUser);
    console.log('🔄 [App] Is guide after update:', updatedUser.isGuide);
    
    setUser(updatedUser);
    if (updatedUser.isGuide) {
      setGuide(updatedUser);
    }
    localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
    localStorage.setItem('userType', updatedUser.type);
  };

  const t = (k) => LOCALES[lang][k] || k;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      
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
      
      <div className="flex-1 overflow-hidden relative">
        {console.log('🔄 [App] Current page:', page)}
        
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
            transport={transport}
            setTransport={setTransport}
            user={user}
            programs={userPrograms}
            setPrograms={setUserPrograms}
            unreadCount={unreadCount}
            refreshTrigger={refreshMap}
          />
        )}
        
        {page === "notifications" && (
          <NotificationsPage 
            setPage={setPage} 
          />
        )}
        
        {page === "upgrade-to-guide" && (
          <UpgradeToGuidePage 
            setPage={setPage}
            onUpgradeSuccess={handleUserUpdate}
          />
        )}

        {page === "upgrade-status" && (
          <UpgradeStatusPage 
            setPage={setPage}
          />
        )}
        
        {page === "support" && (
          <SupportChatPage setPage={setPage} />
        )}
        
        {page === "upgrade-requests" && (
          <SupportUpgradeRequestsPage setPage={setPage} />
        )}
        
        {/* ✅ تم إصلاح المشكلة - إضافة دعم لكل من admin-support و adminSupport */}
        {(page === "admin-support" || page === "adminSupport") && (
          <AdminSupportPage setPage={setPage} />
        )}
        
        {page === "admin-notifications" && (
          <AdminNotificationsPage setPage={setPage} />
        )}
        
        {page === "admin-upgrade-requests" && (
          <AdminUpgradeRequestsPage setPage={setPage} />
        )}
        
        {page === "favorites" && <FavoritesPage lang={lang} />}
        
        {page === "events" && <EventsPage lang={lang} />}
        
        {page === "guides" && (
          <GuidesPage 
            lang={lang} 
            user={user}
            setPage={setPage}
          />
        )}
        
        {/* ✅ صفحة الطوارئ */}
        {page === "emergency" && (
          <EmergencyPage setPage={setPage} user={user} />
        )}
        
        {/* ✅ صفحة لوحة تحكم المرشد - مع التحقق الشامل */}
        {page === "guideDashboard" && (
          (() => {
            console.log('🔴🔴🔴 [App] Rendering guideDashboard section 🔴🔴🔴');
            console.log('[App] isGuide value:', isGuide);
            console.log('[App] user:', user);
            console.log('[App] user?.isGuide:', user?.isGuide);
            console.log('[App] user?.role:', user?.role);
            console.log('[App] user?.type:', user?.type);
            console.log('[App] user?.guide_status:', user?.guide_status);
            
            if (isGuide) {
              console.log('✅✅✅ [App] Rendering GuideDashboard ✅✅✅');
              return (
                <GuideDashboard 
                  lang={lang} 
                  guide={user}
                  setPage={setPage}
                  user={user}
                  setUserPrograms={setUserPrograms}
                  onProgramAdded={handleProgramAdded}
                />
              );
            } else {
              console.log('❌❌❌ [App] Showing Access Denied ❌❌❌');
              return (
                <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                  <div className="text-center p-8">
                    <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Shield className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                      {lang === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {lang === 'ar' 
                        ? `أنت لست مرشداً سياحياً. البيانات: isGuide=${user?.isGuide}, role=${user?.role}, type=${user?.type}, status=${user?.guide_status}`
                        : `You are not a guide. Data: isGuide=${user?.isGuide}, role=${user?.role}, type=${user?.type}, status=${user?.guide_status}`}
                    </p>
                    <button
                      onClick={() => setPage('profile')}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      {lang === 'ar' ? 'العودة للملف الشخصي' : 'Back to Profile'}
                    </button>
                  </div>
                </div>
              );
            }
          })()
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
            onUserUpdate={handleUserUpdate}
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

      {showLogin && (
        <LoginPage 
          lang={lang}
          onLoginSuccess={handleLoginSuccess}
        />
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
        <AuthProvider>
          <TouristAppPrototype />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

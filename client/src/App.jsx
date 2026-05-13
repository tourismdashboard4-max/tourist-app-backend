// client/src/App.jsx
// ✅ النسخة النهائية - إصلاح فتح المحادثات المباشرة من الإشعارات لجميع المستخدمين

import { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshCw, Compass, Globe, ArrowRight,
  AlertCircle, ChevronDown, ChevronUp, Info,
  Loader2, PlusCircle, CalendarCheck, AlertTriangle
} from "lucide-react";
import ExplorePage from './pages/ExplorePage';
import api from './services/api';
import LoginPage from './components/Auth/LoginPage';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import NotificationsPage from './pages/NotificationsPage'; 
import { AuthProvider, useAuth } from './contexts/AuthContext';
import UpgradeToGuidePage from './pages/UpgradeToGuidePage';
import UpgradeStatusPage from './pages/UpgradeStatusPage';
import SupportUpgradeRequestsPage from './pages/SupportUpgradeRequestsPage';
import AdminSupportPage from './pages/AdminSupportPage';
import AdminNotificationsPage from './pages/AdminNotificationsPage';
import AdminUpgradeRequestsPage from './pages/AdminUpgradeRequestsPage';
import GuideDashboard from './pages/GuideDashboard';
import SupportChatPage from './pages/SupportChatPage';
import DirectChatPage from './pages/DirectChatPage';
import toast from 'react-hot-toast';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
const API_BASE_URL = 'https://tourist-app-api.onrender.com';
mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw";

// ===================== LOCALES =====================
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
  }
};

// ===================== 📱 Bottom Navigation Bar (بدون شريط المسؤول) =====================
function BottomNav({ current, setCurrent, lang, user, setShowLogin }) {
  const isGuideUser = user?.type === "guide" || user?.role === 'guide' || user?.isGuide === true || user?.guide_status === 'approved';
  const navItems = isGuideUser ? [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home" },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore" },
    { key: "favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites" },
    { key: "guideDashboard", icon: Shield, label: lang === "ar" ? "لوحتي" : "My Dashboard" },
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile" }
  ] : [
    { key: "home", icon: Home, label: lang === "ar" ? "الرئيسية" : "Home" },
    { key: "explore", icon: Navigation, label: lang === "ar" ? "استكشف" : "Explore" },
    { key: "favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites" },
    { key: "guides", icon: Users, label: lang === "ar" ? "المرشدين" : "Guides" },
    { key: "profile", icon: User, label: lang === "ar" ? "صفحتي" : "Profile" }
  ];

  const getProfileIcon = () => {
    if (user?.avatar) {
      return <img src={user.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover" />;
    }
    return <User size={24} />;
  };

  const handleNavClick = (key) => {
    if (key === 'explore' && !user) {
      alert(lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً' : 'Please login first');
      if (setShowLogin) setShowLogin(true);
      return;
    }
    if (key === 'profile') {
      if (user) {
        setCurrent('profile');   // ✅ فتح صفحة كاملة
      } else {
        if (setShowLogin) setShowLogin(true);
      }
      return;
    }
    setCurrent(key);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white border-t border-gray-200 flex justify-around py-3 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isProfile = item.key === 'profile';
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`flex flex-col items-center justify-center w-16 ${
                current === item.key ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {isProfile ? getProfileIcon() : <Icon size={24} className="mb-1" />}
              <span className="text-xs font-medium">{item.label}</span>
              {current === item.key && <div className="w-1 h-1 bg-green-600 dark:bg-green-400 rounded-full mt-1"></div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===================== 📍 Home Page (معدل زر الوضع الليلي) =====================
function HomePage({ lang, user, setPage, dark, setDark, locationEnabled, setLocationEnabled }) {
  const t = (k) => LOCALES[lang][k] || k;
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (user?.id) {
      const fetchUnreadCount = async () => {
        try {
          const response = await api.getUserNotifications({ status: 'unread', limit: 1 });
          let count = 0;
          if (response.success && response.pagination) count = response.pagination.total || 0;
          else if (response.unreadCount !== undefined) count = response.unreadCount;
          else if (response.data?.unreadCount !== undefined) count = response.data.unreadCount;
          else if (Array.isArray(response.notifications)) count = response.notifications.filter(n => n.status === 'unread').length;
          setUnreadCount(count);
        } catch (error) { console.error(error); }
      };
      fetchUnreadCount();
    } else setUnreadCount(0);
  }, [user]);
  return (
    <div className="h-full overflow-y-auto pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden flex-shrink-0">
                  {user.avatar ? <img src={user.avatar} alt={user.fullName || user.name} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; const parent = e.target.parentElement; if (parent) parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-white text-xl">👤</div>'; }} /> : <div className="w-full h-full flex items-center justify-center text-white text-xl">{user.fullName?.charAt(0) || user.name?.charAt(0) || '👤'}</div>}
                </div>
                <div><h1 className="text-xl font-bold">{user.fullName || user.name}</h1>{user.type === "guide" && <div className="flex items-center mt-0.5"><Shield className="w-3 h-3 ml-1" /><span className="text-xs opacity-90">مرشد سياحي موثق</span></div>}</div>
              </>
            ) : (
              <div><h1 className="text-2xl font-bold">{t("welcome")}</h1><p className="text-white/90">{t("appName")}</p></div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark()} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
            {user && <button onClick={() => setPage("notifications")} className="relative p-2 rounded-full bg-white/20 hover:bg-white/30 transition"><Bell size={20} />{unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>}
          </div>
        </div>
        <div className="relative"><Search className="absolute right-3 top-3.5 text-gray-400" size={20} /><input type="text" placeholder={t("search")} className="w-full p-3 pr-10 rounded-xl bg-white/20 backdrop-blur-sm placeholder-white/70 border border-white/30 focus:outline-none focus:border-white focus:bg-white/30 transition" /></div>
      </div>
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t("explore")}</h2>
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button onClick={() => { if (!user) { alert(lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً للوصول للخريطة' : 'Please login first to access the map'); return; } setPage("explore"); }} className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition"><div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2"><MapPin className="text-blue-600 dark:text-blue-400" size={24} /></div><span className="text-xs font-medium dark:text-gray-200">الخريطة</span></button>
          <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm"><div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2"><Package className="text-green-600 dark:text-green-400" size={24} /></div><span className="text-xs font-medium dark:text-gray-200">{t("nearbyPrograms")}</span></div>
          <button onClick={() => setPage(user?.type === "guide" ? "guideDashboard" : "guides")} className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition"><div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-2"><Users className="text-purple-600 dark:text-purple-400" size={24} /></div><span className="text-xs font-medium dark:text-gray-200">{user?.type === "guide" ? t("guideDashboard") : t("guides")}</span></button>
          <button onClick={() => setPage("profile")} className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition"><div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-2">{user?.type === "guide" ? <Archive className="text-orange-600 dark:text-orange-400" size={24} /> : <Heart className="text-orange-600 dark:text-orange-400" size={24} />}</div><span className="text-xs font-medium dark:text-gray-200">{user?.type === "guide" ? t("archiveTrips") : t("favorites")}</span></button>
        </div>
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t("nearbyPrograms")}</h2>
        {!user ? <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm"><p className="text-gray-600 dark:text-gray-400 mb-4">{lang === 'ar' ? 'سجل دخول لمشاهدة البرامج القريبة منك' : 'Login to see nearby programs'}</p><button onClick={() => setPage('profile')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">{lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</button></div> : <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-sm"><p className="text-gray-600 dark:text-gray-400">{lang === 'ar' ? 'جاري تحميل البرامج القريبة...' : 'Loading nearby programs...'}</p></div>}
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


// ===================== 👨‍🏫 صفحة المرشدين (نسخة تعرض الصور وعدد البرامج بشكل صحيح) =====================
function GuidesPage({ lang, user, setPage }) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [guidesMap, setGuidesMap] = useState({}); // خريطة UUID -> old_id

  // جلب خريطة المرشدين للمساعدة في تحويل UUID إلى old_id
  useEffect(() => {
    const fetchGuidesMap = async () => {
      try {
        const response = await api.get('/api/guides');
        let guidesList = [];
        if (response.data?.data?.guides) guidesList = response.data.data.guides;
        else if (response.data?.guides) guidesList = response.data.guides;
        else if (Array.isArray(response.data)) guidesList = response.data;
        else if (response.data?.data && Array.isArray(response.data.data)) guidesList = response.data.data;

        const map = {};
        guidesList.forEach(guide => {
          const uuid = guide.id || guide.uuid;
          const numericId = guide.old_id;
          if (uuid && numericId && !isNaN(Number(numericId))) {
            map[uuid] = Number(numericId);
          }
        });
        setGuidesMap(map);
      } catch (err) {
        console.error('Failed to fetch guides map:', err);
      }
    };
    fetchGuidesMap();
  }, []);

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. جلب قائمة المرشدين
      const response = await api.get('/api/guides');
      let guidesList = [];
      if (response.data?.data?.guides) guidesList = response.data.data.guides;
      else if (response.data?.guides) guidesList = response.data.guides;
      else if (Array.isArray(response.data)) guidesList = response.data;
      else if (response.data?.data && Array.isArray(response.data.data)) guidesList = response.data.data;

      // 2. تنسيق البيانات الأساسية مع تحسين معالجة الصورة
      const formattedGuides = guidesList.map(guide => {
        let avatarUrl = guide.avatar || guide.avatar_url || guide.profile_image || guide.image;
        if (avatarUrl) {
          if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:image')) {
            avatarUrl = `https://tourist-app-api.onrender.com${avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl}`;
          }
        } else {
          avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(guide.full_name || guide.name || 'Guide')}&background=3b82f6&color=fff&size=200`;
        }
        
        let programsCount = 0;
        let specialties = [];
        if (Array.isArray(guide.specialties)) {
          specialties = guide.specialties;
        } else if (guide.specialties && typeof guide.specialties === 'string') {
          specialties = guide.specialties.split(',').map(s => s.trim()).filter(s => s);
        } else if (guide.specialization) {
          specialties = [guide.specialization];
        }
        
        let distance = guide.distance;
        if (distance && !isNaN(parseFloat(distance))) {
          distance = parseFloat(distance).toFixed(1);
        } else {
          distance = null;
        }
        
        return {
          id: guide.id,
          name: guide.full_name || guide.name || 'مرشد سياحي',
          avatar: avatarUrl,
          verified: guide.is_verified || guide.guide_verified || false,
          rating: guide.rating || 4.5,
          reviews: guide.reviews_count || guide.reviews || 0,
          specialties: specialties,
          distance: distance,
          userId: guide.user_id || guide.id,
          programs: 0
        };
      });
      
      // 3. جلب عدد البرامج لكل مرشد
      const guidesWithPrograms = await Promise.all(formattedGuides.map(async (guide) => {
        try {
          const progResponse = await api.get(`/api/guides/${guide.id}/programs`);
          let programsCount = 0;
          if (progResponse.data?.programs && Array.isArray(progResponse.data.programs)) {
            programsCount = progResponse.data.programs.length;
          } else if (progResponse.data?.data?.programs && Array.isArray(progResponse.data.data.programs)) {
            programsCount = progResponse.data.data.programs.length;
          } else if (Array.isArray(progResponse.data)) {
            programsCount = progResponse.data.length;
          }
          return { ...guide, programs: programsCount };
        } catch (err) {
          console.error(`Error fetching programs for guide ${guide.id}:`, err);
          return { ...guide, programs: 0 };
        }
      }));
      
      setGuides(guidesWithPrograms);
      console.log('✅ Guides with programs:', guidesWithPrograms);
    } catch (error) {
      console.error('Error fetching guides:', error);
      setError(lang === 'ar' ? 'فشل تحميل المرشدين' : 'Failed to load guides');
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ دالة مساعدة لتحويل UUID إلى رقمي (old_id)
  const resolveNumericGuideId = async (guideId) => {
    if (!guideId) return null;
    if (!isNaN(Number(guideId))) return Number(guideId);
    if (guidesMap[guideId]) return guidesMap[guideId];
    try {
      const token = localStorage.getItem('token');
      const userRes = await fetch(`https://tourist-app-api.onrender.com/api/users/${guideId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const userData = await userRes.json();
      if (userData.success && userData.user) {
        if (userData.user.old_id) return Number(userData.user.old_id);
        if (userData.user.id && !isNaN(Number(userData.user.id))) return Number(userData.user.id);
      }
    } catch(e) {
      console.warn('Failed to fetch user:', e);
    }
    return null;
  };

  // ✅ الدالة المعدلة: بدء محادثة مباشرة مع المرشد (نفس آلية ExplorePage)
  const handleStartChat = async (guide) => {
    if (!user) {
      toast.error(lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً للمراسلة' : 'Please login first to message');
      setPage('profile');
      return;
    }
    try {
      // استخدام المعرف الأصلي للمرشد (قد يكون UUID أو رقم)
      let rawId = guide.userId || guide.id;
      // تحويل إلى رقمي إن أمكن
      const numericId = await resolveNumericGuideId(rawId);
      if (!numericId) {
        toast.error(lang === 'ar' ? 'معرف المرشد غير صالح' : 'Invalid guide ID');
        return;
      }
      // حفظ البيانات في localStorage كما في ExplorePage
      const chatParams = {
        recipientId: numericId,
        recipientName: guide.name,
        timestamp: Date.now()
      };
      localStorage.setItem('directChatParams', JSON.stringify(chatParams));
      console.log('✅ Saved chat params to localStorage:', chatParams);
      // الانتقال إلى صفحة المحادثة المباشرة
      setPage('directChat');
      toast.success(lang === 'ar' ? 'تم فتح المحادثة مع المرشد' : 'Conversation with guide opened');
    } catch (err) {
      console.error('Chat error:', err);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء محاولة بدء المحادثة' : 'Error starting conversation');
    }
  };

  const handleViewPrograms = (guideId) => {
    if (!user) {
      toast.error(lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً' : 'Please login first');
      setPage('profile');
      return;
    }
    localStorage.setItem('selectedGuideId', guideId);
    setPage('guidePrograms');
  };

  const filteredGuides = guides.filter(guide =>
    guide.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Array.isArray(guide.specialties) && guide.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        {error}
        <button onClick={fetchGuides} className="mr-2 underline">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {lang === "ar" ? "المرشدين السياحيين" : "Tourist Guides"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {filteredGuides.length} {lang === "ar" ? "مرشد معتمد" : "Verified Guides"}
        </p>
      </div>

      {/* حقل البحث */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={lang === "ar" ? "ابحث عن مرشد بالاسم أو التخصص..." : "Search guides by name or specialty..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pr-10 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
      </div>

      {filteredGuides.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {searchTerm
              ? (lang === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No matching results')
              : (lang === 'ar' ? 'لا يوجد مرشدين حالياً' : 'No guides available at the moment')}
          </p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-green-600 hover:text-green-700 text-sm">
              {lang === 'ar' ? 'مسح البحث' : 'Clear search'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGuides.map((guide) => (
            <div key={guide.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
              {/* رأس البطاقة: صورة واسم وتقييم */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden">
                      <img
                        src={guide.avatar}
                        alt={guide.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class="w-full h-full flex items-center justify-center">${guide.name?.charAt(0) || 'م'}</span>`;
                          }
                        }}
                      />
                    </div>
                    {guide.verified && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white dark:border-gray-800">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="mr-3">
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg">{guide.name}</h3>
                    <div className="flex items-center mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">
                        {guide.rating} ({guide.reviews})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* التخصصات */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {guide.specialties.length > 0 ? (
                    guide.specialties.map((specialty, index) => (
                      <span key={index} className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium border border-green-100 dark:border-green-800">
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

              {/* المسافة وعدد البرامج */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center">
                  <MapPinned className="w-4 h-4 ml-1 text-green-600 dark:text-green-400" />
                  <span>{guide.distance ? `${guide.distance} كم` : (lang === 'ar' ? 'مسافة غير محددة' : 'Distance N/A')}</span>
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
                  <span className="font-medium">{lang === "ar" ? "مراسلة" : "Message"}</span>
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

              {!user && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                  🔒 {lang === 'ar' ? 'سجل دخول للمراسلة وعرض البرامج' : 'Login to message and view programs'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* باقي الأقسام (تسجيل الدخول، ترقية الحساب) */}
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
            <button onClick={() => setPage('profile')} className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg">
              {lang === "ar" ? "تسجيل الدخول" : "Login"}
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              {lang === "ar" ? "ليس لديك حساب؟" : "Don't have an account?"}{' '}
              <button onClick={() => setPage('profile')} className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium">
                {lang === "ar" ? "إنشاء حساب جديد" : "Create account"}
              </button>
            </p>
          </div>
        </div>
      )}

      {user && !user.isGuide && (
        <div className="mt-6 p-5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400 text-xl">👤</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 dark:text-white">{lang === "ar" ? "كن مرشداً سياحياً" : "Become a Tour Guide"}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === "ar" ? "شارك بخبراتك واربح من خلال تقديم جولات سياحية" : "Share your expertise and earn by offering tours"}
              </p>
            </div>
            <button onClick={() => setPage('upgrade-to-guide')} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm hover:from-purple-700 hover:to-pink-700 transition">
              {lang === "ar" ? "ترقية الحساب" : "Upgrade"}
            </button>
          </div>
        </div>
      )}
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




// ===================== ⚙️ Settings Page (معدل زر الوضع الليلي) =====================
function SettingsPage({ lang, dark, setDark, setLang, setPage, locationEnabled, setLocationEnabled }) {
  const t = (k) => LOCALES[lang][k] || k;
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="flex items-center mb-6"><button onClick={() => setPage("profile")} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm ml-4"><span className="text-xl dark:text-white">‹</span></button><h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t("settings")}</h1></div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700"><div className="flex items-center justify-between"><div><h3 className="font-medium text-gray-800 dark:text-white">{t("darkMode")}</h3><p className="text-sm text-gray-500 dark:text-gray-400">مريح للعين في الإضاءة المنخفضة</p></div><button onClick={() => setDark()} className={`w-12 h-6 rounded-full relative transition-colors ${dark ? "bg-green-600" : "bg-gray-300"}`}><div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${dark ? "right-0.5" : "left-0.5"}`}></div></button></div></div>
        <div className="p-4 border-b dark:border-gray-700"><div className="flex items-center justify-between"><div><h3 className="font-medium text-gray-800 dark:text-white">{t("locationSharing")}</h3><p className="text-sm text-gray-500 dark:text-gray-400">مشاركة موقعك لعرض البرامج القريبة</p></div><button onClick={() => setLocationEnabled(!locationEnabled)} className={`w-12 h-6 rounded-full relative transition-colors ${locationEnabled ? "bg-green-600" : "bg-gray-300"}`}><div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${locationEnabled ? "right-0.5" : "left-0.5"}`}></div></button></div></div>
        <div className="p-4 border-b dark:border-gray-700"><div className="flex items-center justify-between"><h3 className="font-medium text-gray-800 dark:text-white">{t("language")}</h3><select value={lang} onChange={(e) => setLang(e.target.value)} className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"><option value="ar">العربية</option><option value="en">English</option></select></div></div>
        <div className="p-4"><h3 className="font-medium text-gray-800 dark:text-white mb-3">حول التطبيق</h3><div className="space-y-2"><div className="flex items-center justify-between w-full p-2"><span className="text-gray-700 dark:text-gray-300">الإصدار</span><span className="text-gray-500 dark:text-gray-400">1.0.0</span></div><button className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition"><span className="text-gray-700 dark:text-gray-300">الشروط والأحكام</span><span className="text-gray-400">‹</span></button><button className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition"><span className="text-gray-700 dark:text-gray-300">سياسة الخصوصية</span><span className="text-gray-400">‹</span></button></div></div>
      </div>
    </div>
  );
}

// ===================== 🚨 صفحة الطوارئ =====================
function EmergencyPage({ setPage, user }) {
  const emergencyNumbers = [
    { name: "الشرطة", number: "999", icon: "📞", color: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-700 dark:text-blue-300" },
    { name: "الإسعاف", number: "997", icon: "🚑", color: "bg-red-100 dark:bg-red-900/30", textColor: "text-red-700 dark:text-red-300" },
    { name: "الدفاع المدني", number: "998", icon: "🔥", color: "bg-orange-100 dark:bg-orange-900/30", textColor: "text-orange-700 dark:text-orange-300" },
    { name: "النجدة", number: "911", icon: "🚨", color: "bg-purple-100 dark:bg-purple-900/30", textColor: "text-purple-700 dark:text-purple-300" }
  ];
  const handleCall = (number) => { window.location.href = `tel:${number}`; };
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4 pb-20">
      <div className="flex items-center mb-6"><button onClick={() => setPage('home')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md ml-4 transition hover:bg-gray-100 dark:hover:bg-gray-700"><span className="text-xl dark:text-white">‹</span></button><h1 className="text-2xl font-bold text-gray-800 dark:text-white">🚨 خدمات الطوارئ</h1></div>
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-4 mb-6"><p className="text-red-700 dark:text-red-300 text-sm font-medium">⚠️ في حالات الطوارئ الخطيرة، اتصل فوراً على الأرقام أدناه.</p></div>
      <div className="grid gap-4">
        {emergencyNumbers.map((item, idx) => (
          <button key={idx} onClick={() => handleCall(item.number)} className={`${item.color} rounded-xl p-4 shadow-sm hover:shadow-md transition transform hover:scale-[1.02] active:scale-98`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4"><span className="text-3xl">{item.icon}</span><div className="text-right"><h3 className={`font-bold text-lg ${item.textColor}`}>{item.name}</h3><p className={`text-2xl font-mono font-bold ${item.textColor}`}>{item.number}</p></div></div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">📞 اتصل</span>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"><h3 className="font-bold text-gray-800 dark:text-white mb-2">💡 نصائح مهمة</h3><ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400"><li>• حافظ على هدوئك وقدم معلومات دقيقة للمسؤول.</li><li>• حدد موقعك بوضوح (استخدم تطبيق الخرائط إذا أمكن).</li><li>• لا تتصل برقم الطوارئ إلا للحالات الخطيرة.</li><li>• أخبر شخصاً قريباً منك بحالتك إن أمكن.</li></ul></div>
    </div>
  );
}
// ===================== 👑 شريط المسؤولين (معدل – أنحف وأصغر) =====================
function AdminTopBar({ setPage, lang, unreadCount }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role === 'admin';
  const isSupport = user?.role === 'support';
  const showAdminBar = isAdmin || isSupport;
  if (!showAdminBar) return null;

  return (
    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 py-0.5 px-2 flex justify-center gap-1.5 shadow-md relative z-10">
      <button
        onClick={() => setPage('adminNotifications')}
        className="relative flex items-center justify-center w-7 h-7 bg-white/20 rounded-full hover:bg-white/30 transition"
        title={lang === 'ar' ? 'الإشعارات' : 'Notifications'}
      >
        <Bell size={14} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <button
        onClick={() => setPage('adminSupport')}
        className="px-2 py-0.5 bg-white text-teal-700 rounded-full text-[11px] font-bold shadow-md hover:bg-gray-100 transition flex items-center gap-1"
      >
        📧 {lang === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}
      </button>
      {isAdmin && (
        <button
          onClick={() => setPage('upgrade-requests')}
          className="px-2 py-0.5 bg-white text-teal-700 rounded-full text-[11px] font-bold shadow-md hover:bg-gray-100 transition flex items-center gap-1"
        >
          ⭐ {lang === 'ar' ? 'طلبات الترقية' : 'Upgrade Requests'}
        </button>
      )}
    </div>
  );
}

// ===================== 📱 Main App Component =====================
export function TouristAppPrototype() {
  const { user: authUser, logout: authLogout, updateUser: authUpdateUser } = useAuth();
  const { darkMode: dark, toggleDarkMode } = useTheme();

  const [lang, setLang] = useState("ar");
  const [showLogin, setShowLogin] = useState(false);
  const [page, setPage] = useState("home");
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [userPrograms, setUserPrograms] = useState([]);
  const mapContainerRef = useRef(null);
  const [transport, setTransport] = useState("driving");
  const [refreshMap, setRefreshMap] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatType, setChatType] = useState(null);
  const [guideUnreadCount, setGuideUnreadCount] = useState(0);
  const pollingRef = useRef(null);
  const prevGuideUnreadCountRef = useRef(0);

  const user = authUser;
  const isGuide = user?.isGuide === true || user?.role === 'guide' || user?.type === 'guide' || user?.guide_status === 'approved';

  // ✅ دالة مساعدة لإنشاء تذكرة guide_chat جديدة (احتياطي)
  const createChatTicket = useCallback(async (touristId, guideId, touristName, guideName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tourist-app-api.onrender.com/api/support/tickets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'guide_chat',
          user_id: touristId,
          metadata: { guideId, guideName, created_by_name: touristName, created_by_id: touristId },
          subject: `محادثة بين ${touristName} والمرشد ${guideName}`,
          status: 'open',
          priority: 'normal'
        })
      });
      const data = await response.json();
      return data.success ? data.ticket : null;
    } catch (error) { console.error(error); return null; }
  }, []);

  // ✅ دالة محسنة لفتح المحادثة من الإشعار – تفتح DirectChatPage لكل المستخدمين
  const openChatFromNotification = useCallback(async (notification) => {
    console.log('🔔 Opening chat from notification:', notification);
    
    const isGuideChatNotif = notification.type === 'GUIDE_CHAT' ||
                            notification.type === 'guide_chat' ||
                            notification.type === 'guide_chat_message' ||
                            notification.type === 'new_message';

    if (isGuideChatNotif) {
      const currentUserId = user?.id ? String(user.id) : null;
      let otherPartyId = notification.userId || notification.data?.userId ||
                         notification.data?.created_by_id || notification.data?.senderId;
      let otherPartyName = notification.userName || notification.data?.userName ||
                           notification.data?.fromName || notification.data?.created_by_name ||
                           (lang === 'ar' ? 'مستخدم' : 'User');
      let ticketId = notification.ticketId || notification.data?.ticketId;
      if (!ticketId && notification.action_url) {
        const match = notification.action_url.match(/\d+/);
        if (match) ticketId = match[0];
      }
      
      if (!otherPartyId && ticketId) {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`https://tourist-app-api.onrender.com/api/support/tickets/${ticketId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.status === 404) {
            toast.error(lang === 'ar' ? 'هذه المحادثة لم تعد موجودة' : 'This conversation no longer exists');
            if (notification.id && !String(notification.id).startsWith('ticket_')) {
              try { await api.deleteNotification(notification.id); } catch(e) {}
            }
            return;
          }
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.ticket) {
              const ticket = data.ticket;
              if (ticket.user_id && (!currentUserId || String(ticket.user_id) !== currentUserId)) {
                otherPartyId = ticket.user_id;
                otherPartyName = ticket.user_name || (lang === 'ar' ? 'مستخدم' : 'User');
              } else if (ticket.metadata?.created_by_id && (!currentUserId || String(ticket.metadata.created_by_id) !== currentUserId)) {
                otherPartyId = ticket.metadata.created_by_id;
                otherPartyName = ticket.metadata.created_by_name || (lang === 'ar' ? 'مسافر' : 'Traveler');
              } else if (ticket.metadata?.guideId && (!currentUserId || String(ticket.metadata.guideId) !== currentUserId)) {
                otherPartyId = ticket.metadata.guideId;
                otherPartyName = ticket.metadata.guideName || (lang === 'ar' ? 'مرشد' : 'Guide');
              } else if (ticket.sender_id && (!currentUserId || String(ticket.sender_id) !== currentUserId)) {
                otherPartyId = ticket.sender_id;
              }
            }
          }
        } catch (err) {
          console.error('Error fetching ticket for notification:', err);
        }
      }
      
      if (otherPartyId) {
        localStorage.setItem('directChatParams', JSON.stringify({
          recipientId: otherPartyId,
          recipientName: otherPartyName,
          recipientType: 'tourist',
          ticketId: ticketId || null
        }));
        setPage('directChat');
      } else {
        toast.error(lang === 'ar' ? 'تعذر تحديد الطرف الآخر للمحادثة' : 'Cannot identify the other party');
      }
      return;
    }
    
    let ticketId = null;
    let type = 'support';
    let userName = null;
    if (notification.ticketId) ticketId = notification.ticketId;
    else if (notification.data?.ticketId) ticketId = notification.data.ticketId;
    else if (notification.action_url) ticketId = notification.action_url.match(/\d+/)?.[0];
    if (ticketId) {
      localStorage.setItem('selectedTicketId', ticketId);
      localStorage.setItem('selectedChatType', type);
      if (userName) localStorage.setItem('chatUserName', userName);
      setChatType(type);
      setPage('support');
    } else {
      setChatType(type);
      setPage('support');
    }
  }, [user, lang, setPage, setChatType]);

  // ✅ دالة جلب التذاكر غير المقروءة للمرشد
  const fetchGuideUnreadCount = useCallback(async () => {
    if (!user || (!user.isGuide && user.role !== 'guide')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tourist-app-api.onrender.com/api/support/tickets?status=open', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success && data.tickets) {
        const guideId = user.id;
        let unreadTickets = data.tickets.filter(ticket =>
          ticket.type === 'guide_chat' &&
          !ticket.is_read &&
          (ticket.metadata?.guideId == guideId || ticket.user_id === guideId)
        );
        unreadTickets.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
        const newCount = unreadTickets.length;
        if (newCount > prevGuideUnreadCountRef.current && newCount > 0) {
          const latestTicket = unreadTickets[0];
          const userName = latestTicket.metadata?.created_by_name || (latestTicket.user_id === guideId ? 'الدعم' : 'مسافر');
          let touristId = null;
          if (latestTicket.metadata?.created_by_id && String(latestTicket.metadata.created_by_id) !== String(guideId)) {
            touristId = latestTicket.metadata.created_by_id;
          } else if (latestTicket.user_id && String(latestTicket.user_id) !== String(guideId)) {
            touristId = latestTicket.user_id;
          } else if (latestTicket.metadata?.userId && String(latestTicket.metadata.userId) !== String(guideId)) {
            touristId = latestTicket.metadata.userId;
          } else if (latestTicket.metadata?.sender_id && String(latestTicket.metadata.sender_id) !== String(guideId)) {
            touristId = latestTicket.metadata.sender_id;
          }
          toast(`📩 ${lang === 'ar' ? `رسالة جديدة من ${userName}` : `New message from ${userName}`}`, {
            icon: '💬',
            duration: 8000,
            onClick: () => {
              if (touristId) {
                localStorage.setItem('directChatParams', JSON.stringify({
                  recipientId: touristId,
                  recipientName: userName,
                  recipientType: 'tourist',
                }));
                setPage('directChat');
              } else {
                localStorage.setItem('selectedTicketId', latestTicket.id);
                localStorage.setItem('selectedChatType', 'guide');
                localStorage.setItem('chatUserName', userName);
                setChatType('guide');
                setPage('support');
              }
            }
          });
        }
        prevGuideUnreadCountRef.current = newCount;
        setGuideUnreadCount(newCount);
      }
    } catch (err) {
      console.error('Polling error for guide tickets:', err);
    }
  }, [user, lang]);

  // بدء polling للمرشد
  useEffect(() => {
    if (user && isGuide) {
      fetchGuideUnreadCount();
      pollingRef.current = setInterval(fetchGuideUnreadCount, 10000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [user, isGuide, fetchGuideUnreadCount]);

  // تحديث عند تغيير الصفحة
  useEffect(() => {
    if (user && isGuide) fetchGuideUnreadCount();
  }, [page, user, fetchGuideUnreadCount]);

  // جلب عدد الإشعارات للمسؤول
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'support')) {
      const fetchAdminUnread = async () => {
        try {
          const response = await api.getUserNotifications({ status: 'unread', limit: 1 });
          let count = 0;
          if (response.success && response.pagination) count = response.pagination.total || 0;
          else if (response.unreadCount !== undefined) count = response.unreadCount;
          setUnreadCount(count);
        } catch (err) { console.error(err); }
      };
      fetchAdminUnread();
      const interval = setInterval(fetchAdminUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleProgramAdded = () => {
    setRefreshMap(prev => !prev);
    if (page === 'explore') toast.success(lang === 'ar' ? '🗺️ تم تحديث الخريطة' : '🗺️ Map updated');
  };

  const handleLoginSuccess = (response) => {
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('userType', response.user.type === 'guide' ? 'guide' : 'user');
    }
    authUpdateUser(response.user);
    setShowLogin(false);
    toast.success(`👋 مرحباً ${response.user.fullName || response.user.name}! تم تسجيل الدخول بنجاح`);
  };

  const handleLogout = () => {
    authLogout();
    setPage('home');
    setUserPrograms([]);
  };

  const handleUserUpdate = (userData) => authUpdateUser(userData);

  const toggleTestMode = () => {
    const newMode = !isTestMode;
    setIsTestMode(newMode);
    authLogout();
    setPage("home");
    toast.info(lang === 'ar' ? `🔄 تم التبديل إلى ${newMode ? 'وضع الاختبار' : 'وضع الإنتاج'}` : `🔄 Switched to ${newMode ? 'Test Mode' : 'Production Mode'}`);
  };

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [lang, dark]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {isTestMode && (
        <div className="bg-yellow-500 text-white text-center py-1 px-4 text-xs font-medium flex items-center justify-center gap-2">
          <span className="animate-pulse">🧪</span>
          <span>{lang === 'ar' ? 'وضع الاختبار التجريبي' : 'Test Mode'}</span>
          <button onClick={toggleTestMode} className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs">🔄</button>
        </div>
      )}
      
      {/* ✅ شريط المسؤولين في الأعلى */}
      <AdminTopBar setPage={setPage} lang={lang} unreadCount={unreadCount} />
      
      {/* ✅ إزالة المسافة العلوية (pt-0) لرفع المحتوى وجعل سطر الكتابة مرئياً */}
      <div className="flex-1 overflow-hidden relative -mt-2">
        {page === "home" && <HomePage lang={lang} user={user} setPage={setPage} dark={dark} setDark={toggleDarkMode} locationEnabled={locationEnabled} setLocationEnabled={setLocationEnabled} />}
        {page === "explore" && <ExplorePage lang={lang} mapContainerRef={mapContainerRef} setPage={setPage} user={user} unreadCount={unreadCount} dark={dark} />}
        {page === "directChat" && <DirectChatPage setPage={setPage} lang={lang} />}
        {page === "programs" && <ProgramsPage setPage={setPage} lang={lang} />} 
        {page === "notifications" && <NotificationsPage setPage={setPage} onNotificationClick={openChatFromNotification} />}
        {page === "upgrade-to-guide" && <UpgradeToGuidePage setPage={setPage} onUpgradeSuccess={handleUserUpdate} />}
        {page === "upgrade-status" && <UpgradeStatusPage setPage={setPage} />}
        {page === "support" && <SupportChatPage setPage={setPage} lang={lang} chatType={chatType} />}
        {page === "upgrade-requests" && <SupportUpgradeRequestsPage setPage={setPage} />}
        {(page === "admin-support" || page === "adminSupport") && <AdminSupportPage setPage={setPage} />}
        {page === "admin-notifications" && <AdminNotificationsPage setPage={setPage} />}
        {page === "admin-upgrade-requests" && <AdminUpgradeRequestsPage setPage={setPage} />}
        {page === "favorites" && <FavoritesPage lang={lang} setPage={setPage} user={user} />}
        {page === "events" && <EventsPage lang={lang} />}
        {page === "guides" && <GuidesPage lang={lang} user={user} setPage={setPage} />}
        {page === "emergency" && <EmergencyPage setPage={setPage} user={user} />}
        {page === "guideDashboard" && (isGuide ? <GuideDashboard lang={lang} guide={user} setPage={setPage} user={user} setUserPrograms={setUserPrograms} onProgramAdded={handleProgramAdded} /> : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-24 h-24 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold">{lang === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
              <button onClick={() => setPage('profile')} className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg">{lang === 'ar' ? 'العودة للملف الشخصي' : 'Back'}</button>
            </div>
          </div>
        ))}
        {page === "profile" && <ProfilePage lang={lang} user={user} setPage={setPage} setShowLogin={setShowLogin} onLogout={handleLogout} onUpdateUser={handleUserUpdate} />}
        {page === "settings" && <SettingsPage lang={lang} dark={dark} setDark={toggleDarkMode} setLang={setLang} setPage={setPage} locationEnabled={locationEnabled} setLocationEnabled={setLocationEnabled} isTestMode={isTestMode} onToggleTestMode={toggleTestMode} onLogout={handleLogout} />}
      </div>
      
      {/* ✅ تمرير setShowLogin إلى BottomNav كي يتم فتح تسجيل الدخول إذا لم يكن المستخدم مسجلاً */}
      <BottomNav 
        current={page} 
        setCurrent={setPage} 
        lang={lang} 
        user={user} 
        unreadCount={unreadCount + guideUnreadCount}
        setShowLogin={setShowLogin}
      />
      
      {showLogin && <LoginPage lang={lang} onLoginSuccess={handleLoginSuccess} />}
    </div>
  );
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  return showLanding ? (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-500 to-emerald-600 text-white p-4 text-center">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="mb-8">
        <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><MapPin size={80} /></div>
      </motion.div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-4xl font-bold mb-4">السائح</motion.h1>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-lg mb-8 max-w-md">دليلك الذكي لاكتشاف أجمل الوجهات السياحية</motion.p>
      <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} onClick={() => setShowLanding(false)} className="px-8 py-3 bg-white text-green-700 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-100 transition transform hover:scale-105">ابدأ الرحلة</motion.button>
    </div>
  ) : (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <WalletProvider>
            <TouristAppPrototype />
          </WalletProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

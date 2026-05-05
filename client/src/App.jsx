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
function BottomNav({ current, setCurrent, lang, user, unreadCount = 0 }) {
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
  const getProfileIcon = () => <User size={24} className="mb-1" />;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* تم إزالة شريط المسؤول من هنا - أصبح في الأعلى */}
      <div className="bg-white border-t border-gray-200 flex justify-around py-3 shadow-lg dark:bg-gray-800 dark:border-gray-700">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.key} onClick={() => { if (!user && item.key === 'explore') { alert(lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً للوصول للخريطة' : 'Please login first to access the map'); return; } setCurrent(item.key); }} className={`flex flex-col items-center justify-center w-16 ${current === item.key ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
              {item.key === 'profile' ? getProfileIcon() : <Icon size={24} className="mb-1" />}
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

// ===================== 🗺️ Explore/Map Page (نسخة متكاملة مع الصور المتعددة، الدردشة، الحجز، إرشادات السلامة) =====================
function ExplorePage({ lang, mapContainerRef, setPage, transport, setTransport, user, unreadCount, dark }) {
  const t = (k) => LOCALES[lang][k] || k;
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [programImages, setProgramImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [guidesMap, setGuidesMap] = useState({}); // ✅ خريطة UUID -> old_id
  
  const markersRef = useRef([]);
  const isMapLoadedRef = useRef(false);
  const API_BASE = 'https://tourist-app-api.onrender.com';

  // ✅ جلب قائمة المرشدين لتحويل UUID -> old_id
  useEffect(() => {
    const fetchGuidesList = async () => {
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
        console.log('✅ Guides map (UUID -> old_id):', map);
      } catch (err) {
        console.error('Failed to fetch guides list:', err);
      }
    };
    fetchGuidesList();
  }, []);

  // ✅ جلب البرامج من API (جميع البرامج النشطة)
  const fetchProgramsFromAPI = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/programs`);
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.programs)) {
        const progs = data.programs
          .filter(p => p.status === 'active')
          .map(p => ({
            id: p.id,
            name_ar: p.name,
            name_en: p.name,
            guide_name: p.guide_name,
            guide_id: p.guide_id,
            guide_uuid: p.guide_id, // قد يكون UUID
            coords: [p.location_lng, p.location_lat],
            price: p.price,
            duration: p.duration,
            rating: p.rating || 4.5,
            location_name: p.location,
            description: p.description,
            image: p.image ? (p.image.startsWith('http') ? p.image : `${API_BASE}${p.image}`) : null,
            images: p.images || [], // ✅ الصور المتعددة
            safetyGuidelines: p.safetyGuidelines || "", // ✅ إرشادات السلامة
          }));
        setPrograms(progs);
        console.log(`📦 Loaded ${progs.length} real programs from API`);
      } else {
        console.warn('API returned no programs');
        setPrograms([]);
      }
    } catch (err) {
      console.error('Failed to fetch programs from API', err);
      setPrograms([]);
    }
  }, []);

  // تحميل البرامج عند بدء التشغيل وكل 30 ثانية
  useEffect(() => {
    fetchProgramsFromAPI();
    const interval = setInterval(fetchProgramsFromAPI, 30000);
    return () => clearInterval(interval);
  }, [fetchProgramsFromAPI]);

  // ✅ جلب الصور الإضافية للبرنامج المحدد (إذا لم تكن موجودة في كائن البرنامج)
  const fetchProgramImages = useCallback(async (program) => {
    if (!program) return;
    setLoadingImages(true);
    console.log(`🖼️ Fetching images for program ${program.id}`);
    try {
      // إذا كان البرنامج يحتوي على صور متعددة في الكائن نفسه، استخدمها مباشرة
      if (program.images && program.images.length > 0) {
        const images = program.images.map(img => img.url.startsWith('http') ? img.url : `${API_BASE}${img.url}`);
        setProgramImages(images);
        const primaryIndex = program.images.findIndex(img => img.is_primary);
        setCurrentImageIndex(primaryIndex !== -1 ? primaryIndex : 0);
        console.log(`✅ Using ${images.length} images from program object`);
        setLoadingImages(false);
        return;
      }
      // خلاف ذلك، حاول جلبها من API
      const response = await api.getProgramImages(program.id);
      if (response.success && Array.isArray(response.images) && response.images.length > 0) {
        const images = response.images.map(img => img.image_url.startsWith('http') ? img.image_url : `${API_BASE}${img.image_url}`);
        setProgramImages(images);
        const primaryIndex = response.images.findIndex(img => img.is_primary);
        setCurrentImageIndex(primaryIndex !== -1 ? primaryIndex : 0);
        console.log(`✅ Loaded ${images.length} images from API for program ${program.id}`);
      } else if (program.image) {
        setProgramImages([program.image]);
        setCurrentImageIndex(0);
        console.log(`✅ Using single image for program ${program.id}`);
      } else {
        console.log(`⚠️ No images for program ${program.id}`);
        setProgramImages([]);
      }
    } catch (err) {
      console.error(`❌ Error fetching images for program ${program.id}:`, err);
      setProgramImages([]);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // ✅ طلب حجز البرنامج (إنشاء تذكرة دعم)
  const handleBooking = async (program) => {
    if (!user) {
      alert('يجب تسجيل الدخول أولاً');
      return;
    }
    setBookingLoading(true);
    try {
      const ticketData = {
        user_id: user.id,
        subject: `طلب حجز برنامج: ${program.name_ar || program.name}`,
        type: 'booking',
        priority: 'normal',
        message: `أود حجز البرنامج السياحي "${program.name_ar || program.name}" الذي يقدمه المرشد ${program.guide_name}.`
      };
      const response = await api.createSupportTicket(ticketData);
      if (response.success) {
        alert(t('requestSent'));
        // تحويل guide_id إلى رقم صحيح (old_id) إذا كان UUID
        let numericGuideId = program.guide_id;
        if (isNaN(Number(program.guide_id)) && guidesMap[program.guide_id]) {
          numericGuideId = guidesMap[program.guide_id];
        } else if (!isNaN(Number(program.guide_id))) {
          numericGuideId = Number(program.guide_id);
        }
        if (numericGuideId && !isNaN(numericGuideId)) {
          try {
            await api.createConversation(numericGuideId, 'booking', program.id);
          } catch (convErr) {
            console.warn("Could not create conversation:", convErr);
          }
        }
      } else {
        alert('فشل إرسال طلب الحجز، حاول مرة أخرى');
      }
    } catch (err) {
      console.error('Booking error:', err);
      alert('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setBookingLoading(false);
    }
  };

  // ✅ الدالة المعدلة لبدء المحادثة المباشرة مع المرشد (تستخدم old_id)
  const handleChatWithGuide = (guideId, guideName) => {
    if (!user) {
      alert(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      setPage('profile');
      return;
    }

    if (!guideId) {
      console.error('Guide ID is missing');
      alert(lang === 'ar' ? 'معرف المرشد غير موجود' : 'Guide ID missing');
      return;
    }

    // ✅ تحويل guideId إلى رقم صحيح (old_id) إذا كان UUID
    let numericGuideId = guideId;
    if (isNaN(Number(guideId)) && guidesMap[guideId]) {
      numericGuideId = guidesMap[guideId];
    } else if (!isNaN(Number(guideId))) {
      numericGuideId = Number(guideId);
    }

    if (!numericGuideId || isNaN(numericGuideId)) {
      alert(lang === 'ar' ? 'معرف المرشد غير صالح' : 'Invalid guide ID');
      return;
    }

    const chatParams = {
      recipientId: numericGuideId,
      recipientName: guideName || 'المرشد',
      timestamp: Date.now()
    };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    console.log('✅ Saved chat params to localStorage:', chatParams);

    setPage('directChat');
  };

  const allPrograms = programs;
  const displayedPrograms = showMyProgramsOnly
    ? allPrograms.filter(p => p.guide_id === user?.id)
    : allPrograms;
  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  // ✅ إضافة العلامات (مع إضافة إرشادات السلامة في النافذة المنبثقة)
  const addMarkersToMap = useCallback((map, programsList, currentLang) => {
    if (!map || !isMapLoadedRef.current) {
      console.warn('⚠️ Map not ready');
      return false;
    }
    markersRef.current.forEach(m => { try { m.remove(); } catch(e) {} });
    markersRef.current = [];

    const validPrograms = programsList.filter(p => {
      const coords = p.coords || (p.location_lng && p.location_lat ? [p.location_lng, p.location_lat] : null);
      return coords && coords[0] && coords[1] && !isNaN(coords[0]) && !isNaN(coords[1]);
    });
    console.log(`🗺️ Adding ${validPrograms.length} markers`);

    validPrograms.forEach(program => {
      const coords = program.coords || [program.location_lng, program.location_lat];
      const color = program.guide_id === user?.id ? "#9b59b6" : "#10b981";
      const safetyIcon = program.safetyGuidelines ? '⚠️' : '';
      const popupHTML = `
        <div style="text-align:${currentLang === "ar" ? "right" : "left"}; padding:12px; min-width:220px; direction:${currentLang === "ar" ? "rtl" : "ltr"};">
          <strong>${program.name_ar || program.name}</strong> ${safetyIcon}<br/>
          👤 ${program.guide_name || "مرشد سياحي"}<br/>
          💰 ${program.price} ${currentLang === "ar" ? "ريال" : "SAR"}<br/>
          ⏱️ ${program.duration || "غير محدد"}<br/>
          ⭐ ${program.rating || 4.5}<br/>
          <button onclick="window.selectProgram(${program.id})" style="margin-top:8px; background:#10b981; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">📍 عرض التفاصيل</button>
        </div>
      `;
      const marker = new mapboxgl.Marker({ color, scale: 1.1 })
        .setLngLat(coords)
        .setPopup(new mapboxgl.Popup({ closeButton: false }).setHTML(popupHTML))
        .addTo(map);
      marker.getElement().addEventListener('click', () => {
        console.log("🟢 Marker clicked for program:", program.id);
        setSelectedProgram(program);
        fetchProgramImages(program);
        if (mapInstance && program.coords)
          mapInstance.flyTo({ center: program.coords, zoom: 14 });
      });
      markersRef.current.push(marker);
    });
    console.log('✅ Markers added');
    return true;
  }, [user?.id, fetchProgramImages, mapInstance]);

  const addUserMarker = (map, location) => {
    if (!map || !location) return;
    new mapboxgl.Marker({ color: "#3b82f6" })
      .setLngLat(location)
      .setPopup(new mapboxgl.Popup().setText(lang === "ar" ? "📍 موقعك" : "📍 Your location"))
      .addTo(map);
  };

  // ✅ تهيئة الخريطة
  useEffect(() => {
    if (!mapContainerRef?.current) return;
    if (mapInstance) return;

    const initMap = (center, zoom = 12) => {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
        center,
        zoom,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.on('load', () => {
        console.log('🗺️ Map loaded');
        isMapLoadedRef.current = true;
        setMapInstance(map);
        if (map.setLanguage) map.setLanguage(lang);
        if (userLocation) addUserMarker(map, userLocation);
        if (displayedPrograms.length) {
          addMarkersToMap(map, displayedPrograms, lang);
        }
      });
      return map;
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setUserLocation(coords);
          initMap(coords, 13);
        },
        () => initMap([46.713, 24.774], 10)
      );
    } else {
      initMap([46.713, 24.774], 10);
    }
  }, [mapContainerRef]);

  // ✅ تحديث العلامات عند تغيير البرامج أو اللغة
  useEffect(() => {
    if (mapInstance && isMapLoadedRef.current) {
      addMarkersToMap(mapInstance, displayedPrograms, lang);
    }
  }, [displayedPrograms, mapInstance, lang, addMarkersToMap]);

  // تأثير الوضع الليلي
  useEffect(() => {
    if (!mapInstance || !isMapLoadedRef.current) return;
    const newStyle = dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12";
    if (mapInstance.getStyle().sprite === newStyle) return;
    mapInstance.setStyle(newStyle);
    mapInstance.once('style.load', () => {
      addMarkersToMap(mapInstance, displayedPrograms, lang);
      if (userLocation) addUserMarker(mapInstance, userLocation);
    });
  }, [dark, mapInstance, displayedPrograms, lang, userLocation, addMarkersToMap]);

  // تأثير اللغة
  useEffect(() => {
    if (mapInstance && isMapLoadedRef.current && mapInstance.setLanguage) {
      mapInstance.setLanguage(lang);
    }
  }, [lang, mapInstance]);

  // ربط اختيار البرنامج من خلال النافذة المنبثقة
  useEffect(() => {
    window.selectProgram = (id) => {
      console.log("🔍 window.selectProgram called with id:", id);
      const prog = displayedPrograms.find(p => p.id === id);
      if (prog) {
        setSelectedProgram(prog);
        fetchProgramImages(prog);
        const coords = prog.coords || [prog.location_lng, prog.location_lat];
        if (mapInstance && coords) mapInstance.flyTo({ center: coords, zoom: 14 });
      } else {
        console.warn(`Program with id ${id} not found in displayedPrograms`);
      }
    };
    return () => delete window.selectProgram;
  }, [displayedPrograms, mapInstance, fetchProgramImages]);

  const requestProgram = (program) => {
    alert(lang === 'ar' ? `✅ تم إرسال طلب المشاركة في "${program.name_ar || program.name}"` : `✅ Request sent for "${program.name}"`);
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <MapPin className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">الخريطة للأعضاء فقط</h2>
          <button onClick={() => setPage('profile')} className="bg-green-600 text-white px-6 py-2 rounded-lg">تسجيل الدخول</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative flex flex-col">
      {/* الشريط العلوي */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center ml-2">
              {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full" alt="avatar" /> : <User size={20} />}
            </div>
            <div>
              <h1 className="font-bold">{user.name}</h1>
              <p className="text-xs"><MapPin size={12} className="inline ml-1" /> استكشف البرامج</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPage('home')} className="p-2 bg-white/20 rounded-full"><Home size={18} /></button>
            <button onClick={() => setPage('notifications')} className="relative p-2 bg-white/20 rounded-full">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
          <input type="text" placeholder={t('search')} className="w-full p-2 pr-9 rounded-lg bg-white/20 text-white" />
        </div>
        <div className="flex justify-between mt-3 text-xs">
          <span>📌 {displayedPrograms.length} برنامج</span>
          {isGuide && (
            <button onClick={() => setShowMyProgramsOnly(!showMyProgramsOnly)} className={`px-2 py-1 rounded ${showMyProgramsOnly ? 'bg-yellow-500' : 'bg-white/20'}`}>
              {showMyProgramsOnly ? '📌 برامجي فقط' : '🌍 كل البرامج'}
            </button>
          )}
        </div>
      </div>

      {/* الخريطة */}
      <div ref={mapContainerRef} className="flex-1 w-full min-h-0" />

      {/* نافذة تفاصيل البرنامج - مع عرض الصور وإرشادات السلامة */}
      {selectedProgram && (
        <div className="absolute bottom-20 left-4 right-4 z-20 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border-2 border-green-500 max-h-[70vh] overflow-y-auto">
          {/* معرض الصور */}
          {loadingImages ? (
            <div className="mb-3 flex justify-center items-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
          ) : programImages.length > 0 ? (
            <div className="mb-3">
              <div className="relative">
                <img src={programImages[currentImageIndex]} alt={selectedProgram.name_ar || selectedProgram.name} className="w-full h-48 object-cover rounded-lg cursor-pointer" onClick={() => setShowGallery(true)} onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found'; }} />
                {programImages.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">❮</button>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">❯</button>
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">{currentImageIndex + 1} / {programImages.length}</div>
                  </>
                )}
              </div>
            </div>
          ) : selectedProgram.image ? (
            <div className="mb-3 flex justify-center"><img src={selectedProgram.image} alt={selectedProgram.name} className="w-full h-48 object-cover rounded-lg" onError={(e) => { e.target.style.display = 'none'; }} /></div>
          ) : null}

          {/* معلومات البرنامج */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">{selectedProgram.name_ar || selectedProgram.name}</h3>
              <p className="text-sm text-gray-600">المرشد: {selectedProgram.guide_name}</p>
              <div className="flex gap-3 mt-2 text-sm">
                <span className="text-green-600 font-bold">{selectedProgram.price} ريال</span>
                <span>{selectedProgram.duration}</span>
                <span>⭐ {selectedProgram.rating || 4.5}</span>
              </div>
              {selectedProgram.description && <p className="text-sm text-gray-500 mt-2">{selectedProgram.description}</p>}
              
              {/* ✅ عرض إرشادات السلامة */}
              {selectedProgram.safetyGuidelines && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-r-4 border-orange-500">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">إرشادات السلامة</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{selectedProgram.safetyGuidelines}</p>
                </div>
              )}
            </div>
            <button onClick={() => { setSelectedProgram(null); setProgramImages([]); }} className="text-gray-500">✕</button>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-wrap gap-2 mt-3">
            <select value={transport} onChange={(e) => setTransport(e.target.value)} className="border rounded p-1 text-sm">
              <option value="driving">🚗 {t('driving')}</option>
              <option value="walking">🚶 {t('walking')}</option>
              <option value="cycling">🚲 {t('cycling')}</option>
            </select>
            
            <button
              onClick={() => handleChatWithGuide(selectedProgram.guide_id, selectedProgram.guide_name)}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700"
            >
              <MessageCircle size={16} />
              <span>{t('chatWithGuide')}</span>
            </button>
            
            <button
              onClick={() => handleBooking(selectedProgram)}
              disabled={bookingLoading}
              className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50"
            >
              <CalendarCheck size={16} />
              <span>{t('bookNow')}</span>
            </button>
            
            <button onClick={() => requestProgram(selectedProgram)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">
              ✉️ {lang === "ar" ? "طلب مشاركة" : "Request to Join"}
            </button>
          </div>
        </div>
      )}

      {/* معرض كامل الشاشة */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <div className="relative max-w-4xl max-h-screen p-4">
            <img src={programImages[currentImageIndex]} className="max-w-full max-h-screen object-contain" alt="Gallery" onError={(e) => { e.target.src = 'https://via.placeholder.com/800x600?text=Image+Error'; }} />
            {programImages.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70">❮</button>
                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70">❯</button>
              </>
            )}
            <button onClick={() => setShowGallery(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">✕</button>
          </div>
        </div>
      )}
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

// ===================== 👤 Profile Page (المُصلحة بالكامل) =====================
function ProfilePage({ lang, user, setPage, setShowLogin, onLogout, onUpdateUser }) {
  const [userData, setUserData] = useState(user || null);
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileContent, setShowProfileContent] = useState(false);
  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState('idle');
  const [tempPhone, setTempPhone] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (user) {
      setUserData(user);
      setEditData({ fullName: user.fullName || '', phone: user.phone || '' });
      let avatarUrl = user.avatar;
      if (avatarUrl && !avatarUrl.startsWith('http')) avatarUrl = `${API_BASE_URL}${avatarUrl}`;
      setAvatarPreview(avatarUrl);
    }
  }, [user]);

  useEffect(() => { if (userData) localStorage.setItem('user', JSON.stringify(userData)); }, [userData]);

  useEffect(() => { if (countdown > 0) { const timer = setTimeout(() => setCountdown(countdown - 1), 1000); return () => clearTimeout(timer); } }, [countdown]);

  const handleEditToggle = () => { setIsEditing(!isEditing); setShowVerificationInput(false); setPhoneVerificationStep('idle'); };
  useEffect(() => { if (!isEditing && userData) setEditData({ fullName: userData.fullName || '', phone: userData.phone || '' }); }, [isEditing, userData]);
  const handleInputChange = (e) => { const { name, value } = e.target; setEditData(prev => ({ ...prev, [name]: value })); };

  const handleVerifyPhone = async () => {
    const phoneNumber = editData.phone;
    if (!phoneNumber || phoneNumber === 'غير مضاف') { alert(lang === 'ar' ? '❌ الرجاء إدخال رقم الجوال أولاً' : '❌ Please enter your phone number first'); return; }
    const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
    if (!saudiPhoneRegex.test(phoneNumber.replace(/\s/g, ''))) { alert(lang === 'ar' ? '❌ رقم الجوال غير صحيح' : '❌ Invalid phone number'); return; }
    setPhoneVerificationStep('sending'); setTempPhone(phoneNumber);
    try {
      const response = await api.sendPhoneVerification(userData.id, phoneNumber);
      if (response.success) { setPhoneVerificationStep('sent'); setShowVerificationInput(true); setCountdown(60); alert(lang === 'ar' ? `📱 تم إرسال رمز التحقق إلى ${phoneNumber}` : `📱 Verification code sent to ${phoneNumber}`); }
      else { setPhoneVerificationStep('idle'); alert(lang === 'ar' ? '❌ فشل إرسال الرمز' : '❌ Failed to send code'); }
    } catch (error) { console.error(error); setPhoneVerificationStep('idle'); alert(lang === 'ar' ? '❌ خطأ في الاتصال' : '❌ Connection error'); }
  };
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 4) { alert(lang === 'ar' ? '❌ الرجاء إدخال الرمز' : '❌ Please enter code'); return; }
    setPhoneVerificationStep('verifying');
    try {
      const response = await api.verifyPhoneCode(userData.id, tempPhone, verificationCode);
      if (response.success) {
        const updatedUser = { ...userData, phone: tempPhone, phoneVerified: true };
        setUserData(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        setEditData(prev => ({ ...prev, phone: tempPhone }));
        setPhoneVerificationStep('verified'); setShowVerificationInput(false);
        alert(lang === 'ar' ? '✅ تم التحقق بنجاح' : '✅ Verified successfully');
      } else { setPhoneVerificationStep('sent'); alert(lang === 'ar' ? '❌ رمز غير صحيح' : '❌ Invalid code'); }
    } catch (error) { console.error(error); setPhoneVerificationStep('sent'); alert(lang === 'ar' ? '❌ خطأ في التحقق' : '❌ Verification error'); }
  };
  const handleResendCode = () => { if (countdown > 0) return; handleVerifyPhone(); };
  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      const response = await api.updateUserProfile(userData.id, { fullName: editData.fullName });
      if (response.success) {
        const updatedUser = { ...userData, fullName: editData.fullName };
        setUserData(updatedUser);
        if (onUpdateUser) onUpdateUser(updatedUser);
        setIsEditing(false);
        alert(lang === 'ar' ? '✅ تم تحديث الاسم' : '✅ Name updated');
      }
    } catch (error) { console.error(error); alert(lang === 'ar' ? '❌ فشل التحديث' : '❌ Update failed'); } finally { setSaveLoading(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert(lang === 'ar' ? '⚠️ حجم الصورة كبير جداً (حد أقصى 2 ميجابايت)' : '⚠️ Image too large (max 2MB)'); e.target.value = ''; return; }
    if (!file.type.startsWith('image/')) { alert(lang === 'ar' ? '⚠️ الرجاء اختيار صورة' : '⚠️ Please select an image'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (event) => setAvatarPreview(event.target.result);
    reader.readAsDataURL(file);
    const formData = new FormData(); formData.append('avatar', file);
    setLoading(true);
    try {
      const response = await api.uploadAvatar(userData.id, formData);
      if (response.success && response.avatarUrl) {
        let fullUrl = response.avatarUrl;
        if (!fullUrl.startsWith('http')) fullUrl = `https://tourist-app-api.onrender.com${fullUrl}`;
        const updatedUser = { ...userData, avatar: fullUrl };
        setUserData(updatedUser); setAvatarPreview(fullUrl);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? '✅ تم تحديث الصورة' : '✅ Picture updated');
      } else throw new Error(response.message || 'Upload failed');
    } catch (error) { console.error(error); alert(lang === 'ar' ? '❌ فشل رفع الصورة' : '❌ Upload failed'); setAvatarPreview(userData?.avatar || null); } finally { setLoading(false); e.target.value = ''; }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من حذف الصورة؟' : '⚠️ Delete picture?')) return;
    setLoading(true);
    try {
      const response = await api.deleteAvatar(userData.id);
      if (response.success) {
        const updatedUser = { ...userData, avatar: null };
        setUserData(updatedUser); setAvatarPreview(null);
        if (onUpdateUser) onUpdateUser(updatedUser);
        alert(lang === 'ar' ? '✅ تم حذف الصورة' : '✅ Picture deleted');
      }
    } catch (error) { console.error(error); alert(lang === 'ar' ? '❌ فشل الحذف' : '❌ Delete failed'); } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('user'); localStorage.removeItem('token'); localStorage.removeItem('userType');
    setUserData(null);
    if (onLogout) onLogout();
    setPage('home');
  };
  const toggleProfileContent = () => setShowProfileContent(!showProfileContent);
  const navigateToSettings = () => setPage('settings');
  const navigateToNotifications = () => setPage('notifications');
  const navigateToMyTrips = () => alert(lang === 'ar' ? '📅 صفحة رحلاتي - قيد التطوير' : '📅 My Trips - Coming soon');

  const renderProfileContent = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-4">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 flex items-center justify-between"><h3 className="text-white font-bold text-lg">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</h3><button onClick={toggleProfileContent} className="text-white/80 hover:text-white">✕</button></div>
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-gray-800 shadow-md overflow-hidden">
              {avatarPreview ? <img src={avatarPreview} alt={userData.fullName} className="w-full h-full object-cover" /> : (userData.fullName?.charAt(0) || 'U')}
            </div>
            <button onClick={() => document.getElementById('avatar-upload').click()} className="absolute -bottom-1 -right-1 bg-green-600 text-white p-1.5 rounded-full hover:bg-green-700 transition shadow-md" disabled={loading}><Camera size={14} /></button>
            {avatarPreview && <button onClick={handleDeleteAvatar} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition shadow-md w-6 h-6 flex items-center justify-center text-xs" disabled={loading}>✕</button>}
            <input type="file" id="avatar-upload" className="hidden" accept="image/jpeg,image/png,image/jpg,image/gif,image/webp" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1"><h4 className="text-lg font-bold text-gray-800 dark:text-white">{userData.fullName}</h4><p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'عضو منذ ' : 'Member since '}{new Date(userData.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</p></div>
        </div>
        {loading && <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center"><div className="inline-flex items-center gap-2 text-blue-600"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div><span>{lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}</span></div></div>}
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Mail size={16} className="text-green-600 dark:text-green-400" /></div><div className="flex-1"><p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p><p className="text-sm font-medium text-gray-800 dark:text-white">{userData.email}</p></div></div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Phone size={16} className="text-green-600 dark:text-green-400" /></div><div className="flex-1"><p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'رقم الجوال' : 'Phone'}</p><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-800 dark:text-white">{userData.phone || (lang === 'ar' ? 'غير مضاف' : 'Not added')}</p>{userData.phone && userData.phoneVerified && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ {lang === 'ar' ? 'موثق' : 'Verified'}</span>}</div></div></div>
        </div>
        <button onClick={handleEditToggle} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-medium"><Edit2 size={18} />{isEditing ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile')}</button>
        {isEditing && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3 border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? 'تعديل البيانات' : 'Edit Data'}</h4>
            <input type="text" name="fullName" value={editData.fullName} onChange={handleInputChange} placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500" />
            <div className="space-y-2">
              <div className="flex gap-2"><input type="tel" name="phone" value={editData.phone} onChange={handleInputChange} placeholder={lang === 'ar' ? 'رقم الجوال (05xxxxxxxx)' : 'Phone (05xxxxxxxx)'} className="flex-1 p-3 border rounded-lg dark:bg-gray-700 dark:text-white" dir="ltr" />{editData.phone && editData.phone !== userData.phone && <button onClick={handleVerifyPhone} disabled={phoneVerificationStep === 'sending' || phoneVerificationStep === 'verifying'} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">{phoneVerificationStep === 'sending' ? (lang === 'ar' ? 'جاري...' : 'Sending...') : (lang === 'ar' ? 'تحقق' : 'Verify')}</button>}</div>
              {showVerificationInput && <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? `تم إرسال الرمز إلى ${tempPhone}` : `Code sent to ${tempPhone}`}</p><div className="flex gap-2"><input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder={lang === 'ar' ? 'أدخل الرمز' : 'Enter code'} className="flex-1 p-2 border rounded-lg text-center" maxLength="6" /><button onClick={handleVerifyCode} disabled={phoneVerificationStep === 'verifying'} className="px-4 py-2 bg-green-600 text-white rounded-lg">{phoneVerificationStep === 'verifying' ? '...' : (lang === 'ar' ? 'تأكيد' : 'Confirm')}</button></div><div className="mt-2 text-center"><button onClick={handleResendCode} disabled={countdown > 0} className="text-sm text-blue-600 hover:underline disabled:text-gray-400">{countdown > 0 ? (lang === 'ar' ? `إعادة الإرسال بعد ${countdown} ث` : `Resend in ${countdown}s`) : (lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}</button></div></div>}
            </div>
            <button onClick={handleSaveProfile} disabled={saveLoading} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">{saveLoading ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الاسم' : 'Save Name')}</button>
          </div>
        )}
      </div>
    </div>
  );

  if (!userData) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white"><div className="flex items-center mb-4"><div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center ml-4"><User size={32} /></div><div><h1 className="text-xl font-bold">{lang === 'ar' ? 'زائر' : 'Guest'}</h1><p className="text-white/80">{lang === 'ar' ? 'مستكشف' : 'Explorer'}</p></div></div></div>
        <div className="p-4"><button onClick={() => setShowLogin(true)} className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">{lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</button></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-6 text-white"><h1 className="text-2xl font-bold">{lang === 'ar' ? `مرحباً، ${userData.fullName?.split(' ')[0]}` : `Welcome, ${userData.fullName?.split(' ')[0]}`}</h1><p className="text-white/80 mt-1">{lang === 'ar' ? 'استعرض وأدر حسابك من هنا' : 'View and manage your account'}</p></div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button onClick={toggleProfileContent} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105 ${showProfileContent ? 'ring-2 ring-green-500' : ''}`}><div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"><User size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</span></button>
          <button onClick={navigateToMyTrips} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center"><Package size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'رحلاتي' : 'My Trips'}</span></button>
          <button onClick={navigateToNotifications} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center"><Bell size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span></button>
          <button onClick={navigateToSettings} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex flex-col items-center gap-2 hover:scale-105"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center"><Settings size={24} className="text-white" /></div><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</span></button>
        </div>
        {showProfileContent && renderProfileContent()}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md mb-4"><h3 className="font-bold text-gray-800 dark:text-white mb-3">{lang === 'ar' ? 'المساعدة والدعم' : 'Help & Support'}</h3><div className="space-y-2"><button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"><span className="text-gray-700 dark:text-gray-300 flex items-center gap-3"><FileText size={18} className="text-purple-600" />{lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</span><span className="text-gray-400">‹</span></button></div></div>
        <button onClick={handleLogout} className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-2"><LogOut size={18} />{lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</button>
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
// ===================== 📱 Main App Component (المعدل نهائياً - رفع المحتوى للأعلى) =====================
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
        {page === "explore" && <ExplorePage lang={lang} mapContainerRef={mapContainerRef} setPage={setPage} transport={transport} setTransport={setTransport} user={user} programs={userPrograms} setPrograms={setUserPrograms} unreadCount={unreadCount} refreshTrigger={refreshMap} dark={dark} />}
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
        {page === "favorites" && <FavoritesPage lang={lang} />}
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
      
      <BottomNav current={page} setCurrent={setPage} lang={lang} user={user} unreadCount={unreadCount + guideUnreadCount} />
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

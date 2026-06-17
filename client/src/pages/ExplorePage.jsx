// client/src/pages/ExplorePage.jsx
// ✅ منع المستخدم من حجز برنامجه الخاص + منع تكرار الحجز لنفس البرنامج
// ✅ إرسال طلبات الحجز كنوع 'general' مع metadata.is_booking=true لضمان وصولها للمرشد
// ✅ تحسين عرض الخريطة للأجهزة الصغيرة (الجوال)
// ✅ إزالة التنبيهات والرسائل المنبثقة من الخريطة
// ✅ زيادة مسافة عرض البرامج السياحية إلى 245 كم
// ✅ رفع مستوى عرض البرامج عند الضغط عليها لتظهر البيانات كاملة
// ✅ تحسين حفظ واسترجاع صور البرامج السياحية
// ✅ إصلاح أزرار التنقل بين الصور - إضافة key و crossOrigin وإعادة تحميل الصورة
// ✅ تصفية الصور غير الصالحة (404) وحذفها من cache تلقائياً
// ✅ توحيد مفتاح cache للصور مع GuideDashboard لضمان ظهور الصور في الخريطة
// ✅ عرض أزرار التنقل عند وجود أكثر من صورة واحدة

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  Home, Bell, User, MapPin, Search, MessageCircle, 
  CalendarCheck, AlertTriangle, Heart, X, Star, Image as ImageIcon, Navigation, Crosshair, MousePointer, Map as MapIcon
} from "lucide-react";
import toast from "react-hot-toast";
import { FaBoxOpen, FaSpinner } from 'react-icons/fa';

// إصلاح أيقونات Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ✅ إخفاء جميع عناصر التحكم والتنبيهات في الخريطة
const style = document.createElement('style');
style.textContent = `
  .leaflet-control-attribution { display: none !important; }
  .leaflet-bottom, .leaflet-control { display: none !important; }
  .leaflet-popup-tip-container { display: none !important; }
  .leaflet-popup-close-button { display: none !important; }
  .leaflet-tile-pane { filter: none !important; }
  .leaflet-container { 
    background: #f0f0f0 !important;
    touch-action: pan-x pan-y !important;
  }
  .leaflet-container:focus { outline: none !important; }
  
  /* ✅ تحسين عرض الخريطة للجوال */
  @media (max-width: 768px) {
    .leaflet-container {
      touch-action: auto !important;
    }
    .leaflet-marker-icon {
      transition: transform 0.2s ease !important;
    }
    .leaflet-marker-icon:active {
      transform: scale(1.1) !important;
    }
  }
`;
document.head.appendChild(style);

const API_BASE = "https://tourist-app-api.onrender.com";

// ✅ زيادة المسافة لعرض البرامج السياحية إلى 245 كيلومتر
const NEARBY_RADIUS = 245;
const LOCAL_BOOKINGS_KEY = (userId) => `local_bookings_${userId}`;
const BOOKED_PROGRAMS_KEY = (userId) => `booked_programs_${userId}`;

// ✅ توحيد مفتاح تخزين الصور مع GuideDashboard
const PROGRAM_IMAGES_KEY = (programId) => `program_images_${programId}`;
const PROGRAM_IMAGES_CACHE_KEY = 'guide_programs_images_cache'; // نفس المفتاح المستخدم في GuideDashboard

// ⏱️ مهلة تحديد الموقع (بالمللي ثانية)
const LOCATION_TIMEOUT = 15000;
// 📍 الحد الأدنى لدقة الموقع المقبولة (بالمتر) - تم رفع الحد للجوال
const MIN_ACCURACY_THRESHOLD = 200;
// 🔄 عدد مرات إعادة المحاولة
const MAX_RETRY_ATTEMPTS = 3;

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

// ✅ دالة للتحقق من صحة الصورة (تجنب 404)
const validateImage = async (url) => {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// ✅ دالة لتصفية الصور الصالحة فقط
const filterValidImages = async (images) => {
  if (!images || images.length === 0) return [];
  const valid = [];
  for (const img of images) {
    const url = buildImageUrl(img);
    if (!url) continue;
    const isValid = await validateImage(url);
    if (isValid) {
      valid.push(url);
    } else {
      console.warn(`⚠️ صورة غير صالحة: ${url}`);
    }
  }
  return valid;
};

// ✅ دالة لحفظ صور البرنامج في localStorage (بعد التحقق من الصحة)
const saveProgramImages = async (programId, images) => {
  try {
    if (!programId) return;
    // تصفية الصور الصالحة
    const validImages = await filterValidImages(images);
    if (validImages.length === 0) {
      // إذا لم تكن هناك صور صالحة، نمسح المفتاح
      const key = PROGRAM_IMAGES_KEY(programId);
      localStorage.removeItem(key);
      const cache = JSON.parse(localStorage.getItem(PROGRAM_IMAGES_CACHE_KEY) || '{}');
      delete cache[programId];
      localStorage.setItem(PROGRAM_IMAGES_CACHE_KEY, JSON.stringify(cache));
      console.log(`🗑️ No valid images for program ${programId}, cache cleared`);
      return;
    }
    
    const key = PROGRAM_IMAGES_KEY(programId);
    localStorage.setItem(key, JSON.stringify(validImages));
    
    // تحديث الكاش
    const cache = JSON.parse(localStorage.getItem(PROGRAM_IMAGES_CACHE_KEY) || '{}');
    cache[programId] = {
      images: validImages,
      timestamp: Date.now()
    };
    localStorage.setItem(PROGRAM_IMAGES_CACHE_KEY, JSON.stringify(cache));
    console.log(`✅ Saved ${validImages.length} valid images for program ${programId}`);
  } catch (error) {
    console.error('Error saving program images:', error);
  }
};

// ✅ دالة لاسترجاع صور البرنامج من localStorage
const getProgramImages = (programId) => {
  try {
    if (!programId) return null;
    const key = PROGRAM_IMAGES_KEY(programId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const images = JSON.parse(saved);
      console.log(`✅ Retrieved ${images.length} images for program ${programId} from cache`);
      return images;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving program images:', error);
    return null;
  }
};

// ✅ دالة لمسح صور البرنامج من localStorage
const clearProgramImages = (programId) => {
  try {
    if (!programId) return;
    const key = PROGRAM_IMAGES_KEY(programId);
    localStorage.removeItem(key);
    
    const cache = JSON.parse(localStorage.getItem(PROGRAM_IMAGES_CACHE_KEY) || '{}');
    delete cache[programId];
    localStorage.setItem(PROGRAM_IMAGES_CACHE_KEY, JSON.stringify(cache));
    console.log(`✅ Cleared images for program ${programId}`);
  } catch (error) {
    console.error('Error clearing program images:', error);
  }
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const isValidLocation = (lat, lng) => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

const getActivityType = (program, lang) => {
  const text = ((program.name || '') + ' ' + (program.description || '')).toLowerCase();
  if (text.includes('بحر') || text.includes('بحري')) return { ar: 'رحلات بحرية', en: 'Marine trips', icon: '🌊' };
  if (text.includes('تسلق') || text.includes('جبل')) return { ar: 'تسلق جبال', en: 'Mountain climbing', icon: '⛰️' };
  if (text.includes('سفاري')) return { ar: 'رحلات سفاري', en: 'Safari trips', icon: '🦁' };
  if (text.includes('براشوت') || text.includes('مظلة')) return { ar: 'رحلات براشوت', en: 'Parachute trips', icon: '🪂' };
  return { ar: 'برنامج سياحي', en: 'Tour program', icon: '🏞️' };
};

const LOCALES = {
  ar: {
    search: "ابحث عن وجهة...",
    chatWithGuide: "💬 دردشة مع المرشد",
    bookNow: "احجز الآن",
    requestSent: "تم إرسال الطلب بنجاح",
    loginRequired: "يجب تسجيل الدخول أولاً",
    bookingFailed: "فشل إرسال الطلب",
    cannotBookOwn: "لا يمكنك حجز برنامجك الخاص",
    cannotChatOwn: "لا يمكنك فتح محادثة مع نفسك",
    safetyGuidelines: "إرشادات السلامة",
    addedToFavorites: "✅ تمت الإضافة إلى المفضلة",
    removedFromFavorites: "🗑️ تمت الإزالة من المفضلة",
    duration: "المدة",
    myLocation: "موقعي",
    locationError: "تعذر تحديد موقعك. تأكد من تفعيل GPS وحاول مرة أخرى",
    locationPermissionDenied: "🚫 الوصول إلى الموقع ممنوع. يرجى السماح من المتصفح",
    locationTimeout: "⏰ انتهت مهلة تحديد الموقع",
    usingGps: "📍 تتبع مباشر",
    usingManual: "📍 يدوي",
    enableLocation: "تفعيل الموقع",
    retryLocation: "إعادة المحاولة",
    kmAway: "كم",
    accuracyMeters: "م",
    locating: "📍 جاري تحديد موقعك...",
    locationAcquired: "✅ تم تحديد موقعك",
    invalidLocation: "الموقع المستلم غير صحيح",
    manualModeActive: "🖱️ انقر على الخريطة لتحديد موقعك يدوياً",
    manualModeOff: "🔄 العودة إلى التحديد التلقائي",
    setManualLocation: "اختر موقعي يدوياً",
    useAutoLocation: "استخدم GPS",
    manualSuccess: "✅ تم تحديد موقعك يدوياً",
    viewOnMap: "عرض على الخريطة",
    startTrip: "بدء الرحلة",
    appPayment: "الدفع عبر التطبيق",
    cashPayment: "الدفع نقداً",
    insufficientBalance: "الرصيد غير كافٍ للدفع عبر التطبيق",
    tripStartedApp: "تم خصم المبلغ وبدء الرحلة",
    tripStartedCash: "تم تأكيد الدفع وبدء الرحلة",
    startTripFailed: "فشل بدء الرحلة",
    activeBookings: "طلبات حجز جديدة",
    userBalance: "رصيد المستخدم",
    price: "ريال",
    programsNearby: "برامج سياحية ضمن 245 كم",
    allPrograms: "جميع البرامج",
    nearby: "القريبة",
    resetView: "المركز الافتراضي",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    loadingImages: "جاري تحميل الصور...",
  },
  en: {
    search: "Search...",
    chatWithGuide: "💬 Chat With Guide",
    bookNow: "Book Now",
    requestSent: "Request sent successfully",
    loginRequired: "Please login first",
    bookingFailed: "Booking failed",
    cannotBookOwn: "You cannot book your own program",
    cannotChatOwn: "You cannot chat with yourself",
    safetyGuidelines: "Safety Guidelines",
    addedToFavorites: "✅ Added to favorites",
    removedFromFavorites: "🗑️ Removed from favorites",
    duration: "Duration",
    myLocation: "My Location",
    locationError: "Could not determine your location. Please enable GPS",
    locationPermissionDenied: "🚫 Location permission denied",
    locationTimeout: "⏰ Location request timeout",
    usingGps: "📍 Live tracking",
    usingManual: "📍 Manual",
    enableLocation: "Enable location",
    retryLocation: "Retry",
    kmAway: "km",
    accuracyMeters: "m",
    locating: "📍 Locating you...",
    locationAcquired: "✅ Location acquired",
    invalidLocation: "Invalid location received",
    manualModeActive: "🖱️ Click on map to set your location",
    manualModeOff: "🔄 Back to auto location",
    setManualLocation: "Set manual location",
    useAutoLocation: "Use GPS",
    manualSuccess: "✅ Manual location set",
    viewOnMap: "View on map",
    startTrip: "Start trip",
    appPayment: "Pay via app",
    cashPayment: "Cash payment",
    insufficientBalance: "Insufficient balance for app payment",
    tripStartedApp: "Amount deducted and trip started",
    tripStartedCash: "Cash payment confirmed and trip started",
    startTripFailed: "Failed to start trip",
    activeBookings: "New booking requests",
    userBalance: "User balance",
    price: "SAR",
    programsNearby: "Tour programs within 245 km",
    allPrograms: "All programs",
    nearby: "Nearby",
    resetView: "Reset view",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    loadingImages: "Loading images...",
  },
};

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1] && map) {
      map.flyTo(center, zoom, { duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
};

// ✅ إزالة دائرة الدقة من الخريطة - تم إلغاؤها لتقليل الفوضى
const AccuracyCircle = ({ center, radius }) => {
  return null;
};

function ExplorePage({ lang = "ar", mapContainerRef, setPage, user, unreadCount, dark }) {
  const t = (key) => LOCALES[lang]?.[key] || key;

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  const [selectedProgram, setSelectedProgram] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [locationActive, setLocationActive] = useState(false);
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [programImages, setProgramImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  
  const [showOnlyNearby, setShowOnlyNearby] = useState(true);
  const [nearbyRadius] = useState(NEARBY_RADIUS);
  
  const [isLocating, setIsLocating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(5);
  const [locationStatus, setLocationStatus] = useState('idle');
  
  const watchIdRef = useRef(null);
  const retryCountRef = useRef(0);
  const leafletMapRef = useRef(null);
  const initialZoomDone = useRef(false);
  const [guidesMap, setGuidesMap] = useState({});
  const locationTimeoutRef = useRef(null);
  const isMobile = useRef(window.innerWidth < 768);
  
  // ✅ مرجع لتخزين صور البرامج محلياً
  const programImagesCache = useRef({});

  const [bookedPrograms, setBookedPrograms] = useState(() => {
    if (!user?.id) return new Set();
    const stored = localStorage.getItem(BOOKED_PROGRAMS_KEY(user.id));
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // جلب خريطة المرشدين
  useEffect(() => {
    const fetchGuidesMap = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/guides`);
        const data = await response.json();
        let guidesList = [];
        if (data && data.data && Array.isArray(data.data)) guidesList = data.data;
        else if (data && Array.isArray(data)) guidesList = data;
        else if (data && data.guides && Array.isArray(data.guides)) guidesList = data.guides;
        else if (data && data.data && data.data.guides && Array.isArray(data.data.guides)) guidesList = data.data.guides;
        
        const map = {};
        guidesList.forEach(guide => {
          const uuid = guide.id || guide.uuid;
          const numericId = guide.old_id || guide.oldId;
          const avatar = buildImageUrl(guide.avatar_url || guide.avatar);
          const fullName = guide.full_name || guide.name;
          if (uuid) {
            map[uuid] = { id: numericId ? Number(numericId) : uuid, name: fullName, avatar };
          }
          if (fullName) {
            map[fullName] = { id: numericId ? Number(numericId) : uuid, name: fullName, avatar };
          }
        });
        setGuidesMap(map);
      } catch (err) { console.error('Failed to fetch guides map:', err); }
    };
    fetchGuidesMap();
  }, []);

  // المفضلة
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`favorites_${user.id}`);
      if (saved) setFavoriteIds(JSON.parse(saved));
      else setFavoriteIds([]);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favoriteIds));
    }
  }, [favoriteIds, user]);

  const toggleFavorite = (id) => {
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    const isFav = favoriteIds.includes(id);
    const newFavs = isFav ? favoriteIds.filter(i => i !== id) : [...favoriteIds, id];
    setFavoriteIds(newFavs);
    toast.success(isFav ? t('removedFromFavorites') : t('addedToFavorites'));
  };

  // جلب البرامج
  const fetchProgramsFromAPI = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/programs`);
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.programs)) {
        const activePrograms = data.programs.filter(p => (p.status || '').toLowerCase() === 'active');
        const progs = activePrograms.map(p => {
          let guide_avatar = null;
          if (p.guide_id && guidesMap[p.guide_id]) guide_avatar = guidesMap[p.guide_id].avatar;
          else if (p.guide_name && guidesMap[p.guide_name]) guide_avatar = guidesMap[p.guide_name].avatar;
          
          // ✅ استرجاع الصور المحفوظة من localStorage
          const savedImages = getProgramImages(p.id);
          
          return {
            id: p.id,
            name: p.name,
            guide_name: p.guide_name,
            guide_id: p.guide_id,
            lat: p.location_lat,
            lng: p.location_lng,
            price: p.price,
            duration: p.duration,
            rating: p.rating || 4.5,
            location_name: p.location,
            description: p.description,
            image: buildImageUrl(p.image),
            images: savedImages || [], // ✅ استخدام الصور المحفوظة
            safetyGuidelines: p.safetyGuidelines || "",
            status: p.status,
            guide_avatar,
            hasCachedImages: !!savedImages,
          };
        }).filter(p => p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng));
        setPrograms(progs);
        console.log(`📦 Loaded ${progs.length} active programs with images cache`);
      } else {
        setPrograms([]);
      }
    } catch (err) {
      console.error('Failed to fetch programs', err);
      setPrograms([]);
    }
  }, [guidesMap]);

  // ✅ دالة محسنة لجلب صور البرنامج مع حفظ الصور الصالحة فقط
  const fetchProgramImages = useCallback(async (program) => {
    if (!program) return;
    
    // ✅ التحقق من وجود الصور في الكاش أولاً
    const cachedImages = getProgramImages(program.id);
    if (cachedImages && cachedImages.length > 0) {
      console.log(`📸 Using cached images for program ${program.id}`);
      setProgramImages(cachedImages);
      setCurrentImageIndex(0);
      // تحديث البرنامج في القائمة بالصور
      setPrograms(prev => prev.map(p => 
        p.id === program.id ? { ...p, images: cachedImages, hasCachedImages: true } : p
      ));
      return;
    }
    
    setLoadingImages(true);
    try {
      const detailRes = await fetch(`${API_BASE}/api/programs/${program.id}`);
      if (!detailRes.ok) { 
        setProgramImages([]); 
        return; 
      }
      const detailData = await detailRes.json();
      const detailProgram = detailData.program || detailData.data || detailData;
      let images = [];
      
      // جلب الصور من عدة مصادر
      if (detailProgram?.images?.length) {
        images = detailProgram.images
          .map(img => buildImageUrl(img.url || img.image_url))
          .filter(Boolean);
      } else if (detailProgram?.image) {
        const imgUrl = buildImageUrl(detailProgram.image);
        if (imgUrl) images = [imgUrl];
      }
      
      // ✅ تصفية الصور الصالحة وحفظها
      if (images.length > 0) {
        // حفظ الصور بعد التحقق من الصحة (يتم داخل saveProgramImages)
        await saveProgramImages(program.id, images);
        // استرجاع الصور الصالحة من cache (تم حفظها بالفعل)
        const validImages = getProgramImages(program.id);
        if (validImages && validImages.length > 0) {
          setProgramImages(validImages);
          setCurrentImageIndex(0);
          // تحديث البرنامج في القائمة بالصور
          setPrograms(prev => prev.map(p => 
            p.id === program.id ? { ...p, images: validImages, hasCachedImages: true } : p
          ));
        } else {
          setProgramImages([]);
        }
      } else {
        setProgramImages([]);
        // مسح cache إذا لم توجد صور
        clearProgramImages(program.id);
      }
      
    } catch (err) {
      console.error('Error fetching program images:', err);
      setProgramImages([]);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // معرف المرشد (UUID)
  const getUserGuideUuid = useCallback(async () => {
    if (!user?.id) return null;
    const userIdStr = String(user.id);
    if (userIdStr.includes('-') || userIdStr.length === 36) return userIdStr;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) return data.user.id;
      }
    } catch (e) { console.warn(e); }
    return null;
  }, [user?.id]);

  const [userUuid, setUserUuid] = useState(null);
  useEffect(() => {
    getUserGuideUuid().then(uuid => setUserUuid(uuid));
  }, [getUserGuideUuid]);

  const isOwnProgram = useCallback((program) => {
    if (!user || !program) return false;
    const guideIdStr = String(program.guide_id);
    const currentGuideId = String(userUuid || user.id);
    return guideIdStr === currentGuideId;
  }, [user, userUuid]);

  // حساب المسافات
  const programsWithDistance = useMemo(() => {
    if (!userLocation) return programs.map(p => ({ ...p, distance: Infinity }));
    return programs.map(p => ({
      ...p,
      distance: getDistance(userLocation[0], userLocation[1], p.lat, p.lng)
    })).sort((a, b) => a.distance - b.distance);
  }, [programs, userLocation]);

  const displayedPrograms = useMemo(() => {
    let filtered = programsWithDistance;
    if (showMyProgramsOnly && user && userUuid) {
      filtered = filtered.filter(p => String(p.guide_id) === String(userUuid));
    }
    if (showOnlyNearby && userLocation) {
      filtered = filtered.filter(p => p.distance <= nearbyRadius);
    }
    return filtered;
  }, [programsWithDistance, showMyProgramsOnly, user, userUuid, showOnlyNearby, nearbyRadius, userLocation]);

  // دالة تحديث حالة الموقع
  const updateUserLocationState = (lat, lng, accuracy, isManual = false) => {
    if (!isValidLocation(lat, lng)) {
      console.warn('Invalid location coordinates:', lat, lng);
      return false;
    }
    
    setUserLocation([lat, lng]);
    setUserAccuracy(accuracy);
    setLocationActive(true);
    setLocationStatus('acquired');
    
    if (!initialZoomDone.current || isManual) {
      const zoomLevel = isMobile.current ? 9 : 11;
      setMapCenter([lat, lng]);
      setMapZoom(isManual ? 10 : zoomLevel);
      initialZoomDone.current = true;
    }
    
    if (isManual) {
      localStorage.setItem('manual_user_location', JSON.stringify({ 
        coords: [lng, lat], 
        accuracy, 
        timestamp: Date.now() 
      }));
    }
    
    return true;
  };

  // دالة تحديد الموقع المحسنة للجوال
  const startAutoTracking = useCallback(() => {
    if (manualMode) return;
    
    if (!navigator.geolocation) {
      setLocationStatus('error');
      toast.error(t('locationError'), { duration: 4000 });
      return;
    }

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }

    setIsLocating(true);
    setLocationStatus('locating');
    
    const loadingToast = toast.loading(t('locating'));

    locationTimeoutRef.current = setTimeout(() => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLocating(false);
      setLocationStatus('error');
      toast.dismiss(loadingToast);
      toast.error(t('locationTimeout'), { duration: 4000 });
    }, LOCATION_TIMEOUT);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        if (!isValidLocation(latitude, longitude)) {
          retryCountRef.current += 1;
          if (retryCountRef.current <= MAX_RETRY_ATTEMPTS) {
            return;
          } else {
            setIsLocating(false);
            setLocationStatus('error');
            toast.dismiss(loadingToast);
            toast.error(t('locationError'), { duration: 4000 });
            if (watchIdRef.current) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            if (locationTimeoutRef.current) {
              clearTimeout(locationTimeoutRef.current);
              locationTimeoutRef.current = null;
            }
            retryCountRef.current = 0;
          }
          return;
        }

        retryCountRef.current = 0;
        
        if (locationTimeoutRef.current) {
          clearTimeout(locationTimeoutRef.current);
          locationTimeoutRef.current = null;
        }

        const success = updateUserLocationState(latitude, longitude, accuracy, false);
        
        if (success) {
          setIsLocating(false);
          setLocationStatus('acquired');
          toast.dismiss(loadingToast);
          
          if (accuracy <= MIN_ACCURACY_THRESHOLD) {
            toast.success(
              lang === 'ar' 
                ? `📍 دقة ${Math.round(accuracy)}م` 
                : `📍 ${Math.round(accuracy)}m accuracy`,
              { duration: 2000 }
            );
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.dismiss(loadingToast);
        setIsLocating(false);
        
        let errorMsg = t('locationError');
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = t('locationPermissionDenied');
        } else if (error.code === error.TIMEOUT) {
          errorMsg = t('locationTimeout');
        }
        
        setLocationStatus('error');
        toast.error(errorMsg, { duration: 4000 });
        
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        if (locationTimeoutRef.current) {
          clearTimeout(locationTimeoutRef.current);
          locationTimeoutRef.current = null;
        }
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 30000,
        timeout: 10000,
      }
    );
  }, [lang, t, manualMode]);

  // إلغاء تتبع الموقع عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
    };
  }, []);

  // تبديل الوضع اليدوي
  const enableManualMode = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }
    setManualMode(true);
    setLocationStatus('idle');
    toast(t('manualModeActive'), { duration: 2000 });
  };

  const disableManualMode = () => {
    setManualMode(false);
    setLocationStatus('idle');
    startAutoTracking();
    toast(t('manualModeOff'), { duration: 1500 });
  };

  const handleManualLocationToggle = () => {
    if (manualMode) disableManualMode();
    else enableManualMode();
  };

  const handleMapClick = (e) => {
    if (!manualMode) return;
    const { lat, lng } = e.latlng;
    if (isValidLocation(lat, lng)) {
      updateUserLocationState(lat, lng, 50, true);
      toast.success(t('manualSuccess'));
      setManualMode(false);
      setLocationStatus('acquired');
    } else {
      toast.error(lang === 'ar' ? 'الموقع غير صالح' : 'Invalid location');
    }
  };

  const handleRetryAutoLocation = () => {
    if (manualMode) {
      disableManualMode();
    } else {
      retryCountRef.current = 0;
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
      startAutoTracking();
    }
  };

  const handleChatWithGuide = (guideId, guideName) => {
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    if (String(guideId) === String(user.id)) {
      toast.error(t('cannotChatOwn'));
      return;
    }
    const chatParams = { recipientId: guideId, recipientName: guideName || 'المرشد', timestamp: Date.now() };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    toast.success(lang === 'ar' ? `تم فتح المحادثة مع ${guideName}` : `Chat opened with ${guideName}`);
    setPage('directChat');
  };

  // دالة الحجز المعدلة
  const handleBooking = async (program) => {
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    if (isOwnProgram(program)) {
      toast.error(t('cannotBookOwn'));
      return;
    }
    if (bookedPrograms.has(program.id)) {
      toast.info(lang === 'ar' ? 'لقد قمت بحجز هذا البرنامج مسبقاً' : 'You have already booked this program');
      return;
    }
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const ticketData = {
        user_id: user.id,
        subject: `طلب حجز برنامج: ${program.name}`,
        type: 'general',
        priority: 'normal',
        message: `أود حجز البرنامج "${program.name}" الذي يقدمه المرشد ${program.guide_name}. السعر: ${program.price} ريال`,
        metadata: {
          program_id: program.id,
          program_name: program.name,
          program_price: program.price,
          guide_id: program.guide_id,
          guide_name: program.guide_name,
          tourist_id: user.id,
          tourist_name: user.name || user.fullName,
          tourist_balance: user.balance || 0,
          user_balance: user.balance || 0,
          is_booking: true,
          created_from: 'explore_page'
        }
      };
      console.log('📤 Sending booking request:', ticketData);
      const response = await fetch(`${API_BASE}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(ticketData)
      });
      const result = await response.json();
      console.log('📥 Booking response:', result);
      if (result.success) {
        toast.success(t('requestSent'));
        
        const localBooking = {
          id: Date.now(),
          user_id: user.id,
          user_name: user.name || user.fullName,
          program_id: program.id,
          program_name: program.name,
          program_price: program.price,
          user_balance: user.balance || 0,
          created_at: new Date().toISOString(),
          status: 'pending',
          guide_id: program.guide_id
        };
        const key = LOCAL_BOOKINGS_KEY(user.id);
        const existing = localStorage.getItem(key);
        let bookings = existing ? JSON.parse(existing) : [];
        bookings.push(localBooking);
        localStorage.setItem(key, JSON.stringify(bookings));
        
        const newBookedSet = new Set(bookedPrograms);
        newBookedSet.add(program.id);
        setBookedPrograms(newBookedSet);
        localStorage.setItem(BOOKED_PROGRAMS_KEY(user.id), JSON.stringify([...newBookedSet]));
        
      } else {
        toast.error(result.message || t('bookingFailed'));
      }
    } catch (err) {
      console.error('Booking error:', err);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Error sending request');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleViewOnMap = (programId) => {
    localStorage.setItem('selectedProgramId', programId);
    setPage('explore');
  };

  // تحميل البيانات الأولية
  useEffect(() => {
    fetchProgramsFromAPI();
    const interval = setInterval(fetchProgramsFromAPI, 60000);
    return () => clearInterval(interval);
  }, [fetchProgramsFromAPI]);

  // بدء تتبع الموقع عند تحميل المكون
  useEffect(() => {
    const savedLocation = localStorage.getItem('manual_user_location');
    if (savedLocation) {
      try {
        const data = JSON.parse(savedLocation);
        if (data.coords && data.coords.length === 2) {
          const lng = data.coords[0];
          const lat = data.coords[1];
          if (isValidLocation(lat, lng)) {
            updateUserLocationState(lat, lng, data.accuracy || 50, true);
            setManualMode(true);
            setLocationStatus('acquired');
            return;
          } else {
            localStorage.removeItem('manual_user_location');
          }
        } else {
          localStorage.removeItem('manual_user_location');
        }
      } catch(e) { 
        localStorage.removeItem('manual_user_location');
      }
    }
    
    startAutoTracking();
  }, []);

  // اختيار برنامج من المعرف المحفوظ
  useEffect(() => {
    if (programs.length === 0) return;
    const selectedId = localStorage.getItem('selectedProgramId');
    if (selectedId) {
      const program = programs.find(p => p.id == selectedId);
      if (program) {
        setSelectedProgram(program);
        fetchProgramImages(program);
        if (program.lat && program.lng) {
          setMapCenter([program.lat, program.lng]);
          setMapZoom(isMobile.current ? 10 : 12);
        }
        localStorage.removeItem('selectedProgramId');
      } else localStorage.removeItem('selectedProgramId');
    }
  }, [programs, fetchProgramImages]);

  // التحقق من حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      isMobile.current = window.innerWidth < 768;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className="h-full flex flex-col pb-16">
      {/* هيدر مدمج ومناسب للجوال */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 text-white flex-shrink-0 z-10 shadow-md">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`} alt={user.name || user.fullName} className="w-full h-full object-cover" />
              ) : user.avatar_url ? (
                <img src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE}${user.avatar_url}`} alt={user.name || user.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm">
                  {user.name?.charAt(0) || user.fullName?.charAt(0) || '👤'}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-bold text-sm">{user.name || user.fullName}</h1>
              <p className="text-[10px] flex items-center gap-1 opacity-90">
                <MapPin size={10} className="inline" />
                {locationActive && userAccuracy && !manualMode ? (
                  <span>{t('usingGps')} ±{Math.round(userAccuracy)}{t('accuracyMeters')}</span>
                ) : manualMode ? (
                  <span>{t('usingManual')}</span>
                ) : locationStatus === 'locating' ? (
                  <span className="animate-pulse">⏳ {t('locating')}</span>
                ) : (
                  <span>⚠️ {t('locationError')}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={handleManualLocationToggle} className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition" title={manualMode ? t('useAutoLocation') : t('setManualLocation')}>
              <MousePointer size={16} />
            </button>
            <button 
              onClick={handleRetryAutoLocation} 
              className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition disabled:opacity-50" 
              disabled={isLocating}
              title={t('retryLocation')}
            >
              <Crosshair size={16} className={isLocating ? "animate-pulse" : ""} />
            </button>
            <button onClick={() => setPage('home')} className="p-1.5 bg-white/20 rounded-full"><Home size={16} /></button>
            <button onClick={() => setPage('notifications')} className="relative p-1.5 bg-white/20 rounded-full"><Bell size={16} />{unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>}</button>
          </div>
        </div>
        
        {/* شريط البحث والفلترة المدمج */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-2 top-1.5 text-white/70" size={12} />
            <input type="text" placeholder={t('search')} className="w-full p-1.5 pr-7 rounded-lg bg-white/20 text-white placeholder-white/60 focus:outline-none focus:bg-white/30 transition text-xs" />
          </div>
          <div className="flex gap-1">
            {isGuide && (
              <button onClick={() => setShowMyProgramsOnly(!showMyProgramsOnly)} className={`px-2 py-1 rounded-lg text-[10px] ${showMyProgramsOnly ? 'bg-yellow-500' : 'bg-white/20'}`}>
                {showMyProgramsOnly ? '📌' : '🌍'}
              </button>
            )}
            <button onClick={() => setShowOnlyNearby(!showOnlyNearby)} className={`px-2 py-1 rounded-lg text-[10px] ${showOnlyNearby ? 'bg-blue-500' : 'bg-white/20'}`}>
              {showOnlyNearby ? `📍 ${nearbyRadius}كم` : '🗺️'}
            </button>
          </div>
        </div>
        
        {/* عداد البرامج */}
        <div className="text-[10px] text-white/80 mt-1 text-center">
          {displayedPrograms.length} {t('programsNearby')}
        </div>
      </div>

      {/* الخريطة - مساحة مخصصة للجوال */}
      <div ref={mapContainerRef} className="flex-1 w-full relative z-0" style={{ height: 'calc(100vh - 180px)' }}>
        <MapContainer 
          key={mapCenter ? `map-${mapCenter[0]}-${mapCenter[1]}` : 'map-default'} 
          center={mapCenter || [0, 0]} 
          zoom={mapZoom || 5} 
          style={{ height: "100%", width: "100%" }} 
          zoomSnap={0.5} 
          zoomDelta={0.5} 
          wheelPxPerZoomLevel={60}
          dragging={true}
          touchZoom={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          whenCreated={(map) => {
            leafletMapRef.current = map;
            map.on('click', handleMapClick);
            if (map.attributionControl) map.attributionControl.remove();
            if (map.zoomControl) map.zoomControl.remove();
            map.setMinZoom(3);
            map.setMaxZoom(18);
            
            if (userLocation && map) {
              setTimeout(() => {
                map.flyTo(userLocation, isMobile.current ? 9 : 11, { duration: 1 });
              }, 500);
            }
          }}
        >
          {dark ? (
            <TileLayer 
              attribution="" 
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
              subdomains="abcd" 
              maxZoom={19}
            />
          ) : (
            <TileLayer 
              attribution="" 
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
              subdomains="abcd"
              maxZoom={19}
            />
          )}
          
          {mapCenter && <MapController center={mapCenter} zoom={mapZoom} />}
          
          {/* عرض البرامج على الخريطة */}
          {displayedPrograms.map(program => {
            const color = isOwnProgram(program) ? "#9b59b6" : "#10b981";
            const isNearby = userLocation && program.distance <= nearbyRadius;
            const size = isNearby ? 28 : 22;
            
            const markerIcon = L.divIcon({ 
              className: "custom-marker", 
              html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: ${isNearby ? '14' : '10'}px; transition: all 0.2s;">🏞️</div>`, 
              iconSize: [size, size], 
              popupAnchor: [0, -size/2] 
            });
            
            return (
              <Marker 
                key={program.id} 
                position={[program.lat, program.lng]} 
                icon={markerIcon} 
                eventHandlers={{ 
                  click: () => { 
                    setSelectedProgram(program); 
                    fetchProgramImages(program); 
                    if (leafletMapRef.current) {
                      leafletMapRef.current.flyTo([program.lat, program.lng], isMobile.current ? 12 : 14, { duration: 0.8 });
                    }
                  } 
                }}
              >
                <Popup closeButton={false} className="custom-popup">
                  <div className="text-center p-1 max-w-[150px]">
                    <div className="font-bold text-sm truncate">{program.name}</div>
                    <div className="text-xs text-gray-600 truncate">{program.guide_name}</div>
                    <div className="text-xs text-green-600 font-bold">{program.price} {t('price')}</div>
                    {program.distance && program.distance !== Infinity && (
                      <div className="text-[10px] text-gray-500">{program.distance.toFixed(1)} {t('kmAway')}</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
          
          {/* علامة موقع المستخدم */}
          {userLocation && (
            <Marker 
              position={userLocation} 
              icon={L.divIcon({ 
                className: "user-marker", 
                html: `<div style="background-color: ${manualMode ? '#f59e0b' : '#3b82f6'}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div></div>`, 
                iconSize: [18, 18] 
              })}
            >
              <Popup closeButton={false}>
                <div className="text-xs text-center">
                  {manualMode ? "📍 يدوي" : `📍 ${Math.round(userAccuracy)}م`}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        
        <style>{`
          .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
            padding: 0 !important;
            background: rgba(255,255,255,0.95) !important;
            backdrop-filter: blur(10px) !important;
          }
          .custom-popup .leaflet-popup-content {
            margin: 8px !important;
            line-height: 1.4 !important;
          }
          .custom-popup .leaflet-popup-tip {
            display: none !important;
          }
          @keyframes pulse-dot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.8; }
          }
          @media (max-width: 768px) {
            .leaflet-popup {
              transform: scale(0.85) !important;
            }
            .leaflet-popup-content-wrapper {
              border-radius: 10px !important;
            }
          }
        `}</style>
      </div>

      {/* بطاقة البرنامج المحدد - مرفوعة للأعلى لتظهر البيانات كاملة */}
      {selectedProgram && (
        <div className="absolute bottom-24 left-0 right-0 z-30 px-1 transition-all duration-300">
          <div className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl overflow-hidden border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="relative w-full" style={{ minHeight: '220px', maxHeight: '340px' }}>
              {loadingImages ? (
                <div className="flex justify-center items-center h-48">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="text-xs text-gray-500">{t('loadingImages')}</span>
                  </div>
                </div>
              ) : programImages.length > 0 ? (
                <>
                  <img 
                    key={`${currentImageIndex}-${programImages[currentImageIndex]}`}
                    src={programImages[currentImageIndex]} 
                    alt={selectedProgram.name} 
                    className="w-full h-full object-cover" 
                    style={{ minHeight: '220px', maxHeight: '340px' }} 
                    onClick={() => setShowGallery(true)}
                    crossOrigin="anonymous"
                    onError={(e) => {
                      // ✅ إذا فشل تحميل الصورة، نحذفها من القائمة وننتقل للتالية
                      console.warn(`⚠️ Failed to load image: ${programImages[currentImageIndex]}`);
                      const newImages = programImages.filter((_, i) => i !== currentImageIndex);
                      if (newImages.length === 0) {
                        // إذا لم تبق صور، نمسح cache
                        clearProgramImages(selectedProgram.id);
                        setProgramImages([]);
                        // تحديث البرنامج في القائمة
                        setPrograms(prev => prev.map(p => 
                          p.id === selectedProgram.id ? { ...p, images: [], hasCachedImages: false } : p
                        ));
                      } else {
                        // تحديث قائمة الصور والمؤشر
                        setProgramImages(newImages);
                        const newIndex = currentImageIndex >= newImages.length ? newImages.length - 1 : currentImageIndex;
                        setCurrentImageIndex(newIndex);
                        // تحديث cache بحذف الصورة الفاشلة
                        saveProgramImages(selectedProgram.id, newImages);
                        // تحديث البرنامج في القائمة
                        setPrograms(prev => prev.map(p => 
                          p.id === selectedProgram.id ? { ...p, images: newImages, hasCachedImages: true } : p
                        ));
                      }
                    }}
                  />
                  {/* ✅ عرض أزرار التنقل إذا كان هناك أكثر من صورة واحدة */}
                  {programImages.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          e.preventDefault();
                          setCurrentImageIndex((prev) => {
                            const newIndex = (prev - 1 + programImages.length) % programImages.length;
                            console.log('⬅️ Previous image:', prev, '->', newIndex);
                            return newIndex;
                          }); 
                        }} 
                        className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition z-20 text-xs pointer-events-auto"
                        style={{ touchAction: 'manipulation' }}
                      >
                        ❮
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          e.preventDefault();
                          setCurrentImageIndex((prev) => {
                            const newIndex = (prev + 1) % programImages.length;
                            console.log('➡️ Next image:', prev, '->', newIndex);
                            return newIndex;
                          }); 
                        }} 
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition z-20 text-xs pointer-events-auto"
                        style={{ touchAction: 'manipulation' }}
                      >
                        ❯
                      </button>
                      <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full z-20">
                        {currentImageIndex+1}/{programImages.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <FaBoxOpen size={32} />
                  <span className="text-xs mt-1">لا توجد صورة</span>
                  <button 
                    onClick={() => fetchProgramImages(selectedProgram)}
                    className="mt-2 text-xs text-green-600 hover:underline"
                  >
                    إعادة تحميل
                  </button>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
              
              <div className="absolute bottom-14 left-2 right-2 text-white pointer-events-none z-10">
                <h3 className="font-bold text-base leading-tight drop-shadow-md truncate">{selectedProgram.name}</h3>
                <div className="flex flex-wrap items-center gap-1 text-[10px] mt-0.5">
                  <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1">{getActivityType(selectedProgram, lang).icon}</span>
                  {selectedProgram.distance !== undefined && selectedProgram.distance !== Infinity && (
                    <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1"><Navigation size={8} /> {selectedProgram.distance.toFixed(1)} {t('kmAway')}</span>
                  )}
                  <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1">{selectedProgram.price} {t('price')}</span>
                  <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full"><Star size={8} className="fill-yellow-400 text-yellow-400" /> {selectedProgram.rating || 4.5}</span>
                </div>
                {/* عرض اسم الموقع */}
                <div className="text-xs mt-1 text-white/80 flex items-center gap-1">
                  <MapPin size={10} />
                  <span className="truncate">{selectedProgram.location_name || selectedProgram.location || 'موقع البرنامج'}</span>
                </div>
              </div>
              
              <button onClick={() => { setSelectedProgram(null); setProgramImages([]); }} className="absolute top-1 right-1 z-20 bg-black/50 backdrop-blur-sm p-1 rounded-full text-white hover:bg-black/70 transition"><X size={14} /></button>
              
              <div className="absolute bottom-1 left-1 right-1 z-20 flex justify-between items-center pointer-events-auto gap-1">
                <button onClick={() => toggleFavorite(selectedProgram.id)} className="p-1.5 rounded-full transition hover:scale-105"><Heart size={16} className={favoriteIds.includes(selectedProgram.id) ? 'fill-red-500 text-red-500' : 'text-white'} /></button>
                <div className="flex gap-1">
                  <button onClick={() => handleChatWithGuide(selectedProgram.guide_id, selectedProgram.guide_name)} disabled={isOwnProgram(selectedProgram)} className={`${isOwnProgram(selectedProgram) ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600/90 hover:bg-blue-700'} backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition`}><MessageCircle size={10} /> {t('chatWithGuide')}</button>
                  <button onClick={() => handleBooking(selectedProgram)} disabled={bookingLoading || isOwnProgram(selectedProgram) || bookedPrograms.has(selectedProgram.id)} className={`${(bookingLoading || isOwnProgram(selectedProgram) || bookedPrograms.has(selectedProgram.id)) ? 'bg-gray-500 cursor-not-allowed' : 'bg-purple-600/90 hover:bg-purple-700'} backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition`}><CalendarCheck size={10} /> {t('bookNow')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* معرض الصور */}
      {showGallery && programImages.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <div className="relative max-w-4xl max-h-screen p-2">
            <img 
              key={`gallery-${currentImageIndex}-${programImages[currentImageIndex]}`}
              src={programImages[currentImageIndex]} 
              className="max-w-full max-h-screen object-contain" 
              alt="Gallery"
              crossOrigin="anonymous"
              onError={(e) => {
                // ✅ محاولة استخدام الصورة التالية إذا فشل تحميل الصورة الحالية
                if (programImages.length > 1) {
                  const newImages = programImages.filter((_, i) => i !== currentImageIndex);
                  setProgramImages(newImages);
                  const newIndex = currentImageIndex >= newImages.length ? newImages.length - 1 : currentImageIndex;
                  setCurrentImageIndex(newIndex);
                  // تحديث cache
                  if (selectedProgram) {
                    saveProgramImages(selectedProgram.id, newImages);
                  }
                } else {
                  // لا توجد صور، نغلق المعرض
                  setShowGallery(false);
                  if (selectedProgram) {
                    clearProgramImages(selectedProgram.id);
                    setProgramImages([]);
                  }
                }
              }}
            />
            {programImages.length > 1 && (
              <>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); 
                  }} 
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full z-50 pointer-events-auto"
                >
                  ❮
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setCurrentImageIndex((prev) => (prev + 1) % programImages.length); 
                  }} 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full z-50 pointer-events-auto"
                >
                  ❯
                </button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full z-50">
                  {currentImageIndex+1} / {programImages.length}
                </div>
              </>
            )}
            <button onClick={() => setShowGallery(false)} className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full z-50 pointer-events-auto">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExplorePage;

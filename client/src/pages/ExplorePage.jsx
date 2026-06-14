// client/src/pages/ExplorePage.jsx
// ✅ منع المستخدم من حجز برنامجه الخاص + منع تكرار الحجز لنفس البرنامج
// ✅ إرسال طلبات الحجز كنوع 'general' مع metadata.is_booking=true لضمان وصولها للمرشد

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

// إخفاء التذييل عبر CSS
const style = document.createElement('style');
style.textContent = `
  .leaflet-control-attribution { display: none !important; }
  .leaflet-bottom, .leaflet-control { display: none !important; }
`;
document.head.appendChild(style);

const API_BASE = "https://tourist-app-api.onrender.com";
const DEFAULT_LOCATION = { lat: -2.333, lng: 34.833 };
const LOCAL_BOOKINGS_KEY = (userId) => `local_bookings_${userId}`;
const BOOKED_PROGRAMS_KEY = (userId) => `booked_programs_${userId}`;

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
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
    locationError: "تعذر تحديد موقعك بدقة، حاول مرة أخرى",
    locationPermissionDenied: "الوصول إلى الموقع ممنوع. يرجى السماح من المتصفح",
    usingGps: "📍 تتبع مباشر",
    usingManual: "📍 يدوي",
    enableLocation: "تفعيل الموقع",
    retryLocation: "إعادة المحاولة",
    kmAway: "كم",
    accuracyMeters: "متر",
    locating: "جاري تحديد موقعك الدقيق...",
    locationFallback: "تم استخدام موقع افتراضي (تنزانيا) كبديل مؤقت",
    invalidLocation: "الموقع المستلم غير دقيق، جاري إعادة المحاولة",
    manualModeActive: "انقر على الخريطة لتحديد موقعك يدوياً",
    manualModeOff: "العودة إلى التحديد التلقائي",
    setManualLocation: "اختر موقعي يدوياً",
    useAutoLocation: "استخدم GPS",
    manualSuccess: "تم تحديد موقعك يدوياً وحفظه",
    viewOnMap: "عرض على الخريطة",
    startTrip: "بدء الرحلة",
    appPayment: "الدفع عبر التطبيق",
    cashPayment: "الدفع نقداً",
    insufficientBalance: "الرصيد غير كافٍ للدفع عبر التطبيق، يرجى الدفع نقداً",
    tripStartedApp: "تم خصم المبلغ من رصيد المستخدم وبدء الرحلة",
    tripStartedCash: "تم تأكيد الدفع النقدي وبدء الرحلة",
    startTripFailed: "فشل بدء الرحلة",
    activeBookings: "طلبات حجز جديدة",
    userBalance: "رصيد المستخدم",
    price: "ريال",
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
    locationError: "Could not determine your location accurately, please try again",
    locationPermissionDenied: "Location permission denied. Please allow in browser",
    usingGps: "📍 Live tracking",
    usingManual: "📍 Manual",
    enableLocation: "Enable location",
    retryLocation: "Retry",
    kmAway: "km",
    accuracyMeters: "m",
    locating: "Locating you accurately...",
    locationFallback: "Using default location (Tanzania) as temporary fallback",
    invalidLocation: "Received location is invalid, retrying...",
    manualModeActive: "Click on map to set your location manually",
    manualModeOff: "Back to auto location",
    setManualLocation: "Set manual location",
    useAutoLocation: "Use GPS",
    manualSuccess: "Manual location set and saved",
    viewOnMap: "View on map",
    startTrip: "Start trip",
    appPayment: "Pay via app",
    cashPayment: "Cash payment",
    insufficientBalance: "Insufficient balance for app payment, please use cash",
    tripStartedApp: "Amount deducted from user's wallet and trip started",
    tripStartedCash: "Cash payment confirmed and trip started",
    startTripFailed: "Failed to start trip",
    activeBookings: "New booking requests",
    userBalance: "User balance",
    price: "SAR",
  },
};

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1] && map) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

const AccuracyCircle = ({ center, radius }) => {
  if (!center || !radius || radius > 1000) return null;
  return <Circle center={center} radius={radius} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.2, weight: 1 }} />;
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
  const [nearbyRadius] = useState(50);
  const [isLocating, setIsLocating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [mapCenter, setMapCenter] = useState([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]);
  const [mapZoom, setMapZoom] = useState(12);
  
  const watchIdRef = useRef(null);
  const retryCountRef = useRef(0);
  const leafletMapRef = useRef(null);
  const initialZoomDone = useRef(false);
  const [guidesMap, setGuidesMap] = useState({});

  // ✅ قائمة البرامج التي تم حجزها مسبقاً (لتعطيل الزر)
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
            images: [],
            safetyGuidelines: p.safetyGuidelines || "",
            status: p.status,
            guide_avatar,
          };
        }).filter(p => p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng));
        setPrograms(progs);
        console.log(`📦 Loaded ${progs.length} active programs`);
      } else {
        setPrograms([]);
      }
    } catch (err) {
      console.error('Failed to fetch programs', err);
      setPrograms([]);
    }
  }, [guidesMap]);

  const fetchProgramImages = useCallback(async (program) => {
    if (!program) return;
    setLoadingImages(true);
    try {
      const detailRes = await fetch(`${API_BASE}/api/programs/${program.id}`);
      if (!detailRes.ok) { setProgramImages([]); return; }
      const detailData = await detailRes.json();
      const detailProgram = detailData.program || detailData.data || detailData;
      let images = [];
      if (detailProgram?.images?.length) {
        images = detailProgram.images.map(img => buildImageUrl(img.url || img.image_url)).filter(Boolean);
      } else if (detailProgram?.image) {
        const imgUrl = buildImageUrl(detailProgram.image);
        if (imgUrl) images = [imgUrl];
      }
      setProgramImages(images);
      setCurrentImageIndex(0);
    } catch (err) {
      console.error(err);
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

  // دوال الموقع
  const updateUserLocationState = (lat, lng, accuracy, isManual = false) => {
    setUserLocation([lat, lng]);
    setUserAccuracy(accuracy);
    setLocationActive(true);
    if (!initialZoomDone.current && !isManual) {
      setMapCenter([lat, lng]);
      setMapZoom(14);
      initialZoomDone.current = true;
    } else if (isManual) {
      setMapCenter([lat, lng]);
      setMapZoom(13);
    }
    if (isManual) {
      localStorage.setItem('manual_user_location', JSON.stringify({ coords: [lng, lat], accuracy, timestamp: Date.now() }));
    }
  };

  const startAutoTracking = useCallback(() => {
    if (manualMode) return;
    if (!navigator.geolocation) {
      toast.error(t('locationError'));
      updateUserLocationState(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, 10000, false);
      return;
    }
    setIsLocating(true);
    toast.loading(t('locating'), { id: 'locating' });
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!isValidLocation(latitude, longitude)) {
          retryCountRef.current += 1;
          if (retryCountRef.current <= 3) {
            toast.error(t('invalidLocation'), { duration: 3000 });
            return;
          } else {
            updateUserLocationState(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, 10000, false);
            toast.error(t('locationFallback'), { duration: 5000 });
            setIsLocating(false);
            toast.dismiss('locating');
            retryCountRef.current = 0;
          }
          return;
        }
        retryCountRef.current = 0;
        updateUserLocationState(latitude, longitude, accuracy, false);
        setIsLocating(false);
        toast.dismiss('locating');
        toast.success(lang === 'ar' ? `تم تحديد موقعك بدقة ${Math.round(accuracy)} متر` : `Location accuracy: ${Math.round(accuracy)} m`);
      },
      (error) => {
        console.error(error);
        toast.dismiss('locating');
        let msg = t('locationError');
        if (error.code === error.PERMISSION_DENIED) msg = t('locationPermissionDenied');
        toast.error(msg);
        setLocationActive(false);
        setIsLocating(false);
        updateUserLocationState(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, 10000, false);
        if (error.code !== error.PERMISSION_DENIED) {
          toast.error(t('locationFallback'), { duration: 5000 });
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, [lang, t, manualMode]);

  const enableManualMode = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setManualMode(true);
    toast(t('manualModeActive'), { duration: 3000 });
  };

  const disableManualMode = () => {
    setManualMode(false);
    startAutoTracking();
    toast(t('manualModeOff'), { duration: 2000 });
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
    } else {
      toast.error(lang === 'ar' ? 'الموقع غير صالح' : 'Invalid location');
    }
  };

  const handleRetryAutoLocation = () => {
    if (manualMode) disableManualMode();
    else {
      retryCountRef.current = 0;
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
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

  // ✅ دالة الحجز المعدلة (تمنع تكرار الحجز والحجز الخاص)
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
        
        // حفظ الحجز محلياً (للمستخدم العادي والمرشد)
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
        
        // إضافة البرنامج إلى قائمة البرامج المحجوزة (لتعطيل الزر)
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
    const interval = setInterval(fetchProgramsFromAPI, 30000);
    return () => clearInterval(interval);
  }, [fetchProgramsFromAPI]);

  useEffect(() => {
    const savedLocation = localStorage.getItem('manual_user_location');
    if (savedLocation && !manualMode) {
      try {
        const data = JSON.parse(savedLocation);
        if (data.coords && data.coords.length === 2) {
          const lng = data.coords[0];
          const lat = data.coords[1];
          if (isValidLocation(lat, lng)) {
            updateUserLocationState(lat, lng, data.accuracy || 50, true);
            setManualMode(true);
          } else {
            localStorage.removeItem('manual_user_location');
            startAutoTracking();
          }
        } else {
          startAutoTracking();
        }
      } catch(e) { startAutoTracking(); }
    } else {
      startAutoTracking();
    }
  }, []);

  useEffect(() => {
    if (programs.length === 0) return;
    const selectedId = localStorage.getItem('selectedProgramId');
    if (selectedId) {
      const program = programs.find(p => p.id == selectedId);
      if (program) {
        setSelectedProgram(program);
        fetchProgramImages(program);
        setMapCenter([program.lat, program.lng]);
        setMapZoom(14);
        localStorage.removeItem('selectedProgramId');
      } else localStorage.removeItem('selectedProgramId');
    }
  }, [programs, fetchProgramImages]);

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
    <div className="h-full flex flex-col pb-24">
      {/* الهيدر */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white flex-shrink-0 z-10 shadow-md">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`} alt={user.name || user.fullName} className="w-full h-full object-cover" />
              ) : user.avatar_url ? (
                <img src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE}${user.avatar_url}`} alt={user.name || user.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-lg">
                  {user.name?.charAt(0) || user.fullName?.charAt(0) || '👤'}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-bold text-base">{user.name || user.fullName}</h1>
              <p className="text-xs flex items-center gap-1">
                <MapPin size={12} className="inline ml-1" /> استكشف البرامج
                {locationActive && userAccuracy && !manualMode && (
                  <span className="bg-blue-500/80 text-[10px] px-1 rounded-full mr-1">
                    {t('usingGps')} (±{Math.round(userAccuracy)}{t('accuracyMeters')})
                  </span>
                )}
                {manualMode && <span className="bg-orange-500/80 text-[10px] px-1 rounded-full mr-1">{t('usingManual')}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleManualLocationToggle} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"><MousePointer size={18} /></button>
            <button onClick={handleRetryAutoLocation} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition disabled:opacity-50" disabled={isLocating}><Crosshair size={18} className={isLocating ? "animate-pulse" : ""} /></button>
            <button onClick={() => setPage('home')} className="p-2 bg-white/20 rounded-full"><Home size={18} /></button>
            <button onClick={() => setPage('notifications')} className="relative p-2 bg-white/20 rounded-full"><Bell size={18} />{unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}</button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
          <input type="text" placeholder={t('search')} className="w-full p-2 pr-9 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:bg-white/30 transition" />
        </div>
        <div className="flex flex-wrap justify-between mt-3 text-xs gap-2">
          <div className="flex items-center gap-2">
            <span>📌 {displayedPrograms.length} برنامج نشط</span>
            {userLocation && showOnlyNearby && (<span className="bg-blue-500/50 px-2 py-0.5 rounded-full">ضمن {nearbyRadius} كم</span>)}
          </div>
          <div className="flex gap-2">
            {isGuide && (<button onClick={() => setShowMyProgramsOnly(!showMyProgramsOnly)} className={`px-2 py-1 rounded ${showMyProgramsOnly ? 'bg-yellow-500' : 'bg-white/20'}`}>{showMyProgramsOnly ? '📌 برامجي فقط' : '🌍 كل البرامج'}</button>)}
            <button onClick={() => setShowOnlyNearby(!showOnlyNearby)} className="px-2 py-1 rounded bg-white/20">{showOnlyNearby ? '📍 القريبة فقط' : '🗺️ الكل'}</button>
          </div>
        </div>
      </div>

      {/* الخريطة */}
      <div ref={mapContainerRef} className="flex-1 w-full relative z-0">
        <MapContainer key={`map-${mapCenter[0]}-${mapCenter[1]}`} center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%" }} zoomSnap={0.5} zoomDelta={0.5} wheelPxPerZoomLevel={120} whenCreated={(map) => {
            leafletMapRef.current = map;
            map.on('click', handleMapClick);
            if (map.attributionControl) map.attributionControl.remove();
            if (map.zoomControl) map.zoomControl.remove();
            map.setMinZoom(6);
            map.setMaxZoom(18);
          }}>
          {dark ? (<TileLayer attribution="" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" />) : (<TileLayer attribution="" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" subdomains="abcd" />)}
          <MapController center={mapCenter} zoom={mapZoom} />
          {!manualMode && userLocation && userAccuracy && userAccuracy < 1000 && (<AccuracyCircle center={userLocation} radius={userAccuracy} />)}
          {displayedPrograms.map(program => {
            const color = isOwnProgram(program) ? "#9b59b6" : "#10b981";
            const markerIcon = L.divIcon({ className: "custom-marker", html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 16px;">🏞️</div>`, iconSize: [28, 28], popupAnchor: [0, -14] });
            return (<Marker key={program.id} position={[program.lat, program.lng]} icon={markerIcon} eventHandlers={{ click: () => { setSelectedProgram(program); fetchProgramImages(program); if (leafletMapRef.current) leafletMapRef.current.flyTo([program.lat, program.lng], 14, { duration: 1.2 }); } }}><Popup><div className="text-center"><strong>{program.name}</strong><br />{program.guide_name}<br />{program.price} ريال</div></Popup></Marker>);
          })}
          {userLocation && (<Marker position={userLocation} icon={L.divIcon({ className: "user-marker", html: `<div style="background-color: ${manualMode ? '#f59e0b' : '#3b82f6'}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`, iconSize: [22, 22] })}><Popup>{manualMode ? "📍 موقع محدد يدوياً" : `موقعك (دقة ${Math.round(userAccuracy)} م)`}</Popup></Marker>)}
        </MapContainer>
      </div>

      {/* بطاقة البرنامج المحدد */}
      {selectedProgram && (
        <div className="absolute bottom-28 left-0 right-0 z-30 px-2 transition-all duration-300">
          <div className={`${dark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl overflow-hidden border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="relative w-full" style={{ minHeight: '280px', maxHeight: '420px' }}>
              {loadingImages ? (<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>) : programImages.length > 0 ? (
                <>
                  <img src={programImages[currentImageIndex]} alt={selectedProgram.name} className="w-full h-full object-cover" style={{ minHeight: '280px', maxHeight: '420px' }} onClick={() => setShowGallery(true)} />
                  {programImages.length > 1 && (<><button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-10">❮</button><button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-10">❯</button><div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">{currentImageIndex+1}/{programImages.length}</div></>)}
                </>
              ) : (<div className="flex flex-col items-center justify-center h-64 text-gray-400"><FaBoxOpen size={48} /><span className="text-sm mt-1">لا توجد صورة</span></div>)}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-16 left-2 right-2 text-white pointer-events-none z-10">
                <h3 className="font-bold text-lg leading-tight drop-shadow-md">{selectedProgram.name}</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs mt-0.5">
                  <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1">{getActivityType(selectedProgram, lang).icon} {getActivityType(selectedProgram, lang)[lang]}</span>
                  {selectedProgram.distance !== undefined && selectedProgram.distance !== Infinity && (<span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1"><Navigation size={10} /> {selectedProgram.distance.toFixed(1)} {t('kmAway')}</span>)}
                  <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1">{selectedProgram.price} {t('price')}</span>
                  <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full"><Star size={10} className="fill-yellow-400 text-yellow-400" /> {selectedProgram.rating || 4.5}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2">{selectedProgram.guide_avatar ? (<img src={selectedProgram.guide_avatar} className="w-5 h-5 rounded-full object-cover" alt={selectedProgram.guide_name} />) : (<div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-[10px]">{selectedProgram.guide_name?.charAt(0) || 'G'}</div>)}<span className="text-xs">{selectedProgram.guide_name || 'مرشد سياحي'}</span></div>
                  <span className="text-xs flex items-center gap-1"><MapPin size={10} /><span className="truncate max-w-[150px]">{selectedProgram.location_name || 'موقع البرنامج'}</span></span>
                </div>
              </div>
              <button onClick={() => { setSelectedProgram(null); setProgramImages([]); }} className="absolute top-2 right-2 z-20 bg-black/50 backdrop-blur-sm p-1.5 rounded-full text-white hover:bg-black/70 transition"><X size={18} /></button>
              <div className="absolute bottom-2 left-2 right-2 z-20 flex justify-between items-center pointer-events-auto">
                <button onClick={() => toggleFavorite(selectedProgram.id)} className="p-2 rounded-full transition hover:scale-105"><Heart size={20} className={favoriteIds.includes(selectedProgram.id) ? 'fill-red-500 text-red-500' : 'text-white'} /></button>
                <div className="flex gap-2">
                  <button onClick={() => handleChatWithGuide(selectedProgram.guide_id, selectedProgram.guide_name)} disabled={isOwnProgram(selectedProgram)} className={`${isOwnProgram(selectedProgram) ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600/90 hover:bg-blue-700'} backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition`}><MessageCircle size={12} /> <span>{t('chatWithGuide')}</span></button>
                  <button onClick={() => handleBooking(selectedProgram)} disabled={bookingLoading || isOwnProgram(selectedProgram) || bookedPrograms.has(selectedProgram.id)} className={`${(bookingLoading || isOwnProgram(selectedProgram) || bookedPrograms.has(selectedProgram.id)) ? 'bg-gray-500 cursor-not-allowed' : 'bg-purple-600/90 hover:bg-purple-700'} backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition`}><CalendarCheck size={12} /> <span>{t('bookNow')}</span></button>
                  <button onClick={() => handleViewOnMap(selectedProgram.id)} className="bg-emerald-600/90 hover:bg-emerald-700 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition"><MapIcon size={12} /> <span>{t('viewOnMap')}</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGallery && programImages.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <div className="relative max-w-4xl max-h-screen p-4"><img src={programImages[currentImageIndex]} className="max-w-full max-h-screen object-contain" alt="Gallery" />{programImages.length > 1 && (<><button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full">❮</button><button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full">❯</button></>)}<button onClick={() => setShowGallery(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full">✕</button></div>
        </div>
      )}
    </div>
  );
}

export default ExplorePage;

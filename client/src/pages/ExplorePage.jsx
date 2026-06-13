// client/src/pages/ExplorePage.jsx
// ✅ تحسين جودة تحديد موقع المستخدم: دائرة دقة، تتبع مستمر، عرض اتجاه، تكبير ذكي
// ✅ استخدام watchPosition مع أعلى دقة ممكنة
// ✅ رسم دائرة شفافة حول الموقع تُظهر هامش الخطأ
// ✅ تحديث الخريطة تلقائياً كلما تغير الموقع بفارق كبير

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import { 
  Home, Bell, User, MapPin, Search, MessageCircle, 
  CalendarCheck, AlertTriangle, Heart, X, Star, Image as ImageIcon, Navigation, Crosshair
} from "lucide-react";
import toast from "react-hot-toast";
import api from '../services/api';

const MAPBOX_TOKEN = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWR5em0xciJ9.sl39WFOhm4m-kOOYtGqONw";
mapboxgl.accessToken = MAPBOX_TOKEN;

const API_BASE = "https://tourist-app-api.onrender.com";

// دالة حساب المسافة
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

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
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
    locationError: "تعذر تحديد موقعك بدقة عالية، حاول مرة أخرى",
    locationPermissionDenied: "الوصول إلى الموقع ممنوع، يرجى السماح من المتصفح",
    usingGps: "📍 تتبع مباشر بدقة عالية",
    enableLocation: "تفعيل الموقع",
    retryLocation: "إعادة المحاولة",
    kmAway: "كم",
    accuracyMeters: "متر",
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
    locationError: "Could not determine your location with high accuracy, please try again",
    locationPermissionDenied: "Location permission denied, please allow in browser",
    usingGps: "📍 Live tracking - high accuracy",
    enableLocation: "Enable location",
    retryLocation: "Retry",
    kmAway: "km",
    accuracyMeters: "m",
  },
};

function ExplorePage({ lang = "ar", mapContainerRef, setPage, user, unreadCount, dark }) {
  const t = (key) => LOCALES[lang]?.[key] || key;

  const [selectedProgram, setSelectedProgram] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
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
  const [mapLoadError, setMapLoadError] = useState(false);
  const [showOnlyNearby, setShowOnlyNearby] = useState(true);
  const [nearbyRadius] = useState(50);
  const [isLocating, setIsLocating] = useState(false);

  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const accuracyCircleSourceRef = useRef(null);
  const watchIdRef = useRef(null);
  const isMapLoadedRef = useRef(false);
  const mapInitializedRef = useRef(false);
  const lastLocationUpdateRef = useRef(null);

  // ========== جلب البرامج ==========
  const fetchProgramsFromAPI = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/programs`);
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.programs)) {
        const activePrograms = data.programs.filter(p => (p.status || '').toLowerCase() === 'active');
        const progs = activePrograms.map(p => ({
          id: p.id,
          name_ar: p.name,
          name_en: p.name,
          guide_name: p.guide_name,
          guide_id: p.guide_id,
          coords: [p.location_lng, p.location_lat],
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
        }));
        setPrograms(progs);
        console.log(`📦 Loaded ${progs.length} active programs`);
      } else {
        setPrograms([]);
      }
    } catch (err) {
      console.error('Failed to fetch programs', err);
      setPrograms([]);
    }
  }, []);

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

  // ========== دوال المستخدم والمرشد ==========
  const getUserGuideUuid = useCallback(async () => {
    if (!user?.id) return null;
    if (typeof user.id === 'string' && (user.id.includes('-') || user.id.length === 36)) return user.id;
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
    return String(program.guide_id) === String(userUuid || user.id);
  }, [user, userUuid]);

  // ========== إضافة علامات البرامج على الخريطة ==========
  const addMarkersToMap = useCallback((map, programsList) => {
    if (!map || !isMapLoadedRef.current) return;
    markersRef.current.forEach(m => { try { m.remove(); } catch(e) {} });
    markersRef.current = [];
    const validPrograms = programsList.filter(p => p.coords && p.coords[0] && p.coords[1] && !isNaN(p.coords[0]) && !isNaN(p.coords[1]));
    validPrograms.forEach(program => {
      const color = isOwnProgram(program) ? "#9b59b6" : "#10b981";
      const marker = new mapboxgl.Marker({ color, scale: 1.1 }).setLngLat(program.coords).addTo(map);
      marker.getElement().addEventListener('click', () => {
        setSelectedProgram(program);
        fetchProgramImages(program);
        if (mapInstance && program.coords) mapInstance.flyTo({ center: program.coords, zoom: 14 });
      });
      markersRef.current.push(marker);
    });
  }, [isOwnProgram, mapInstance, fetchProgramImages]);

  // ========== حساب المسافات والترتيب ==========
  const programsWithDistance = useMemo(() => {
    if (!userLocation) return programs.map(p => ({ ...p, distance: Infinity }));
    const [userLng, userLat] = userLocation;
    return programs.map(p => ({
      ...p,
      distance: getDistance(userLat, userLng, p.lat, p.lng)
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

  // تحديث العلامات عند تغيير البرامج
  useEffect(() => {
    if (mapInstance && isMapLoadedRef.current) addMarkersToMap(mapInstance, displayedPrograms);
  }, [displayedPrograms, mapInstance, addMarkersToMap]);

  // ========== المفضلة ==========
  useEffect(() => {
    if (user?.id) {
      const loadFavorites = async () => {
        try {
          const res = await api.getFavorites();
          setFavoriteIds(res.favorites || []);
        } catch (err) { console.error(err); }
      };
      loadFavorites();
    } else {
      setFavoriteIds([]);
    }
  }, [user]);

  const toggleFavorite = async (programId) => {
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    const isFavorite = favoriteIds.includes(programId);
    const previousFavs = [...favoriteIds];
    if (isFavorite) {
      setFavoriteIds(prev => prev.filter(id => id !== programId));
      toast.success(t('removedFromFavorites'));
    } else {
      setFavoriteIds(prev => [...prev, programId]);
      toast.success(t('addedToFavorites'));
    }
    try {
      if (isFavorite) await api.removeFavorite(programId);
      else await api.addFavorite(programId);
    } catch (error) {
      setFavoriteIds(previousFavs);
      toast.error(isFavorite ? '❌ فشل إزالة من المفضلة' : '❌ فشل إضافة إلى المفضلة');
    }
  };

  // ========== الدوال الأخرى ==========
  const handleChatWithGuide = (guideId, guideName) => {
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    if (selectedProgram && isOwnProgram(selectedProgram)) {
      toast.error(t('cannotChatOwn'));
      return;
    }
    localStorage.setItem('previousPage', 'explore');
    localStorage.setItem('directChatParams', JSON.stringify({ recipientId: guideId, recipientName: guideName }));
    setPage('directChat');
  };

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
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const ticketData = {
        user_id: user.id,
        subject: `طلب حجز برنامج: ${program.name_ar || program.name}`,
        type: 'booking',
        priority: 'normal',
        message: `أود حجز البرنامج "${program.name_ar || program.name}" الذي يقدمه المرشد ${program.guide_name}.`
      };
      const response = await fetch(`${API_BASE}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
        body: JSON.stringify(ticketData)
      });
      const result = await response.json();
      if (result.success) toast.success(t('requestSent'));
      else toast.error(result.message || t('bookingFailed'));
    } catch (err) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Error sending request');
    } finally { setBookingLoading(false); }
  };

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  // ========== تحديث علامة المستخدم ودائرة الدقة على الخريطة ==========
  const updateUserLocationOnMap = useCallback((map, location, accuracy, heading = null) => {
    if (!map || !location) return;

    // تحديث أو إنشاء العلامة الرئيسية (نقطة زرقاء مع دائرة خارجية)
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(location);
    } else {
      // إنشاء عنصر HTML مخصص للعلامة
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.style.backgroundColor = '#3b82f6';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
      el.style.cursor = 'pointer';
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(location)
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${lang === 'ar' ? 'موقعك' : 'Your location'}</strong><br/>${lang === 'ar' ? `الدقة: ${Math.round(accuracy)} متر` : `Accuracy: ${Math.round(accuracy)} m`}`))
        .addTo(map);
      userMarkerRef.current = marker;
    }

    // تحديث أو إنشاء دائرة الدقة (طبقة GeoJSON)
    const circleData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: location },
        properties: { accuracy: Math.min(accuracy, 500) } // تحديد أقصى نصف قطر 500 متر للعرض
      }]
    };

    if (map.getSource('user-accuracy-circle')) {
      map.getSource('user-accuracy-circle').setData(circleData);
    } else {
      map.addSource('user-accuracy-circle', { type: 'geojson', data: circleData });
      map.addLayer({
        id: 'user-accuracy-circle-layer',
        type: 'circle',
        source: 'user-accuracy-circle',
        paint: {
          'circle-radius': ['*', ['get', 'accuracy'], 0.02], // تحويل الأمتار إلى وحدات خريطة تقريبية
          'circle-color': '#3b82f6',
          'circle-opacity': 0.3,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#1e40af'
        }
      });
    }
  }, [lang]);

  // ========== بدء تتبع الموقع بدقة عالية باستخدام watchPosition ==========
  const startHighAccuracyTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(t('locationError'));
      return;
    }

    setIsLocating(true);

    // إيقاف أي تتبع سابق
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading } = position.coords;
        const newLocation = [longitude, latitude];
        
        // تحديث الحالة
        setUserLocation(newLocation);
        setUserAccuracy(accuracy);
        setLocationActive(true);
        
        // تحديث الخريطة إذا كانت جاهزة
        if (mapInstance && isMapLoadedRef.current) {
          updateUserLocationOnMap(mapInstance, newLocation, accuracy, heading);
          
          // تحريك الخريطة إلى الموقع الجديد مع تكبير مناسب
          const currentZoom = mapInstance.getZoom();
          const targetZoom = Math.max(currentZoom, 16);
          mapInstance.flyTo({ center: newLocation, zoom: targetZoom, duration: 1000 });
        }
        
        // إظهار إشعار بدقة الموقع أول مرة أو عند تحسن الدقة
        if (!lastLocationUpdateRef.current || accuracy < (userAccuracy || 1000)) {
          toast.success(lang === 'ar' ? `تم تحديد موقعك بدقة ${Math.round(accuracy)} متر` : `Location accuracy: ${Math.round(accuracy)} m`);
        }
        lastLocationUpdateRef.current = Date.now();
        setIsLocating(false);
        console.log(`📍 دقة عالية: ${newLocation} (±${accuracy}m)`);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let msg = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            msg = t('locationPermissionDenied');
            break;
          case error.POSITION_UNAVAILABLE:
          case error.TIMEOUT:
            msg = t('locationError');
            break;
          default:
            msg = t('locationError');
        }
        toast.error(msg);
        setLocationActive(false);
        setIsLocating(false);
        
        // تعيين موقع افتراضي (الرياض) كحل احتياطي
        const defaultLoc = [46.713, 24.774];
        setUserLocation(defaultLoc);
        setUserAccuracy(1000);
        if (mapInstance && isMapLoadedRef.current) {
          updateUserLocationOnMap(mapInstance, defaultLoc, 1000);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  }, [mapInstance, updateUserLocationOnMap, lang, t, userAccuracy]);

  // ========== تهيئة الخريطة ==========
  useEffect(() => {
    if (!mapContainerRef?.current || mapInitializedRef.current) return;
    mapInitializedRef.current = true;

    const initMap = () => {
      try {
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
          center: [46.713, 24.774],
          zoom: 12,
        });
        
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
        
        map.on('load', () => {
          isMapLoadedRef.current = true;
          setMapInstance(map);
          if (map.setLanguage) map.setLanguage(lang);
          if (programs.length) addMarkersToMap(map, displayedPrograms);
          
          // بدء التتبع فوراً بعد تحميل الخريطة
          startHighAccuracyTracking();
        });
        
        map.on('error', (e) => {
          if (e.error?.status === 401 || e.error?.status === 403) {
            setMapLoadError(true);
            toast.error('خطأ في مفتاح الخريطة. يرجى تحديث الصفحة.');
          }
        });
        
        return map;
      } catch (err) {
        console.error(err);
        setMapLoadError(true);
        return null;
      }
    };
    
    initMap();
  }, [mapContainerRef, dark, lang, programs.length, displayedPrograms, addMarkersToMap, startHighAccuracyTracking]);

  // تنظيف التتبع عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // تحديث الخريطة عند تغيير الثيم
  useEffect(() => {
    if (!mapInstance || !isMapLoadedRef.current) return;
    const newStyle = dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12";
    if (mapInstance.getStyle().sprite === newStyle) return;
    mapInstance.setStyle(newStyle);
    mapInstance.once('style.load', () => {
      addMarkersToMap(mapInstance, displayedPrograms);
      if (userLocation && userAccuracy) {
        updateUserLocationOnMap(mapInstance, userLocation, userAccuracy);
      }
    });
  }, [dark, mapInstance, displayedPrograms, addMarkersToMap, updateUserLocationOnMap, userLocation, userAccuracy]);

  // تغيير اللغة
  useEffect(() => {
    if (mapInstance && isMapLoadedRef.current && mapInstance.setLanguage) mapInstance.setLanguage(lang);
  }, [lang, mapInstance]);

  // تحميل البرامج
  useEffect(() => {
    fetchProgramsFromAPI();
    const interval = setInterval(fetchProgramsFromAPI, 30000);
    return () => clearInterval(interval);
  }, [fetchProgramsFromAPI]);

  // تحديث البرامج عند تغير موقع المستخدم
  useEffect(() => {
    if (userLocation) {
      fetchProgramsFromAPI();
    }
  }, [userLocation, fetchProgramsFromAPI]);

  // تحديد برنامج من localStorage
  useEffect(() => {
    if (programs.length === 0) return;
    const selectedId = localStorage.getItem('selectedProgramId');
    if (selectedId) {
      const program = programs.find(p => p.id == selectedId);
      if (program) {
        setSelectedProgram(program);
        fetchProgramImages(program);
        if (mapInstance && program.coords) mapInstance.flyTo({ center: program.coords, zoom: 14 });
        localStorage.removeItem('selectedProgramId');
      } else localStorage.removeItem('selectedProgramId');
    }
  }, [programs, mapInstance, fetchProgramImages]);

  // استماع لتحديثات بيانات المرشدين
  useEffect(() => {
    const handleGuideUpdate = (event) => {
      const { guideId, updatedData } = event.detail;
      setPrograms(prev => prev.map(p => {
        if (p.guide_id == guideId) {
          return { ...p, guide_name: updatedData.fullName || p.guide_name, guide_image: updatedData.avatar_url || p.guide_image };
        }
        return p;
      }));
      if (selectedProgram && selectedProgram.guide_id == guideId) {
        setSelectedProgram(prev => ({ ...prev, guide_name: updatedData.fullName || prev.guide_name, guide_image: updatedData.avatar_url || prev.guide_image }));
      }
    };
    window.addEventListener('guideProfileUpdated', handleGuideUpdate);
    return () => window.removeEventListener('guideProfileUpdated', handleGuideUpdate);
  }, [selectedProgram]);

  // ========== زر تفعيل التتبع يدوياً ==========
  const handleManualTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    startHighAccuracyTracking();
  };

  // ========== العروض الشرطية ==========
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

  if (mapLoadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2 text-center">{lang === 'ar' ? 'حدث خطأ في تحميل الخريطة' : 'Failed to load map'}</h2>
        <button onClick={() => window.location.reload()} className="bg-green-600 text-white px-6 py-2 rounded-lg">{lang === 'ar' ? 'تحديث الصفحة' : 'Refresh'}</button>
      </div>
    );
  }

  return (
    <div className="h-full relative flex flex-col">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center ml-2">
              {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full" alt="avatar" /> : <User size={20} />}
            </div>
            <div>
              <h1 className="font-bold">{user.name}</h1>
              <p className="text-xs flex items-center gap-1">
                <MapPin size={12} className="inline ml-1" /> استكشف البرامج
                {locationActive && userAccuracy && (
                  <span className="bg-blue-500/80 text-[10px] px-1 rounded-full mr-1">
                    {t('usingGps')} (±{Math.round(userAccuracy)}{t('accuracyMeters')})
                  </span>
                )}
                {!locationActive && <span className="bg-yellow-500/80 text-[10px] px-1 rounded-full mr-1">موقع تقريبي</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleManualTracking} 
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition disabled:opacity-50"
              title={t('myLocation')}
              disabled={isLocating}
            >
              <Crosshair size={18} className={isLocating ? "animate-pulse" : ""} />
            </button>
            <button onClick={() => setPage('home')} className="p-2 bg-white/20 rounded-full"><Home size={18} /></button>
            <button onClick={() => setPage('notifications')} className="relative p-2 bg-white/20 rounded-full">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
          <input type="text" placeholder={t('search')} className="w-full p-2 pr-9 rounded-lg bg-white/20 text-white placeholder-white/70" />
        </div>
        <div className="flex flex-wrap justify-between mt-3 text-xs gap-2">
          <div className="flex items-center gap-2">
            <span>📌 {displayedPrograms.length} برنامج نشط</span>
            {userLocation && showOnlyNearby && (
              <span className="bg-blue-500/50 px-2 py-0.5 rounded-full">ضمن {nearbyRadius} كم</span>
            )}
          </div>
          <div className="flex gap-2">
            {isGuide && (
              <button onClick={() => setShowMyProgramsOnly(!showMyProgramsOnly)} className={`px-2 py-1 rounded ${showMyProgramsOnly ? 'bg-yellow-500' : 'bg-white/20'}`}>
                {showMyProgramsOnly ? '📌 برامجي فقط' : '🌍 كل البرامج'}
              </button>
            )}
            <button onClick={() => setShowOnlyNearby(!showOnlyNearby)} className="px-2 py-1 rounded bg-white/20">
              {showOnlyNearby ? '📍 القريبة فقط' : '🗺️ الكل'}
            </button>
          </div>
        </div>
      </div>

      <div ref={mapContainerRef} className="flex-1 w-full min-h-0" />

      {selectedProgram && (
        <div className="absolute bottom-20 left-4 right-4 z-20 rounded-xl shadow-lg overflow-hidden border-2 border-green-500 bg-transparent">
          <div className="relative w-full bg-gray-900" style={{ height: '220px' }}>
            {loadingImages ? (
              <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
            ) : programImages.length > 0 ? (
              <>
                <img src={programImages[currentImageIndex]} alt={selectedProgram.name_ar || selectedProgram.name} className="w-full h-full object-cover" onClick={() => setShowGallery(true)} />
                {programImages.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full">❮</button>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full">❯</button>
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{currentImageIndex+1}/{programImages.length}</div>
                  </>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-full bg-gray-200"><ImageIcon size={32} className="text-gray-400" /><span className="mr-2 text-gray-600">لا توجد صورة</span></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
            <button onClick={() => { setSelectedProgram(null); setProgramImages([]); }} className="absolute top-2 right-2 z-20 bg-black/50 backdrop-blur-sm p-1.5 rounded-full text-white hover:bg-black/70 transition"><X size={18} /></button>
            <button onClick={() => toggleFavorite(selectedProgram.id)} className="absolute bottom-2 left-2 z-20 bg-black/50 backdrop-blur-sm p-1.5 rounded-full hover:scale-105 transition"><Heart size={18} className={favoriteIds.includes(selectedProgram.id) ? 'fill-red-500 text-red-500' : 'text-white'} /></button>
            <div className="absolute bottom-2 right-2 z-20 flex gap-2">
              <button onClick={() => handleChatWithGuide(selectedProgram.guide_id, selectedProgram.guide_name)} disabled={isOwnProgram(selectedProgram)} className={`${isOwnProgram(selectedProgram) ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600/90 hover:bg-blue-700'} backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1`}><MessageCircle size={12} /> <span>{t('chatWithGuide')}</span></button>
              <button onClick={() => handleBooking(selectedProgram)} disabled={bookingLoading || isOwnProgram(selectedProgram)} className={`${(bookingLoading || isOwnProgram(selectedProgram)) ? 'bg-gray-500 cursor-not-allowed' : 'bg-purple-600/90 hover:bg-purple-700'} backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1`}><CalendarCheck size={12} /> <span>{t('bookNow')}</span></button>
            </div>
            <div className="absolute bottom-12 left-2 right-2 text-white pointer-events-none">
              <h3 className="font-bold text-base leading-tight drop-shadow-md">{selectedProgram.name_ar || selectedProgram.name}</h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs mt-0.5">
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">👤 {selectedProgram.guide_name}</span>
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">💰 {selectedProgram.price} ريال</span>
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star size={10} className="fill-yellow-400 text-yellow-400" /> {selectedProgram.rating || 4.5}</span>
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">⏱ {selectedProgram.duration}</span>
                {selectedProgram.distance !== undefined && selectedProgram.distance !== Infinity && (
                  <span className="bg-blue-500/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Navigation size={10} /> {selectedProgram.distance.toFixed(1)} {t('kmAway')}</span>
                )}
              </div>
              {selectedProgram.description && <p className="text-xs text-white/80 line-clamp-1 mt-0.5 drop-shadow-md">{selectedProgram.description}</p>}
              {selectedProgram.safetyGuidelines && <div className="flex items-center gap-1 text-[10px] bg-orange-500/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 w-fit mt-0.5"><AlertTriangle size={10} /> <span>{t('safetyGuidelines')}</span></div>}
            </div>
          </div>
        </div>
      )}

      {showGallery && programImages.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <div className="relative max-w-4xl max-h-screen p-4">
            <img src={programImages[currentImageIndex]} className="max-w-full max-h-screen object-contain" alt="Gallery" />
            {programImages.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full">❮</button>
                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full">❯</button>
              </>
            )}
            <button onClick={() => setShowGallery(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExplorePage;

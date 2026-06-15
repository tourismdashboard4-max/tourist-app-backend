// client/src/pages/HomePage.jsx
// ✅ يعتمد على موقع المستخدم الحقيقي فقط، لا توجد مواقع افتراضية إلا عند فشل GPS
// ✅ يتم تحديث البرامج القريبة تلقائياً بناءً على الموقع الفعلي

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  MapPin, Bell, Search, Users, Heart, Navigation, MessageCircle, CalendarCheck, Shield, Sun, Moon, Crosshair
} from 'lucide-react';
import { 
  FaStar, FaBoxOpen, FaSpinner, FaRedoAlt, FaArrowUp, FaMapMarkedAlt
} from 'react-icons/fa';

const API_BASE = 'https://tourist-app-api.onrender.com';
const DEFAULT_LOCATION = { lat: 24.774, lng: 46.713 };
const NEARBY_RADIUS_KM = 254;

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const isValidLocation = (lat, lng) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const getDistance = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
    appName: 'تطبيق السائح', welcome: 'مرحباً بك', search: 'ابحث عن وجهة...',
    nearbyPrograms: 'البرامج القريبة منك', loading: 'جاري تحميل البرامج...', noPrograms: 'لا توجد برامج سياحية قريبة حالياً',
    loginRequired: 'الرجاء تسجيل الدخول أولاً', distance: 'كم', price: 'ريال', rating: 'تقييم',
    chat: 'دردشة', book: 'احجز', viewOnMap: 'خريطة', addToFavorites: 'مفضلة', removeFromFavorites: 'تمت الإزالة',
    requestSent: 'تم إرسال طلب الحجز بنجاح', bookingFailed: 'فشل إرسال طلب الحجز', locationUpdated: 'تم تحديث الموقع',
    usingGps: '📍 GPS', usingDefault: '📍 الموقع الافتراضي', updateLocation: 'تحديث موقعي', refresh: 'تحديث',
    connectionError: 'فشل الاتصال بالإنترنت', locationError: 'تعذر تحديد موقعك، حاول مرة أخرى',
    locationPermissionDenied: 'الوصول إلى الموقع ممنوع', accuracyMeters: 'متر', locating: 'جاري تحديد موقعك الدقيق...',
    invalidLocation: 'الموقع المستلم غير دقيق', locationFallback: 'تم استخدام موقع افتراضي مؤقت',
    retryLocation: 'إعادة المحاولة', showNearby: 'القريبة فقط', showAll: 'عرض الكل',
  },
  en: {
    appName: 'Tourist App', welcome: 'Welcome', search: 'Search...',
    nearbyPrograms: 'Nearby Programs', loading: 'Loading programs...', noPrograms: 'No nearby programs available',
    loginRequired: 'Please login first', distance: 'km', price: 'SAR', rating: 'Rating',
    chat: 'Chat', book: 'Book', viewOnMap: 'Map', addToFavorites: 'Favorite', removeFromFavorites: 'Removed',
    requestSent: 'Booking request sent', bookingFailed: 'Booking failed', locationUpdated: 'Location updated',
    usingGps: '📍 GPS', usingDefault: '📍 Default', updateLocation: 'Update location', refresh: 'Refresh',
    connectionError: 'Connection failed', locationError: 'Could not determine your location',
    locationPermissionDenied: 'Location permission denied', accuracyMeters: 'm', locating: 'Locating you accurately...',
    invalidLocation: 'Invalid location', locationFallback: 'Using temporary default location',
    retryLocation: 'Retry', showNearby: 'Nearby only', showAll: 'Show all',
  }
};

const HeroAd = ({ lang, setPage }) => {
  const t = (key) => LOCALES[lang]?.[key] || key;
  return (
    <div className="relative rounded-2xl overflow-hidden mb-6 shadow-md">
      <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-700" />
      <div className="relative p-6 text-white text-center">
        <h2 className="text-2xl font-bold mb-2">🌟 {t('appName')}</h2>
        <p className="text-sm opacity-95 mb-3">{lang === 'ar' ? 'اكتشف أجمل الوجهات السياحية مع مرشدين محترفين' : 'Discover the best tourist destinations with professional guides'}</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => setPage('explore')} className="bg-white text-green-700 px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2"><MapPin size={16} /> {lang === 'ar' ? 'استكشف الآن' : 'Explore Now'}</button>
          <button onClick={() => setPage('guides')} className="bg-transparent border border-white px-4 py-1.5 rounded-full text-sm flex items-center gap-2"><Users size={16} /> {lang === 'ar' ? 'المرشدون' : 'Guides'}</button>
        </div>
      </div>
    </div>
  );
};

const HomePage = ({ lang = 'ar', user, setPage, dark, setDark }) => {
  const t = (key) => LOCALES[lang]?.[key] || key;

  const [allPrograms, setAllPrograms] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [locationSource, setLocationSource] = useState(null);
  const [showAllMode, setShowAllMode] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [imageIndex, setImageIndex] = useState({});
  const [isLocating, setIsLocating] = useState(false);

  const watchIdRef = useRef(null);
  const retryCountRef = useRef(0);
  const contentRef = useRef(null);
  const initialLoadDone = useRef(false);
  const [guidesMap, setGuidesMap] = useState({});

  // Load favorites
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`favorites_${user.id}`);
      if (saved) setFavoriteIds(JSON.parse(saved));
      else setFavoriteIds([]);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favoriteIds));
  }, [favoriteIds, user]);

  const toggleFavorite = (id) => {
    if (!user) { toast.error(t('loginRequired')); setPage('profile'); return; }
    const isFav = favoriteIds.includes(id);
    const newFavs = isFav ? favoriteIds.filter(i => i !== id) : [...favoriteIds, id];
    setFavoriteIds(newFavs);
    toast.success(isFav ? t('removeFromFavorites') : t('addToFavorites'));
  };

  // Fetch guides map
  useEffect(() => {
    const fetchGuidesMap = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/guides`);
        const data = await res.json();
        let guidesList = [];
        if (data?.data && Array.isArray(data.data)) guidesList = data.data;
        else if (Array.isArray(data)) guidesList = data;
        else if (data?.guides && Array.isArray(data.guides)) guidesList = data.guides;
        else if (data?.data?.guides && Array.isArray(data.data.guides)) guidesList = data.data.guides;
        const map = {};
        guidesList.forEach(guide => {
          const uuid = guide.id || guide.uuid;
          const numericId = guide.old_id || guide.oldId;
          const avatar = buildImageUrl(guide.avatar_url || guide.avatar);
          const fullName = guide.full_name || guide.name;
          if (uuid) map[uuid] = { id: numericId ? Number(numericId) : uuid, name: fullName, avatar };
          if (fullName) map[fullName] = { id: numericId ? Number(numericId) : uuid, name: fullName, avatar };
        });
        setGuidesMap(map);
      } catch (err) { console.error(err); }
    };
    fetchGuidesMap();
  }, []);

  // Update guide profiles in real-time
  useEffect(() => {
    const handleGuideUpdate = (event) => {
      const { guideId, updatedData } = event.detail;
      setGuidesMap(prev => {
        const newMap = { ...prev };
        Object.keys(newMap).forEach(key => {
          if (newMap[key].id == guideId) {
            newMap[key].name = updatedData.fullName || newMap[key].name;
            newMap[key].avatar = updatedData.avatar_url ? buildImageUrl(updatedData.avatar_url) : null;
          }
        });
        return newMap;
      });
      setAllPrograms(prev => prev.map(prog => {
        if (String(prog.guide_id) === String(guideId)) {
          return { ...prog, guide_name: updatedData.fullName || prog.guide_name, guide_avatar: updatedData.avatar_url ? buildImageUrl(updatedData.avatar_url) : null };
        }
        return prog;
      }));
    };
    window.addEventListener('guideProfileUpdated', handleGuideUpdate);
    return () => window.removeEventListener('guideProfileUpdated', handleGuideUpdate);
  }, []);

  // Fetch full program details
  const fetchFullProgram = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/programs/${id}`);
      const data = await res.json();
      const prog = data.program || data.data || data;
      if (prog) {
        let images = [];
        if (prog.images?.length) images = prog.images.map(img => buildImageUrl(img.url || img.image_url)).filter(Boolean);
        else if (prog.image) images = [buildImageUrl(prog.image)];
        let guide_avatar = null;
        if (prog.guide_id && guidesMap[prog.guide_id]) guide_avatar = guidesMap[prog.guide_id].avatar;
        else if (prog.guide_name && guidesMap[prog.guide_name]) guide_avatar = guidesMap[prog.guide_name].avatar;
        return { ...prog, images, guide_avatar };
      }
    } catch(e) {}
    return null;
  }, [guidesMap]);

  // Fetch all active programs
  const fetchAllPrograms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/programs`);
      if (!response.ok) throw new Error('HTTP error');
      const data = await response.json();
      let list = [];
      if (data.success && Array.isArray(data.programs)) list = data.programs;
      else if (Array.isArray(data)) list = data;
      else list = [];
      const active = list.filter(p => (p.status || '').toLowerCase() === 'active');
      const detailed = await Promise.all(active.map(p => fetchFullProgram(p.id).catch(() => p)));
      setAllPrograms(detailed);
      const idxMap = {};
      detailed.forEach(p => idxMap[p.id] = 0);
      setImageIndex(prev => ({ ...prev, ...idxMap }));
      initialLoadDone.current = true;
    } catch (err) {
      console.error(err);
      setError(t('connectionError'));
    } finally {
      setLoading(false);
    }
  }, [fetchFullProgram, t, user]);

  // Location tracking - REAL GPS
  const updateUserLocationState = (lat, lng, accuracy) => {
    setUserLocation({ lat, lng });
    setUserAccuracy(accuracy);
    setLocationSource('gps');
    console.log(`📍 User location: ${lat}, ${lng} (accuracy: ${accuracy}m)`);
  };

  const startAutoTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(t('locationError'));
      setUserLocation(DEFAULT_LOCATION);
      setLocationSource('default');
      toast.warning(t('locationFallback'), { duration: 5000 });
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
            setUserLocation(DEFAULT_LOCATION);
            setLocationSource('default');
            toast.warning(t('locationFallback'), { duration: 5000 });
            setIsLocating(false);
            toast.dismiss('locating');
            retryCountRef.current = 0;
          }
          return;
        }
        retryCountRef.current = 0;
        updateUserLocationState(latitude, longitude, accuracy);
        setIsLocating(false);
        toast.dismiss('locating');
        toast.success(t('locationUpdated') + ` (${Math.round(accuracy)} ${t('accuracyMeters')})`, { duration: 2000 });
      },
      (error) => {
        console.error(error);
        toast.dismiss('locating');
        let msg = t('locationError');
        if (error.code === error.PERMISSION_DENIED) msg = t('locationPermissionDenied');
        toast.error(msg);
        setIsLocating(false);
        setUserLocation(DEFAULT_LOCATION);
        setLocationSource('default');
        if (error.code !== error.PERMISSION_DENIED) {
          toast.warning(t('locationFallback'), { duration: 5000 });
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, [t]);

  const handleRetryLocation = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    retryCountRef.current = 0;
    startAutoTracking();
  };

  useEffect(() => {
    if (user) startAutoTracking();
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [user, startAutoTracking]);

  // Load programs when user location is available
  useEffect(() => {
    if (userLocation && !initialLoadDone.current) fetchAllPrograms();
    else if (userLocation && initialLoadDone.current) fetchAllPrograms();
  }, [userLocation, fetchAllPrograms]);

  // Notifications
  useEffect(() => {
    if (!user?.id) { setUnreadCount(0); return; }
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/notifications?status=unread&limit=1`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
        const data = await res.json();
        let count = 0;
        if (data.success && data.pagination) count = data.pagination.total || 0;
        else if (data.unreadCount !== undefined) count = data.unreadCount;
        else if (data.data?.unreadCount !== undefined) count = data.data.unreadCount;
        else if (Array.isArray(data.notifications)) count = data.notifications.filter(n => n.status === 'unread').length;
        setUnreadCount(count);
      } catch (err) { console.warn(err); }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Filter and sort programs based on user location
  const displayedPrograms = useMemo(() => {
    if (!userLocation || allPrograms.length === 0) return [];
    const withDist = allPrograms.map(p => {
      let dist = Infinity;
      if (p.lat && p.lng) dist = getDistance(userLocation.lat, userLocation.lng, p.lat, p.lng);
      return { ...p, distance: dist };
    });
    withDist.sort((a,b) => a.distance - b.distance);
    if (showAllMode) return withDist;
    return withDist.filter(p => p.distance <= NEARBY_RADIUS_KM);
  }, [allPrograms, userLocation, showAllMode]);

  const handleRefresh = () => fetchAllPrograms();
  const toggleDisplayMode = () => setShowAllMode(prev => !prev);

  const handleChat = (guideId, guideName) => {
    if (!user) { toast.error(t('loginRequired')); setPage('profile'); return; }
    if (String(guideId) === String(user.id)) { toast.error(lang === 'ar' ? 'لا يمكنك فتح محادثة مع نفسك' : 'Cannot chat with yourself'); return; }
    const chatParams = { recipientId: guideId, recipientName: guideName || 'المرشد', timestamp: Date.now() };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    toast.success(lang === 'ar' ? `تم فتح المحادثة مع ${guideName}` : `Chat opened with ${guideName}`);
    setPage('directChat');
  };

  const handleBooking = async (program) => {
    if (!user) { toast.error(t('loginRequired')); setPage('profile'); return; }
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({
          user_id: user.id,
          subject: `طلب حجز: ${program.name}`,
          type: 'booking',
          priority: 'normal',
          message: `أود حجز البرنامج "${program.name}" للمرشد ${program.guide_name}`
        })
      });
      const result = await res.json();
      if (result.success) toast.success(t('requestSent'));
      else toast.error(result.message || t('bookingFailed'));
    } catch(e) { toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error'); }
    finally { setBookingLoading(false); }
  };

  const handleViewOnMap = (id) => {
    localStorage.setItem('selectedProgramId', id);
    setPage('explore');
  };

  const nextImage = (e, id, total) => { e.stopPropagation(); setImageIndex(prev => ({ ...prev, [id]: (prev[id] + 1) % total })); };
  const prevImage = (e, id, total) => { e.stopPropagation(); setImageIndex(prev => ({ ...prev, [id]: (prev[id] - 1 + total) % total })); };

  useEffect(() => {
    const handleScroll = () => { if (contentRef.current) setShowScrollTop(contentRef.current.scrollTop > 300); };
    const container = contentRef.current;
    if (container) { container.addEventListener('scroll', handleScroll); return () => container.removeEventListener('scroll', handleScroll); }
  }, []);

  const scrollToTop = () => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const ScrollTopButton = () => showScrollTop ? <button onClick={scrollToTop} className="fixed bottom-6 left-6 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition z-50"><FaArrowUp size={20} /></button> : null;

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold mb-2">{t('welcome')}</h2>
          <p className="mb-4 text-gray-600">{t('loginRequired')}</p>
          <button onClick={() => setPage('profile')} className="bg-green-600 text-white px-6 py-2 rounded-lg">{lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</button>
        </div>
      </div>
    );
  }

  const getUserAvatarUrl = () => {
    if (user.avatar) return user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`;
    if (user.avatar_url) return user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE}${user.avatar_url}`;
    return null;
  };

  const textColor = dark ? 'text-gray-100' : 'text-gray-900';
  const bgColor = dark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = dark ? 'bg-gray-800' : 'bg-white';
  const borderColor = dark ? 'border-gray-700' : 'border-gray-200';

  return (
    <div ref={contentRef} className={`${bgColor} ${textColor} h-full overflow-y-auto pb-20`} dir="rtl">
      <div className="sticky top-0 z-20 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
        <div className="px-6 pt-6 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden flex-shrink-0">
                {getUserAvatarUrl() ? <img src={getUserAvatarUrl()} alt={user.fullName || user.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-xl">{user.fullName?.charAt(0) || user.name?.charAt(0) || '👤'}</div>}
              </div>
              <div>
                <h1 className="text-xl font-bold">{user.fullName || user.name}</h1>
                {user.type === 'guide' && <div className="flex items-center mt-0.5"><Shield className="w-3 h-3 ml-1" /><span className="text-xs opacity-90">{lang === 'ar' ? 'مرشد سياحي موثق' : 'Verified Guide'}</span></div>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDark(!dark)} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
              <button onClick={() => setPage('notifications')} className="relative p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-3.5 text-gray-200" size={20} />
            <input type="text" placeholder={t('search')} className="w-full p-3 pr-10 rounded-xl bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border border-white/30 focus:outline-none focus:border-white focus:bg-white/30 transition" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <HeroAd lang={lang} setPage={setPage} />

        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t('nearbyPrograms')}</h2>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div className="flex gap-2">
            <button onClick={toggleDisplayMode} className="px-3 py-1.5 rounded-lg text-sm bg-cyan-600 text-white shadow">{showAllMode ? t('showNearby') : t('showAll')}</button>
            <button onClick={handleRetryLocation} disabled={isLocating} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white shadow flex items-center gap-1 disabled:opacity-50"><Crosshair size={14} className={isLocating ? "animate-pulse" : ""} /> {t('updateLocation')}</button>
            <button onClick={handleRefresh} className="px-3 py-1.5 rounded-lg text-sm bg-gray-600 text-white shadow"><FaRedoAlt size={14} /> {t('refresh')}</button>
          </div>
          {userLocation && <div className="text-xs text-gray-500 dark:text-gray-400">{locationSource === 'gps' && `${t('usingGps')} (±${Math.round(userAccuracy)}${t('accuracyMeters')})`}{locationSource === 'default' && t('usingDefault')}</div>}
        </div>

        {loading && !initialLoadDone.current && <div className="text-center py-12"><FaSpinner className="animate-spin h-10 w-10 text-green-600 mx-auto" /><p className="mt-3 text-gray-500">{t('loading')}</p></div>}
        {error && <div className="text-center py-10 bg-red-50 dark:bg-red-900/20 rounded-xl"><p className="text-red-600 dark:text-red-400 mb-2">{error}</p><button onClick={handleRefresh} className="text-green-600 underline">{t('refresh')}</button></div>}
        {!loading && !error && !userLocation && <div className="text-center py-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl"><MapPin size={48} className="mx-auto text-yellow-500 mb-3" /><p className="mb-4 text-gray-700 dark:text-gray-300">{t('locationError')}</p><button onClick={handleRetryLocation} className="bg-green-600 text-white px-5 py-2 rounded-lg">{t('retryLocation')}</button></div>}
        {!loading && !error && userLocation && displayedPrograms.length === 0 && <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-xl"><FaBoxOpen size={48} className="mx-auto text-gray-400" /><p className="mt-2">{t('noPrograms')}</p>{!showAllMode && <button onClick={toggleDisplayMode} className="mt-3 text-green-600 underline">{t('showAll')}</button>}</div>}

        <AnimatePresence>
          {!loading && userLocation && displayedPrograms.length > 0 && (
            <div className="space-y-5">
              {displayedPrograms.map((program) => {
                const images = program.images || [];
                const total = images.length;
                const idx = imageIndex[program.id] || 0;
                const currentImg = images[idx] || (program.image ? buildImageUrl(program.image) : null);
                const distance = program.distance !== Infinity ? program.distance.toFixed(1) : null;
                const activity = getActivityType(program, lang);
                const activityLabel = lang === 'ar' ? activity.ar : activity.en;
                const isFav = favoriteIds.includes(program.id);
                const guideAvatar = program.guide_avatar || (program.guide_id && guidesMap[program.guide_id]?.avatar) || (program.guide_name && guidesMap[program.guide_name]?.avatar) || null;

                return (
                  <motion.div key={program.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className={`${cardBg} rounded-2xl shadow-md overflow-hidden border ${borderColor}`}>
                    <div className="relative w-full bg-gray-200" style={{ minHeight: '280px', maxHeight: '420px' }}>
                      {currentImg ? <img src={currentImg} alt={program.name} className="w-full h-full object-cover" style={{ minHeight: '280px', maxHeight: '420px' }} onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-size='14' fill='%23999' text-anchor='middle' dy='.3em'%3E🏞️%3C/text%3E%3C/svg%3E"; }} /> : <div className="w-full h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-100"><FaBoxOpen size={48} /><span className="text-sm mt-1">لا توجد صورة</span></div>}
                      {total > 1 && (<><button onClick={(e) => prevImage(e, program.id, total)} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-10">❮</button><button onClick={(e) => nextImage(e, program.id, total)} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-10">❯</button><div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">{idx+1}/{total}</div></>)}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                      <div className="absolute bottom-16 left-3 right-3 text-white pointer-events-none z-10">
                        <h3 className="font-bold text-xl leading-tight drop-shadow-md">{program.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mt-1">
                          <span className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">{activity.icon} {activityLabel}</span>
                          {distance && <span className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1"><Navigation size={10} /> {distance} {t('distance')}</span>}
                          <span className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">{program.price} {t('price')}</span>
                          <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full"><FaStar size={10} className="text-yellow-400" /> {program.rating || 4.5}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2">{guideAvatar ? <img src={guideAvatar} className="w-6 h-6 rounded-full object-cover border border-white/30" alt={program.guide_name} /> : <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs">{program.guide_name?.charAt(0) || 'G'}</div>}<span className="text-sm font-medium">{program.guide_name || 'مرشد سياحي'}</span></div>
                          <span className="text-xs flex items-center gap-1"><MapPin size={10} /><span className="truncate max-w-[140px]">{program.location || 'موقع البرنامج'}</span></span>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-3 right-3 z-20 flex justify-between items-center pointer-events-auto">
                        <button onClick={() => toggleFavorite(program.id)} className="p-2 rounded-full transition hover:scale-110"><Heart size={20} className={isFav ? 'fill-red-500 text-red-500' : 'text-white drop-shadow'} /></button>
                        <div className="flex gap-2">
                          <button onClick={() => handleChat(program.guide_id, program.guide_name)} className="bg-blue-600/80 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition backdrop-blur-sm"><MessageCircle size={12} /> <span>{t('chat')}</span></button>
                          <button onClick={() => handleBooking(program)} disabled={bookingLoading} className="bg-purple-600/80 hover:bg-purple-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition backdrop-blur-sm disabled:opacity-50"><CalendarCheck size={12} /> <span>{t('book')}</span></button>
                          <button onClick={() => handleViewOnMap(program.id)} className="bg-emerald-600/80 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition backdrop-blur-sm"><FaMapMarkedAlt size={12} /> <span>{t('viewOnMap')}</span></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
      <ScrollTopButton />
    </div>
  );
};

export default HomePage;

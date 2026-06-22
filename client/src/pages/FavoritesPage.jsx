// client/src/pages/FavoritesPage.jsx
// ✅ النسخة النهائية – إصلاح مشكلة اختفاء المفضلة عند الضغط على الخريطة والعودة
// ✅ دعم نظام الحجوزات الموحد مع منع التكرار وإلغاء الحجز
// ✅ تحديث فوري للحجوزات عبر focus و visibilitychange

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Star, Heart, Trash2, Navigation, ImageIcon, MessageCircle, CalendarCheck, Map } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'https://tourist-app-api.onrender.com';

// ✅ توحيد مفتاح تخزين الصور مع GuideDashboard و HomePage
const IMAGE_CACHE_KEY = 'guide_programs_images_cache';
const LEGACY_IMAGE_KEY = (programId) => `program_images_${programId}`;
const LOCAL_BOOKINGS_KEY = (userId) => `local_bookings_${userId}`;

// ✅ دالة للحصول على مفتاح المفضلة الخاص بالمستخدم
const getFavoritesKey = (userId) => `favorites_${userId}`;

// ===== دوال الصور والكاش (نفس HomePage) =====
const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const validateImage = async (url) => {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch { return false; }
};

const filterValidImages = async (images) => {
  if (!images || images.length === 0) return [];
  const valid = [];
  for (const img of images) {
    const url = buildImageUrl(img);
    if (!url) continue;
    const isValid = await validateImage(url);
    if (isValid) valid.push(url);
    else console.warn(`⚠️ صورة غير صالحة: ${url}`);
  }
  return valid;
};

const saveImagesToCache = (programId, images) => {
  try {
    const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    if (images && images.length > 0) {
      const imagesWithId = images.map(url => ({
        url: typeof url === 'string' ? url : (url.url || url.image_url || null),
        is_primary: url.is_primary !== undefined ? url.is_primary : false,
        id: url.id || null
      }));
      cache[programId] = { images: imagesWithId, timestamp: Date.now() };
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    } else {
      delete cache[programId];
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (e) { console.warn('Failed to save images to cache:', e); }
};

const getImagesFromCache = (programId) => {
  try {
    const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    const entry = cache[programId];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > 3600000) {
      delete cache[programId];
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.images.map(img => img.url).filter(Boolean);
  } catch (e) { return null; }
};

const getLegacyImages = (programId) => {
  try {
    const key = LEGACY_IMAGE_KEY(programId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const images = JSON.parse(saved);
      if (images && images.length > 0) return images;
    }
    return null;
  } catch (e) { return null; }
};

const saveProgramImages = async (programId, images) => {
  try {
    if (!programId) return;
    const validImages = await filterValidImages(images);
    if (validImages.length === 0) {
      saveImagesToCache(programId, []);
      const key = LEGACY_IMAGE_KEY(programId);
      localStorage.removeItem(key);
      return;
    }
    saveImagesToCache(programId, validImages);
    const key = LEGACY_IMAGE_KEY(programId);
    localStorage.setItem(key, JSON.stringify(validImages));
  } catch (error) { console.error('Error saving program images:', error); }
};

const getProgramImages = (programId) => {
  try {
    if (!programId) return null;
    const cached = getImagesFromCache(programId);
    if (cached && cached.length > 0) return cached;
    const legacy = getLegacyImages(programId);
    if (legacy && legacy.length > 0) {
      saveImagesToCache(programId, legacy);
      return legacy;
    }
    return null;
  } catch (error) { return null; }
};

const clearProgramImages = (programId) => {
  try {
    if (!programId) return;
    saveImagesToCache(programId, []);
    const key = LEGACY_IMAGE_KEY(programId);
    localStorage.removeItem(key);
  } catch (error) { console.error('Error clearing program images:', error); }
};

// ===== دوال المسافات والأنشطة =====
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

// ===== مكون الصفحة =====
function FavoritesPage({ lang, setPage, user }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationSource, setLocationSource] = useState(null);
  const [imageIndex, setImageIndex] = useState({});
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // ✅ حالة الحجوزات المعلقة (غير الملغاة)
  const [bookedProgramIds, setBookedProgramIds] = useState([]);

  // ✅ دالة جلب معرفات البرامج المحجوزة (غير الملغاة)
  const getBookedProgramIds = useCallback(() => {
    if (!user?.id) return [];
    const key = LOCAL_BOOKINGS_KEY(user.id);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    try {
      const bookings = JSON.parse(stored);
      return bookings
        .filter(b => b.status !== 'cancelled')
        .map(b => b.program_id)
        .filter(Boolean);
    } catch { return []; }
  }, [user?.id]);

  // ✅ تحديث الحجوزات
  const refreshBookedPrograms = useCallback(() => {
    const ids = getBookedProgramIds();
    setBookedProgramIds(ids);
    console.log('🔄 تحديث الحجوزات (FavoritesPage):', ids);
  }, [getBookedProgramIds]);

  // ✅ الاستماع لتغييرات الحجوزات عبر الأحداث
  useEffect(() => {
    refreshBookedPrograms();
    const handleFocus = () => refreshBookedPrograms();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshBookedPrograms();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshBookedPrograms]);

  // مرجع للقائمة السابقة
  const previousFavoritesRef = useRef([]);
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // تحميل الموقع المخزن (مثل HomePage)
  const loadStoredLocation = useCallback(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`manual_loc_${user.id}`);
      if (saved) {
        try {
          const { lat, lng } = JSON.parse(saved);
          setUserLocation({ lat, lng });
          setLocationSource('manual');
          return;
        } catch(e) {}
      }
    }
    const defaultLoc = localStorage.getItem('cached_user_location');
    if (defaultLoc) {
      try {
        const { lat, lng } = JSON.parse(defaultLoc);
        setUserLocation({ lat, lng });
        setLocationSource('cached');
        return;
      } catch(e) {}
    }
    setUserLocation(null);
  }, [user]);

  // جلب تفاصيل برنامج كاملة مع دعم الكاش الموحد
  const fetchFullProgram = useCallback(async (programId) => {
    try {
      const cachedImages = getProgramImages(programId);
      const res = await fetch(`${API_BASE}/api/programs/${programId}`);
      if (!res.ok) throw new Error('فشل تحميل بيانات البرنامج');
      const data = await res.json();
      const prog = data.program || data.data || data;
      if (prog) {
        let images = [];
        if (cachedImages && cachedImages.length > 0) {
          images = cachedImages;
        } else {
          if (prog.images && prog.images.length > 0) {
            images = prog.images.map(img => buildImageUrl(img.url || img.image_url || img)).filter(Boolean);
          } else if (prog.image) {
            const imgUrl = buildImageUrl(prog.image);
            if (imgUrl) images = [imgUrl];
          }
          if (images.length > 0) await saveProgramImages(programId, images);
        }
        return { ...prog, images: images.length > 0 ? images : [], hasCachedImages: !!cachedImages };
      }
      return null;
    } catch(e) {
      console.error('Error fetching program:', e);
      return null;
    }
  }, []);

  // تحميل قائمة المفضلة من localStorage وجلب تفاصيل البرامج
  const loadFavorites = useCallback(async (force = false) => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      setError(null);
      previousFavoritesRef.current = [];
      hasLoadedRef.current = false;
      return;
    }

    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    setLoading(true);
    setError(null);
    
    try {
      const favoritesKey = getFavoritesKey(user.id);
      const favoriteIds = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
      
      if (favoriteIds.length === 0) {
        if (!force && previousFavoritesRef.current.length > 0) {
          setFavorites(previousFavoritesRef.current);
          setLoading(false);
          isLoadingRef.current = false;
          return;
        } else {
          setFavorites([]);
          previousFavoritesRef.current = [];
          hasLoadedRef.current = true;
          setLoading(false);
          isLoadingRef.current = false;
          return;
        }
      }

      const res = await fetch(`${API_BASE}/api/programs`);
      if (!res.ok) throw new Error('فشل تحميل البرامج');
      const data = await res.json();
      let allPrograms = [];
      if (data.success && Array.isArray(data.programs)) allPrograms = data.programs;
      else if (Array.isArray(data)) allPrograms = data;
      else allPrograms = [];

      const favProgramsBasic = allPrograms.filter(p => favoriteIds.includes(p.id) && p.status === 'active');

      const detailed = await Promise.all(
        favProgramsBasic.map(async (p) => {
          try {
            const full = await fetchFullProgram(p.id);
            return full || p;
          } catch { return p; }
        })
      );
      
      const validFavorites = detailed.filter(p => p !== null);
      
      if (validFavorites.length === 0 && !force && previousFavoritesRef.current.length > 0) {
        setFavorites(previousFavoritesRef.current);
        toast.warning(lang === 'ar' ? 'حدث خطأ، تم عرض آخر قائمة محفوظة' : 'Error, showing last saved list');
      } else {
        previousFavoritesRef.current = validFavorites;
        setFavorites(validFavorites);
      }

      const currentFavorites = validFavorites.length > 0 ? validFavorites : previousFavoritesRef.current;
      const initialIndex = {};
      currentFavorites.forEach(p => { if (p && p.id) initialIndex[p.id] = 0; });
      setImageIndex(initialIndex);
      
      if (validFavorites.length === 0 && favoriteIds.length > 0) {
        toast.info(lang === 'ar' ? 'بعض البرامج المفضلة غير متاحة حالياً' : 'Some favorite programs are not available');
      }
      
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError(err.message);
      if (previousFavoritesRef.current.length > 0) {
        setFavorites(previousFavoritesRef.current);
        toast.warning(lang === 'ar' ? 'حدث خطأ، تم عرض آخر قائمة محفوظة' : 'Error, showing last saved list');
      } else {
        toast.error(lang === 'ar' ? 'حدث خطأ أثناء تحميل المفضلة' : 'Error loading favorites');
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [user, lang, fetchFullProgram]);

  // إزالة من المفضلة
  const removeFavorite = useCallback((programId) => {
    if (!user) return;
    const favoritesKey = getFavoritesKey(user.id);
    const favoriteIds = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    const newFavs = favoriteIds.filter(id => id !== programId);
    localStorage.setItem(favoritesKey, JSON.stringify(newFavs));
    setFavorites(prev => prev.filter(p => p.id !== programId));
    previousFavoritesRef.current = previousFavoritesRef.current.filter(p => p.id !== programId);
    toast.success(lang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites');
  }, [user, lang]);

  // دوال التفاعل (دردشة، حجز، عرض على الخريطة)
  const convertGuideId = (guideId, guideName) => {
    if (guideId && !isNaN(Number(guideId))) return Number(guideId);
    if (guideId === "64be64ff-ae41-4eb0-a41f-27de577b6246") return 6;
    if (guideId === "d93beb84-4e67-4f64-bfe9-d20cc25f8b44") return 1;
    if (guideName === "مرشد سياحي") return 6;
    return null;
  };

  const handleChatWithGuide = (guideId, guideName) => {
    if (!user) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      setPage('profile');
      return;
    }
    const numericGuideId = convertGuideId(guideId, guideName);
    if (!numericGuideId) {
      toast.error(lang === 'ar' ? 'معرف المرشد غير صالح' : 'Invalid guide ID');
      return;
    }
    if (String(numericGuideId) === String(user.id)) {
      toast.error(lang === 'ar' ? 'لا يمكنك فتح محادثة مع نفسك' : 'Cannot start chat with yourself');
      return;
    }
    const chatParams = { recipientId: numericGuideId, recipientName: guideName || 'المرشد', timestamp: Date.now() };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    toast.success(lang === 'ar' ? `تم فتح المحادثة مع ${guideName}` : `Chat opened with ${guideName}`);
    setPage('directChat');
  };

  // ✅ دالة الحجز المعدلة مع التحقق من الحجز المسبق
  const handleBooking = async (program) => {
    if (!user) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      setPage('profile');
      return;
    }
    // التحقق من وجود حجز معلق
    if (bookedProgramIds.includes(program.id)) {
      toast.info(lang === 'ar' ? 'لديك طلب حجز معلق لهذا البرنامج' : 'You have a pending booking for this program');
      return;
    }
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({
          user_id: user.id,
          subject: `طلب حجز: ${program.name}`,
          type: 'general',
          priority: 'normal',
          message: `أود حجز البرنامج "${program.name}" للمرشد ${program.guide_name}`,
          metadata: {
            program_id: program.id,
            program_name: program.name,
            guide_id: program.guide_id,
            guide_name: program.guide_name,
            tourist_id: user.id,
            tourist_name: user.name || user.fullName,
            is_booking: true,
            created_from: 'favorites_page'
          }
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(lang === 'ar' ? 'تم إرسال طلب الحجز بنجاح' : 'Booking request sent');
        // حفظ محلياً
        const localBooking = {
          id: Date.now(),
          user_id: user.id,
          program_id: program.id,
          program_name: program.name,
          program_price: program.price,
          created_at: new Date().toISOString(),
          status: 'pending',
          guide_id: program.guide_id
        };
        const key = LOCAL_BOOKINGS_KEY(user.id);
        const existing = localStorage.getItem(key);
        let bookings = existing ? JSON.parse(existing) : [];
        bookings.push(localBooking);
        localStorage.setItem(key, JSON.stringify(bookings));
        refreshBookedPrograms(); // تحديث القائمة فوراً
      } else {
        toast.error(result.message || (lang === 'ar' ? 'فشل إرسال طلب الحجز' : 'Booking failed'));
      }
    } catch(e) {
      toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleViewOnMap = useCallback((id) => {
    localStorage.setItem('selectedProgramId', id);
    setPage('explore');
  }, [setPage]);

  const nextImage = (e, id, total) => {
    e.stopPropagation();
    setImageIndex(prev => ({ ...prev, [id]: (prev[id] + 1) % total }));
  };
  const prevImage = (e, id, total) => {
    e.stopPropagation();
    setImageIndex(prev => ({ ...prev, [id]: (prev[id] - 1 + total) % total }));
  };

  const goToMapForLocation = () => {
    localStorage.setItem('redirectAfterLocation', 'favorites');
    setPage('explore');
  };

  // تحميل المفضلة عند تغيير المستخدم أو عند أول تحميل
  useEffect(() => {
    loadStoredLocation();
    if (user) {
      if (!hasLoadedRef.current) {
        loadFavorites(true);
      }
    } else {
      setFavorites([]);
      setLoading(false);
      previousFavoritesRef.current = [];
      hasLoadedRef.current = false;
    }
  }, [user, loadFavorites, loadStoredLocation]);

  // الاستماع لتغييرات localStorage من نوافذ أخرى
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (user && event.key === getFavoritesKey(user.id)) {
        loadFavorites(true);
      }
      // أيضًا الاستماع لتغييرات الحجوزات
      if (user && event.key === LOCAL_BOOKINGS_KEY(user.id)) {
        refreshBookedPrograms();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, loadFavorites, refreshBookedPrograms]);

  if (loading && favorites.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
        <div className="text-center py-12">
          <Heart size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {lang === 'ar' ? 'يرجى تسجيل الدخول لعرض مفضلاتك' : 'Please login to view your favorites'}
          </p>
          <button onClick={() => setPage('profile')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
            {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {lang === 'ar' ? 'المفضلة' : 'Favorites'}
        </h1>
        <button
          onClick={goToMapForLocation}
          className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:shadow transition flex items-center gap-1 text-sm text-green-600 dark:text-green-400"
        >
          <Map size={16} />
          <span className="hidden sm:inline">{lang === 'ar' ? 'تحديد موقعي' : 'Set location'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-yellow-700 dark:text-yellow-300 text-sm flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button onClick={() => loadFavorites(true)} className="underline hover:no-underline text-green-600 dark:text-green-400">
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {userLocation && (
        <div className="mb-4 text-xs text-center text-gray-500 dark:text-gray-400">
          {locationSource === 'manual' ? '📍 موقع محدد يدوياً' : '📍 موقع مخزن سابقاً'}
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {lang === 'ar' ? 'لا توجد برامج في المفضلة بعد' : 'No favorite programs yet'}
          </p>
          <button onClick={() => setPage('explore')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
            {lang === 'ar' ? 'استكشف البرامج' : 'Explore Programs'}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {favorites.map(program => {
            const images = program.images || [];
            const currentImgIndex = imageIndex[program.id] || 0;
            const currentImg = images[currentImgIndex] || null;
            let distance = null;
            if (userLocation && program.location_lat && program.location_lng) {
              distance = getDistance(userLocation.lat, userLocation.lng, program.location_lat, program.location_lng);
              if (distance !== null) distance = distance.toFixed(1);
            }
            const activity = getActivityType(program, lang);
            const activityLabel = lang === 'ar' ? activity.ar : activity.en;
            const isBooked = bookedProgramIds.includes(program.id);

            return (
              <div key={program.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition overflow-hidden relative">
                <button
                  onClick={() => removeFavorite(program.id)}
                  className="absolute top-2 right-2 z-20 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full transition shadow-md"
                >
                  <Trash2 size={16} />
                </button>
                <div className="relative w-full h-64 md:h-72 bg-gray-200">
                  {currentImg ? (
                    <img
                      key={`${program.id}-${currentImgIndex}`}
                      src={currentImg}
                      alt={program.name}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        console.warn(`⚠️ Failed to load image: ${currentImg}`);
                        const newImages = images.filter((_, i) => i !== currentImgIndex);
                        if (newImages.length === 0) {
                          clearProgramImages(program.id);
                          setFavorites(prev => prev.map(p => 
                            p.id === program.id ? { ...p, images: [] } : p
                          ));
                        } else {
                          const newIndex = currentImgIndex >= newImages.length ? newImages.length - 1 : currentImgIndex;
                          setImageIndex(prev => ({ ...prev, [program.id]: newIndex }));
                          saveProgramImages(program.id, newImages);
                          setFavorites(prev => prev.map(p => 
                            p.id === program.id ? { ...p, images: newImages } : p
                          ));
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={40} />
                      <span className="text-sm mt-1">لا توجد صورة</span>
                      <button 
                        onClick={async () => {
                          const prog = await fetchFullProgram(program.id);
                          if (prog && prog.images.length > 0) {
                            setFavorites(prev => prev.map(p => 
                              p.id === program.id ? { ...p, images: prog.images } : p
                            ));
                            setImageIndex(prev => ({ ...prev, [program.id]: 0 }));
                          }
                        }}
                        className="mt-2 text-xs text-green-600 hover:underline"
                      >
                        إعادة تحميل
                      </button>
                    </div>
                  )}
                  {images.length > 1 && (
                    <>
                      <button onClick={(e) => prevImage(e, program.id, images.length)} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full text-sm hover:bg-black/70 transition z-10">❮</button>
                      <button onClick={(e) => nextImage(e, program.id, images.length)} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full text-sm hover:bg-black/70 transition z-10">❯</button>
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">{currentImgIndex+1} / {images.length}</span>
                    </>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 text-white">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{program.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-purple-500/80 backdrop-blur-sm px-2 py-0.5 rounded-full">{activity.icon} {activityLabel}</span>
                          {distance && <span className="text-xs bg-blue-500/80 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1"><Navigation size={12} /> {distance} كم</span>}
                          <span className="text-xs bg-green-500/80 backdrop-blur-sm px-2 py-0.5 rounded-full">{program.duration || 'غير محدد'}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">{program.guide_name || 'مرشد سياحي'}</div>
                        <div className="text-xs flex items-center gap-1 mt-0.5"><MapPin size={12} /> <span className="truncate max-w-[120px]">{program.location_name || program.location || 'موقع البرنامج'}</span></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-2">
                        <Star size={14} className="text-yellow-400 fill-current" />
                        <span className="text-sm">{program.rating || 4.5}</span>
                        <span className="text-sm font-bold bg-green-600/80 px-2 py-0.5 rounded-full">{program.price} ريال</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleChatWithGuide(program.guide_id, program.guide_name)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition"><MessageCircle size={14} />{lang === 'ar' ? 'دردشة' : 'Chat'}</button>
                        <button 
                          onClick={() => handleBooking(program)} 
                          disabled={bookingLoading || isBooked}
                          className={`${(bookingLoading || isBooked) ? 'bg-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'} text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition disabled:opacity-50`}
                        >
                          <CalendarCheck size={14} /> 
                          {isBooked ? (lang === 'ar' ? 'تم الطلب' : 'Requested') : (lang === 'ar' ? 'احجز' : 'Book')}
                        </button>
                        <button 
                          onClick={() => handleViewOnMap(program.id)} 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition"
                        >
                          <Map size={14} />{lang === 'ar' ? 'خريطة' : 'Map'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FavoritesPage;

// client/src/pages/HomePage.jsx
// ✅ النسخة النهائية – عرض كامل للبيانات والصور مع توحيد الكاش مع GuideDashboard و ExplorePage
// ✅ استخدام نفس نظام الكاش الموحد (guide_programs_images_cache)
// ✅ عرض جميع بيانات البرنامج: الاسم، السعر، المدة، الموقع، التقييم، المسافة
// ✅ عرض صور متعددة مع أزرار تنقل
// ✅ معالجة الأخطاء وعرض رسائل للمستخدم
// ✅ إزالة زر المفضلة من الهيرو (موجود في شريط التنقل السفلي)

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  FaStar, FaSun, FaMoon, FaMapMarkerAlt, 
  FaBoxOpen, FaSpinner, FaLocationArrow, FaRedoAlt, FaArrowUp,
  FaHeart, FaCalendarCheck, FaMapMarkedAlt
} from 'react-icons/fa';
import { 
  MapPin, Bell, Search, Users, 
  Navigation, MessageCircle, CalendarCheck, Shield, Sun, Moon, Compass,
  Home, User, Map as MapIcon, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = 'https://tourist-app-api.onrender.com';

const NEARBY_RADIUS_KM = 245;
const LOCATION_TIMEOUT = 15000;
const MAX_RETRY_ATTEMPTS = 5;

// ✅ توحيد مفتاح تخزين الصور مع GuideDashboard و ExplorePage
const IMAGE_CACHE_KEY = 'guide_programs_images_cache';
const LEGACY_IMAGE_KEY = (programId) => `program_images_${programId}`;

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
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

// ✅ دالة موحدة لحفظ صور البرنامج في localStorage (مثل GuideDashboard)
const saveImagesToCache = (programId, images) => {
  try {
    const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    if (images && images.length > 0) {
      const imagesWithId = images.map(url => ({
        url: typeof url === 'string' ? url : (url.url || url.image_url || null),
        is_primary: url.is_primary !== undefined ? url.is_primary : false,
        id: url.id || null
      }));
      cache[programId] = {
        images: imagesWithId,
        timestamp: Date.now()
      };
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
      console.log(`💾 Saved ${imagesWithId.length} images to cache for program ${programId}`);
    } else {
      delete cache[programId];
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
      console.log(`🗑️ Cleared cache for program ${programId}`);
    }
  } catch (e) {
    console.warn('Failed to save images to cache:', e);
  }
};

// ✅ دالة موحدة لاسترجاع صور البرنامج من localStorage (مثل GuideDashboard)
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
  } catch (e) {
    return null;
  }
};

// ✅ دالة احتياطية لاسترجاع الصور من المفتاح القديم
const getLegacyImages = (programId) => {
  try {
    const key = LEGACY_IMAGE_KEY(programId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const images = JSON.parse(saved);
      if (images && images.length > 0) {
        return images;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

// ✅ دالة موحدة لحفظ صور البرنامج
const saveProgramImages = async (programId, images) => {
  try {
    if (!programId) return;
    const validImages = await filterValidImages(images);
    if (validImages.length === 0) {
      saveImagesToCache(programId, []);
      const key = LEGACY_IMAGE_KEY(programId);
      localStorage.removeItem(key);
      console.log(`🗑️ No valid images for program ${programId}, cache cleared`);
      return;
    }
    
    saveImagesToCache(programId, validImages);
    
    const key = LEGACY_IMAGE_KEY(programId);
    localStorage.setItem(key, JSON.stringify(validImages));
    console.log(`✅ Saved ${validImages.length} valid images for program ${programId}`);
  } catch (error) {
    console.error('Error saving program images:', error);
  }
};

// ✅ دالة موحدة لاسترجاع صور البرنامج
const getProgramImages = (programId) => {
  try {
    if (!programId) return null;
    const cached = getImagesFromCache(programId);
    if (cached && cached.length > 0) {
      console.log(`✅ Retrieved ${cached.length} images from global cache for program ${programId}`);
      return cached;
    }
    const legacy = getLegacyImages(programId);
    if (legacy && legacy.length > 0) {
      saveImagesToCache(programId, legacy);
      console.log(`✅ Migrated ${legacy.length} images from legacy to global cache for program ${programId}`);
      return legacy;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving program images:', error);
    return null;
  }
};

// ✅ دالة لمسح صور البرنامج
const clearProgramImages = (programId) => {
  try {
    if (!programId) return;
    saveImagesToCache(programId, []);
    const key = LEGACY_IMAGE_KEY(programId);
    localStorage.removeItem(key);
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
  if (text.includes('بحر') || text.includes('بحري') || text.includes('marine')) 
    return { ar: 'رحلات بحرية', en: 'Marine trips', icon: '🌊', color: 'blue' };
  if (text.includes('تسلق') || text.includes('جبل') || text.includes('mountain') || text.includes('climb')) 
    return { ar: 'تسلق جبال', en: 'Mountain climbing', icon: '⛰️', color: 'green' };
  if (text.includes('سفاري') || text.includes('safari')) 
    return { ar: 'رحلات سفاري', en: 'Safari trips', icon: '🦁', color: 'orange' };
  if (text.includes('براشوت') || text.includes('مظلة') || text.includes('parachute')) 
    return { ar: 'رحلات براشوت', en: 'Parachute trips', icon: '🪂', color: 'purple' };
  return { ar: 'برنامج سياحي', en: 'Tour program', icon: '🏞️', color: 'teal' };
};

const LOCALES = {
  ar: {
    appName: 'تطبيق السائح',
    welcome: 'مرحباً بك',
    search: 'ابحث عن وجهة...',
    explore: 'استكشف',
    nearbyPrograms: 'البرامج القريبة منك',
    map: 'الخريطة',
    nearby: 'القريبة',
    guides: 'المرشدون',
    favorites: 'المفضلة',
    archiveTrips: 'أرشيف الرحلات',
    guideDashboard: 'لوحة التحكم',
    loading: 'جاري تحميل البرامج...',
    noPrograms: 'لا توجد برامج سياحية قريبة حالياً',
    noProgramsAtAll: 'لا توجد برامج سياحية متاحة',
    loginRequired: 'الرجاء تسجيل الدخول أولاً',
    distance: 'كم',
    price: 'ريال',
    rating: 'تقييم',
    chat: 'دردشة',
    book: 'احجز',
    viewOnMap: 'خريطة',
    addToFavorites: 'مفضلة',
    removeFromFavorites: 'تمت الإزالة',
    requestSent: 'تم إرسال طلب الحجز بنجاح',
    bookingFailed: 'فشل إرسال طلب الحجز',
    locationUpdated: 'تم تحديث الموقع',
    usingGps: '📍 تتبع مباشر',
    usingManual: '📍 يدوي',
    updateLocation: 'تحديث موقعي',
    refresh: 'تحديث',
    connectionError: 'فشل الاتصال بالإنترنت',
    tryAgainLater: 'حاول مرة أخرى لاحقاً',
    exploreNature: 'استكشف الطبيعة الخلابة',
    home: 'الرئيسية',
    profile: 'الملف الشخصي',
    notifications: 'الإشعارات',
    viewAll: 'عرض الكل',
    showNearby: 'القريبة فقط',
    showAll: 'عرض الكل',
    noLocation: 'لم يتم تحديد الموقع',
    getLocation: 'تحديد الموقع',
    retry: 'إعادة المحاولة',
    locating: 'جاري تحديد موقعك...',
    locationError: 'تعذر تحديد موقعك. تأكد من تفعيل GPS',
    locationPermissionDenied: 'الوصول إلى الموقع ممنوع',
    locationTimeout: 'انتهت مهلة تحديد الموقع',
    cannotChatOwn: 'لا يمكنك فتح محادثة مع نفسك',
    location: 'الموقع',
    programsNearby: 'برامج سياحية ضمن 245 كم',
    loadingImages: 'جاري تحميل الصور...',
    noImage: 'لا توجد صورة',
  },
  en: {
    appName: 'Tourist App',
    welcome: 'Welcome',
    search: 'Search...',
    explore: 'Explore',
    nearbyPrograms: 'Nearby Programs',
    map: 'Map',
    nearby: 'Nearby',
    guides: 'Guides',
    favorites: 'Favorites',
    archiveTrips: 'Archive',
    guideDashboard: 'Dashboard',
    loading: 'Loading programs...',
    noPrograms: 'No nearby programs available',
    noProgramsAtAll: 'No tour programs available',
    loginRequired: 'Please login first',
    distance: 'km',
    price: 'SAR',
    rating: 'Rating',
    chat: 'Chat',
    book: 'Book',
    viewOnMap: 'Map',
    addToFavorites: 'Favorite',
    removeFromFavorites: 'Removed',
    requestSent: 'Booking request sent',
    bookingFailed: 'Booking failed',
    locationUpdated: 'Location updated',
    usingGps: '📍 Live tracking',
    usingManual: '📍 Manual',
    updateLocation: 'Update location',
    refresh: 'Refresh',
    connectionError: 'Connection failed',
    tryAgainLater: 'Please try again later',
    exploreNature: 'Explore beautiful nature',
    home: 'Home',
    profile: 'Profile',
    notifications: 'Notifications',
    viewAll: 'View All',
    showNearby: 'Nearby',
    showAll: 'Show All',
    noLocation: 'Location not set',
    getLocation: 'Get Location',
    retry: 'Retry',
    locating: 'Locating you...',
    locationError: 'Could not determine your location. Please enable GPS',
    locationPermissionDenied: 'Location permission denied',
    locationTimeout: 'Location request timeout',
    cannotChatOwn: 'Cannot start chat with yourself',
    location: 'Location',
    programsNearby: 'Tour programs within 245 km',
    loadingImages: 'Loading images...',
    noImage: 'No image',
  }
};

const HeroAd = ({ lang, setPage }) => {
  const t = (key) => LOCALES[lang]?.[key] || key;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl overflow-hidden mb-4 shadow-lg"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-700" />
      <div className="relative p-5 text-white text-center">
        <h2 className="text-2xl font-bold mb-1">🌟 {t('appName')}</h2>
        <p className="text-sm opacity-95 mb-3">
          {lang === 'ar' 
            ? 'اكتشف أجمل الوجهات السياحية مع مرشدين محترفين'
            : 'Discover the best tourist destinations with professional guides'}
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          <button onClick={() => setPage('explore')} className="bg-white text-green-700 px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
            <MapPin size={16} /> {lang === 'ar' ? 'استكشف الآن' : 'Explore Now'}
          </button>
          <button onClick={() => setPage('guides')} className="bg-transparent border-2 border-white px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-white/20 transition">
            <Users size={16} /> {lang === 'ar' ? 'المرشدون' : 'Guides'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const ProgramCard = React.memo(({ program, lang, onBook, onView, onChat, isFavorite, onToggleFavorite, dark }) => {
  const t = (key) => LOCALES[lang]?.[key] || key;
  const activity = getActivityType(program, lang);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  
  // ✅ استرجاع الصور من البرنامج (باستخدام الكاش الموحد)
  const getImagesList = useMemo(() => {
    const images = [];
    
    if (program.images && Array.isArray(program.images) && program.images.length > 0) {
      program.images.forEach(img => {
        if (typeof img === 'string') {
          const url = buildImageUrl(img);
          if (url) images.push(url);
        } else if (typeof img === 'object' && img !== null) {
          const url = buildImageUrl(img.url || img.image_url || img);
          if (url) images.push(url);
        }
      });
    }
    
    if (program.image && images.length === 0) {
      const url = buildImageUrl(program.image);
      if (url) images.push(url);
    }
    
    return images;
  }, [program.images, program.image]);
  
  const currentImage = getImagesList.length > 0 ? getImagesList[currentImageIndex] : null;
  const totalImages = getImagesList.length;
  
  const nextImage = (e) => {
    e.stopPropagation();
    if (totalImages > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % totalImages);
      setImageError(false);
    }
  };
  
  const prevImage = (e) => {
    e.stopPropagation();
    if (totalImages > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
      setImageError(false);
    }
  };
  
  const distance = program.distance !== Infinity ? program.distance.toFixed(1) : null;
  const cardBg = dark ? 'bg-gray-800' : 'bg-white';
  const borderColor = dark ? 'border-gray-700' : 'border-gray-200';
  const textColor = dark ? 'text-white' : 'text-gray-800';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className={`${cardBg} rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border ${borderColor}`}
    >
      <div className="relative w-full bg-gray-200 dark:bg-gray-700" style={{ minHeight: '200px', maxHeight: '280px' }}>
        {loadingImage ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-700">
            <FaSpinner className="animate-spin h-8 w-8" />
            <span className="text-xs mt-1">{t('loadingImages')}</span>
          </div>
        ) : currentImage && !imageError ? (
          <img 
            key={`${program.id}-${currentImageIndex}-${currentImage}`}
            src={currentImage} 
            alt={program.name} 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
            style={{ minHeight: '200px', maxHeight: '280px' }} 
            loading="lazy"
            crossOrigin="anonymous"
            onLoad={() => setLoadingImage(false)}
            onError={() => {
              setImageError(true);
              setLoadingImage(false);
              // ✅ محاولة الانتقال للصورة التالية إذا فشل التحميل
              if (totalImages > 1) {
                const newIndex = (currentImageIndex + 1) % totalImages;
                setCurrentImageIndex(newIndex);
                setImageError(false);
                // حذف الصورة الفاشلة من cache
                const newImages = getImagesList.filter((_, i) => i !== currentImageIndex);
                if (newImages.length > 0) {
                  saveProgramImages(program.id, newImages);
                } else {
                  clearProgramImages(program.id);
                }
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-700">
            <FaBoxOpen size={32} />
            <span className="text-xs mt-1">{t('noImage')}</span>
            <button 
              onClick={() => {
                setLoadingImage(true);
                setImageError(false);
                // محاولة إعادة جلب الصور من API
                const fetchImages = async () => {
                  try {
                    const res = await fetch(`${API_BASE}/api/programs/${program.id}`);
                    const data = await res.json();
                    const prog = data.program || data.data || data;
                    let images = [];
                    if (prog?.images?.length) {
                      images = prog.images.map(img => buildImageUrl(img.url || img.image_url)).filter(Boolean);
                    } else if (prog?.image) {
                      const url = buildImageUrl(prog.image);
                      if (url) images = [url];
                    }
                    if (images.length > 0) {
                      await saveProgramImages(program.id, images);
                      const cached = getProgramImages(program.id);
                      if (cached && cached.length > 0) {
                        // تحديث البرنامج في القائمة
                        program.images = cached;
                        setCurrentImageIndex(0);
                        setImageError(false);
                        setLoadingImage(false);
                        window.location.reload(); // بسيط: إعادة تحميل الصفحة لتحديث البيانات
                      }
                    }
                  } catch (e) {
                    console.error('Failed to reload images:', e);
                    setLoadingImage(false);
                  }
                };
                fetchImages();
              }}
              className="mt-2 text-xs text-green-600 hover:underline"
            >
              إعادة تحميل
            </button>
          </div>
        )}
        
        {totalImages > 1 && !imageError && currentImage && (
          <>
            <button 
              onClick={prevImage} 
              className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition z-10 text-xs pointer-events-auto"
              style={{ touchAction: 'manipulation' }}
            >
              ❮
            </button>
            <button 
              onClick={nextImage} 
              className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition z-10 text-xs pointer-events-auto"
              style={{ touchAction: 'manipulation' }}
            >
              ❯
            </button>
            <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10">
              {currentImageIndex+1}/{totalImages}
            </div>
          </>
        )}
        
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
          <span>{activity.icon}</span>
          <span className="hidden sm:inline">{activity[lang]}</span>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(program.id); }}
          className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm p-1.5 rounded-full hover:bg-black/60 transition z-10"
        >
          <FaHeart size={14} className={isFavorite ? 'text-red-500' : 'text-white'} />
        </button>
        
        <div className="absolute bottom-14 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
          <Star size={10} className="fill-yellow-400 text-yellow-400" />
          <span>{program.rating || 4.5}</span>
        </div>
        
        <div className="absolute bottom-14 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
          {program.price} {t('price')}
        </div>
        
        {distance && (
          <div className="absolute bottom-7 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
            <Navigation size={10} /> {distance} {t('distance')}
          </div>
        )}
        
        <div className="absolute bottom-2 right-2 left-28 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full truncate z-10">
          {program.name}
        </div>
      </div>
      
      <div className="p-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className={`text-sm font-bold ${textColor} truncate`}>{program.name}</h3>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {program.duration || 'غير محدد'}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
          <MapPin size={10} />
          <span className="truncate">{program.location_name || program.location || 'موقع البرنامج'}</span>
        </div>
        
        <div className="flex gap-1.5 mt-2">
          <button 
            onClick={() => onView(program.id)} 
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-medium py-1.5 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-center gap-1"
          >
            <FaMapMarkedAlt size={10} /> {t('viewOnMap')}
          </button>
          <button 
            onClick={() => onChat(program.guide_id, program.guide_name)} 
            className="flex-1 bg-blue-500 text-white text-[10px] font-medium py-1.5 px-2 rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-1"
          >
            <MessageCircle size={10} /> {t('chat')}
          </button>
          <button 
            onClick={() => onBook(program)} 
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-medium py-1.5 px-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition flex items-center justify-center gap-1"
          >
            <CalendarCheck size={10} /> {t('book')}
          </button>
        </div>
      </div>
    </motion.div>
  );
});

function HomePage({ lang = 'ar', user, setPage, dark, setDark }) {
  const t = (key) => LOCALES[lang]?.[key] || key;

  const [allPrograms, setAllPrograms] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationSource, setLocationSource] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`favorites_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [showAllMode, setShowAllMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  
  const [guidesMap, setGuidesMap] = useState({});
  const isFetchingRef = useRef(false);
  const contentRef = useRef(null);
  const watchIdRef = useRef(null);
  const locationTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const locationLoadedRef = useRef(false);

  const getUserAvatarUrl = useCallback(() => {
    if (!user) return null;
    if (user.avatar) return user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`;
    if (user.avatar_url) return user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE}${user.avatar_url}`;
    return null;
  }, [user]);

  // ✅ دالة محسنة لجلب برنامج كامل مع الصور باستخدام الكاش الموحد
  const fetchFullProgram = useCallback(async (id) => {
    try {
      // ✅ التحقق من الصور في الكاش أولاً
      const cachedImages = getProgramImages(id);
      
      const res = await fetch(`${API_BASE}/api/programs/${id}`);
      const data = await res.json();
      const prog = data.program || data.data || data;
      
      if (prog) {
        let images = [];
        
        if (cachedImages && cachedImages.length > 0) {
          images = cachedImages;
          console.log(`📸 Using cached images for program ${id}`);
        } else {
          // جلب الصور من البيانات
          if (prog.images && prog.images.length > 0) {
            images = prog.images
              .map(img => buildImageUrl(img.url || img.image_url || img))
              .filter(Boolean);
          } else if (prog.image) {
            const imgUrl = buildImageUrl(prog.image);
            if (imgUrl) images = [imgUrl];
          }
          
          if (images.length > 0) {
            await saveProgramImages(id, images);
            console.log(`💾 Saved ${images.length} images for program ${id}`);
          }
        }
        
        let guide_avatar = null;
        if (prog.guide_id && guidesMap[prog.guide_id]) {
          guide_avatar = guidesMap[prog.guide_id].avatar;
        } else if (prog.guide_name && guidesMap[prog.guide_name]) {
          guide_avatar = guidesMap[prog.guide_name].avatar;
        }
        
        return { 
          ...prog, 
          images: images.length > 0 ? images : [],
          guide_avatar,
          hasCachedImages: !!cachedImages,
        };
      }
    } catch(e) {
      console.error('Error fetching program:', e);
    }
    return null;
  }, [guidesMap]);

  const fetchAllPrograms = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/programs`);
      if (!res.ok) throw new Error('HTTP error');
      const data = await res.json();
      let list = [];
      if (data.success && Array.isArray(data.programs)) list = data.programs;
      else if (Array.isArray(data)) list = data;
      else list = [];
      const active = list.filter(p => (p.status || '').toLowerCase() === 'active');
      const detailed = await Promise.all(active.map(p => fetchFullProgram(p.id).catch(() => p)));
      setAllPrograms(detailed.filter(Boolean));
      setInitialLoadDone(true);
    } catch (err) {
      console.error(err);
      setError(t('connectionError'));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchFullProgram, t]);

  const toggleFavorite = useCallback((id) => {
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    const isFav = favoriteIds.includes(id);
    const newFavs = isFav ? favoriteIds.filter(i => i !== id) : [...favoriteIds, id];
    setFavoriteIds(newFavs);
    toast.success(isFav ? t('removeFromFavorites') : t('addToFavorites'));
  }, [user, favoriteIds, t, setPage]);

  const handleChat = useCallback((guideId, guideName) => {
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    if (String(guideId) === String(user.id)) {
      toast.error(t('cannotChatOwn'));
      return;
    }
    const chatParams = { 
      recipientId: guideId, 
      recipientName: guideName || 'المرشد', 
      timestamp: Date.now() 
    };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    toast.success(lang === 'ar' ? `تم فتح المحادثة مع ${guideName}` : `Chat opened with ${guideName}`);
    setPage('directChat');
  }, [user, t, setPage, lang]);

  const handleBooking = useCallback(async (program) => {
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          ...(token && { Authorization: `Bearer ${token}` }) 
        },
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
            created_from: 'home_page'
          }
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(t('requestSent'));
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
        const key = `local_bookings_${user.id}`;
        const existing = localStorage.getItem(key);
        let bookings = existing ? JSON.parse(existing) : [];
        bookings.push(localBooking);
        localStorage.setItem(key, JSON.stringify(bookings));
      } else {
        toast.error(result.message || t('bookingFailed'));
      }
    } catch(e) {
      toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error');
    } finally {
      setBookingLoading(false);
    }
  }, [user, t, setPage, lang]);

  const handleViewOnMap = useCallback((id) => {
    localStorage.setItem('selectedProgramId', String(id));
    setPage('explore');
  }, [setPage]);

  const handleRefresh = useCallback(() => {
    setInitialLoadDone(false);
    fetchAllPrograms();
  }, [fetchAllPrograms]);
  
  const toggleDisplayMode = useCallback(() => setShowAllMode(prev => !prev), []);

  const displayedPrograms = useMemo(() => {
    if (!userLocation || allPrograms.length === 0) return [];
    
    const withDist = allPrograms.map(p => {
      let dist = Infinity;
      if (p.location_lat && p.location_lng) {
        dist = getDistance(userLocation.lat, userLocation.lng, p.location_lat, p.location_lng);
      }
      return { ...p, distance: dist };
    });
    
    withDist.sort((a, b) => a.distance - b.distance);
    
    const nearby = withDist.filter(p => p.distance <= NEARBY_RADIUS_KM);
    
    if (showAllMode) return withDist;
    return nearby;
  }, [allPrograms, userLocation, showAllMode]);

  // ✅ فقط useEffect واحد للتحكم في الموقع
  useEffect(() => {
    if (!user?.id || locationLoadedRef.current) return;
    
    const saved = localStorage.getItem(`manual_loc_${user.id}`);
    if (saved) {
      try {
        const { lat, lng } = JSON.parse(saved);
        if (isValidLocation(lat, lng)) {
          setUserLocation({ lat, lng });
          setLocationSource('manual');
          setLocationStatus('acquired');
          locationLoadedRef.current = true;
          return;
        }
      } catch(e) {}
    }
    
    // بدء تتبع الموقع
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError(t('locationError'));
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
      setLocationError(t('locationTimeout'));
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
            setLocationError(t('locationError'));
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
            locationLoadedRef.current = true;
          }
          return;
        }

        retryCountRef.current = 0;
        
        if (locationTimeoutRef.current) {
          clearTimeout(locationTimeoutRef.current);
          locationTimeoutRef.current = null;
        }

        setUserLocation({ lat: latitude, lng: longitude });
        setLocationSource('gps');
        setLocationError(null);
        setLocationStatus('acquired');
        locationLoadedRef.current = true;
        
        if (user?.id) {
          localStorage.setItem(`manual_loc_${user.id}`, JSON.stringify({ lat: latitude, lng: longitude }));
        }
        
        setIsLocating(false);
        toast.dismiss(loadingToast);
        toast.success(
          lang === 'ar' 
            ? `📍 دقة ${Math.round(accuracy)}م` 
            : `📍 ${Math.round(accuracy)}m accuracy`,
          { duration: 2000 }
        );
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
        setLocationError(errorMsg);
        toast.error(errorMsg, { duration: 4000 });
        locationLoadedRef.current = true;
        
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
  }, [user?.id, t, lang]);

  // ✅ useEffect واحد لجلب البرامج
  useEffect(() => {
    if (userLocation && !initialLoadDone && !isFetchingRef.current) {
      fetchAllPrograms();
    }
  }, [userLocation, initialLoadDone, fetchAllPrograms]);

  // ✅ useEffect للمفضلة
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favoriteIds));
    }
  }, [favoriteIds, user]);

  // ✅ useEffect لخريطة المرشدين
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

  // ✅ useEffect للإشعارات
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

  // ✅ useEffect للتمرير
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setShowScrollTop(contentRef.current.scrollTop > 300);
      }
    };
    const container = contentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleUpdateLocation = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
      locationTimeoutRef.current = null;
    }
    locationLoadedRef.current = false;
    setUserLocation(null);
    setLocationStatus('idle');
  }, []);

  const ScrollTopButton = useMemo(() => {
    if (!showScrollTop) return null;
    return (
      <button 
        onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-20 left-4 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition z-50"
      >
        <FaArrowUp size={18} />
      </button>
    );
  }, [showScrollTop]);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold mb-2">{t('welcome')}</h2>
          <p className="mb-4 text-gray-600 dark:text-gray-400">{t('loginRequired')}</p>
          <button onClick={() => setPage('profile')} className="bg-green-600 text-white px-6 py-2 rounded-lg">
            {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </button>
        </div>
      </div>
    );
  }

  const textColor = dark ? 'text-gray-100' : 'text-gray-900';
  const bgColor = dark ? 'bg-gray-900' : 'bg-gray-50';

  return (
    <div ref={contentRef} className={`${bgColor} ${textColor} h-full overflow-y-auto pb-20`} dir="rtl">
      <div className="sticky top-0 z-20 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden flex-shrink-0">
                {getUserAvatarUrl() ? (
                  <img src={getUserAvatarUrl()} alt={user.fullName || user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-lg">
                    {user.fullName?.charAt(0) || user.name?.charAt(0) || '👤'}
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-bold text-base">{user.fullName || user.name}</h1>
                <p className="text-[10px] opacity-90 flex items-center gap-1">
                  <Compass size={10} />
                  {lang === 'ar' ? 'اكتشف وجهتك القادمة' : 'Discover your next destination'}
                  {locationStatus === 'locating' && <span className="animate-pulse text-yellow-200">⏳ {t('locating')}</span>}
                  {locationStatus === 'acquired' && locationSource === 'gps' && (
                    <span className="bg-blue-500/80 text-[8px] px-1.5 py-0.5 rounded-full mr-1">📍 GPS</span>
                  )}
                  {locationStatus === 'acquired' && locationSource === 'manual' && (
                    <span className="bg-orange-500/80 text-[8px] px-1.5 py-0.5 rounded-full mr-1">📍 يدوي</span>
                  )}
                  {locationStatus === 'error' && (
                    <span className="bg-red-500/80 text-[8px] px-1.5 py-0.5 rounded-full mr-1">⚠️ خطأ</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setDark(!dark)} className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={() => setPage('notifications')} className="relative p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute right-2.5 top-2 text-white/70" size={14} />
            <input 
              type="text" 
              placeholder={t('search')} 
              className="w-full p-2 pr-8 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border border-white/30 focus:outline-none focus:border-white focus:bg-white/30 transition text-sm" 
            />
          </div>
        </div>
      </div>

      <div className="p-3">
        <HeroAd lang={lang} setPage={setPage} />

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-800 dark:text-white">
              {t('nearbyPrograms')}
            </h2>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              ({displayedPrograms.length})
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button 
              onClick={toggleDisplayMode}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
                showAllMode 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {showAllMode ? t('showNearby') : t('showAll')}
            </button>
            <button 
              onClick={handleUpdateLocation}
              className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1"
              disabled={isLocating}
            >
              <FaLocationArrow size={10} /> {t('updateLocation')}
            </button>
            <button 
              onClick={handleRefresh}
              className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-gray-600 text-white hover:bg-gray-700 transition flex items-center gap-1"
              disabled={loading}
            >
              <FaRedoAlt size={10} className={loading ? 'animate-spin' : ''} /> {t('refresh')}
            </button>
          </div>
        </div>

        {loading && !initialLoadDone && (
          <div className="text-center py-10">
            <FaSpinner className="animate-spin h-8 w-8 text-green-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
            <button onClick={handleRefresh} className="text-green-600 dark:text-green-400 underline text-sm">
              {t('retry')}
            </button>
          </div>
        )}

        {!loading && !error && !userLocation && locationStatus !== 'locating' && (
          <div className="text-center py-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <FaMapMarkerAlt size={36} className="mx-auto text-yellow-500 mb-3" />
            <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">{t('noLocation')}</p>
            <button onClick={handleUpdateLocation} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm">
              {t('getLocation')}
            </button>
          </div>
        )}

        {locationStatus === 'locating' && (
          <div className="text-center py-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <FaSpinner className="animate-spin h-8 w-8 text-blue-500 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('locating')}</p>
          </div>
        )}

        {!loading && !error && userLocation && displayedPrograms.length === 0 && locationStatus === 'acquired' && (
          <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <FaBoxOpen size={36} className="mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('noPrograms')}</p>
            {!showAllMode && (
              <button onClick={toggleDisplayMode} className="mt-2 text-green-600 dark:text-green-400 underline text-sm">
                {t('viewAll')}
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {!loading && userLocation && displayedPrograms.length > 0 && locationStatus === 'acquired' && (
            <div className="space-y-3">
              {displayedPrograms.map((program) => (
                <ProgramCard 
                  key={program.id}
                  program={program}
                  lang={lang}
                  onBook={handleBooking}
                  onView={handleViewOnMap}
                  onChat={handleChat}
                  isFavorite={favoriteIds.includes(program.id)}
                  onToggleFavorite={toggleFavorite}
                  dark={dark}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-1.5 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button onClick={() => setPage('home')} className="flex flex-col items-center gap-0.5 text-green-600 dark:text-green-400">
            <Home size={20} />
            <span className="text-[8px]">{t('home')}</span>
          </button>
          <button onClick={() => setPage('explore')} className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition">
            <Compass size={20} />
            <span className="text-[8px]">{t('explore')}</span>
          </button>
          <button onClick={() => setPage('notifications')} className="relative flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span className="text-[8px]">{t('notifications')}</span>
          </button>
          <button onClick={() => setPage('profile')} className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition">
            <User size={20} />
            <span className="text-[8px]">{t('profile')}</span>
          </button>
        </div>
      </div>

      {ScrollTopButton}
    </div>
  );
}

export default HomePage;

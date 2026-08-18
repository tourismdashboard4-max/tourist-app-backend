// client/src/pages/HomePage.jsx
// ✅ النسخة النهائية – أزرار علوية متوازية مثل أزرار البطاقة (flex-1)
// ✅ زر "تحديد" بدلاً من رمز التحديث، مع وظيفة تحديث الموقع وجلب البرامج القريبة
// ✅ مزامنة وضع العرض (القريبة/الكل) مع ExplorePage عبر localStorage
// ✅ إضافة مستمع لحدث profileUpdated لتحديث الاسم والصورة فوراً عند تغيير الملف الشخصي
// ✅ استخدام useAuth مباشرة بدلاً من prop user

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  FaStar, FaSun, FaMoon, FaMapMarkerAlt, 
  FaBoxOpen, FaSpinner, FaLocationArrow, FaRedoAlt, FaArrowUp,
  FaHeart, FaCalendarCheck, FaMapMarkedAlt, FaCheckCircle
} from 'react-icons/fa';
import { 
  MapPin, Bell, Search, Users, 
  Navigation, MessageCircle, CalendarCheck, Shield, Sun, Moon, Compass,
  Home, User, Map as MapIcon, Star, Crosshair, MousePointer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'https://tourist-app-api.onrender.com';
const NEARBY_RADIUS_KM = 245;
const LOCATION_TIMEOUT = 15000;
const MAX_RETRY_ATTEMPTS = 5;
const MIN_ACCURACY_THRESHOLD = 200;

const IMAGE_CACHE_KEY = 'guide_programs_images_cache';
const LEGACY_IMAGE_KEY = (programId) => `program_images_${programId}`;
const LOCAL_BOOKINGS_KEY = (userId) => `local_bookings_${userId}`;
const SHOW_ALL_MODE_KEY = 'show_all_programs_mode';

// ===== صورة افتراضية مدمجة (SVG) =====
const DEFAULT_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%2310b981"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="28" fill="white" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';

// ===== دوال الصور =====
const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const saveImagesToCache = (programId, images) => {
  try {
    const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    const urls = (images || []).map(url => ({ url: typeof url === 'string' ? url : url.url, is_primary: false }));
    cache[programId] = {
      images: urls.length ? urls : [{ url: DEFAULT_IMAGE, is_primary: false }],
      timestamp: Date.now()
    };
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
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
    const urls = images.map(img => buildImageUrl(img)).filter(Boolean);
    if (urls.length === 0) urls.push(DEFAULT_IMAGE);
    saveImagesToCache(programId, urls);
    localStorage.setItem(LEGACY_IMAGE_KEY(programId), JSON.stringify(urls));
  } catch (error) { console.error('Error saving program images:', error); }
};

const getProgramImages = (programId) => {
  try {
    if (!programId) return [DEFAULT_IMAGE];
    const cached = getImagesFromCache(programId);
    if (cached && cached.length > 0) return cached;
    const legacy = getLegacyImages(programId);
    if (legacy && legacy.length > 0) {
      saveImagesToCache(programId, legacy);
      return legacy;
    }
    return [DEFAULT_IMAGE];
  } catch (error) {
    console.error('Error retrieving program images:', error);
    return [DEFAULT_IMAGE];
  }
};

// ===== دوال المسافات والأنشطة =====
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

// ===== الترجمات =====
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
    alreadyBooked: 'تم طلب حجز',
    bookingExists: 'لديك طلب حجز معلق لهذا البرنامج',
    chatWithGuide: '💬 دردشة مع المرشد',
    bookNow: 'احجز الآن',
    cannotBookOwn: 'لا يمكنك حجز برنامجك الخاص',
    addedToFavorites: '✅ تمت الإضافة إلى المفضلة',
    removedFromFavorites: '🗑️ تمت الإزالة من المفضلة',
    duration: 'المدة',
    myLocation: 'موقعي',
    enableLocation: 'تفعيل الموقع',
    retryLocation: 'إعادة المحاولة',
    kmAway: 'كم',
    accuracyMeters: 'م',
    locationAcquired: '✅ تم تحديد موقعك',
    invalidLocation: 'الموقع المستلم غير صحيح',
    locate: 'تحديد',
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
    alreadyBooked: 'Booking Requested',
    bookingExists: 'You have a pending booking for this program',
    chatWithGuide: '💬 Chat With Guide',
    bookNow: 'Book Now',
    cannotBookOwn: 'You cannot book your own program',
    addedToFavorites: '✅ Added to favorites',
    removedFromFavorites: '🗑️ Removed from favorites',
    duration: 'Duration',
    myLocation: 'My Location',
    enableLocation: 'Enable location',
    retryLocation: 'Retry',
    kmAway: 'km',
    accuracyMeters: 'm',
    locationAcquired: '✅ Location acquired',
    invalidLocation: 'Invalid location received',
    locate: 'Locate',
  }
};

// ===== ProgramCard =====
const ProgramCard = React.memo(({ program, lang, onBook, onView, onChat, isFavorite, onToggleFavorite, dark, isBooked }) => {
  const t = (key) => LOCALES[lang]?.[key] || key;
  const activity = getActivityType(program, lang);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  
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
    if (images.length === 0) {
      images.push(DEFAULT_IMAGE);
    }
    return images;
  }, [program.images, program.image]);
  
  const currentImage = getImagesList.length > 0 ? getImagesList[currentImageIndex] : DEFAULT_IMAGE;
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
              const updatedImages = getImagesList.map((img, idx) => 
                idx === currentImageIndex ? DEFAULT_IMAGE : img
              );
              program.images = updatedImages;
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
                        program.images = cached;
                        setCurrentImageIndex(0);
                        setImageError(false);
                        setLoadingImage(false);
                      }
                    } else {
                      program.images = [DEFAULT_IMAGE];
                      setImageError(false);
                      setLoadingImage(false);
                    }
                  } catch (e) {
                    console.error('Failed to reload images:', e);
                    setLoadingImage(false);
                    setImageError(false);
                    program.images = [DEFAULT_IMAGE];
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
            <button onClick={prevImage} className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition z-10 text-xs">❮</button>
            <button onClick={nextImage} className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition z-10 text-xs">❯</button>
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
          <button onClick={() => onView(program.id)} 
                  className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-medium py-1.5 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-center gap-1">
            <FaMapMarkedAlt size={10} /> {t('viewOnMap')}
          </button>
          <button onClick={() => onChat(program.guide_id, program.guide_name)} 
                  className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-medium py-1.5 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-center gap-1">
            <MessageCircle size={10} /> {t('chat')}
          </button>
          <button 
            onClick={() => onBook(program)} 
            disabled={isBooked}
            className={`flex-1 text-[10px] font-medium py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 ${
              isBooked 
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {isBooked ? (
              <>
                <FaCheckCircle size={10} /> {t('alreadyBooked')}
              </>
            ) : (
              <>
                <CalendarCheck size={10} /> {t('book')}
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
});

// ===== الصفحة الرئيسية =====
function HomePage({ lang = 'ar', setPage, dark, setDark }) {
  const { user } = useAuth(); // ✅ استخدام السياق مباشرة
  const t = (key) => LOCALES[lang]?.[key] || key;

  // حالات محلية لعرض اسم المستخدم وصورته (للتحديث الفوري)
  const [localDisplayName, setLocalDisplayName] = useState(user?.fullName || user?.name || '');
  const [localAvatar, setLocalAvatar] = useState(null);

  const [allPrograms, setAllPrograms] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [locationActive, setLocationActive] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationSource, setLocationSource] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`favorites_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // قراءة وضع العرض من localStorage
  const getInitialShowAllMode = () => {
    const stored = localStorage.getItem(SHOW_ALL_MODE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    return false;
  };

  const [showAllMode, setShowAllMode] = useState(getInitialShowAllMode);

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
    } catch {
      return [];
    }
  }, [user?.id]);

  const [bookedProgramIds, setBookedProgramIds] = useState(() => getBookedProgramIds());

  const refreshBookedPrograms = useCallback(() => {
    const ids = getBookedProgramIds();
    setBookedProgramIds(ids);
    console.log('🔄 تحديث الحجوزات (HomePage):', ids);
  }, [getBookedProgramIds]);

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [guidesMap, setGuidesMap] = useState({});
  const isFetchingRef = useRef(false);
  const contentRef = useRef(null);
  const watchIdRef = useRef(null);
  const locationTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);

  const getUserAvatarUrl = useCallback(() => {
    if (!user) return null;
    if (user.avatar) return user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`;
    if (user.avatar_url) return user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE}${user.avatar_url}`;
    return null;
  }, [user]);

  // ===== دوال تحديد الموقع =====
  const updateUserLocationState = useCallback((lat, lng, accuracy, isManual = false) => {
    if (!isValidLocation(lat, lng)) return false;
    setUserLocation([lat, lng]);
    setUserAccuracy(accuracy);
    setLocationActive(true);
    setLocationStatus('acquired');
    setLocationSource(isManual ? 'manual' : 'gps');
    if (isManual) {
      localStorage.setItem('manual_user_location', JSON.stringify({ coords: [lng, lat], accuracy, timestamp: Date.now() }));
    }
    return true;
  }, []);

  const startAutoTracking = useCallback(() => {
    if (manualMode) return;
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError(t('locationError'));
      toast.error(t('locationError'), { duration: 4000 });
      return;
    }
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
    setIsLocating(true);
    setLocationStatus('locating');
    const loadingToast = toast.loading(t('locating'));
    locationTimeoutRef.current = setTimeout(() => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
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
          if (retryCountRef.current <= MAX_RETRY_ATTEMPTS) return;
          else {
            setIsLocating(false);
            setLocationStatus('error');
            toast.dismiss(loadingToast);
            toast.error(t('locationError'), { duration: 4000 });
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
            if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
            retryCountRef.current = 0;
          }
          return;
        }
        retryCountRef.current = 0;
        if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
        const success = updateUserLocationState(latitude, longitude, accuracy, false);
        if (success) {
          setIsLocating(false);
          setLocationStatus('acquired');
          toast.dismiss(loadingToast);
          if (accuracy <= MIN_ACCURACY_THRESHOLD) {
            toast.success(lang === 'ar' ? `📍 دقة ${Math.round(accuracy)}م` : `📍 ${Math.round(accuracy)}m accuracy`, { duration: 2000 });
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.dismiss(loadingToast);
        setIsLocating(false);
        let errorMsg = t('locationError');
        if (error.code === error.PERMISSION_DENIED) errorMsg = t('locationPermissionDenied');
        else if (error.code === error.TIMEOUT) errorMsg = t('locationTimeout');
        setLocationStatus('error');
        setLocationError(errorMsg);
        toast.error(errorMsg, { duration: 4000 });
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  }, [lang, t, manualMode, updateUserLocationState]);

  // ===== دالة "تحديد" (تحديث الموقع وجلب البرامج) =====
  const handleLocate = useCallback(() => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
    setUserLocation(null);
    setLocationStatus('idle');
    setLocationError(null);
    retryCountRef.current = 0;
    if (manualMode) setManualMode(false);
    startAutoTracking();
  }, [startAutoTracking, manualMode]);

  // ===== دوال جلب البرامج =====
  const fetchFullProgram = useCallback(async (id) => {
    try {
      const cachedImages = getProgramImages(id);
      const res = await fetch(`${API_BASE}/api/programs/${id}`);
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
          await saveProgramImages(id, images);
        }
        let guide_avatar = null;
        if (prog.guide_id && guidesMap[prog.guide_id]) guide_avatar = guidesMap[prog.guide_id].avatar;
        else if (prog.guide_name && guidesMap[prog.guide_name]) guide_avatar = guidesMap[prog.guide_name].avatar;
        return { ...prog, images: images.length > 0 ? images : [DEFAULT_IMAGE], guide_avatar, hasCachedImages: !!cachedImages };
      }
    } catch(e) { console.error('Error fetching program:', e); }
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

  // ===== دوال التفاعل =====
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
    if (String(user.id) === String(program.guide_id)) {
      toast.error(lang === 'ar' ? 'لا يمكنك حجز برنامجك الخاص' : 'You cannot book your own program');
      return;
    }
    if (bookedProgramIds.includes(program.id)) {
      toast.info(t('bookingExists'));
      return;
    }
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        user_id: user.id,
        subject: `طلب حجز: ${program.name}`,
        type: 'booking',
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
      };
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
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
        const key = LOCAL_BOOKINGS_KEY(user.id);
        const existing = localStorage.getItem(key);
        let bookings = existing ? JSON.parse(existing) : [];
        bookings.push(localBooking);
        localStorage.setItem(key, JSON.stringify(bookings));
        refreshBookedPrograms();
      } else {
        toast.error(result.message || t('bookingFailed'));
      }
    } catch(e) {
      console.error('Booking error:', e);
      toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error');
    } finally {
      setBookingLoading(false);
    }
  }, [user, t, setPage, lang, bookedProgramIds, refreshBookedPrograms]);

  const handleViewOnMap = useCallback((id) => {
    localStorage.setItem('selectedProgramId', String(id));
    setPage('explore');
  }, [setPage]);

  // ===== دالة تبديل وضع العرض مع المزامنة =====
  const toggleDisplayMode = useCallback(() => {
    const newMode = !showAllMode;
    setShowAllMode(newMode);
    localStorage.setItem(SHOW_ALL_MODE_KEY, String(newMode));
    window.dispatchEvent(new CustomEvent('showAllModeChanged', { detail: { showAllMode: newMode } }));
  }, [showAllMode]);

  const displayedPrograms = useMemo(() => {
    if (!userLocation || allPrograms.length === 0) return [];
    const withDist = allPrograms.map(p => {
      let dist = Infinity;
      if (p.location_lat && p.location_lng) {
        dist = getDistance(userLocation[0], userLocation[1], p.location_lat, p.location_lng);
      }
      return { ...p, distance: dist };
    });
    withDist.sort((a, b) => a.distance - b.distance);
    const nearby = withDist.filter(p => p.distance <= NEARBY_RADIUS_KM);
    return showAllMode ? withDist : nearby;
  }, [allPrograms, userLocation, showAllMode]);

  // ===== تأثيرات =====
  useEffect(() => {
    if (userLocation && !initialLoadDone && !isFetchingRef.current) fetchAllPrograms();
  }, [userLocation, initialLoadDone, fetchAllPrograms]);

  useEffect(() => {
    if (user?.id) localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favoriteIds));
  }, [favoriteIds, user]);

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
          if (uuid) map[uuid] = { id: numericId ? Number(numericId) : uuid, name: fullName, avatar };
          if (fullName) map[fullName] = { id: numericId ? Number(numericId) : uuid, name: fullName, avatar };
        });
        setGuidesMap(map);
      } catch (err) { console.error('Failed to fetch guides map:', err); }
    };
    fetchGuidesMap();
  }, []);

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

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) setShowScrollTop(contentRef.current.scrollTop > 300);
    };
    const container = contentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // ===== الاستماع لتغييرات localStorage من صفحات أخرى =====
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === SHOW_ALL_MODE_KEY) {
        const newValue = e.newValue === 'true';
        setShowAllMode(newValue);
      }
    };
    const handleCustomEvent = (e) => {
      if (e.detail && typeof e.detail.showAllMode === 'boolean') {
        setShowAllMode(e.detail.showAllMode);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('showAllModeChanged', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('showAllModeChanged', handleCustomEvent);
    };
  }, []);

  // ===== تحديد الموقع التلقائي عند التحميل =====
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
          } else localStorage.removeItem('manual_user_location');
        } else localStorage.removeItem('manual_user_location');
      } catch(e) { localStorage.removeItem('manual_user_location'); }
    }
    startAutoTracking();
  }, []);

  // ===== تنظيف المؤقتات =====
  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
    };
  }, []);

  // ===== 🎯 تحديث الاسم والصورة عند تغير user من السياق =====
  useEffect(() => {
    if (user) {
      setLocalDisplayName(user.fullName || user.name || '');
      setLocalAvatar(getUserAvatarUrl());
    }
  }, [user, getUserAvatarUrl]);

  // ===== 🎯 مستمع لتحديث الملف الشخصي (profileUpdated) =====
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const { userId, updatedData } = e.detail;
      if (userId === user?.id) {
        console.log('📢 [HomePage] Profile updated for user:', userId, updatedData);
        if (updatedData.fullName || updatedData.name) {
          setLocalDisplayName(updatedData.fullName || updatedData.name);
        }
        if (updatedData.avatar_url) {
          const avatarUrl = updatedData.avatar_url.startsWith('http') 
            ? updatedData.avatar_url 
            : `${API_BASE}${updatedData.avatar_url}`;
          setLocalAvatar(avatarUrl);
        } else if (updatedData.avatar_url === null) {
          setLocalAvatar(null);
        }
        toast.success(lang === 'ar' ? '✅ تم تحديث الملف الشخصي' : '✅ Profile updated');
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [user?.id, lang]);

  const ScrollTopButton = useMemo(() => {
    if (!showScrollTop) return null;
    return (
      <button onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-20 left-4 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition z-50">
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
      {/* الهيدر */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden flex-shrink-0">
                {localAvatar ? (
                  <img src={localAvatar} alt={localDisplayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-lg">
                    {localDisplayName?.charAt(0) || '👤'}
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-bold text-base">{localDisplayName}</h1>
                <p className="text-[10px] opacity-90 flex items-center gap-1">
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
            <input type="text" placeholder={t('search')} className="w-full p-2 pr-8 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border border-white/30 focus:outline-none focus:border-white focus:bg-white/30 transition text-sm" />
          </div>
        </div>
      </div>

      <div className="p-3">
        {/* الأزرار العلوية المتوازية */}
        <div className="mb-4 flex gap-2">
          <button 
            onClick={() => setPage('guides')} 
            className={`flex-1 py-2.5 rounded-xl font-medium transition text-sm flex items-center justify-center gap-2 ${
              showAllMode 
                ? 'bg-cyan-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Users size={18} />
            <span>{t('guides')}</span>
          </button>
          <button 
            onClick={toggleDisplayMode} 
            className={`flex-1 py-2.5 rounded-xl font-medium transition text-sm flex items-center justify-center ${
              showAllMode 
                ? 'bg-cyan-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {showAllMode ? t('showNearby') : t('showAll')}
          </button>
          <button 
            onClick={handleLocate} 
            disabled={isLocating} 
            className={`flex-1 py-2.5 rounded-xl font-medium transition text-sm flex items-center justify-center gap-1 ${
              isLocating 
                ? 'bg-gray-400 dark:bg-gray-600 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Crosshair size={16} />
            <span>{t('locate')}</span>
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white">{t('nearbyPrograms')}</h2>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">({displayedPrograms.length})</span>
        </div>

        {loading && !initialLoadDone && (
          <div className="text-center py-10"><FaSpinner className="animate-spin h-8 w-8 text-green-600 mx-auto" /><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p></div>
        )}
        {error && (
          <div className="text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
            <button onClick={() => fetchAllPrograms()} className="text-green-600 dark:text-green-400 underline text-sm">{t('retry')}</button>
          </div>
        )}
        {!loading && !error && !userLocation && locationStatus !== 'locating' && (
          <div className="text-center py-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <FaMapMarkerAlt size={36} className="mx-auto text-yellow-500 mb-3" />
            <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">{t('noLocation')}</p>
            <button onClick={startAutoTracking} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm">{t('getLocation')}</button>
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
            {!showAllMode && <button onClick={toggleDisplayMode} className="mt-2 text-green-600 dark:text-green-400 underline text-sm">{t('viewAll')}</button>}
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
                  isBooked={bookedProgramIds.includes(program.id)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* شريط التنقل السفلي */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-1.5 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button onClick={() => setPage('home')} className="flex flex-col items-center gap-0.5 text-green-600 dark:text-green-400">
            <Home size={20} /><span className="text-[8px]">{t('home')}</span>
          </button>
          <button onClick={() => setPage('explore')} className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition">
            <Compass size={20} /><span className="text-[8px]">{t('explore')}</span>
          </button>
          <button onClick={() => setPage('notifications')} className="relative flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition">
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            <span className="text-[8px]">{t('notifications')}</span>
          </button>
          <button onClick={() => setPage('profile')} className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition">
            <User size={20} /><span className="text-[8px]">{t('profile')}</span>
          </button>
        </div>
      </div>
      {ScrollTopButton}
    </div>
  );
}

export default HomePage;

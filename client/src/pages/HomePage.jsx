// client/src/pages/HomePage.jsx
// ✅ إصلاح كامل: استخدام نفس منطق FavoritesPage الناجح
// ✅ عرض جميع البرامج النشطة بنفس التصميم والأزرار
// ✅ دعم تحديد الموقع وعرض المسافة
// ✅ تحديث تلقائي كل 5 ثوانٍ

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaMapMarkedAlt, FaUserTie, FaWallet, FaComments,
  FaStar, FaArrowLeft, FaShieldAlt, FaClock,
  FaSun, FaMoon, FaUserCircle, FaMapMarkerAlt, FaBoxOpen,
  FaSpinner, FaLocationArrow, FaRedoAlt
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Navigation, MessageCircle, CalendarCheck, MapPin, Image as ImageIcon } from 'lucide-react';

const API_BASE = 'https://tourist-app-api.onrender.com';

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const fixImagesArray = (images) => {
  if (!images || !Array.isArray(images)) return [];
  return images.map(img => {
    if (!img) return null;
    if (typeof img === 'string') {
      const url = buildImageUrl(img);
      return url ? { url, is_primary: false } : null;
    }
    const url = buildImageUrl(img.url || img.image_url);
    if (!url) return null;
    return { ...img, url };
  }).filter(Boolean);
};

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
  if (text.includes('بحر') || text.includes('بحري') || text.includes('marine') || text.includes('sea'))
    return { ar: 'رحلات بحرية', en: 'Marine trips', icon: '🌊' };
  if (text.includes('تسلق') || text.includes('جبل') || text.includes('mountain') || text.includes('climb'))
    return { ar: 'تسلق جبال', en: 'Mountain climbing', icon: '⛰️' };
  if (text.includes('سفاري') || text.includes('safari') || text.includes('براري'))
    return { ar: 'رحلات سفاري', en: 'Safari trips', icon: '🦁' };
  if (text.includes('براشوت') || text.includes('مظلة') || text.includes('parachute') || text.includes('skydive'))
    return { ar: 'رحلات براشوت', en: 'Parachute trips', icon: '🪂' };
  return { ar: 'برنامج سياحي', en: 'Tour program', icon: '🏞️' };
};

const LOCALES = {
  ar: {
    appName: 'تطبيق السائح',
    heroTitle: 'اكتشف جمال السياحة مع',
    heroSubtitle: 'مرشدين محترفين',
    heroDesc: 'منصتك المتكاملة لحجز المرشدين السياحيين واكتشاف الأماكن الرائعة في المملكة',
    ctaStart: 'ابدأ الآن مجاناً',
    ctaExplore: 'استكشف البرامج',
    goToDashboard: 'اذهب إلى لوحة التحكم',
    stats: { guides: 'مرشد سياحي', trips: 'رحلة مكتملة', rating: 'تقييم إيجابي', support: 'دعم فني' },
    featuresTitle: 'مميزات التطبيق',
    featuresSub: 'كل ما تحتاجه في منصة واحدة لتجربة سياحية مميزة',
    nearbyTitle: 'البرامج السياحية',
    nearbySub: 'اكتشف البرامج السياحية النشطة القريبة منك',
    loading: 'جاري تحميل البرامج...',
    noNearby: 'لا توجد برامج سياحية نشطة',
    enableLocation: 'يُرجى تفعيل خدمة الموقع لحساب المسافة',
    enableLocationBtn: 'تفعيل الموقع',
    viewOnMap: 'عرض على الخريطة',
    refreshNearby: 'تحديث البرامج',
    retry: 'إعادة المحاولة',
    locationPermissionDenied: 'تم رفض إذن الموقع. يرجى السماح يدوياً من إعدادات المتصفح.',
    locationTimeout: 'انتهت مهلة الحصول على الموقع، حاول مرة أخرى.',
    locationGeneralError: 'حدث خطأ أثناء الحصول على الموقع.',
    autoTrack: 'تتبع تلقائي (كل 5 ثوانٍ)',
    stopTracking: 'إيقاف التتبع',
    startTracking: 'تشغيل التتبع',
    howItWorks: 'كيف تعمل المنصة؟',
    howItWorksSub: 'ثلاث خطوات بسيطة لحجز رحلتك المثالية',
    step1Title: 'اختر المرشد',
    step1Desc: 'تصفح قائمة المرشدين واختر الأنسب لرحلتك',
    step2Title: 'احجز البرنامج',
    step2Desc: 'حدد الموعد وادفع عبر المحفظة الإلكترونية',
    step3Title: 'استمتع بالرحلة',
    step3Desc: 'تواصل مع المرشد واستمتع بتجربة فريدة',
    testimonialsTitle: 'آراء المستخدمين',
    testimonialsSub: 'ماذا يقول عملاؤنا عن تجربتهم معنا',
    ctaTitle: 'انضم إلى آلاف المستخدمين',
    ctaDesc: 'ابدأ رحلتك السياحية مع أفضل المرشدين الآن واستمتع بتجربة فريدة',
    ctaRegister: 'سجل مجاناً',
    ctaBrowse: 'تصفح البرامج',
    securePayment: 'دفع آمن 100%',
    support247: 'دعم فني 24/7',
    verifiedGuides: 'مرشدين معتمدين',
    footerQuickLinks: 'روابط سريعة',
    footerSupport: 'الدعم',
    footerContact: 'تواصل معنا',
    footerRights: 'جميع الحقوق محفوظة',
    home: 'الرئيسية',
    programs: 'البرامج',
    about: 'عن التطبيق',
    faq: 'الأسئلة الشائعة',
    privacy: 'سياسة الخصوصية',
    terms: 'شروط الاستخدام'
  },
  en: {
    appName: 'Tourist App',
    heroTitle: 'Discover the beauty of tourism with',
    heroSubtitle: 'professional guides',
    heroDesc: 'Your integrated platform for booking tour guides and discovering amazing places in the Kingdom',
    ctaStart: 'Start for free',
    ctaExplore: 'Explore Programs',
    goToDashboard: 'Go to Dashboard',
    stats: { guides: 'Tour Guides', trips: 'Completed Trips', rating: 'Positive Rating', support: '24/7 Support' },
    featuresTitle: 'Features',
    featuresSub: 'Everything you need in one platform for an exceptional tourism experience',
    nearbyTitle: 'Tour Programs',
    nearbySub: 'Discover active tour programs near you',
    loading: 'Loading programs...',
    noNearby: 'No active tour programs available',
    enableLocation: 'Please enable location to see distance',
    enableLocationBtn: 'Enable location',
    viewOnMap: 'View on map',
    refreshNearby: 'Refresh programs',
    retry: 'Retry',
    locationPermissionDenied: 'Location permission denied. Please allow manually from browser settings.',
    locationTimeout: 'Location request timeout, please try again.',
    locationGeneralError: 'Error getting your location.',
    autoTrack: 'Auto-track (every 5 sec)',
    stopTracking: 'Stop tracking',
    startTracking: 'Start tracking',
    howItWorks: 'How it works?',
    howItWorksSub: 'Three simple steps to book your perfect trip',
    step1Title: 'Choose a guide',
    step1Desc: 'Browse the list of guides and choose the best for your trip',
    step2Title: 'Book the program',
    step2Desc: 'Select the date and pay via digital wallet',
    step3Title: 'Enjoy the trip',
    step3Desc: 'Communicate with your guide and enjoy a unique experience',
    testimonialsTitle: 'User Reviews',
    testimonialsSub: 'What our customers say about their experience with us',
    ctaTitle: 'Join thousands of users',
    ctaDesc: 'Start your tourism journey with the best guides now and enjoy a unique experience',
    ctaRegister: 'Sign up for free',
    ctaBrowse: 'Browse programs',
    securePayment: '100% secure payment',
    support247: '24/7 support',
    verifiedGuides: 'Verified guides',
    footerQuickLinks: 'Quick Links',
    footerSupport: 'Support',
    footerContact: 'Contact',
    footerRights: 'All rights reserved',
    home: 'Home',
    programs: 'Programs',
    about: 'About',
    faq: 'FAQ',
    privacy: 'Privacy Policy',
    terms: 'Terms of Use'
  }
};

const HomePage = ({ lang, user, setPage, dark, setDark, locationEnabled, setLocationEnabled }) => {
  const t = (key) => LOCALES[lang]?.[key] || key;

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isAutoTracking, setIsAutoTracking] = useState(true);
  const intervalRef = useRef(null);

  const fetchFullProgram = async (programId) => {
    try {
      const res = await fetch(`${API_BASE}/api/programs/${programId}`);
      const data = await res.json();
      const programData = data.program || data.data || data;
      if (programData) {
        return {
          ...programData,
          images: fixImagesArray(programData.images || []),
          image: buildImageUrl(programData.image)
        };
      }
    } catch (err) { console.error(`Failed to fetch details for program ${programId}`, err); }
    return null;
  };

  const fetchAllActivePrograms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/programs`);
      const data = await res.json();
      if (!res.ok) throw new Error('API error');

      let programsArray = [];
      if (data.success && Array.isArray(data.programs)) programsArray = data.programs;
      else if (Array.isArray(data)) programsArray = data;
      else if (data.data && Array.isArray(data.data)) programsArray = data.data;
      else programsArray = [];

      const activePrograms = programsArray.filter(p => {
        const status = (p.status || '').toLowerCase();
        return status === 'active';
      });

      if (activePrograms.length === 0) {
        setPrograms([]);
        return;
      }

      const detailedPrograms = await Promise.all(
        activePrograms.map(async (prog) => {
          const detailed = await fetchFullProgram(prog.id);
          if (detailed) return detailed;
          return {
            ...prog,
            images: fixImagesArray(prog.images || []),
            image: buildImageUrl(prog.image)
          };
        })
      );

      const withDistance = detailedPrograms.map(p => {
        let distance = null;
        if (userLocation && p.location_lat && p.location_lng) {
          distance = getDistance(
            userLocation.lat, userLocation.lng,
            p.location_lat, p.location_lng
          );
        }
        return { ...p, distance };
      });

      setPrograms(withDistance);
      console.log(`✅ HomePage loaded ${withDistance.length} active programs`);
    } catch (err) {
      console.error('Fetch programs error:', err);
      setError(err.message);
      toast.error(lang === 'ar' ? 'فشل تحميل البرامج' : 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, [userLocation, lang]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t('locationGeneralError'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationEnabled(true);
        localStorage.setItem('cached_user_location', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() }));
      },
      (err) => {
        let msg = '';
        switch(err.code) {
          case err.PERMISSION_DENIED: msg = t('locationPermissionDenied'); break;
          case err.TIMEOUT: msg = t('locationTimeout'); break;
          default: msg = t('locationGeneralError');
        }
        setError(msg);
        setLocationEnabled(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [setLocationEnabled, t]);

  useEffect(() => {
    const cached = localStorage.getItem('cached_user_location');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        const hoursPassed = (Date.now() - data.timestamp) / (1000 * 60 * 60);
        if (hoursPassed < 1) {
          setUserLocation({ lat: data.lat, lng: data.lng });
          setLocationEnabled(true);
        }
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    fetchAllActivePrograms();
    if (locationEnabled && !userLocation) requestLocation();
  }, []);

  useEffect(() => {
    fetchAllActivePrograms();
  }, [userLocation]);

  useEffect(() => {
    if (!isAutoTracking) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetchAllActivePrograms();
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [isAutoTracking, fetchAllActivePrograms]);

  const handleRefresh = () => {
    fetchAllActivePrograms();
    if (locationEnabled && !userLocation) requestLocation();
  };

  const handleViewProgramOnMap = (programId) => {
    localStorage.setItem('highlightProgramId', String(programId));
    setPage('explore');
  };

  const features = [
    { icon: <FaMapMarkedAlt size={40} />, title: 'اكتشف الأماكن', desc: 'استكشف أفضل الوجهات السياحية والأماكن المميزة في جميع أنحاء المملكة', primary: true },
    { icon: <FaUserTie size={40} />, title: 'مرشدين محترفين', desc: 'احجز مع مرشدين سياحيين معتمدين ومتميزين بخبرة عالية', primary: false },
    { icon: <FaWallet size={40} />, title: 'محفظة إلكترونية', desc: 'ادفع بسهولة وأمان عبر محفظتك الرقمية مع نظام رسوم شفاف', primary: false },
    { icon: <FaComments size={40} />, title: 'تواصل فوري', desc: 'تحدث مع المرشدين مباشرة عبر المحادثة الفورية قبل وأثناء الرحلة', primary: false }
  ];
  const stats = [
    { value: '500+', label: t('stats.guides') },
    { value: '1000+', label: t('stats.trips') },
    { value: '98%', label: t('stats.rating') },
    { value: '24/7', label: t('stats.support') }
  ];
  const testimonials = [
    { name: 'أحمد محمد', role: 'سائح', comment: 'تجربة رائعة جداً، المرشد كان محترف والمكان جميل', rating: 5, image: 'https://i.pravatar.cc/100?img=1' },
    { name: 'سارة عبدالله', role: 'سائحة', comment: 'سهولة في الحجز والتواصل، أنصح الجميع باستخدام التطبيق', rating: 5, image: 'https://i.pravatar.cc/100?img=2' },
    { name: 'محمد علي', role: 'مرشد سياحي', comment: 'منصة ممتازة للتواصل مع السياح وإدارة الحجوزات بكل سهولة', rating: 5, image: 'https://i.pravatar.cc/100?img=3' }
  ];

  const textColor = dark ? 'text-gray-100' : 'text-gray-900';
  const bgColor = dark ? 'bg-gray-900' : 'bg-white';
  const cardBg = dark ? 'bg-gray-800' : 'bg-white';
  const borderColor = dark ? 'border-gray-700' : 'border-gray-200';
  const secondaryText = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`${bgColor} ${textColor} min-h-screen`} dir="rtl">
      <nav className={`sticky top-0 z-50 ${cardBg} border-b ${borderColor} shadow-sm`}>
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <button onClick={() => setPage('home')} className="text-2xl font-bold">{t('appName')}</button>
          <div className="flex gap-4 items-center">
            <button onClick={() => setDark(!dark)} className={`p-2 rounded-lg border ${borderColor}`}>
              {dark ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-600" />}
            </button>
            {user ? (
              <button onClick={() => setPage('profile')} className="flex items-center gap-2">
                <FaUserCircle size={24} className="text-green-600" />
                <span className="hidden sm:inline">{user.name}</span>
              </button>
            ) : (
              <button onClick={() => setPage('profile')} className="bg-green-600 text-white px-4 py-2 rounded-lg">دخول</button>
            )}
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="absolute inset-0 bg-black/20" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: dark ? 0.1 : 0.2 }}></div>
        <div className="relative container mx-auto px-4 py-24 md:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">{t('heroTitle')}<br /><span className="text-yellow-300">{t('heroSubtitle')}</span></h1>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">{t('heroDesc')}</p>
            {!user ? (
              <div className="flex gap-4 justify-center flex-wrap">
                <button onClick={() => setPage('profile')} className="bg-yellow-400 text-gray-900 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-yellow-500 transition flex items-center gap-2"><span>{t('ctaStart')}</span> <FaArrowLeft /></button>
                <button onClick={() => setPage('guides')} className="border-2 border-white text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition">{t('ctaExplore')}</button>
              </div>
            ) : (
              <button onClick={() => setPage(user.type === 'guide' ? 'guideDashboard' : 'explore')} className="bg-yellow-400 text-gray-900 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-yellow-500 transition flex items-center gap-2 mx-auto"><span>{t('goToDashboard')}</span> <FaArrowLeft /></button>
            )}
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 120" fill="none"><path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H0Z" fill={dark ? '#1f2937' : 'white'} /></svg></div>
      </section>

      <section className={`py-12 ${cardBg}`}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: i*0.1 }}>
                <div className="text-3xl md:text-4xl font-bold text-green-600">{s.value}</div>
                <div className={secondaryText}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className={`py-16 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">{t('featuresTitle')}</h2>
            <p className={`text-lg ${secondaryText} max-w-2xl mx-auto`}>{t('featuresSub')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx*0.1 }} className={`p-6 rounded-xl ${cardBg} shadow-lg border ${borderColor}`}>
                <div className="text-green-600 mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className={secondaryText}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className={`py-16 ${cardBg}`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FaMapMarkerAlt className="text-green-600 text-2xl" />
                <h2 className="text-2xl md:text-3xl font-bold">{t('nearbyTitle')}</h2>
              </div>
              <p className={secondaryText}>{t('nearbySub')}</p>
              {userLocation && (
                <div className="text-xs text-green-600 mt-1">
                  📍 {lang === 'ar' ? 'موقعك الحالي مفعل' : 'Your location enabled'}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsAutoTracking(!isAutoTracking)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition ${
                isAutoTracking ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isAutoTracking ? '🔴 ' + t('stopTracking') : '🟢 ' + t('startTracking')}
            </button>
          </div>

          {loading && (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin h-8 w-8 text-green-600 mx-auto" />
              <p className="mt-2">{t('loading')}</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
              <button onClick={handleRefresh} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
                <FaLocationArrow size={14} /> {t('enableLocationBtn')}
              </button>
            </div>
          )}

          {!loading && !error && programs.length === 0 && (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <FaBoxOpen size={48} className="mx-auto text-gray-400 mb-2" />
              <p>{t('noNearby')}</p>
              <button onClick={handleRefresh} className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
                <FaRedoAlt size={14} /> {t('refreshNearby')}
              </button>
            </div>
          )}

          {!loading && !error && programs.length > 0 && (
            <div className="space-y-5">
              {programs.map(program => {
                const images = (program.images || []).map(img => img.url);
                const currentImg = images.length > 0 ? images[0] : (program.image ? buildImageUrl(program.image) : null);
                const distance = program.distance !== null ? program.distance.toFixed(1) : null;
                const activity = getActivityType(program, lang);
                const activityLabel = lang === 'ar' ? activity.ar : activity.en;

                return (
                  <div key={program.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition overflow-hidden relative">
                    <div className="relative w-full h-64 md:h-72 bg-gray-200">
                      {currentImg ? (
                        <img
                          src={currentImg}
                          alt={program.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3E❌%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={40} />
                          <span className="text-sm mt-1">لا توجد صورة</span>
                        </div>
                      )}

                      {images.length > 1 && (
                        <>
                          <button className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full text-sm hover:bg-black/70 transition z-10">❮</button>
                          <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full text-sm hover:bg-black/70 transition z-10">❯</button>
                          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">1/{images.length}</span>
                        </>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 text-white">
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="font-bold text-lg leading-tight">{program.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs bg-purple-500/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                {activity.icon} {activityLabel}
                              </span>
                              {distance && (
                                <span className="text-xs bg-blue-500/80 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Navigation size={12} /> {distance} كم
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold">{program.guide_name || 'مرشد سياحي'}</div>
                            <div className="text-xs flex items-center gap-1 mt-0.5">
                              <MapPin size={12} />
                              <span className="truncate max-w-[120px]">{program.location || 'موقع البرنامج'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2">
                            <Star size={14} className="text-yellow-400 fill-current" />
                            <span className="text-sm">{program.rating || 4.5}</span>
                            <span className="text-sm font-bold bg-green-600/80 px-2 py-0.5 rounded-full">
                              {program.price} ريال
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (!user) {
                                  toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
                                  setPage('profile');
                                  return;
                                }
                                handleViewProgramOnMap(program.id);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition"
                            >
                              <MapPin size={14} />
                              {lang === 'ar' ? 'خريطة' : 'Map'}
                            </button>
                            <button
                              onClick={() => {
                                if (!user) {
                                  toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
                                  setPage('profile');
                                  return;
                                }
                                toast.info(lang === 'ar' ? 'سيتم تفعيل الحجز قريباً' : 'Booking feature coming soon');
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition"
                            >
                              <CalendarCheck size={14} />
                              {lang === 'ar' ? 'احجز' : 'Book'}
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
      </section>

      <section className={`py-16 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">{t('howItWorks')}</h2>
            <p className={secondaryText}>{t('howItWorksSub')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🔍', title: t('step1Title'), desc: t('step1Desc') },
              { icon: '📅', title: t('step2Title'), desc: t('step2Desc') },
              { icon: '🎉', title: t('step3Title'), desc: t('step3Desc') }
            ].map((step, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, x: idx===0 ? -50 : idx===2 ? 50 : 0 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: idx*0.2 }} className={`relative p-6 text-center rounded-xl ${cardBg} shadow border ${borderColor}`}>
                <div className="text-5xl mb-3">{step.icon}</div>
                <div className="absolute -top-4 right-4 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">{idx+1}</div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className={secondaryText}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className={`py-16 ${cardBg}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">{t('testimonialsTitle')}</h2>
            <p className={secondaryText}>{t('testimonialsSub')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((tst, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx*0.1 }} className={`p-6 rounded-xl ${cardBg} shadow border ${borderColor}`}>
                <div className="flex items-center gap-4 mb-4">
                  <img src={tst.image} alt={tst.name} className="w-12 h-12 rounded-full object-cover border-2 border-green-500" />
                  <div><h4 className="font-bold">{tst.name}</h4><p className="text-sm text-gray-500">{tst.role}</p></div>
                </div>
                <div className="flex text-yellow-500 mb-3">{[...Array(tst.rating)].map((_,i) => <FaStar key={i} />)}</div>
                <p className={`italic ${secondaryText}`}>"{tst.comment}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t('ctaTitle')}</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">{t('ctaDesc')}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={() => setPage('profile')} className="bg-yellow-400 text-gray-900 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-yellow-500 transition">{t('ctaRegister')}</button>
            <button onClick={() => setPage('guides')} className="border-2 border-white text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition">{t('ctaBrowse')}</button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm">
            <span className="flex items-center gap-2"><FaShieldAlt className="text-yellow-400" /> {t('securePayment')}</span>
            <span className="flex items-center gap-2"><FaClock className="text-yellow-400" /> {t('support247')}</span>
            <span className="flex items-center gap-2"><FaStar className="text-yellow-400" /> {t('verifiedGuides')}</span>
          </div>
        </div>
      </section>

      <footer className={`py-12 bg-gray-800 text-gray-300`}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div><h3 className="text-xl font-bold text-white mb-3">{t('appName')}</h3><p className="text-sm">{t('heroDesc')}</p></div>
            <div><h4 className="font-bold text-white mb-3">{t('footerQuickLinks')}</h4><ul className="space-y-2"><li><button onClick={() => setPage('home')} className="hover:text-green-400 transition">{t('home')}</button></li><li><button onClick={() => setPage('guides')} className="hover:text-green-400 transition">{t('programs')}</button></li><li><button onClick={() => setPage('profile')} className="hover:text-green-400 transition">{t('about')}</button></li></ul></div>
            <div><h4 className="font-bold text-white mb-3">{t('footerSupport')}</h4><ul className="space-y-2"><li><button className="hover:text-green-400 transition">{t('faq')}</button></li><li><button className="hover:text-green-400 transition">{t('privacy')}</button></li><li><button className="hover:text-green-400 transition">{t('terms')}</button></li></ul></div>
            <div><h4 className="font-bold text-white mb-3">{t('footerContact')}</h4><div className="flex gap-4 text-2xl"><a href="#" className="hover:text-green-400">📱</a><a href="#" className="hover:text-green-400">📘</a><a href="#" className="hover:text-green-400">📷</a><a href="#" className="hover:text-green-400">🐦</a></div></div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm">{t('footerRights')} © 2026 {t('appName')}</div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

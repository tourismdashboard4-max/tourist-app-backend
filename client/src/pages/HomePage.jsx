// client/src/pages/HomePage.jsx
// ✅ النسخة المحسنة - عرض البرامج القريبة من المستخدم بشكل دقيق وموثوق

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaMapMarkedAlt, FaUserTie, FaWallet, FaComments,
  FaStar, FaArrowLeft, FaShieldAlt, FaClock,
  FaSun, FaMoon, FaUserCircle, FaMapMarkerAlt, FaBoxOpen,
  FaSpinner, FaLocationArrow, FaRedoAlt
} from 'react-icons/fa';
import { motion } from 'framer-motion';

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
    nearbyTitle: 'برامج قريبة منك',
    nearbySub: 'اكتشف البرامج السياحية القريبة من موقعك الحالي (أقل من 10 كم)',
    loading: 'جاري تحميل البرامج القريبة...',
    noNearby: 'لا توجد برامج قريبة حالياً',
    enableLocation: 'يُرجى تفعيل خدمة الموقع لعرض البرامج القريبة',
    enableLocationBtn: 'تفعيل الموقع',
    viewOnMap: 'عرض على الخريطة',
    refreshNearby: 'تحديث',
    retry: 'إعادة المحاولة',
    locationPermissionDenied: 'تم رفض إذن الموقع. يرجى السماح يدوياً من إعدادات المتصفح.',
    locationTimeout: 'انتهت مهلة الحصول على الموقع، حاول مرة أخرى.',
    locationGeneralError: 'حدث خطأ أثناء الحصول على الموقع.',
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
    nearbyTitle: 'Nearby Programs',
    nearbySub: 'Discover tour programs near your current location (within 10 km)',
    loading: 'Loading nearby programs...',
    noNearby: 'No nearby programs at the moment',
    enableLocation: 'Please enable location to see nearby programs',
    enableLocationBtn: 'Enable location',
    viewOnMap: 'View on map',
    refreshNearby: 'Refresh',
    retry: 'Retry',
    locationPermissionDenied: 'Location permission denied. Please allow manually from browser settings.',
    locationTimeout: 'Location request timeout, please try again.',
    locationGeneralError: 'Error getting your location.',
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

const API_BASE = 'https://tourist-app-api.onrender.com';

const HomePage = ({ lang, user, setPage, dark, setDark, locationEnabled, setLocationEnabled }) => {
  const t = (key) => LOCALES[lang]?.[key] || key;

  const [nearbyPrograms, setNearbyPrograms] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // دقة حساب المسافة (Haversine)
  const getDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLon/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // جلب البرامج القريبة بناءً على الموقع الحالي
  const fetchNearbyPrograms = useCallback(async (lat, lng) => {
    if (!lat || !lng) return;
    setLoadingNearby(true);
    setLocationError(null);
    try {
      const res = await fetch(`${API_BASE}/api/programs`);
      const data = await res.json();
      if (!res.ok) throw new Error('API error');
      
      let programsArray = [];
      if (data.success && Array.isArray(data.programs)) programsArray = data.programs;
      else if (Array.isArray(data)) programsArray = data;
      else if (data.data && Array.isArray(data.data)) programsArray = data.data;
      else programsArray = [];

      const activePrograms = programsArray.filter(p => 
        p.status === 'active' && 
        p.location_lat && p.location_lng &&
        typeof p.location_lat === 'number' && 
        typeof p.location_lng === 'number'
      );

      if (activePrograms.length === 0) {
        setNearbyPrograms([]);
        return;
      }

      const withDistance = activePrograms.map(p => ({
        id: p.id,
        name: p.name,
        guide_name: p.guide_name || (lang === 'ar' ? 'مرشد' : 'Guide'),
        guide_id: p.guide_id,
        price: p.price,
        image: p.image && (p.image.startsWith('http') ? p.image : (p.image ? `${API_BASE}${p.image}` : null)),
        distance: getDistance(lat, lng, p.location_lat, p.location_lng)
      })).filter(p => p.distance <= 10) // فقط ضمن 10 كم
        .sort((a,b) => a.distance - b.distance)
        .slice(0, 8); // حد أقصى 8 برامج

      setNearbyPrograms(withDistance);
    } catch (err) {
      console.error('Fetch nearby error:', err);
      setLocationError(err.message);
    } finally {
      setLoadingNearby(false);
    }
  }, [getDistance, lang]);

  // طلب الموقع الجغرافي (مع خيارات محسنة)
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t('locationGeneralError'));
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationEnabled(true);
        setIsLocating(false);
        fetchNearbyPrograms(latitude, longitude);
      },
      (err) => {
        setIsLocating(false);
        let errorMsg = '';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = t('locationPermissionDenied');
            break;
          case err.TIMEOUT:
            errorMsg = t('locationTimeout');
            break;
          default:
            errorMsg = t('locationGeneralError');
        }
        setLocationError(errorMsg);
        setLocationEnabled(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [fetchNearbyPrograms, setLocationEnabled, t]);

  // عندما يتم تفعيل الموقع من الخارج (عبر الـ prop)
  useEffect(() => {
    if (locationEnabled && !userLocation && !isLocating) {
      requestLocation();
    }
  }, [locationEnabled, userLocation, isLocating, requestLocation]);

  // تحديث يدوي (زر التحديث)
  const handleRefresh = () => {
    if (userLocation) {
      fetchNearbyPrograms(userLocation.lat, userLocation.lng);
    } else {
      requestLocation();
    }
  };

  // الانتقال إلى صفحة الخريطة مع تمييز البرنامج
  const handleViewProgramOnMap = (programId) => {
    localStorage.setItem('highlightProgramId', String(programId));
    setPage('explore');
  };

  // بيانات ثابتة للواجهة (كما هي)
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
      {/* شريط التنقل (نفس السابق) */}
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

      {/* Hero section (نفس السابق) */}
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

      {/* الإحصائيات (نفس السابق) */}
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

      {/* الميزات (نفس السابق) */}
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

      {/* ========== قسم البرامج القريبة (المحسّن) ========== */}
      <section className={`py-16 ${cardBg}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
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

          {/* حالة التحميل */}
          {loadingNearby && (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin h-8 w-8 text-green-600 mx-auto" />
              <p className="mt-2">{t('loading')}</p>
            </div>
          )}

          {/* أخطاء الموقع */}
          {locationError && !loadingNearby && (
            <div className="text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-red-600 dark:text-red-400 mb-3">{locationError}</p>
              <button onClick={requestLocation} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
                <FaLocationArrow size={14} /> {t('enableLocationBtn')}
              </button>
            </div>
          )}

          {/* لا توجد برامج قريبة (مع إمكانية التحديث) */}
          {!loadingNearby && !locationError && nearbyPrograms.length === 0 && (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <FaBoxOpen size={48} className="mx-auto text-gray-400 mb-2" />
              <p>{locationEnabled && userLocation ? t('noNearby') : t('enableLocation')}</p>
              {!locationEnabled && !userLocation && (
                <button onClick={requestLocation} className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
                  <FaLocationArrow size={14} /> {t('enableLocationBtn')}
                </button>
              )}
              {locationEnabled && userLocation && (
                <button onClick={handleRefresh} className="mt-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
                  <FaRedoAlt size={14} /> {t('refreshNearby')}
                </button>
              )}
            </div>
          )}

          {/* عرض البرامج القريبة */}
          {!loadingNearby && !locationError && nearbyPrograms.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {nearbyPrograms.map(prog => (
                  <div key={prog.id} className={`flex gap-4 p-4 rounded-xl shadow-md ${cardBg} border ${borderColor}`}>
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {prog.image ? (
                        <img src={prog.image} alt={prog.name} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <FaMapMarkerAlt className="text-gray-400 text-2xl" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base line-clamp-1">{prog.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        👤 {prog.guide_name}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-green-600 font-bold text-sm">{prog.price} {lang === 'ar' ? 'ريال' : 'SAR'}</span>
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 px-2 py-0.5 rounded-full">
                          🚶 {prog.distance.toFixed(1)} km
                        </span>
                      </div>
                      <button 
                        onClick={() => handleViewProgramOnMap(prog.id)} 
                        className="mt-3 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                      >
                        <FaMapMarkerAlt size={10} /> {t('viewOnMap')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-4">
                <button onClick={handleRefresh} className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 mx-auto">
                  <FaRedoAlt size={12} /> {t('refreshNearby')}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* باقي الأقسام (كيف تعمل، آراء، CTA، Footer) تبقى كما هي */}
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

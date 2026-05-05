// client/src/pages/ExplorePage.jsx - النسخة النهائية المبسطة (بدون guidesMap)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Home, Bell, User, MapPin, Search, MessageCircle, CalendarCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWR5em0xciJ9.sl39WFOhm4m-kOOYtGqONw";

const API_BASE = 'https://tourist-app-api.onrender.com';
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%239ca3af' text-anchor='middle' dy='.3em'%3E🖼️ لا توجد صورة%3C/text%3E%3C/svg%3E";

const LOCALES = {
  ar: {
    search: "ابحث عن وجهة...",
    driving: "سيارة",
    walking: "مشي",
    cycling: "دراجة",
    startTrip: "ابدأ الرحلة",
    chatWithGuide: "دردشة مع المرشد",
    bookNow: "احجز الآن",
    requestSent: "تم إرسال الطلب بنجاح",
    loginRequired: "يجب تسجيل الدخول أولاً",
    bookingFailed: "فشل إرسال الطلب",
    refreshMap: "تحديث الخريطة",
    cannotBookOwn: "لا يمكنك حجز برنامجك",
    cannotRequestOwn: "لا يمكنك طلب برنامجك",
    safetyGuidelines: "إرشادات السلامة",
  },
  en: {
    search: "Search...",
    driving: "Driving",
    walking: "Walking",
    cycling: "Cycling",
    startTrip: "Start Trip",
    chatWithGuide: "Chat With Guide",
    bookNow: "Book Now",
    requestSent: "Request sent successfully",
    loginRequired: "Please login first",
    bookingFailed: "Booking failed",
    refreshMap: "Refresh Map",
    cannotBookOwn: "You cannot book your own program",
    cannotRequestOwn: "You cannot request your own program",
    safetyGuidelines: "Safety Guidelines",
  },
};

function ExplorePage({ lang, mapContainerRef, setPage, transport, setTransport, user, programs: externalPrograms, setPrograms: setExternalPrograms, unreadCount, dark }) {
  const t = (k) => LOCALES[lang][k] || k;
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programImages, setProgramImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);
  const [programs, setPrograms] = useState([]);
  
  const markersRef = useRef([]);
  const isMapLoadedRef = useRef(false);
  const mapInstanceRef = useRef(null);

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  // جلب البرامج
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
            coords: [p.location_lng, p.location_lat],
            price: p.price,
            duration: p.duration,
            rating: p.rating || 4.5,
            description: p.description,
            image: p.image ? (p.image.startsWith('http') ? p.image : `${API_BASE}${p.image}`) : null,
            images: p.images || [],
            safetyGuidelines: p.safetyGuidelines || "",
          }));
        setPrograms(progs);
        setExternalPrograms(progs);
      } else {
        setPrograms([]);
        setExternalPrograms([]);
      }
    } catch (err) {
      console.error(err);
      setPrograms([]);
      setExternalPrograms([]);
    }
  }, [setExternalPrograms]);

  useEffect(() => {
    fetchProgramsFromAPI();
    const interval = setInterval(fetchProgramsFromAPI, 30000);
    return () => clearInterval(interval);
  }, [fetchProgramsFromAPI]);

  // تحميل الصور
  const fetchProgramImages = useCallback(async (program) => {
    if (!program) return;
    setLoadingImages(true);
    try {
      if (program.images && program.images.length > 0) {
        const images = program.images.map(img => img.url?.startsWith('http') ? img.url : `${API_BASE}${img.url}`);
        setProgramImages(images);
        setCurrentImageIndex(0);
        return;
      }
      if (program.image) {
        setProgramImages([program.image]);
        return;
      }
      setProgramImages([FALLBACK_IMAGE]);
    } catch (err) {
      console.error(err);
      setProgramImages([FALLBACK_IMAGE]);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // ✅ دالة فتح المحادثة (مبسطة بدون تحويل)
  const handleChatWithGuide = (guideId, guideName) => {
    console.log('🔍 Opening chat with guide:', { guideId, guideName, userId: user?.id });
    
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }

    if (!guideId) {
      toast.error(lang === 'ar' ? 'معرف المرشد غير موجود' : 'Guide ID missing');
      return;
    }

    if (String(guideId) === String(user.id)) {
      toast.error(lang === 'ar' ? 'لا يمكنك فتح محادثة مع نفسك' : 'Cannot start chat with yourself');
      return;
    }

    const chatParams = {
      recipientId: guideId,
      recipientName: guideName || 'Guide',
      timestamp: Date.now(),
      from: 'explore'
    };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    console.log('✅ Saved chat params:', chatParams);
    toast.success(`تم فتح المحادثة مع ${guideName}`);

    setSelectedProgram(null);
    setProgramImages([]);
    setPage('directChat');
  };

  // الحجز
  const handleBooking = async (program) => {
    if (!user) {
      toast.error(t('loginRequired'));
      return;
    }
    setBookingLoading(true);
    try {
      const ticketData = {
        user_id: user.id,
        subject: `طلب حجز برنامج: ${program.name_ar || program.name}`,
        type: 'booking',
        priority: 'normal',
        message: `أود حجز البرنامج "${program.name_ar || program.name}" الذي يقدمه المرشد ${program.guide_name}.`
      };
      const response = await api.createSupportTicket(ticketData);
      if (response.success) {
        toast.success(t('requestSent'));
      } else {
        toast.error(t('bookingFailed'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('bookingFailed'));
    } finally {
      setBookingLoading(false);
    }
  };

  // طلب مشاركة
  const requestProgram = (program) => {
    if (!user) {
      toast.error(t('loginRequired'));
      return;
    }
    if (String(program.guide_id) === String(user.id)) {
      toast.error(t('cannotRequestOwn'));
      return;
    }
    handleChatWithGuide(program.guide_id, program.guide_name);
  };

  // إضافة العلامات
  const addMarkersToMap = useCallback((map, programsList) => {
    if (!map || !isMapLoadedRef.current) return;
    markersRef.current.forEach(m => { try { m.remove(); } catch(e) {} });
    markersRef.current = [];
    programsList.forEach(program => {
      if (!program.coords) return;
      const marker = new mapboxgl.Marker({ color: "#10b981" })
        .setLngLat(program.coords)
        .addTo(map);
      marker.getElement().addEventListener('click', () => {
        setSelectedProgram(program);
        fetchProgramImages(program);
        map.flyTo({ center: program.coords, zoom: 14 });
      });
      markersRef.current.push(marker);
    });
  }, [fetchProgramImages]);

  // تهيئة الخريطة
  useEffect(() => {
    if (!mapContainerRef?.current || mapInstanceRef.current) return;

    const initMap = (center) => {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
        center,
        zoom: 12,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.on('load', () => {
        isMapLoadedRef.current = true;
        mapInstanceRef.current = map;
        if (map.setLanguage) map.setLanguage(lang);
        addMarkersToMap(map, programs);
      });
      return map;
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          initMap(coords);
          // إضافة علامة موقع المستخدم
          new mapboxgl.Marker({ color: "#3b82f6" })
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setText(lang === "ar" ? "📍 موقعك" : "📍 Your location"))
            .addTo(mapInstanceRef.current);
        },
        () => initMap([46.713, 24.774])
      );
    } else {
      initMap([46.713, 24.774]);
    }
  }, [mapContainerRef, dark, lang, programs, addMarkersToMap]);

  // تحديث العلامات عند تغيير البرامج
  useEffect(() => {
    if (mapInstanceRef.current && isMapLoadedRef.current) {
      addMarkersToMap(mapInstanceRef.current, programs);
    }
  }, [programs, addMarkersToMap]);

  const displayedPrograms = showMyProgramsOnly ? programs.filter(p => String(p.guide_id) === String(user?.id)) : programs;

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
      {/* Header */}
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

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 w-full min-h-0" />

      {/* Program Details Modal */}
      {selectedProgram && (
        <div className="absolute bottom-20 left-4 right-4 z-20 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border-2 border-green-500 max-h-[70vh] overflow-y-auto">
          {/* Image Gallery */}
          {loadingImages ? (
            <div className="mb-3 flex justify-center items-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
          ) : programImages.length > 0 ? (
            <div className="mb-3">
              <div className="relative">
                <img src={programImages[currentImageIndex]} alt={selectedProgram.name_ar || selectedProgram.name} className="w-full h-48 object-cover rounded-lg cursor-pointer" onClick={() => setShowGallery(true)} onError={(e) => e.target.src = FALLBACK_IMAGE} />
                {programImages.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full">❮</button>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full">❯</button>
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">{currentImageIndex + 1} / {programImages.length}</div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Info */}
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

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <select value={transport} onChange={(e) => setTransport(e.target.value)} className="border rounded p-1 text-sm">
              <option value="driving">🚗 {t('driving')}</option>
              <option value="walking">🚶 {t('walking')}</option>
              <option value="cycling">🚲 {t('cycling')}</option>
            </select>
            <button onClick={() => { if (selectedProgram) window.open(`https://www.google.com/maps/dir/${userLocation?.[1] || '24.774'},${userLocation?.[0] || '46.713'}/${selectedProgram.coords[1]},${selectedProgram.coords[0]}`); }} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">🗺️ {t('startTrip')}</button>
            <button onClick={() => handleChatWithGuide(selectedProgram.guide_id, selectedProgram.guide_name)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1">
              <MessageCircle size={16} /> {t('chatWithGuide')}
            </button>
            <button onClick={() => handleBooking(selectedProgram)} disabled={bookingLoading} className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm disabled:opacity-50">
              <CalendarCheck size={16} /> {t('bookNow')}
            </button>
            <button onClick={() => requestProgram(selectedProgram)} className="bg-cyan-600 text-white px-3 py-1 rounded-lg text-sm">✉️ {t('requestToJoin') || (lang === 'ar' ? 'طلب مشاركة' : 'Request to Join')}</button>
          </div>
        </div>
      )}

      {/* Fullscreen Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <div className="relative max-w-4xl max-h-screen p-4">
            <img src={programImages[currentImageIndex]} className="max-w-full max-h-screen object-contain" alt="Gallery" onError={(e) => e.target.src = FALLBACK_IMAGE} />
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

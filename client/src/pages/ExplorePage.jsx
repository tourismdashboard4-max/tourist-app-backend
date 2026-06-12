// client/src/pages/ExplorePage.jsx
// ✅ إصلاح نهائي: استخدام المعرف الرقمي (old_id) للمستخدم + معالجة الأخطاء
// ✅ إضافة مستمع لتحديث بيانات المرشدين (الاسم والصورة) في الوقت الفعلي

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import { 
  Home, Bell, User, MapPin, Search, MessageCircle, 
  CalendarCheck, AlertTriangle, Heart, X, Star, Image as ImageIcon 
} from "lucide-react";
import toast from "react-hot-toast";
import api from '../services/api';

mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWR5em0xciJ9.sl39WFOhm4m-kOOYtGqONw";

const API_BASE = "https://tourist-app-api.onrender.com";

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
    refreshMap: "تحديث الخريطة",
    cannotBookOwn: "لا يمكنك حجز برنامجك الخاص",
    cannotChatOwn: "لا يمكنك فتح محادثة مع نفسك",
    safetyGuidelines: "إرشادات السلامة",
    addedToFavorites: "✅ تمت الإضافة إلى المفضلة",
    removedFromFavorites: "🗑️ تمت الإزالة من المفضلة",
    duration: "المدة",
  },
  en: {
    search: "Search...",
    chatWithGuide: "💬 Chat With Guide",
    bookNow: "Book Now",
    requestSent: "Request sent successfully",
    loginRequired: "Please login first",
    bookingFailed: "Booking failed",
    refreshMap: "Refresh Map",
    cannotBookOwn: "You cannot book your own program",
    cannotChatOwn: "You cannot chat with yourself",
    safetyGuidelines: "Safety Guidelines",
    addedToFavorites: "✅ Added to favorites",
    removedFromFavorites: "🗑️ Removed from favorites",
    duration: "Duration",
  },
};

function ExplorePage({ lang = "ar", mapContainerRef, setPage, user, unreadCount, dark }) {
  const t = (key) => LOCALES[lang]?.[key] || key;
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [programImages, setProgramImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const markersRef = useRef([]);
  const isMapLoadedRef = useRef(false);

  // ✅ استماع لتحديثات المرشدين (الاسم والصورة)
  useEffect(() => {
    const handleGuideUpdate = (event) => {
      const { guideId, updatedData } = event.detail;
      console.log(`🔄 تحديث بيانات المرشد ${guideId}:`, updatedData);
      
      // تحديث قائمة البرامج
      setPrograms(prevPrograms => prevPrograms.map(program => {
        if (program.guide_id == guideId) {
          return {
            ...program,
            guide_name: updatedData.fullName || program.guide_name,
            guide_image: updatedData.avatar_url || program.guide_image
          };
        }
        return program;
      }));
      
      // إذا كان البرنامج المحدد هو لنفس المرشد، قم بتحديثه
      if (selectedProgram && selectedProgram.guide_id == guideId) {
        setSelectedProgram(prev => ({
          ...prev,
          guide_name: updatedData.fullName || prev.guide_name,
          guide_image: updatedData.avatar_url || prev.guide_image
        }));
      }
    };
    
    window.addEventListener('guideProfileUpdated', handleGuideUpdate);
    return () => window.removeEventListener('guideProfileUpdated', handleGuideUpdate);
  }, [selectedProgram]);

  // الحصول على old_id (الرقمي) للمستخدم الحالي
  const currentUserNumericId = user?.old_id || (user?.id && !isNaN(Number(user.id)) ? user.id : null);

  useEffect(() => {
    if (user?.id) {
      const loadFavorites = async () => {
        try {
          const res = await api.getFavorites();
          setFavoriteIds(res.favorites || []);
        } catch (err) {
          console.error('Failed to load favorites', err);
        }
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
      if (isFavorite) {
        await api.removeFavorite(programId);
      } else {
        await api.addFavorite(programId);
      }
    } catch (error) {
      setFavoriteIds(previousFavs);
      toast.error(isFavorite ? '❌ فشل إزالة من المفضلة' : '❌ فشل إضافة إلى المفضلة');
      console.error('Favorite toggle error:', error);
    }
  };

  const fetchProgramsFromAPI = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/programs`);
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.programs)) {
        const activePrograms = data.programs.filter(p => {
          const status = (p.status || '').toLowerCase();
          return status === 'active';
        });
        
        const progs = activePrograms.map(p => ({
          id: p.id,
          name_ar: p.name,
          name_en: p.name,
          guide_name: p.guide_name,
          guide_id: p.guide_id,
          coords: [p.location_lng, p.location_lat],
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
        console.log(`📦 Loaded ${progs.length} active programs from API`);
      } else {
        setPrograms([]);
        console.warn('No programs or invalid response');
      }
    } catch (err) {
      console.error('Failed to fetch programs', err);
      setPrograms([]);
    }
  }, []);

  useEffect(() => {
    fetchProgramsFromAPI();
    const interval = setInterval(fetchProgramsFromAPI, 30000);
    return () => clearInterval(interval);
  }, [fetchProgramsFromAPI]);

  // الحصول على UUID للمستخدم للمقارنة (لتحديد البرامج الخاصة)
  const getUserGuideUuid = useCallback(async () => {
    if (!user?.id) return null;
    if (typeof user.id === 'string' && (user.id.includes('-') || user.id.length === 36)) {
      return user.id;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          return data.user.id;
        }
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
    const programGuideId = program.guide_id;
    const currentUserId = userUuid || user.id;
    if (typeof programGuideId === 'string' && typeof currentUserId === 'string') {
      return programGuideId === currentUserId;
    }
    const numProg = !isNaN(Number(programGuideId)) ? Number(programGuideId) : null;
    const numUser = !isNaN(Number(currentUserId)) ? Number(currentUserId) : null;
    return numProg && numUser && numProg === numUser;
  }, [user, userUuid]);

  const handleChatWithGuide = (guideId, guideName) => {
    console.log('🟢 handleChatWithGuide called:', { guideId, guideName, user });
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    if (!guideId && !guideName) {
      toast.error(lang === 'ar' ? 'معرف المرشد غير موجود' : 'Guide ID missing');
      return;
    }
    if (selectedProgram && isOwnProgram(selectedProgram)) {
      toast.error(t('cannotChatOwn'));
      return;
    }
    localStorage.setItem('previousPage', 'explore');
    const chatParams = { 
      recipientId: guideId, 
      recipientName: guideName || (lang === 'ar' ? 'المرشد' : 'Guide'), 
      timestamp: Date.now() 
    };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    toast.success(lang === 'ar' ? `جاري فتح المحادثة مع ${guideName}` : `Opening chat with ${guideName}`);
    console.log('📤 Navigating to directChat with params:', chatParams);
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
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(ticketData)
      });
      if (response.status === 401) {
        toast.error(lang === 'ar' ? 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى' : 'Session expired, please login again');
        setPage('profile');
        return;
      }
      const result = await response.json();
      if (result.success) toast.success(t('requestSent'));
      else toast.error(result.message || t('bookingFailed'));
    } catch (err) {
      console.error('Booking error:', err);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Error sending request');
    } finally { setBookingLoading(false); }
  };

  const allPrograms = programs;
  const displayedPrograms = useMemo(() => {
    if (!showMyProgramsOnly) return allPrograms;
    if (!user) return [];
    const currentGuideId = userUuid || user.id;
    if (!currentGuideId) return [];
    return allPrograms.filter(p => {
      const programGuideId = p.guide_id;
      if (typeof programGuideId === 'string' && typeof currentGuideId === 'string') {
        return programGuideId === currentGuideId;
      }
      const numProg = !isNaN(Number(programGuideId)) ? Number(programGuideId) : null;
      const numUser = !isNaN(Number(currentGuideId)) ? Number(currentGuideId) : null;
      return numProg && numUser && numProg === numUser;
    });
  }, [allPrograms, showMyProgramsOnly, user, userUuid]);

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  const fetchProgramImages = useCallback(async (program) => {
    if (!program) return;
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

  const addMarkersToMap = useCallback((map, programsList) => {
    if (!map || !isMapLoadedRef.current) return false;
    markersRef.current.forEach(m => { try { m.remove(); } catch(e) {} });
    markersRef.current = [];
    const validPrograms = programsList.filter(p => {
      const coords = p.coords || (p.location_lng && p.location_lat ? [p.location_lng, p.location_lat] : null);
      return coords && coords[0] && coords[1] && !isNaN(coords[0]) && !isNaN(coords[1]);
    });
    validPrograms.forEach(program => {
      const coords = program.coords;
      const color = isOwnProgram(program) ? "#9b59b6" : "#10b981";
      const marker = new mapboxgl.Marker({ color, scale: 1.1 }).setLngLat(coords).addTo(map);
      marker.getElement().addEventListener('click', () => {
        setSelectedProgram(program);
        fetchProgramImages(program);
        if (mapInstance && program.coords) mapInstance.flyTo({ center: program.coords, zoom: 14 });
      });
      markersRef.current.push(marker);
    });
    return true;
  }, [isOwnProgram, fetchProgramImages, mapInstance]);

  const addUserMarker = (map, location) => {
    if (!map || !location) return;
    new mapboxgl.Marker({ color: "#3b82f6" })
      .setLngLat(location)
      .setPopup(new mapboxgl.Popup().setText(lang === "ar" ? "📍 موقعك" : "📍 Your location"))
      .addTo(map);
  };

  useEffect(() => {
    if (!mapContainerRef?.current) return;
    if (mapInstance) return;
    const initMap = (center, zoom = 12) => {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
        center,
        zoom,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.on('load', () => {
        isMapLoadedRef.current = true;
        setMapInstance(map);
        if (map.setLanguage) map.setLanguage(lang);
        if (userLocation) addUserMarker(map, userLocation);
        if (displayedPrograms.length) addMarkersToMap(map, displayedPrograms);
      });
      return map;
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setUserLocation(coords);
          initMap(coords, 13);
        },
        () => initMap([46.713, 24.774], 10)
      );
    } else initMap([46.713, 24.774], 10);
  }, [mapContainerRef]);

  useEffect(() => {
    if (mapInstance && isMapLoadedRef.current) addMarkersToMap(mapInstance, displayedPrograms);
  }, [displayedPrograms, mapInstance, addMarkersToMap]);

  useEffect(() => {
    if (!mapInstance || !isMapLoadedRef.current) return;
    const newStyle = dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12";
    if (mapInstance.getStyle().sprite === newStyle) return;
    mapInstance.setStyle(newStyle);
    mapInstance.once('style.load', () => {
      addMarkersToMap(mapInstance, displayedPrograms);
      if (userLocation) addUserMarker(mapInstance, userLocation);
    });
  }, [dark, mapInstance, displayedPrograms, userLocation, addMarkersToMap]);

  useEffect(() => {
    if (mapInstance && isMapLoadedRef.current && mapInstance.setLanguage) mapInstance.setLanguage(lang);
  }, [lang, mapInstance]);

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
          <input type="text" placeholder={t('search')} className="w-full p-2 pr-9 rounded-lg bg-white/20 text-white placeholder-white/70" />
        </div>
        <div className="flex justify-between mt-3 text-xs">
          <span>📌 {displayedPrograms.length} برنامج نشط</span>
          {isGuide && (
            <button onClick={() => setShowMyProgramsOnly(!showMyProgramsOnly)} className={`px-2 py-1 rounded ${showMyProgramsOnly ? 'bg-yellow-500' : 'bg-white/20'}`}>
              {showMyProgramsOnly ? '📌 برامجي فقط' : '🌍 كل البرامج'}
            </button>
          )}
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
                <img
                  src={programImages[currentImageIndex]}
                  alt={selectedProgram.name_ar || selectedProgram.name}
                  className="w-full h-full object-cover"
                  onClick={() => setShowGallery(true)}
                  onError={(e) => {
                    console.error(`❌ فشل تحميل الصورة: ${programImages[currentImageIndex]}`);
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3E❌%3C/text%3E%3C/svg%3E";
                  }}
                />
                {programImages.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full">❮</button>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full">❯</button>
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">{currentImageIndex+1}/{programImages.length}</div>
                  </>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-full bg-gray-200">
                <ImageIcon size={32} className="text-gray-400" />
                <span className="mr-2 text-gray-600">لا توجد صورة</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

            <button
              onClick={() => { setSelectedProgram(null); setProgramImages([]); }}
              className="absolute top-2 right-2 z-20 bg-black/50 backdrop-blur-sm p-1.5 rounded-full text-white hover:bg-black/70 transition pointer-events-auto"
            >
              <X size={18} />
            </button>

            <button
              onClick={() => toggleFavorite(selectedProgram.id)}
              className="absolute bottom-2 left-2 z-20 bg-black/50 backdrop-blur-sm p-1.5 rounded-full hover:scale-105 transition pointer-events-auto"
            >
              <Heart size={18} className={favoriteIds.includes(selectedProgram.id) ? 'fill-red-500 text-red-500' : 'text-white'} />
            </button>

            <div className="absolute bottom-2 right-2 z-20 flex gap-2 pointer-events-auto">
              <button
                onClick={() => handleChatWithGuide(selectedProgram.guide_id, selectedProgram.guide_name)}
                disabled={isOwnProgram(selectedProgram)}
                className={`${isOwnProgram(selectedProgram) ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600/90 hover:bg-blue-700'} backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition`}
                title={isOwnProgram(selectedProgram) ? t('cannotChatOwn') : t('chatWithGuide')}
              >
                <MessageCircle size={12} /> <span>{t('chatWithGuide')}</span>
              </button>
              <button
                onClick={() => handleBooking(selectedProgram)}
                disabled={bookingLoading || isOwnProgram(selectedProgram)}
                className={`${(bookingLoading || isOwnProgram(selectedProgram)) ? 'bg-gray-500 cursor-not-allowed' : 'bg-purple-600/90 hover:bg-purple-700'} backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition`}
                title={isOwnProgram(selectedProgram) ? t('cannotBookOwn') : t('bookNow')}
              >
                <CalendarCheck size={12} /> <span>{t('bookNow')}</span>
              </button>
            </div>

            <div className="absolute bottom-12 left-2 right-2 text-white pointer-events-none">
              <h3 className="font-bold text-base leading-tight drop-shadow-md">{selectedProgram.name_ar || selectedProgram.name}</h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs mt-0.5">
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">👤 {selectedProgram.guide_name}</span>
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">💰 {selectedProgram.price} ريال</span>
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star size={10} className="fill-yellow-400 text-yellow-400" /> {selectedProgram.rating || 4.5}</span>
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">⏱ {selectedProgram.duration}</span>
              </div>
              {selectedProgram.description && (
                <p className="text-xs text-white/80 line-clamp-1 mt-0.5 drop-shadow-md">{selectedProgram.description}</p>
              )}
              {selectedProgram.safetyGuidelines && (
                <div className="flex items-center gap-1 text-[10px] bg-orange-500/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 w-fit mt-0.5">
                  <AlertTriangle size={10} /> <span>{t('safetyGuidelines')}</span>
                </div>
              )}
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

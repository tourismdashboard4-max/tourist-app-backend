// client/src/pages/ExplorePage.jsx - نسخة Leaflet المستقرة
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Home, Bell, User, MapPin, Search, MessageCircle,
  CalendarCheck, AlertTriangle, Heart, X, Star, Image as ImageIcon, Navigation
} from "lucide-react";
import toast from "react-hot-toast";
import api from '../services/api';

// إصلاح أيقونات Leaflet (ضروري)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// مكون لتغيير مركز الخريطة برمجياً
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) map.setView(center, zoom);
  }, [center, zoom]);
  return null;
}

const API_BASE = "https://tourist-app-api.onrender.com";

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const getDistance = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const LOCALES = {
  ar: { /* نفس المحتوى السابق - اختصاراً */ 
    search: "ابحث عن وجهة...",
    chatWithGuide: "💬 دردشة مع المرشد",
    bookNow: "احجز الآن",
    requestSent: "تم إرسال الطلب بنجاح",
    loginRequired: "يجب تسجيل الدخول أولاً",
    bookingFailed: "فشل إرسال الطلب",
    refreshMap: "تحديث الخريطة",
    cannotBookOwn: "لا يمكنك حجز برنامجك",
    safetyGuidelines: "إرشادات السلامة",
    addedToFavorites: "✅ تمت الإضافة إلى المفضلة",
    removedFromFavorites: "🗑️ تمت الإزالة من المفضلة",
    duration: "المدة",
    nearbyPrograms: "البرامج القريبة",
    distance: "المسافة",
  },
  en: { /* بالمثل */ 
    search: "Search...",
    chatWithGuide: "💬 Chat With Guide",
    bookNow: "Book Now",
    requestSent: "Request sent successfully",
    loginRequired: "Please login first",
    bookingFailed: "Booking failed",
    refreshMap: "Refresh Map",
    cannotBookOwn: "You cannot book your own program",
    safetyGuidelines: "Safety Guidelines",
    addedToFavorites: "✅ Added to favorites",
    removedFromFavorites: "🗑️ Removed from favorites",
    duration: "Duration",
    nearbyPrograms: "Nearby Programs",
    distance: "Distance",
  },
};

function ExplorePage({ lang = "ar", setPage, user, unreadCount, dark }) {
  const t = (key) => LOCALES[lang]?.[key] || key;
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [userLocation, setUserLocation] = useState([24.774, 46.713]); // الرياض
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [programImages, setProgramImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [locationError, setLocationError] = useState(false);

  // تحميل المفضلة
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
      if (isFavorite) await api.removeFavorite(programId);
      else await api.addFavorite(programId);
    } catch (error) {
      setFavoriteIds(previousFavs);
      toast.error(isFavorite ? '❌ فشل إزالة من المفضلة' : '❌ فشل إضافة إلى المفضلة');
    }
  };

  // جلب البرامج النشطة
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
        }));
        setPrograms(progs);
      } else setPrograms([]);
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

  // طلب موقع المستخدم
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocationError(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocationError(true);
        setUserLocation([24.774, 46.713]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // جلب صور البرنامج
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

  // التحقق من ملكية البرنامج
  const isOwnProgram = useCallback((program) => {
    if (!user || !program) return false;
    return String(program.guide_id) === String(user.id);
  }, [user]);

  // فتح المحادثة
  const handleChatWithGuide = (guideId, guideName) => {
    if (!user) {
      toast.error(t('loginRequired'));
      setPage('profile');
      return;
    }
    if (selectedProgram && isOwnProgram(selectedProgram)) {
      toast.error(lang === 'ar' ? 'هذا برنامجك الخاص، لا يمكنك فتح محادثة مع نفسك' : 'You cannot chat with yourself');
      return;
    }
    const recipientId = guideId;
    if (!recipientId) {
      toast.error(lang === 'ar' ? 'معرف المرشد غير صالح' : 'Invalid guide ID');
      return;
    }
    const chatParams = { recipientId, recipientName: guideName || 'المرشد', timestamp: Date.now() };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    toast.success(lang === 'ar' ? `تم فتح المحادثة مع ${guideName}` : `Chat opened with ${guideName}`);
    setPage('directChat');
  };

  // الحجز
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
      if (response.status === 401) {
        toast.error(lang === 'ar' ? 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى' : 'Session expired');
        setPage('profile');
        return;
      }
      const result = await response.json();
      if (result.success) toast.success(t('requestSent'));
      else toast.error(result.message || t('bookingFailed'));
    } catch (err) {
      console.error('Booking error:', err);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Error sending request');
    } finally {
      setBookingLoading(false);
    }
  };

  // فلترة البرامج
  const allPrograms = programs;
  const displayedPrograms = useMemo(() => {
    if (!showMyProgramsOnly) return allPrograms;
    if (!user) return [];
    return allPrograms.filter(p => String(p.guide_id) === String(user.id));
  }, [allPrograms, showMyProgramsOnly, user]);

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

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
      {/* الشريط العلوي - نفس التصميم */}
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
          <input
            type="text"
            placeholder={t('search')}
            className="w-full p-2 pr-9 rounded-lg bg-white/20 text-white placeholder-white/70"
            onChange={(e) => {
              const term = e.target.value.toLowerCase();
              const matchingProgram = displayedPrograms.find(p =>
                (p.name_ar || p.name).toLowerCase().includes(term) ||
                (p.location_name || '').toLowerCase().includes(term)
              );
              if (matchingProgram && matchingProgram.lat && matchingProgram.lng) {
                setUserLocation([matchingProgram.lat, matchingProgram.lng]);
                setSelectedProgram(matchingProgram);
                fetchProgramImages(matchingProgram);
              }
            }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs">
          <span>📌 {displayedPrograms.length} برنامج نشط</span>
          {isGuide && (
            <button
              onClick={() => setShowMyProgramsOnly(!showMyProgramsOnly)}
              className={`px-2 py-1 rounded ${showMyProgramsOnly ? 'bg-yellow-500' : 'bg-white/20'}`}
            >
              {showMyProgramsOnly ? '📌 برامجي فقط' : '🌍 كل البرامج'}
            </button>
          )}
        </div>
        {locationError && (
          <div className="text-xs bg-yellow-500/80 p-1 rounded mt-1 text-center">
            {lang === 'ar' ? '⚠️ تعذر تحديد موقعك بدقة، تم تعيين موقع افتراضي.' : '⚠️ Could not determine your location.'}
          </div>
        )}
      </div>

      {/* خريطة Leaflet بارتفاع ثابت */}
      <div style={{ height: '500px', width: '100%' }}>
        <MapContainer center={userLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
          <ChangeMapView center={userLocation} zoom={13} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB'
          />
          <Marker position={userLocation}>
            <Popup>{lang === 'ar' ? '📍 موقعك الحالي' : 'Your location'}</Popup>
          </Marker>
          {displayedPrograms.map(program => (
            program.lat && program.lng && (
              <Marker
                key={program.id}
                position={[program.lat, program.lng]}
                eventHandlers={{
                  click: () => {
                    setSelectedProgram(program);
                    fetchProgramImages(program);
                  }
                }}
              >
                <Popup>
                  <b>{program.name_ar || program.name}</b><br />
                  {program.guide_name}<br />
                  {program.price} ريال
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>

      {/* بقية الكود (البطاقة السفلية ومعرض الصور) - نفس الكود الأصلي */}
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
                  onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3E❌%3C/text%3E%3C/svg%3E"; }}
                />
                {programImages.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-10">❮</button>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-10">❯</button>
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">{currentImageIndex+1}/{programImages.length}</div>
                  </>
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-full bg-gray-200 dark:bg-gray-700">
                <ImageIcon size={32} className="text-gray-400" />
                <span className="mr-2 text-gray-600 dark:text-gray-300">لا توجد صورة</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
            <button onClick={() => { setSelectedProgram(null); setProgramImages([]); }} className="absolute top-2 right-2 z-20 bg-black/50 backdrop-blur-sm p-1.5 rounded-full text-white hover:bg-black/70 transition pointer-events-auto"><X size={18} /></button>
            <button onClick={() => toggleFavorite(selectedProgram.id)} className="absolute bottom-2 left-2 z-20 bg-black/50 backdrop-blur-sm p-1.5 rounded-full hover:scale-105 transition pointer-events-auto"><Heart size={18} className={favoriteIds.includes(selectedProgram.id) ? 'fill-red-500 text-red-500' : 'text-white'} /></button>
            <div className="absolute bottom-2 right-2 z-20 flex gap-2 pointer-events-auto">
              <button onClick={() => handleChatWithGuide(selectedProgram.guide_id, selectedProgram.guide_name)} className="bg-blue-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-blue-700 transition"><MessageCircle size={12} /> {t('chatWithGuide')}</button>
              <button onClick={() => handleBooking(selectedProgram)} disabled={bookingLoading || isOwnProgram(selectedProgram)} className={`bg-purple-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${(bookingLoading || isOwnProgram(selectedProgram)) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}><CalendarCheck size={12} /> {t('bookNow')}</button>
            </div>
            <div className="absolute bottom-12 left-2 right-2 text-white pointer-events-none">
              <h3 className="font-bold text-base leading-tight drop-shadow-md">{selectedProgram.name_ar || selectedProgram.name}</h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs mt-0.5">
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">👤 {selectedProgram.guide_name}</span>
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">💰 {selectedProgram.price} ريال</span>
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star size={10} className="fill-yellow-400 text-yellow-400" /> {selectedProgram.rating || 4.5}</span>
                <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">⏱ {selectedProgram.duration}</span>
                {userLocation && selectedProgram.lat && selectedProgram.lng && (
                  <span className="bg-blue-500/70 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Navigation size={10} /> {getDistance(userLocation[0], userLocation[1], selectedProgram.lat, selectedProgram.lng)?.toFixed(1)} {t('distance')}
                  </span>
                )}
              </div>
              {selectedProgram.description && <p className="text-xs text-white/80 line-clamp-1 mt-0.5 drop-shadow-md">{selectedProgram.description}</p>}
              {selectedProgram.safetyGuidelines && (
                <div className="flex items-center gap-1 text-[10px] bg-orange-500/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 w-fit mt-0.5"><AlertTriangle size={10} /> {t('safetyGuidelines')}</div>
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
                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition">❮</button>
                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition">❯</button>
              </>
            )}
            <button onClick={() => setShowGallery(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExplorePage;

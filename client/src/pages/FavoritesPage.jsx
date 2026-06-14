// client/src/pages/FavoritesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Star, Heart, Trash2, Navigation, Image as ImageIcon, MessageCircle, CalendarCheck, Map } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'https://tourist-app-api.onrender.com';

// دوال مساعدة (نفس المستخدمة في HomePage)
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
    if (typeof img === 'string') return buildImageUrl(img);
    const url = buildImageUrl(img.url || img.image_url);
    return url || null;
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
  if (text.includes('بحر') || text.includes('بحري')) return { ar: 'رحلات بحرية', en: 'Marine trips', icon: '🌊' };
  if (text.includes('تسلق') || text.includes('جبل')) return { ar: 'تسلق جبال', en: 'Mountain climbing', icon: '⛰️' };
  if (text.includes('سفاري')) return { ar: 'رحلات سفاري', en: 'Safari trips', icon: '🦁' };
  if (text.includes('براشوت') || text.includes('مظلة')) return { ar: 'رحلات براشوت', en: 'Parachute trips', icon: '🪂' };
  return { ar: 'برنامج سياحي', en: 'Tour program', icon: '🏞️' };
};

function FavoritesPage({ lang, setPage, user }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationSource, setLocationSource] = useState(null);
  const [imageIndex, setImageIndex] = useState({});
  const [bookingLoading, setBookingLoading] = useState(false);

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

  // جلب تفاصيل برنامج كاملة (مطابق لـ HomePage)
  const fetchFullProgram = async (programId) => {
    try {
      const res = await fetch(`${API_BASE}/api/programs/${programId}`);
      const data = await res.json();
      const prog = data.program || data.data || data;
      if (prog) {
        let images = [];
        if (prog.images?.length) images = prog.images.map(img => buildImageUrl(img.url || img.image_url)).filter(Boolean);
        else if (prog.image) images = [buildImageUrl(prog.image)];
        return { ...prog, images };
      }
    } catch(e) {}
    return null;
  };

  // تحميل قائمة المفضلة من localStorage وجلب تفاصيل البرامج
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const favoriteIds = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]');
      if (favoriteIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // جلب جميع البرامج النشطة
      const res = await fetch(`${API_BASE}/api/programs`);
      const data = await res.json();
      let allPrograms = [];
      if (data.success && Array.isArray(data.programs)) allPrograms = data.programs;
      else if (Array.isArray(data)) allPrograms = data;
      else allPrograms = [];

      const favProgramsBasic = allPrograms.filter(p => favoriteIds.includes(p.id) && p.status === 'active');
      const detailed = await Promise.all(favProgramsBasic.map(p => fetchFullProgram(p.id).catch(() => p)));
      setFavorites(detailed.filter(p => p !== null));

      const initialIndex = {};
      detailed.forEach(p => { if(p) initialIndex[p.id] = 0; });
      setImageIndex(initialIndex);
    } catch (err) {
      console.error('Error loading favorites:', err);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // إزالة من المفضلة (تحديث localStorage)
  const removeFavorite = (programId) => {
    if (!user) return;
    const favoriteIds = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]');
    const newFavs = favoriteIds.filter(id => id !== programId);
    localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavs));
    setFavorites(prev => prev.filter(p => p.id !== programId));
    toast.success(lang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites');
  };

  // دوال التفاعل (دردشة، حجز، عرض على الخريطة) مشابهة لـ HomePage
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

  const handleBooking = async (program) => {
    if (!user) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      setPage('profile');
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
          type: 'booking',
          priority: 'normal',
          message: `أود حجز البرنامج "${program.name}" للمرشد ${program.guide_name}`
        })
      });
      const result = await res.json();
      if (result.success) toast.success(lang === 'ar' ? 'تم إرسال طلب الحجز بنجاح' : 'Booking request sent');
      else toast.error(result.message || (lang === 'ar' ? 'فشل إرسال طلب الحجز' : 'Booking failed'));
    } catch(e) {
      toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleViewOnMap = (id) => {
    localStorage.setItem('selectedProgramId', id);
    setPage('explore');
  };

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

  useEffect(() => {
    loadStoredLocation();
    loadFavorites();

    const handleLocationUpdate = (event) => {
      if (event.detail && event.detail.coords) {
        const coords = event.detail.coords;
        setUserLocation({ lat: coords[1], lng: coords[0] });
        setLocationSource('manual');
        toast.success(lang === 'ar' ? 'تم تحديث موقعك يدوياً' : 'Manual location updated');
      }
    };
    window.addEventListener('userLocationUpdated', handleLocationUpdate);
    return () => window.removeEventListener('userLocationUpdated', handleLocationUpdate);
  }, [loadFavorites, loadStoredLocation, lang]);

  if (loading) {
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
              distance = getDistance(userLocation.lat, userLocation.lng, program.location_lat, program.location_lng).toFixed(1);
            }
            const activity = getActivityType(program, lang);
            const activityLabel = lang === 'ar' ? activity.ar : activity.en;

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
                    <img src={currentImg} alt={program.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={40} />
                      <span className="text-sm mt-1">لا توجد صورة</span>
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
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">{program.guide_name || 'مرشد سياحي'}</div>
                        <div className="text-xs flex items-center gap-1 mt-0.5"><MapPin size={12} /> <span className="truncate max-w-[120px]">{program.location || 'موقع البرنامج'}</span></div>
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
                        <button onClick={() => handleBooking(program)} disabled={bookingLoading} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition disabled:opacity-50"><CalendarCheck size={14} />{lang === 'ar' ? 'احجز' : 'Book'}</button>
                        <button onClick={() => handleViewOnMap(program.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition"><Map size={14} />{lang === 'ar' ? 'خريطة' : 'Map'}</button>
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

// client/src/pages/FavoritesPage.jsx
// ✅ إصدار نهائي – أزرار "دردشة مع المرشد" و"احجز الآن" تعمل بنفس طريقة ExplorePage

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, Star, Heart, Trash2, Navigation, 
  Image as ImageIcon, MessageCircle, CalendarCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'https://tourist-app-api.onrender.com';

// ========== دوال معالجة الصور (مطابقة لـ ExplorePage) ==========
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
// ============================================================

// خريطة ثابتة للمرشدين (مثل FALLBACK_GUIDES_MAP في ExplorePage)
const FALLBACK_GUIDES_MAP = {
  "64be64ff-ae41-4eb0-a41f-27de577b6246": 6,
  "d93beb84-4e67-4f64-bfe9-d20cc25f8b44": 1,
};

// دالة حساب المسافة (هافرسين)
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

// تحديد نوع النشاط
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

function FavoritesPage({ lang, setPage, user }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [imageIndex, setImageIndex] = useState({});
  const [bookingLoading, setBookingLoading] = useState(false);
  const [guidesMap, setGuidesMap] = useState(FALLBACK_GUIDES_MAP);

  // ========== جلب خريطة تحويل المعرفات (مثل ExplorePage) ==========
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
          if (uuid && numericId && !isNaN(Number(numericId))) map[uuid] = Number(numericId);
          const name = guide.full_name || guide.name;
          if (name && numericId && !isNaN(Number(numericId))) map[name] = Number(numericId);
        });
        setGuidesMap(prev => ({ ...prev, ...map }));
      } catch (err) { console.error('Failed to fetch guides map:', err); }
    };
    fetchGuidesMap();
  }, []);

  // ========== تحويل معرف المرشد (نفس ExplorePage) ==========
  const convertGuideId = useCallback((guideId, guideName) => {
    if (guideId && !isNaN(Number(guideId))) return Number(guideId);
    if (guideId && guidesMap[guideId]) return guidesMap[guideId];
    if (guideName && guidesMap[guideName]) return guidesMap[guideName];
    // حالات خاصة
    if (guideId === "64be64ff-ae41-4eb0-a41f-27de577b6246") return 6;
    if (guideId === "d93beb84-4e67-4f64-bfe9-d20cc25f8b44") return 1;
    if (guideName === "مرشد سياحي") return 6;
    if (guideName === "Tour Guide 2") return 6;
    return null;
  }, [guidesMap]);

  // ========== فتح محادثة مع المرشد (نفس ExplorePage) ==========
  const handleChatWithGuide = useCallback((guideId, guideName) => {
    if (!user) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      setPage('profile');
      return;
    }
    if (!guideId && !guideName) {
      toast.error(lang === 'ar' ? 'معرف المرشد غير موجود' : 'Guide ID missing');
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
    const chatParams = { 
      recipientId: numericGuideId, 
      recipientName: guideName || 'المرشد', 
      timestamp: Date.now() 
    };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    toast.success(lang === 'ar' ? `تم فتح المحادثة مع ${guideName}` : `Chat opened with ${guideName}`);
    setPage('directChat');
  }, [user, lang, setPage, convertGuideId]);

  // ========== طلب حجز البرنامج (نفس ExplorePage) ==========
  const handleBooking = async (program) => {
    if (!user) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      setPage('profile');
      return;
    }
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const ticketData = {
        user_id: user.id,
        subject: `طلب حجز برنامج: ${program.name}`,
        type: 'booking',
        priority: 'normal',
        message: `أود حجز البرنامج "${program.name}" الذي يقدمه المرشد ${program.guide_name}.`
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
      if (result.success) {
        toast.success(lang === 'ar' ? 'تم إرسال طلب الحجز بنجاح' : 'Booking request sent');
      } else {
        toast.error(result.message || (lang === 'ar' ? 'فشل إرسال طلب الحجز' : 'Booking failed'));
      }
    } catch (err) {
      console.error('Booking error:', err);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Error sending request');
    } finally {
      setBookingLoading(false);
    }
  };

  // ========== جلب التفاصيل الكاملة للبرنامج (بما في ذلك الصور) ==========
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

  // ========== تحميل المفضلة ==========
  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favIds = JSON.parse(localStorage.getItem('favorite_programs') || '[]');
      if (favIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/programs`);
      const data = await res.json();
      let programs = [];
      if (data.success && Array.isArray(data.programs)) programs = data.programs;
      else if (Array.isArray(data)) programs = data;

      const basicFavs = programs.filter(p => favIds.includes(p.id));
      const detailedFavs = await Promise.all(
        basicFavs.map(async (prog) => {
          const detailed = await fetchFullProgram(prog.id);
          if (detailed) return detailed;
          return {
            ...prog,
            images: fixImagesArray(prog.images || []),
            image: buildImageUrl(prog.image)
          };
        })
      );
      setFavorites(detailedFavs);
      const initialIndex = {};
      detailedFavs.forEach(p => { initialIndex[p.id] = 0; });
      setImageIndex(initialIndex);
    } catch (err) {
      console.error(err);
      setFavorites([]);
    } finally { setLoading(false); }
  };

  const removeFavorite = (programId) => {
    const favIds = JSON.parse(localStorage.getItem('favorite_programs') || '[]');
    const newFavIds = favIds.filter(id => id !== programId);
    localStorage.setItem('favorite_programs', JSON.stringify(newFavIds));
    setFavorites(prev => prev.filter(p => p.id !== programId));
    toast.success(lang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites');
  };

  // ========== التنقل بين الصور ==========
  const nextImage = (e, programId, total) => {
    e.stopPropagation();
    setImageIndex(prev => ({ ...prev, [programId]: (prev[programId] + 1) % total }));
  };
  const prevImage = (e, programId, total) => {
    e.stopPropagation();
    setImageIndex(prev => ({ ...prev, [programId]: (prev[programId] - 1 + total) % total }));
  };

  // ========== تحميل موقع المستخدم ==========
  const loadUserLocation = () => {
    const cached = localStorage.getItem('cached_user_location');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.lat && data.lng) setUserLocation({ lat: data.lat, lng: data.lng });
      } catch(e) {}
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn('Unable to get location')
      );
    }
  };

  useEffect(() => {
    loadUserLocation();
    loadFavorites();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        {lang === 'ar' ? 'المفضلة' : 'Favorites'}
      </h1>

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
            const images = (program.images || []).map(img => img.url);
            const currentImgIndex = imageIndex[program.id] || 0;
            const currentImg = images[currentImgIndex] || null;

            let distance = null;
            if (userLocation && program.location_lat && program.location_lng) {
              distance = getDistance(
                userLocation.lat, userLocation.lng,
                program.location_lat, program.location_lng
              ).toFixed(1);
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
                      <button
                        onClick={(e) => prevImage(e, program.id, images.length)}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full text-sm hover:bg-black/70 transition z-10"
                      >❮</button>
                      <button
                        onClick={(e) => nextImage(e, program.id, images.length)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full text-sm hover:bg-black/70 transition z-10"
                      >❯</button>
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
                        {currentImgIndex+1} / {images.length}
                      </span>
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
                        {/* زر الدردشة مع المرشد */}
                        <button
                          onClick={() => handleChatWithGuide(program.guide_id, program.guide_name)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition"
                        >
                          <MessageCircle size={14} />
                          {lang === 'ar' ? 'دردشة' : 'Chat'}
                        </button>
                        {/* زر الحجز */}
                        <button
                          onClick={() => handleBooking(program)}
                          disabled={bookingLoading}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition disabled:opacity-50"
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
  );
}

export default FavoritesPage;

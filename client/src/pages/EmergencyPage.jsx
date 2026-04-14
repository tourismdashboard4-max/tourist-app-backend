// client/src/pages/ExplorePage.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
// ❌ لا تستورد MapboxDirections مباشرة
// import MapboxDirections from '@mapbox/mapbox-gl-directions';
// import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import { FaMapMarkerAlt } from 'react-icons/fa';

// Mapbox token
mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw";
client/src/pages/ExplorePage.jsx - النسخة النهائية المصححة (تدعم المحادثة المباشرة مع المرشد)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import {
  Home,
  Bell,
  User,
  MapPin,
  Search,
  Star,
  MessageCircle,
  CalendarCheck,
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWR5em0xciJ9.sl39WFOhm4m-kOOYtGqONw";

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23999' text-anchor='middle' dy='.3em'%3E🖼️ لا توجد صورة%3C/text%3E%3C/svg%3E";

const LOCALES = {
  en: {
    search: "Search destination...",
    driving: "Driving",
    walking: "Walking",
    cycling: "Cycling",
    startTrip: "Start trip",
    distance: "Distance",
    duration: "Duration",
    viewImages: "View Images",
    chatWithGuide: "Chat with Guide",
    bookNow: "Book Now",
    requestSent: "Request sent! The guide will contact you.",
    loginRequired: "Please login first to book this program",
    bookingFailed: "Failed to send booking request, please try again",
    chatError: "Could not start chat with guide, please try again later",
  },
  ar: {
    search: "ابحث عن وجهة...",
    driving: "سيارة",
    walking: "مشي",
    cycling: "دراجة",
    startTrip: "ابدأ الرحلة",
    distance: "المسافة",
    duration: "المدة",
    viewImages: "عرض الصور",
    chatWithGuide: "دردشة مع المرشد",
    bookNow: "احجز الآن",
    requestSent: "تم إرسال الطلب! سيتواصل معك المرشد.",
    loginRequired: "يجب تسجيل الدخول أولاً لحجز هذا البرنامج",
    bookingFailed: "فشل إرسال طلب الحجز، حاول مرة أخرى",
    chatError: "لا يمكن بدء المحادثة مع المرشد حالياً، حاول لاحقاً",
  },
};

function ExplorePage({
  lang,
  mapContainerRef,
  setPage,
  transport,
  setTransport,
  user,
  unreadCount,
  dark,
}) {
  const t = (k) => LOCALES[lang][k] || k;
  const navigate = useNavigate(); // ✅ استخدام React Router للتنقل
  
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [programImages, setProgramImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [guidesMap, setGuidesMap] = useState({});
  const [mapLoading, setMapLoading] = useState(true);

  const markersRef = useRef([]);
  const isMapLoadedRef = useRef(false);
  const API_BASE = "https://tourist-app-api.onrender.com";

  // ✅ جلب قائمة المرشدين وإنشاء خريطة UUID -> old_id (الرقم الحقيقي)
  useEffect(() => {
    const fetchGuidesList = async () => {
      try {
        const response = await api.get('/api/guides');
        let guidesList = [];
        if (response.data?.data?.guides) guidesList = response.data.data.guides;
        else if (response.data?.guides) guidesList = response.data.guides;
        else if (Array.isArray(response.data)) guidesList = response.data;
        else if (response.data?.data && Array.isArray(response.data.data)) guidesList = response.data.data;

        const map = {};
        guidesList.forEach(guide => {
          const uuid = guide.id || guide.uuid;
          const numericId = guide.old_id;
          if (uuid && numericId && !isNaN(Number(numericId))) {
            map[uuid] = Number(numericId);
            if (guide.guide_id) map[guide.guide_id] = Number(numericId);
            if (guide.name) map[guide.name] = Number(numericId);
            if (guide.full_name) map[guide.full_name] = Number(numericId);
            if (guide.email) map[guide.email] = Number(numericId);
          }
        });
        setGuidesMap(map);
        localStorage.setItem('guidesMap', JSON.stringify(map));
        console.log('✅ Guides map (UUID -> old_id):', map);
      } catch (err) {
        console.error('Failed to fetch guides list:', err);
      }
    };
    fetchGuidesList();
  }, []);

  // جلب البرامج
  const fetchProgramsFromAPI = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/programs`);
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.programs)) {
        const progs = data.programs
          .filter((p) => p.status === "active")
          .map((p) => ({
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
            image: p.image
              ? p.image.startsWith("http")
                ? p.image
                : `${API_BASE}${p.image}`
              : null,
          }));
        setPrograms(progs);
        localStorage.setItem("public_programs", JSON.stringify(progs));
        console.log(`📦 Loaded ${progs.length} real programs from API`);
      } else {
        const stored = localStorage.getItem("public_programs");
        if (stored) setPrograms(JSON.parse(stored));
      }
    } catch (err) {
      const stored = localStorage.getItem("public_programs");
      if (stored) setPrograms(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    fetchProgramsFromAPI();
    const interval = setInterval(fetchProgramsFromAPI, 30000);
    return () => clearInterval(interval);
  }, [fetchProgramsFromAPI]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "public_programs") fetchProgramsFromAPI();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchProgramsFromAPI]);

  const fetchProgramImages = useCallback(async (programId) => {
    setLoadingImages(true);
    try {
      const response = await api.getProgramImages(programId);
      if (
        response.success &&
        Array.isArray(response.images) &&
        response.images.length > 0
      ) {
        const images = response.images.map((img) =>
          img.image_url.startsWith("http")
            ? img.image_url
            : `${API_BASE}${img.image_url}`
        );
        setProgramImages(images);
        const primaryIndex = response.images.findIndex((img) => img.is_primary);
        setCurrentImageIndex(primaryIndex !== -1 ? primaryIndex : 0);
      } else {
        setProgramImages([]);
      }
    } catch (err) {
      setProgramImages([]);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  const handleBooking = async (program) => {
    if (!user) {
      alert(t("loginRequired"));
      setPage("profile");
      return;
    }
    setBookingLoading(true);
    try {
      const ticketData = {
        user_id: user.id,
        subject: `طلب حجز برنامج: ${program.name_ar || program.name}`,
        type: "booking",
        priority: "normal",
        message: `أود حجز البرنامج السياحي "${
          program.name_ar || program.name
        }" الذي يقدمه المرشد ${program.guide_name}.`,
      };
      const response = await api.createSupportTicket(ticketData);
      if (response.success) {
        alert(t("requestSent"));
      } else {
        alert(t("bookingFailed"));
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert(t("bookingFailed"));
    } finally {
      setBookingLoading(false);
    }
  };

  // ✅ دالة معالجة الدردشة: تحويل UUID إلى old_id واستخدام React Router
  const handleChatWithGuide = async (guideId, guideName) => {
    if (!user) {
      toast.error(t("loginRequired"));
      setPage("profile");
      return;
    }

    if (!guideId) {
      toast.error(lang === 'ar' ? 'معرف المرشد غير موجود' : 'Guide ID missing');
      return;
    }

    let numericGuideId = null;

    // 1. إذا كان المعرف رقماً بالفعل
    if (!isNaN(Number(guideId))) {
      numericGuideId = Number(guideId);
    } else {
      // 2. البحث في guidesMap (المبنية من old_id)
      if (guidesMap[guideId]) {
        numericGuideId = guidesMap[guideId];
      } else if (guideName && guidesMap[guideName]) {
        numericGuideId = guidesMap[guideName];
      } else {
        // 3. محاولة البحث في الخريطة المخزنة في localStorage (احتياطي)
        try {
          const mapStr = localStorage.getItem('guidesMap');
          if (mapStr) {
            const map = JSON.parse(mapStr);
            if (map[guideId]) numericGuideId = map[guideId];
            else if (guideName && map[guideName]) numericGuideId = map[guideName];
          }
        } catch (e) { console.warn(e); }
      }
    }

    if (!numericGuideId || isNaN(numericGuideId)) {
      toast.error(lang === 'ar' ? 'لم نتمكن من العثور على معرف المرشد الصحيح' : 'Could not find valid guide ID');
      return;
    }

    // حفظ المعاملات مع old_id (رقم صحيح)
    const chatParams = {
      recipientId: numericGuideId,
      recipientName: guideName || 'المرشد',
      timestamp: Date.now()
    };
    localStorage.setItem('directChatParams', JSON.stringify(chatParams));
    console.log('✅ Saved chat params with numeric ID:', chatParams);
    
    // ✅ استخدام React Router للتنقل إلى صفحة المحادثة المباشرة
    navigate('/direct-chat');
  };

  const allPrograms = programs;
  const displayedPrograms = showMyProgramsOnly
    ? allPrograms.filter((p) => p.guide_id === user?.id)
    : allPrograms;
  const isGuide =
    user?.role === "guide" || user?.type === "guide" || user?.isGuide === true;

  // إضافة العلامات على الخريطة (محسنة)
  const addMarkersToMap = useCallback(
    (map, programsList, currentLang) => {
      if (!map || !isMapLoadedRef.current) return false;
      markersRef.current.forEach((m) => { try { m.remove(); } catch (e) {} });
      markersRef.current = [];

      const validPrograms = programsList.filter((p) => {
        const coords = p.coords || (p.location_lng && p.location_lat ? [p.location_lng, p.location_lat] : null);
        return coords && coords[0] && coords[1] && !isNaN(coords[0]) && !isNaN(coords[1]);
      });
      console.log(`🗺️ Adding ${validPrograms.length} markers with enhanced popups`);

      validPrograms.forEach((program) => {
        const coords = program.coords || [program.location_lng, program.location_lat];
        const isUserProgram = program.guide_id === user?.id;
        const color = isUserProgram ? "#9b59b6" : "#10b981";
        
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            background: ${color};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <span style="font-size: 20px;">🌳</span>
          </div>
        `;
        markerElement.addEventListener('mouseenter', () => {
          markerElement.style.transform = 'scale(1.1)';
        });
        markerElement.addEventListener('mouseleave', () => {
          markerElement.style.transform = 'scale(1)';
        });
        
        const popupHTML = `
          <div style="
            text-align: ${currentLang === "ar" ? "right" : "left"};
            padding: 0;
            min-width: 260px;
            max-width: 320px;
            direction: ${currentLang === "ar" ? "rtl" : "ltr"};
            font-family: system-ui, -apple-system, sans-serif;
            border-radius: 12px;
            overflow: hidden;
          ">
            <div style="
              background: linear-gradient(135deg, ${color}20, ${color}10);
              padding: 12px;
              border-bottom: 2px solid ${color};
            ">
              <h3 style="margin:0 0 4px 0; color:${color}; font-size:16px; font-weight:bold;">${program.name_ar || program.name}</h3>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <span style="font-size:12px; color:#666;">👤 ${program.guide_name || "مرشد سياحي"}</span>
                <span style="font-size:12px; color:#666;">⭐ ${program.rating || 4.5}</span>
              </div>
            </div>
            <div style="padding:12px;">
              ${program.image ? `<img src="${program.image}" style="width:100%; height:100px; object-fit:cover; border-radius:8px; margin-bottom:10px;" onerror="this.style.display='none'" />` : ''}
              <div style="display:flex; gap:12px; margin-bottom:10px;">
                <span style="font-size:14px; font-weight:bold; color:${color};">💰 ${program.price} ريال</span>
                <span style="font-size:14px;">⏱️ ${program.duration || "غير محدد"}</span>
              </div>
              ${program.description ? `<p style="font-size:12px; color:#666; margin:0 0 10px 0; line-height:1.4;">${program.description.substring(0, 80)}${program.description.length > 80 ? '...' : ''}</p>` : ''}
              <button 
                id="popup-details-btn-${program.id}" 
                style="width:100%; background:${color}; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; transition:opacity 0.2s;"
                onmouseover="this.style.opacity='0.9'"
                onmouseout="this.style.opacity='1'"
              >
                📍 ${currentLang === "ar" ? "عرض التفاصيل" : "View Details"}
              </button>
            </div>
          </div>
        `;
        
        const marker = new mapboxgl.Marker({ element: markerElement, scale: 1 })
          .setLngLat(coords)
          .setPopup(new mapboxgl.Popup({ closeButton: true, closeOnClick: false, maxWidth: 320, offset: 25 }).setHTML(popupHTML))
          .addTo(map);
        
        marker.getElement().addEventListener("click", () => {
          console.log("🟢 Marker clicked for program:", program.id);
          setSelectedProgram(program);
          fetchProgramImages(program.id);
          if (mapInstance && program.coords)
            mapInstance.flyTo({ center: program.coords, zoom: 14, duration: 1000 });
        });
        
        markersRef.current.push(marker);
      });
      return true;
    },
    [user?.id, fetchProgramImages, mapInstance]
  );

  const addUserMarker = (map, location) => {
    if (!map || !location) return;
    new mapboxgl.Marker({ color: "#3b82f6" })
      .setLngLat(location)
      .setPopup(new mapboxgl.Popup().setText(lang === "ar" ? "📍 موقعك" : "📍 Your location"))
      .addTo(map);
  };

  // تهيئة الخريطة
  useEffect(() => {
    if (!mapContainerRef?.current) return;
    if (mapInstance) return;

    const initMap = (center, zoom = 12) => {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/outdoors-v12",
        center,
        zoom,
        optimizeForTerrain: true,
      });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.addControl(new mapboxgl.FullscreenControl(), "top-right");
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      });
      map.addControl(geolocate, 'top-right');
      
      map.on("load", () => {
        console.log("🗺️ Map loaded");
        setMapLoading(false);
        isMapLoadedRef.current = true;
        setMapInstance(map);
        if (map.setLanguage) map.setLanguage(lang);
        if (userLocation) addUserMarker(map, userLocation);
        if (displayedPrograms.length) {
          addMarkersToMap(map, displayedPrograms, lang);
        }
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
    } else {
      initMap([46.713, 24.774], 10);
    }
  }, [mapContainerRef]);

  useEffect(() => {
    if (mapInstance && isMapLoadedRef.current) {
      addMarkersToMap(mapInstance, displayedPrograms, lang);
    }
  }, [displayedPrograms, mapInstance, lang, addMarkersToMap]);

  useEffect(() => {
    if (!mapInstance || !isMapLoadedRef.current) return;
    const newStyle = dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/outdoors-v12";
    if (mapInstance.getStyle().sprite === newStyle) return;
    mapInstance.setStyle(newStyle);
    mapInstance.once("style.load", () => {
      addMarkersToMap(mapInstance, displayedPrograms, lang);
      if (userLocation) addUserMarker(mapInstance, userLocation);
    });
  }, [dark, mapInstance, displayedPrograms, lang, userLocation, addMarkersToMap]);

  useEffect(() => {
    if (mapInstance && isMapLoadedRef.current && mapInstance.setLanguage) {
      mapInstance.setLanguage(lang);
    }
  }, [lang, mapInstance]);

  useEffect(() => {
    window.selectProgram = (id) => {
      console.log("🔍 window.selectProgram called with id:", id);
      const prog = displayedPrograms.find((p) => p.id === id);
      if (prog) {
        setSelectedProgram(prog);
        fetchProgramImages(id);
        const coords = prog.coords || [prog.location_lng, prog.location_lat];
        if (mapInstance && coords) mapInstance.flyTo({ center: coords, zoom: 14 });
      } else {
        console.warn(`Program with id ${id} not found in displayedPrograms`);
      }
    };
    return () => delete window.selectProgram;
  }, [displayedPrograms, mapInstance, fetchProgramImages]);

  const startTrip = () => {
    if (!selectedProgram || !userLocation) {
      alert(lang === "ar" ? "اختر برنامجاً أولاً" : "Select a program first");
      return;
    }
    let coords = selectedProgram.coords || [selectedProgram.location_lng, selectedProgram.location_lat];
    if (!coords) return;
    window.open(`https://www.google.com/maps/dir/${userLocation[1]},${userLocation[0]}/${coords[1]},${coords[0]}`);
  };

  const requestProgram = (program) => {
    alert(lang === "ar" ? `✅ تم إرسال طلب المشاركة في "${program.name_ar || program.name}"` : `✅ Request sent for "${program.name}"`);
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <MapPin className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">الخريطة للأعضاء فقط</h2>
          <button onClick={() => setPage("profile")} className="bg-green-600 text-white px-6 py-2 rounded-lg">تسجيل الدخول</button>
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
            <div><h1 className="font-bold">{user.name}</h1><p className="text-xs"><MapPin size={12} className="inline ml-1" /> استكشف البرامج</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPage("home")} className="p-2 bg-white/20 rounded-full"><Home size={18} /></button>
            <button onClick={() => setPage("notifications")} className="relative p-2 bg-white/20 rounded-full">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
          <input type="text" placeholder={t("search")} className="w-full p-2 pr-9 rounded-lg bg-white/20 text-white" />
        </div>
        <div className="flex justify-between mt-3 text-xs">
          <span>📌 {displayedPrograms.length} برنامج</span>
          {isGuide && (
            <button onClick={() => setShowMyProgramsOnly(!showMyProgramsOnly)} className={`px-2 py-1 rounded ${showMyProgramsOnly ? "bg-yellow-500" : "bg-white/20"}`}>
              {showMyProgramsOnly ? "📌 برامجي فقط" : "🌍 كل البرامج"}
            </button>
          )}
        </div>
      </div>

      <div ref={mapContainerRef} className="flex-1 w-full min-h-0 relative">
        {mapLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-800/80 z-10 backdrop-blur-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">جاري تحميل الخريطة...</p>
            </div>
          </div>
        )}
      </div>

      {selectedProgram && (
        <div className="absolute bottom-20 left-4 right-4 z-20 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border-2 border-green-500 max-h-[70vh] overflow-y-auto">
          {loadingImages ? (
            <div className="mb-3 flex justify-center items-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
          ) : programImages.length > 0 ? (
            <div className="mb-3">
              <div className="relative">
                <img src={programImages[currentImageIndex]} alt={selectedProgram.name_ar || selectedProgram.name} className="w-full h-48 object-cover rounded-lg cursor-pointer" onClick={() => setShowGallery(true)} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }} />
                {programImages.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">❮</button>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">❯</button>
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">{currentImageIndex + 1} / {programImages.length}</div>
                  </>
                )}
              </div>
            </div>
          ) : selectedProgram.image ? (
            <div className="mb-3 flex justify-center"><img src={selectedProgram.image} alt={selectedProgram.name} className="w-full h-48 object-cover rounded-lg" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }} /></div>
          ) : null}

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
            </div>
            <button onClick={() => { setSelectedProgram(null); setProgramImages([]); }} className="text-gray-500">✕</button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <select value={transport} onChange={(e) => setTransport(e.target.value)} className="border rounded p-1 text-sm">
              <option value="driving">🚗 {t("driving")}</option>
              <option value="walking">🚶 {t("walking")}</option>
              <option value="cycling">🚲 {t("cycling")}</option>
            </select>
            <button onClick={startTrip} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">🗺️ {t("startTrip")}</button>
            <button onClick={() => handleChatWithGuide(selectedProgram.guide_id, selectedProgram.guide_name)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700">
              <MessageCircle size={16} /> <span>{t("chatWithGuide")}</span>
            </button>
            <button onClick={() => handleBooking(selectedProgram)} disabled={bookingLoading} className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700 disabled:opacity-50">
              <CalendarCheck size={16} /> <span>{t("bookNow")}</span>
            </button>
            <button onClick={() => requestProgram(selectedProgram)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">✉️ {lang === "ar" ? "طلب مشاركة" : "Request to Join"}</button>
          </div>
        </div>
      )}

      {showGallery && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowGallery(false)}>
          <div className="relative max-w-4xl max-h-screen p-4">
            <img src={programImages[currentImageIndex]} className="max-w-full max-h-screen object-contain" alt="Gallery" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }} />
            {programImages.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + programImages.length) % programImages.length); }} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70">❮</button>
                <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % programImages.length); }} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70">❯</button>
              </>
            )}
            <button onClick={() => setShowGallery(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExplorePage;
const ExplorePage = ({ setPage, programs = [], user, refreshTrigger }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [directionsControl, setDirectionsControl] = useState(null);
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [publicPrograms, setPublicPrograms] = useState([]);
  const markersRef = useRef([]);

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;
  const defaultLocation = { lat: 24.7136, lng: 46.6753 };
  
  // تحميل البرامج من localStorage العام
  const loadPublicPrograms = useCallback(() => {
    const saved = localStorage.getItem('public_programs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('📦 Loaded public programs:', parsed.length);
        setPublicPrograms(parsed);
        return parsed;
      } catch(e) {
        console.error('Error parsing public programs:', e);
        return [];
      }
    }
    
    // برامج تجريبية
    const demoPrograms = [
      {
        id: 9991,
        name: 'برنامج تجريبي - برج المملكة',
        name_ar: 'برنامج تجريبي - برج المملكة',
        guide_name: 'مرشد تجريبي',
        coords: [46.683, 24.713],
        price: 100,
        duration: 'نصف يوم',
        location_name: 'برج المملكة، الرياض',
        description: 'جولة في برج المملكة وأبراج الرياض',
        image: null,
        rating: 4.5
      },
      {
        id: 9992,
        name: 'برنامج تجريبي - الدرعية',
        name_ar: 'برنامج تجريبي - الدرعية',
        guide_name: 'مرشد تجريبي',
        coords: [46.733, 24.733],
        price: 200,
        duration: 'يوم كامل',
        location_name: 'الدرعية التاريخية، الرياض',
        description: 'جولة في الدرعية التاريخية',
        image: null,
        rating: 4.8
      }
    ];
    
    localStorage.setItem('public_programs', JSON.stringify(demoPrograms));
    console.log('📦 Added demo programs to public storage');
    setPublicPrograms(demoPrograms);
    return demoPrograms;
  }, []);

  useEffect(() => {
    loadPublicPrograms();
    
    const handleStorageChange = (e) => {
      if (e.key === 'public_programs') {
        console.log('🔄 Public programs updated, reloading...');
        loadPublicPrograms();
        if (map.current && map.current.loaded()) {
          addMarkersToMap();
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadPublicPrograms]);

  const displayedPrograms = publicPrograms.length > 0 ? publicPrograms : (programs || []);
  const finalPrograms = showMyProgramsOnly && isGuide
    ? displayedPrograms.filter(p => p.guide_id === user?.id)
    : displayedPrograms;

  // ✅ إضافة العلامات
  const addMarkersToMap = useCallback(() => {
    if (!map.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    finalPrograms.forEach((program) => {
      let coords = program.coords;
      if (!coords && program.location_lng && program.location_lat) {
        coords = [program.location_lng, program.location_lat];
      }
      
      if (coords && coords.length === 2) {
        const markerColor = program.guide_id === user?.id ? "#9b59b6" : "#10b981";
        
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            background: ${markerColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
            cursor: pointer;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          ${program.price ? `<div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: bold;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid white;
          ">${program.price}</div>` : ''}
        `;
        
        const popupContent = `
          <div style="direction: rtl; padding: 12px; min-width: 220px;">
            <h3 style="font-weight: bold; margin-bottom: 8px;">${program.name_ar || program.name}</h3>
            <p style="font-size: 12px; color: #666;">👤 ${program.guide_name || "مرشد سياحي"}</p>
            <div style="display: flex; gap: 12px; margin: 8px 0;">
              <span>💰 ${program.price || 0} ريال</span>
              <span>⏱️ ${program.duration || "غير محدد"}</span>
            </div>
            <button onclick="window.selectProgram(${program.id})" style="
              width: 100%;
              background: #10b981;
              color: white;
              border: none;
              padding: 8px;
              border-radius: 8px;
              cursor: pointer;
            ">📍 عرض التفاصيل</button>
          </div>
        `;
        
        const marker = new mapboxgl.Marker(el)
          .setLngLat(coords)
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
          .addTo(map.current);
        
        markersRef.current.push(marker);
      }
    });

    if (userLocation) {
      const userMarker = new mapboxgl.Marker({ color: "#3b82f6" })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML("<strong>📍 موقعك الحالي</strong>"))
        .addTo(map.current);
      markersRef.current.push(userMarker);
    }
  }, [finalPrograms, userLocation, user]);

  // ✅ بدء الرحلة - استخدام مسار بسيط بدون Directions API
  const startTrip = () => {
    if (!selectedProgram || !userLocation) {
      alert('الرجاء اختيار برنامج أولاً');
      return;
    }

    let programCoords = selectedProgram.coords;
    if (!programCoords && selectedProgram.location_lng && selectedProgram.location_lat) {
      programCoords = [selectedProgram.location_lng, selectedProgram.location_lat];
    }
    
    if (!programCoords) {
      alert('لا يمكن تحديد موقع البرنامج');
      return;
    }

    // فتح خرائط جوجل بدلاً من Mapbox Directions
    const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${programCoords[1]},${programCoords[0]}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    window.selectProgram = (programId) => {
      const program = finalPrograms.find(p => p.id === programId);
      if (program) {
        setSelectedProgram(program);
        if (map.current && program.coords) {
          map.current.flyTo({ center: program.coords, zoom: 14 });
        }
      }
    };
    return () => { delete window.selectProgram; };
  }, [finalPrograms]);

  // ✅ تهيئة الخريطة
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = (center, zoom = 13) => {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom
      });
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.on('load', () => addMarkersToMap());
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          initMap([longitude, latitude], 13);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError('تعذر تحديد موقعك. سيتم عرض موقع افتراضي');
          setUserLocation(defaultLocation);
          initMap([defaultLocation.lng, defaultLocation.lat], 12);
        }
      );
    } else {
      setLocationError('المتصفح لا يدعم تحديد الموقع');
      setUserLocation(defaultLocation);
      initMap([defaultLocation.lng, defaultLocation.lat], 12);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (map.current && map.current.loaded()) {
      addMarkersToMap();
    }
  }, [finalPrograms, refreshTrigger, addMarkersToMap]);

  if (!user) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', padding: 20, background: 'white', borderRadius: 16 }}>
          <h3>الخريطة متاحة للأعضاء فقط</h3>
          <button onClick={() => setPage('profile')} style={{ padding: '10px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>تسجيل الدخول</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative', direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        left: 20,
        zIndex: 10,
        background: 'white',
        padding: '12px 20px',
        borderRadius: 15,
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <button onClick={() => setPage('home')} style={{ padding: '8px 16px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer' }}>← الرئيسية</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaMapMarkerAlt color="#4CAF50" />
          <span>{userLocation ? 'موقعك الحالي' : 'استكشف البرامج'}</span>
        </div>
        <span style={{ color: '#10b981' }}>📌 {finalPrograms.length} برنامج</span>
      </div>

      {/* Map */}
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />

      {/* Selected Program Info */}
      {selectedProgram && (
        <div style={{
          position: 'absolute',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 400,
          background: 'white',
          borderRadius: 15,
          padding: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 20
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 60, height: 60, background: '#10b981', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🗺️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px' }}>{selectedProgram.name_ar || selectedProgram.name}</h3>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#666' }}>👤 {selectedProgram.guide_name}</p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <span>💰 {selectedProgram.price} ريال</span>
                <span>⏱️ {selectedProgram.duration}</span>
              </div>
              <button onClick={startTrip} style={{ width: '100%', padding: 8, background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>🗺️ بدء الرحلة</button>
            </div>
          </div>
          <button onClick={() => setSelectedProgram(null)} style={{ position: 'absolute', top: 8, left: 8, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;

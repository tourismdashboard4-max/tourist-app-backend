// src/components/Map/MapController.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Sun, Moon, Globe, MapPin, Star } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

// Mapbox token
mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw";

const MapController = ({ 
  center = [46.713, 24.774],
  zoom = 12,
  markers = [],
  programs = [], // ✅ إضافة prop للبرامج
  onMapClick,
  onMarkerClick,
  onProgramSelect, // ✅ إضافة prop لتحديد البرنامج
  showUserLocation = true,
  interactive = true
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [styleLoading, setStyleLoading] = useState(false);
  const programMarkersRef = useRef([]); // ✅ لتتبع علامات البرامج
  
  // ✅ استخدام Context
  const { darkMode, toggleDarkMode } = useTheme();
  const { language, toggleLanguage } = useLanguage();

  // ============================================
  // 🔄 أنماط الخريطة
  // ============================================
  const getMapStyle = useCallback(() => {
    return darkMode 
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/streets-v12';
  }, [darkMode]);

  // ============================================
  // 📍 إضافة علامة برنامج سياحي (مخصصة)
  // ============================================
  const addProgramMarker = useCallback((program) => {
    if (!map.current || !mapLoaded) return;
    
    // التحقق من وجود إحداثيات
    let coords = program.coordinates || program.coords;
    if (!coords && program.location_lng && program.location_lat) {
      coords = [program.location_lng, program.location_lat];
    }
    
    if (!coords || coords.length !== 2) {
      console.warn('Invalid coordinates for program:', program);
      return;
    }

    // إنشاء عنصر HTML مخصص للعلامة
    const el = document.createElement('div');
    el.className = 'program-marker';
    el.innerHTML = `
      <div class="relative cursor-pointer transform transition-transform hover:scale-110" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
        <div class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white" 
             style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        ${program.price ? `<div class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">${program.price}</div>` : ''}
      </div>
    `;

    // إضافة بعض التنسيقات
    const styleId = 'program-marker-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .program-marker {
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .program-marker:hover {
          transform: scale(1.05);
        }
        .program-popup .mapboxgl-popup-content {
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
          direction: ${language === 'ar' ? 'rtl' : 'ltr'};
        }
      `;
      document.head.appendChild(style);
    }

    // إنشاء محتوى البوب أب
    const popupContent = `
      <div class="w-72 max-w-full">
        <!-- صورة البرنامج (إذا وجدت) -->
        ${program.image ? `
          <div class="h-32 bg-cover bg-center" style="background-image: url('${program.image}');"></div>
        ` : `
          <div class="h-32 bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
            <svg class="w-12 h-12 text-white opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            </svg>
          </div>
        `}
        
        <div class="p-4">
          <h3 class="font-bold text-lg text-gray-800 dark:text-white mb-1">
            ${program.name || program.name_ar || 'برنامج سياحي'}
          </h3>
          
          ${program.guide_name ? `
            <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span class="text-green-600">👤</span>
              <span>${program.guide_name}</span>
            </div>
          ` : ''}
          
          ${program.description ? `
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
              ${program.description}
            </p>
          ` : ''}
          
          <div class="grid grid-cols-2 gap-2 mb-3 text-sm">
            ${program.price ? `
              <div class="flex items-center gap-1">
                <span class="text-green-600">💰</span>
                <span class="font-bold text-green-600">${program.price} ريال</span>
              </div>
            ` : ''}
            
            ${program.duration ? `
              <div class="flex items-center gap-1">
                <span>⏱️</span>
                <span>${program.duration}</span>
              </div>
            ` : ''}
            
            ${program.location_name || program.location ? `
              <div class="flex items-center gap-1 col-span-2">
                <span>📍</span>
                <span class="text-xs">${program.location_name || program.location}</span>
              </div>
            ` : ''}
            
            <div class="flex items-center gap-1">
              <span>👥</span>
              <span>${program.participants || 0}/${program.maxParticipants || 20}</span>
            </div>
          </div>
          
          <button 
            class="program-book-btn w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
            data-program-id="${program.id}"
          >
            ${language === 'ar' ? '📅 احجز الآن' : '📅 Book Now'}
          </button>
        </div>
      </div>
    `;

    // إنشاء العلامة
    const marker = new mapboxgl.Marker(el)
      .setLngLat([coords[0], coords[1]])
      .setPopup(new mapboxgl.Popup({ 
        offset: 25, 
        className: 'program-popup',
        maxWidth: '300px'
      }).setHTML(popupContent));
    
    marker.addTo(map.current);
    
    // إضافة حدث للنقر على زر الحجز
    const popupElement = marker.getPopup().getElement();
    if (popupElement) {
      popupElement.addEventListener('click', (e) => {
        const bookBtn = e.target.closest('.program-book-btn');
        if (bookBtn) {
          const programId = parseInt(bookBtn.dataset.programId);
          console.log('Booking program:', programId);
          if (onProgramSelect) {
            onProgramSelect(program);
          } else {
            alert(language === 'ar' 
              ? `جاري التوجيه لحجز البرنامج: ${program.name}` 
              : `Redirecting to book: ${program.name}`);
          }
        }
      });
    }
    
    return marker;
  }, [map, mapLoaded, language, onProgramSelect]);

  // ============================================
  // 📍 إضافة علامة عادية على الخريطة
  // ============================================
  const addMarker = useCallback((markerData) => {
    if (!map.current) return;

    const markerColor = markerData.color || (darkMode ? '#fbbf24' : '#10b981');
    
    const marker = new mapboxgl.Marker({ color: markerColor })
      .setLngLat(markerData.coordinates)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div style="direction: ${language === 'ar' ? 'rtl' : 'ltr'}; text-align: ${language === 'ar' ? 'right' : 'left'}; padding: 8px;">
              <h3 style="font-weight: bold; margin-bottom: 4px;">${markerData.title || ''}</h3>
              <p style="margin: 0; font-size: 12px;">${markerData.description || ''}</p>
              ${markerData.price ? `<p style="margin: 4px 0 0; color: #10b981; font-weight: bold;">${markerData.price} ريال</p>` : ''}
            </div>
          `)
      )
      .addTo(map.current);

    if (onMarkerClick) {
      marker.getElement().addEventListener('click', () => {
        onMarkerClick(markerData);
      });
    }

    return marker;
  }, [darkMode, language, onMarkerClick]);

  // ============================================
  // 📍 إضافة جميع برامج المرشدين
  // ============================================
  const addAllProgramMarkers = useCallback(() => {
    if (!map.current || !mapLoaded || !programs || programs.length === 0) return;
    
    // إزالة العلامات القديمة
    programMarkersRef.current.forEach(marker => {
      if (marker && marker.remove) marker.remove();
    });
    programMarkersRef.current = [];
    
    // إضافة العلامات الجديدة
    programs.forEach(program => {
      const marker = addProgramMarker(program);
      if (marker) {
        programMarkersRef.current.push(marker);
      }
    });
    
    console.log(`✅ Added ${programMarkersRef.current.length} program markers to map`);
  }, [programs, mapLoaded, addProgramMarker]);

  // ============================================
  // 📍 إضافة موقع المستخدم
  // ============================================
  const addUserLocationMarker = useCallback((location) => {
    if (!map.current || !showUserLocation) return;

    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat(location)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(language === 'ar' ? '📍 موقعك الحالي' : '📍 Your location')
      )
      .addTo(map.current);
  }, [showUserLocation, language]);

  // ============================================
  // 🗺️ تهيئة الخريطة
  // ============================================
  useEffect(() => {
    if (!mapContainer.current) return;

    console.log('🗺️ Creating map with style:', getMapStyle());
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      center: center,
      zoom: zoom,
      interactive: interactive
    });

    // إضافة عناصر التحكم
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.current.addControl(geolocate, 'top-right');

    map.current.addControl(new mapboxgl.ScaleControl({
      unit: language === 'ar' ? 'metric' : 'imperial',
      maxWidth: 200
    }), 'bottom-left');

    map.current.on('load', () => {
      console.log('✅ Map loaded');
      setMapLoaded(true);
    });

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // مرة واحدة فقط عند التحميل

  // ============================================
  // 📍 إضافة برامج المرشدين بعد تحميل الخريطة
  // ============================================
  useEffect(() => {
    if (mapLoaded && programs && programs.length > 0) {
      addAllProgramMarkers();
    }
  }, [mapLoaded, programs, addAllProgramMarkers]);

  // ============================================
  // 🔄 تحديث نمط الخريطة عند تغيير الوضع الليلي
  // ============================================
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const updateMapStyle = async () => {
      setStyleLoading(true);
      console.log('🔄 Changing map style to:', darkMode ? 'dark' : 'light');
      
      try {
        // تغيير نمط الخريطة
        map.current.setStyle(getMapStyle());
        
        // انتظار تحميل النمط الجديد
        map.current.once('style.load', () => {
          console.log('✅ New style loaded');
          
          // إعادة إضافة العلامات العادية
          if (markers.length > 0) {
            markers.forEach(addMarker);
          }
          
          // ✅ إعادة إضافة برامج المرشدين
          if (programs.length > 0) {
            addAllProgramMarkers();
          }
          
          // إعادة إضافة موقع المستخدم
          if (userLocation && showUserLocation) {
            addUserLocationMarker(userLocation);
          }
          
          // إعادة إضافة عناصر التحكم (بعضها يختفي عند تغيير النمط)
          map.current.addControl(new mapboxgl.ScaleControl({
            unit: language === 'ar' ? 'metric' : 'imperial',
            maxWidth: 200
          }), 'bottom-left');
          
          setStyleLoading(false);
        });
      } catch (error) {
        console.error('❌ Error changing map style:', error);
        setStyleLoading(false);
      }
    };

    updateMapStyle();
  }, [darkMode, mapLoaded, programs, addAllProgramMarkers]);

  // ============================================
  // 🔄 تحديث لغة الخريطة
  // ============================================
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    console.log('🔄 Updating map language to:', language);
    
    // تحديث وحدة القياس
    const scaleControl = map.current._controls.find(
      control => control instanceof mapboxgl.ScaleControl
    );
    if (scaleControl) {
      scaleControl._unit = language === 'ar' ? 'metric' : 'imperial';
      scaleControl._onMove();
    }
  }, [language, mapLoaded]);

  // ============================================
  // 📍 الحصول على موقع المستخدم
  // ============================================
  useEffect(() => {
    if (!showUserLocation || !navigator.geolocation) return;

    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.longitude, position.coords.latitude];
          setUserLocation(location);
          
          if (map.current && mapLoaded) {
            addUserLocationMarker(location);
            map.current.flyTo({ center: location, zoom: 13 });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    };

    getLocation();
  }, [mapLoaded, showUserLocation, addUserLocationMarker]);

  // ============================================
  // 📍 تحديث العلامات العادية عند تغييرها
  // ============================================
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // حذف كل العلامات القديمة (غير برامج المرشدين)
    const markersElements = document.querySelectorAll('.mapboxgl-marker:not(.program-marker)');
    markersElements.forEach(marker => marker.remove());

    // إضافة العلامات الجديدة
    markers.forEach(addMarker);
  }, [markers, mapLoaded, addMarker]);

  // ============================================
  // 🔄 تغيير مركز الخريطة
  // ============================================
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    map.current.flyTo({ center, zoom });
  }, [center, zoom, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* مؤشر تحميل الخريطة */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'ar' ? 'جاري تحميل الخريطة...' : 'Loading map...'}
            </p>
          </div>
        </div>
      )}

      {/* مؤشر تغيير النمط */}
      {styleLoading && mapLoaded && (
        <div className="absolute top-4 right-4 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
            <span>{language === 'ar' ? 'جاري التحديث...' : 'Updating...'}</span>
          </div>
        </div>
      )}

      {/* زر تغيير الوضع الليلي */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 left-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition"
        title={language === 'ar' ? 'تغيير الوضع' : 'Toggle theme'}
      >
        {darkMode ? (
          <Sun size={20} className="text-yellow-500" />
        ) : (
          <Moon size={20} className="text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* زر تغيير اللغة */}
      <button
        onClick={toggleLanguage}
        className="absolute top-4 left-16 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition flex items-center gap-1"
        title={language === 'ar' ? 'English' : 'العربية'}
      >
        <Globe size={20} className="text-green-600" />
        <span className="text-xs font-medium">{language === 'ar' ? 'AR' : 'EN'}</span>
      </button>

      {/* عداد البرامج */}
      {programs && programs.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-green-600" />
            <span className="text-green-600 font-bold text-lg">{programs.length}</span>
            <span className="text-gray-600 dark:text-gray-300 text-sm">
              {language === 'ar' ? 'برنامج سياحي' : 'Tour Programs'}
            </span>
          </div>
        </div>
      )}

      {/* مؤشر الوضع الحالي للاختبار */}
      <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-1 text-xs">
        <span className="text-gray-600 dark:text-gray-400">
          {darkMode ? '🌙' : '☀️'} | {language === 'ar' ? 'عربي' : 'EN'}
        </span>
      </div>
    </div>
  );
};

export default MapController;

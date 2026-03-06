// src/components/Map/MapController.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Sun, Moon, Globe } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

// Mapbox token
mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw";

const MapController = ({ 
  center = [46.713, 24.774],
  zoom = 12,
  markers = [],
  onMapClick,
  onMarkerClick,
  showUserLocation = true,
  interactive = true
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [styleLoading, setStyleLoading] = useState(false);
  
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
  // 📍 إضافة علامة على الخريطة
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
  // 📍 إضافة موقع المستخدم
  // ============================================
  const addUserLocationMarker = useCallback((location) => {
    if (!map.current || !showUserLocation) return;

    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat(location)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(language === 'ar' ? 'موقعك الحالي' : 'Your location')
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
          
          // إعادة إضافة العلامات
          if (markers.length > 0) {
            markers.forEach(addMarker);
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
  }, [darkMode, mapLoaded]);

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
  // 📍 تحديث العلامات عند تغييرها
  // ============================================
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // حذف كل العلامات القديمة
    const markersElements = document.querySelectorAll('.mapboxgl-marker');
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

      {/* مؤشر الوضع الحالي للاختبار */}
      <div className="absolute bottom-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-1 text-xs">
        <span className="text-gray-600 dark:text-gray-400">
          {darkMode ? '🌙' : '☀️'} | {language === 'ar' ? 'عربي' : 'EN'}
        </span>
      </div>
    </div>
  );
};

export default MapController;
// client/src/pages/MapPage.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  FaArrowLeft, 
  FaMapMarkedAlt, 
  FaSatellite,
  FaLayerGroup,
  FaSearch,
  FaLocationArrow,
  FaSun,
  FaMoon,
  FaMap,
  FaMountain
} from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

// Mapbox token
mapboxgl.accessToken = 'pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw';

const MapPage = ({ setPage }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const { darkMode, theme } = useTheme();
  const { language } = useLanguage();
  
  const [lng] = useState(46.713);
  const [lat] = useState(24.774);
  const [zoom] = useState(11);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState('streets');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // أنماط الخريطة
  const mapStyles = {
    light: {
      streets: 'mapbox://styles/mapbox/streets-v12',
      light: 'mapbox://styles/mapbox/light-v11',
      outdoors: 'mapbox://styles/mapbox/outdoors-v12',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
      navigation: 'mapbox://styles/mapbox/navigation-day-v1'
    },
    dark: {
      streets: 'mapbox://styles/mapbox/dark-v11',
      light: 'mapbox://styles/mapbox/light-v11',
      outdoors: 'mapbox://styles/mapbox/outdoors-v12',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
      navigation: 'mapbox://styles/mapbox/navigation-night-v1'
    }
  };

  // تهيئة الخريطة
  useEffect(() => {
    if (map.current) return;

    try {
      const initialStyle = darkMode ? mapStyles.dark.streets : mapStyles.light.streets;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: initialStyle,
        center: [lng, lat],
        zoom: zoom,
        pitch: 0,
        bearing: 0,
        antialias: true,
        attributionControl: true,
        fadeDuration: 1000 // مدة التلاشي للانتقال السلس
      });

      // إضافة عناصر التحكم
      map.current.addControl(new mapboxgl.NavigationControl({
        visualizePitch: false,
        showZoom: true,
        showCompass: true
      }), 'top-left');

      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-left');
      
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
        showAccuracyCircle: false
      }), 'top-left');

      map.current.addControl(new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }), 'bottom-left');

      map.current.on('load', () => {
        setMapLoaded(true);
        console.log('🗺️ Map loaded successfully');
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError('حدث خطأ في تحميل الخريطة');
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('فشل في تحميل الخريطة');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // دالة لتغيير نمط الخريطة بشكل سلس
  const changeMapStyleSmoothly = useCallback((newStyle) => {
    if (!map.current || !mapLoaded || isTransitioning) return;

    setIsTransitioning(true);

    // حفظ المركز والتكبير الحالي
    const center = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    const currentPitch = map.current.getPitch();
    const currentBearing = map.current.getBearing();

    // تغيير النمط
    map.current.setStyle(newStyle);

    // بعد تحميل النمط الجديد، استعادة العرض
    map.current.once('style.load', () => {
      // استعادة المركز والتكبير
      map.current.jumpTo({
        center: center,
        zoom: currentZoom,
        pitch: currentPitch,
        bearing: currentBearing
      });

      // إعادة إضافة عناصر التحكم
      map.current.addControl(new mapboxgl.NavigationControl({
        visualizePitch: false,
        showZoom: true,
        showCompass: true
      }), 'top-left');

      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-left');
      
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
        showAccuracyCircle: false
      }), 'top-left');

      map.current.addControl(new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }), 'bottom-left');

      // إنهاء حالة الانتقال
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
    });
  }, [mapLoaded, isTransitioning]);

  // تحديث الخريطة عند تغيير darkMode أو currentStyle
  useEffect(() => {
    if (map.current && mapLoaded) {
      const newStyle = darkMode ? mapStyles.dark[currentStyle] : mapStyles.light[currentStyle];
      changeMapStyleSmoothly(newStyle);
    }
  }, [darkMode, currentStyle, mapLoaded, changeMapStyleSmoothly]);

  const changeMapStyle = (style) => {
    setCurrentStyle(style);
    setShowLayerMenu(false);
  };

  const flyToLocation = (coords, zoom = 14) => {
    if (map.current) {
      map.current.flyTo({
        center: coords,
        zoom: zoom,
        essential: true,
        duration: 2000,
        curve: 1.5
      });
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          flyToLocation([position.coords.longitude, position.coords.latitude], 15);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert(language === 'ar' 
            ? 'فشل في الحصول على موقعك الحالي' 
            : 'Failed to get your current location');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert(language === 'ar' 
        ? 'متصفحك لا يدعم تحديد الموقع' 
        : 'Your browser does not support geolocation');
    }
  };

  const texts = {
    ar: {
      title: 'الخريطة',
      back: 'رجوع',
      search: 'ابحث عن مكان...',
      layers: 'الطبقات',
      streets: 'الشوارع',
      satellite: 'قمر صناعي',
      light: 'فاتح',
      dark: 'داكن',
      outdoors: 'خارجي',
      navigation: 'ملاحة',
      myLocation: 'موقعي',
      error: 'حدث خطأ في تحميل الخريطة',
      retry: 'إعادة المحاولة',
      transitioning: 'جاري تغيير النمط...'
    },
    en: {
      title: 'Map',
      back: 'Back',
      search: 'Search place...',
      layers: 'Layers',
      streets: 'Streets',
      satellite: 'Satellite',
      light: 'Light',
      dark: 'Dark',
      outdoors: 'Outdoors',
      navigation: 'Navigation',
      myLocation: 'My Location',
      error: 'Error loading map',
      retry: 'Retry',
      transitioning: 'Changing style...'
    }
  };

  const t = texts[language];

  if (mapError) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
        color: theme.text,
        direction: language === 'ar' ? 'rtl' : 'ltr'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
          <h2 style={{ marginBottom: '10px' }}>{t.error}</h2>
          <p style={{ color: theme.textSecondary, marginBottom: '20px' }}>{mapError}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 30px',
              background: theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      width: '100%',
      position: 'relative',
      direction: language === 'ar' ? 'rtl' : 'ltr',
      backgroundColor: darkMode ? '#0f172a' : '#f9fafb'
    }}>
      
      {/* الخريطة */}
      <div ref={mapContainer} style={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        transition: 'filter 0.5s ease'
      }} />

      {/* طبقة تعتيم متحركة للوضع الليلي */}
      {darkMode && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'background-color 0.5s ease'
        }} />
      )}

      {/* مؤشر تغيير النمط */}
      {isTransitioning && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
          padding: '10px 20px',
          borderRadius: '30px',
          boxShadow: darkMode 
            ? '0 4px 6px rgba(0,0,0,0.5)' 
            : '0 2px 4px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          zIndex: 20,
          color: darkMode ? '#f3f4f6' : '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeInOut 1.5s infinite'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: `2px solid ${theme.primary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span>{t.transitioning}</span>
        </div>
      )}

      {/* شريط علوي */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage('home')}
            style={{
              background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
              border: darkMode ? '1px solid #334155' : 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              color: darkMode ? '#f3f4f6' : '#1f2937',
              cursor: 'pointer',
              boxShadow: darkMode 
                ? '0 4px 6px rgba(0,0,0,0.5)' 
                : '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(10px)',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            <FaArrowLeft /> {t.back}
          </button>

          {/* شريط البحث */}
          <div style={{
            background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
            border: darkMode ? '1px solid #334155' : 'none',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: darkMode 
              ? '0 4px 6px rgba(0,0,0,0.5)' 
              : '0 2px 4px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)',
            minWidth: '250px'
          }}>
            <FaSearch style={{ color: darkMode ? '#9ca3af' : '#6b7280' }} />
            <input
              type="text"
              placeholder={t.search}
              style={{
                background: 'none',
                border: 'none',
                color: darkMode ? '#f3f4f6' : '#1f2937',
                width: '100%',
                outline: 'none',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          
          {/* زر طبقات الخريطة */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              disabled={isTransitioning}
              style={{
                background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
                border: darkMode ? '1px solid #334155' : 'none',
                borderRadius: '12px',
                padding: '12px',
                color: isTransitioning 
                  ? (darkMode ? '#4b5563' : '#9ca3af')
                  : (darkMode ? '#f3f4f6' : '#1f2937'),
                cursor: isTransitioning ? 'wait' : 'pointer',
                boxShadow: darkMode 
                  ? '0 4px 6px rgba(0,0,0,0.5)' 
                  : '0 2px 4px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.3s ease',
                opacity: isTransitioning ? 0.5 : 1
              }}
            >
              <FaLayerGroup />
              <span style={{ fontSize: '14px' }}>{t.layers}</span>
            </button>

            {/* قائمة الطبقات */}
            {showLayerMenu && !isTransitioning && (
              <div style={{
                position: 'absolute',
                top: '50px',
                [language === 'ar' ? 'left' : 'right']: '0',
                background: darkMode ? '#1f2937' : 'white',
                border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '8px',
                boxShadow: darkMode 
                  ? '0 10px 15px -3px rgba(0,0,0,0.5)' 
                  : '0 10px 15px -3px rgba(0,0,0,0.1)',
                minWidth: '180px',
                zIndex: 20
              }}>
                <div style={{
                  padding: '8px 12px',
                  fontWeight: 'bold',
                  borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                  color: darkMode ? '#f3f4f6' : '#1f2937'
                }}>
                  {t.layers}
                </div>
                {[
                  { id: 'streets', name: t.streets, icon: <FaMap /> },
                  { id: 'satellite', name: t.satellite, icon: <FaSatellite /> },
                  { id: 'outdoors', name: t.outdoors, icon: <FaMountain /> },
                  { id: 'light', name: t.light, icon: <FaSun /> },
                  { id: 'navigation', name: t.navigation, icon: <FaLocationArrow /> }
                ].map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => changeMapStyle(layer.id)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'none',
                      border: 'none',
                      textAlign: language === 'ar' ? 'right' : 'left',
                      color: currentStyle === layer.id 
                        ? theme.primary 
                        : (darkMode ? '#d1d5db' : '#4b5563'),
                      cursor: 'pointer',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      backgroundColor: currentStyle === layer.id 
                        ? (darkMode ? 'rgba(74,222,128,0.1)' : 'rgba(22,163,74,0.1)') 
                        : 'transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{layer.icon}</span>
                    {layer.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* زر موقعي */}
          <button
            onClick={getCurrentLocation}
            disabled={isTransitioning}
            style={{
              background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
              border: darkMode ? '1px solid #334155' : 'none',
              borderRadius: '12px',
              padding: '12px',
              color: isTransitioning 
                ? (darkMode ? '#4b5563' : '#9ca3af')
                : (darkMode ? '#f3f4f6' : '#1f2937'),
              cursor: isTransitioning ? 'wait' : 'pointer',
              boxShadow: darkMode 
                ? '0 4px 6px rgba(0,0,0,0.5)' 
                : '0 2px 4px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.3s ease',
              opacity: isTransitioning ? 0.5 : 1
            }}
          >
            <FaLocationArrow style={{ color: theme.primary }} />
            <span style={{ fontSize: '14px' }}>{t.myLocation}</span>
          </button>
        </div>
      </div>

      {/* مؤشر التحميل الأولي */}
      {!mapLoaded && !isTransitioning && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: darkMode 
            ? '0 4px 6px rgba(0,0,0,0.5)' 
            : '0 2px 4px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          zIndex: 15,
          color: darkMode ? '#f3f4f6' : '#1f2937'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: `3px solid ${theme.primary}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span>{language === 'ar' ? 'جاري تحميل الخريطة...' : 'Loading map...'}</span>
          </div>
        </div>
      )}

      {/* معلومات الموقع */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
        border: darkMode ? '1px solid #334155' : 'none',
        borderRadius: '12px',
        padding: '8px 16px',
        boxShadow: darkMode 
          ? '0 4px 6px rgba(0,0,0,0.5)' 
          : '0 2px 4px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        color: darkMode ? '#f3f4f6' : '#1f2937',
        fontSize: '14px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <FaMapMarkedAlt style={{ color: theme.primary }} />
        <span>
          {language === 'ar' ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
        </span>
      </div>

      {/* CSS إضافي */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeInOut {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
        
        .mapboxgl-ctrl-group {
          background: ${darkMode ? '#1f2937 !important' : 'white !important'};
          border: ${darkMode ? '1px solid #374151 !important' : 'none !important'};
          box-shadow: ${darkMode ? '0 4px 6px rgba(0,0,0,0.5) !important' : '0 2px 4px rgba(0,0,0,0.1) !important'};
          transition: all 0.3s ease !important;
        }
        
        .mapboxgl-ctrl-icon {
          filter: ${darkMode ? 'invert(0.8)' : 'none'};
          transition: filter 0.3s ease;
        }
        
        .mapboxgl-ctrl-scale {
          background-color: ${darkMode ? 'rgba(31,41,55,0.8) !important' : 'rgba(255,255,255,0.8) !important'};
          color: ${darkMode ? '#f3f4f6 !important' : '#1f2937 !important'};
          border: ${darkMode ? '1px solid #374151 !important' : '1px solid #e5e7eb !important'};
          transition: all 0.3s ease !important;
        }
        
        .mapboxgl-canvas {
          transition: filter 0.5s ease;
        }
      `}</style>
    </div>
  );
};

export default MapPage;
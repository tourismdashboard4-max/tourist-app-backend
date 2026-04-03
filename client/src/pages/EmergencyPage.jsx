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

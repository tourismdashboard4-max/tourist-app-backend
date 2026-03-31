// client/src/pages/ExplorePage.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDirections from '@mapbox/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import { FaMapMarkerAlt, FaStar, FaClock, FaUser, FaHeart, FaShare, FaPhone, FaEnvelope } from 'react-icons/fa';

// Mapbox token
mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw";

const ExplorePage = ({ setPage, programs = [], user, refreshTrigger }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [directionsControl, setDirectionsControl] = useState(null);
  const [showMyProgramsOnly, setShowMyProgramsOnly] = useState(false);
  const markersRef = useRef([]);

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;
  
  // البرامج المعروضة
  const allPrograms = programs || [];
  const displayedPrograms = showMyProgramsOnly 
    ? allPrograms.filter(p => p.guide_id === user?.id)
    : allPrograms;

  // ✅ دالة إضافة العلامات
  const addMarkersToMap = useCallback(() => {
    if (!map.current) return;

    // إزالة العلامات القديمة
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // إضافة علامات البرامج
    displayedPrograms.forEach((program) => {
      // تحديد الإحداثيات
      let coords = program.coords;
      if (!coords && program.location_lng && program.location_lat) {
        coords = [program.location_lng, program.location_lat];
      }
      
      if (coords && coords.length === 2) {
        const markerColor = program.guide_id === user?.id ? "#9b59b6" : "#10b981";
        
        // إنشاء عنصر HTML للعلامة
        const el = document.createElement('div');
        el.className = 'custom-marker';
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
            transition: transform 0.2s;
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
        
        // محتوى البوب أب
        const popupContent = `
          <div style="direction: rtl; padding: 12px; min-width: 220px; max-width: 280px;">
            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">${program.name_ar || program.name}</h3>
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">👤 ${program.guide_name || "مرشد سياحي"}</p>
            ${program.description ? `<p style="font-size: 12px; color: #4b5563; margin-bottom: 8px;">${program.description.substring(0, 80)}${program.description.length > 80 ? '...' : ''}</p>` : ''}
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px;">
              <div style="font-size: 12px;">💰 <strong style="color: #10b981;">${program.price || 0} ريال</strong></div>
              <div style="font-size: 12px;">⏱️ ${program.duration || "غير محدد"}</div>
              <div style="font-size: 12px;">📍 ${program.location_name || "موقع غير محدد"}</div>
              <div style="font-size: 12px;">👥 ${program.participants || 0}/${program.maxParticipants || 20}</div>
            </div>
            <button onclick="window.selectProgram(${program.id})" style="
              width: 100%;
              background: #10b981;
              color: white;
              border: none;
              padding: 8px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 500;
              margin-top: 8px;
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

    // إضافة علامة موقع المستخدم
    if (userLocation) {
      const userMarker = new mapboxgl.Marker({ color: "#3b82f6" })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML("<strong>📍 موقعك الحالي</strong>"))
        .addTo(map.current);
      markersRef.current.push(userMarker);
    }

    console.log(`✅ Added ${displayedPrograms.length} program markers`);
  }, [displayedPrograms, userLocation, user]);

  // ✅ دالة لتحديد البرنامج
  useEffect(() => {
    window.selectProgram = (programId) => {
      const program = displayedPrograms.find(p => p.id === programId);
      if (program) {
        setSelectedProgram(program);
        if (map.current && program.coords) {
          map.current.flyTo({ center: program.coords, zoom: 14 });
        }
      }
    };
    return () => { delete window.selectProgram; };
  }, [displayedPrograms]);

  // ✅ تهيئة الخريطة
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // الحصول على موقع المستخدم
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [longitude, latitude],
            zoom: 13
          });

          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

          map.current.on('load', () => {
            console.log('✅ Map loaded');
            addMarkersToMap();
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          // موقع افتراضي (الرياض)
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [46.713, 24.774],
            zoom: 12
          });
          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          map.current.on('load', () => addMarkersToMap());
        }
      );
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // ✅ تحديث الخريطة عند تغيير البرامج
  useEffect(() => {
    if (map.current && map.current.loaded()) {
      addMarkersToMap();
    }
  }, [displayedPrograms, refreshTrigger, addMarkersToMap]);

  // ✅ بدء الرحلة
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

    if (directionsControl) {
      map.current.removeControl(directionsControl);
    }

    const directions = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: "metric",
      profile: "mapbox/driving",
      controls: { instructions: true }
    });
    
    map.current.addControl(directions, "top-left");
    directions.setOrigin([userLocation.lng, userLocation.lat]);
    directions.setDestination(programCoords);
    setDirectionsControl(directions);
  };

  // ✅ طلب المشاركة
  const requestJoin = () => {
    alert(`✅ تم إرسال طلب المشاركة في برنامج "${selectedProgram?.name_ar || selectedProgram?.name}" بنجاح. سيتم التواصل معك من قبل المرشد.`);
  };

  // ✅ إذا لم يكن المستخدم مسجلاً
  if (!user) {
    return (
      <div style={{ height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', padding: '20px', background: 'white', borderRadius: '16px', maxWidth: '300px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h3 style={{ marginBottom: '12px' }}>الخريطة متاحة للأعضاء فقط</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>سجل دخول للاستفادة من الخريطة والبرامج القريبة</p>
          <button onClick={() => setPage('profile')} style={{ padding: '10px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>تسجيل الدخول</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative', direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        left: '20px',
        zIndex: 10,
        background: 'white',
        padding: '12px 20px',
        borderRadius: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <button
          onClick={() => setPage('home')}
          style={{
            padding: '8px 16px',
            background: '#f5f5f5',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#333',
            fontWeight: 'bold'
          }}
        >
          ← الرئيسية
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaMapMarkerAlt color="#4CAF50" />
          <span style={{ fontWeight: 'bold', color: '#333' }}>
            {userLocation ? 'موقعك الحالي' : 'استكشف البرامج'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#10b981', fontSize: '14px' }}>
            📌 {displayedPrograms.length} برنامج
          </span>
          {isGuide && (
            <button
              onClick={() => setShowMyProgramsOnly(!showMyProgramsOnly)}
              style={{
                padding: '5px 12px',
                background: showMyProgramsOnly ? '#9b59b6' : '#f0f0f0',
                color: showMyProgramsOnly ? 'white' : '#666',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {showMyProgramsOnly ? '📌 برامجي' : '🗺️ الكل'}
            </button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />

      {/* Selected Program Info */}
      {selectedProgram && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '400px',
          background: 'white',
          borderRadius: '15px',
          padding: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 20,
          direction: 'rtl'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              🗺️
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px', color: '#333' }}>
                {selectedProgram.name_ar || selectedProgram.name}
              </h3>
              <p style={{ margin: '0 0 8px', color: '#666', fontSize: '12px' }}>
                👤 {selectedProgram.guide_name}
              </p>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#10b981' }}>💰 {selectedProgram.price} ريال</span>
                <span style={{ fontSize: '13px' }}>⏱️ {selectedProgram.duration}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={startTrip}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  🗺️ بدء الرحلة
                </button>
                {!isGuide && (
                  <button
                    onClick={requestJoin}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    📅 طلب المشاركة
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedProgram(null)}
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#999'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;

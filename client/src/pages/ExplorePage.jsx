import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FaMapMarkerAlt, FaStar, FaClock, FaUser } from 'react-icons/fa';

// المفتاح يأتي من ملف .env
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ExplorePage = ({ setPage }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [places] = useState([
    { 
      id: 1, 
      name: 'برج المملكة', 
      lat: 24.7136, 
      lng: 46.6753,
      description: 'أحد أبرز معالم الرياض',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
    },
    { 
      id: 2, 
      name: 'المتحف الوطني', 
      lat: 24.6478, 
      lng: 46.7103,
      description: 'تاريخ وثقافة المملكة',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
    },
    { 
      id: 3, 
      name: 'حديقة الوطن', 
      lat: 24.6880, 
      lng: 46.6851,
      description: 'أجمل الحدائق في الرياض',
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
    }
  ]);

  useEffect(() => {
    if (map.current) return;

    // الحصول على موقع المستخدم
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          // إنشاء الخريطة مع موقع المستخدم
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [longitude, latitude],
            zoom: 13
          });

          // إضافة علامة موقع المستخدم
          new mapboxgl.Marker({ color: '#4CAF50' })
            .setLngLat([longitude, latitude])
            .setPopup(new mapboxgl.Popup().setHTML('<h3>موقعك الحالي</h3>'))
            .addTo(map.current);

          // إضافة علامات الأماكن
          places.forEach(place => {
            const marker = new mapboxgl.Marker({ color: '#FF5722' })
              .setLngLat([place.lng, place.lat])
              .setPopup(new mapboxgl.Popup().setHTML(`
                <div style="direction: rtl; padding: 10px; max-width: 200px;">
                  <h3 style="margin: 0 0 5px; color: #333;">${place.name}</h3>
                  <p style="margin: 0 0 5px; color: #666;">${place.description}</p>
                  <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="color: #FFD700;">★</span>
                    <span style="color: #333;">${place.rating}</span>
                  </div>
                </div>
              `))
              .addTo(map.current);

            marker.getElement().addEventListener('click', () => {
              setSelectedPlace(place);
            });
          });

          // إضافة عناصر التحكم
          map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');
          map.current.addControl(new mapboxgl.FullscreenControl());
        },
        (error) => {
          console.error('Error getting location:', error);
          // إذا لم يتم الحصول على الموقع، استخدم موقع افتراضي (الرياض)
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [46.713, 24.774],
            zoom: 12
          });
        }
      );
    }

    return () => map.current?.remove();
  }, []);

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
        padding: '15px 25px',
        borderRadius: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button
          onClick={() => setPage('home')}
          style={{
            padding: '10px 20px',
            background: '#f5f5f5',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#333',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ← الرئيسية
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaMapMarkerAlt color="#4CAF50" />
          <span style={{ fontWeight: 'bold', color: '#333' }}>
            {userLocation ? 'موقعك الحالي' : 'استكشف الأماكن'}
          </span>
        </div>

        <div style={{ color: '#666', fontSize: '14px' }}>
          {places.length} مكان قريب
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />

      {/* Selected Place Info */}
      {selectedPlace && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '400px',
          background: 'white',
          borderRadius: '15px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 20,
          direction: 'rtl'
        }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <img 
              src={selectedPlace.image} 
              alt={selectedPlace.name}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '10px',
                objectFit: 'cover'
              }}
            />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px', color: '#333' }}>{selectedPlace.name}</h3>
              <p style={{ margin: '0 0 10px', color: '#666', fontSize: '14px' }}>
                {selectedPlace.description}
              </p>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FaStar color="#FFD700" />
                  <span>{selectedPlace.rating}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FaClock color="#666" />
                  <span>مفتوح الآن</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlace(null)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
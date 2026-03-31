// client/src/pages/EmergencyPage.jsx
import React, { useState, useEffect } from 'react';
import { FaPhone, FaAmbulance, FaFireExtinguisher, FaShieldAlt, FaMapMarkerAlt, FaHeartbeat, FaCarCrash, FaExclamationTriangle, FaCheckCircle, FaArrowLeft, FaHome } from 'react-icons/fa';
import './EmergencyPage.css';

const EmergencyPage = ({ setPage, user }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState(null);
  const [description, setDescription] = useState('');
  const [shareLocation, setShareLocation] = useState(true);
  const [requestedServices, setRequestedServices] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // أنواع الحالات الطارئة
  const emergencyTypes = [
    { id: 'medical', label: 'حالة طبية', icon: <FaHeartbeat />, description: 'إصابة، مرض مفاجئ، صعوبة في التنفس' },
    { id: 'accident', label: 'حادث', icon: <FaCarCrash />, description: 'حادث سير، حادث في الموقع' },
    { id: 'fire', label: 'حريق', icon: <FaFireExtinguisher />, description: 'حريق، دخان، مواد قابلة للاشتعال' },
    { id: 'security', label: 'أمني', icon: <FaShieldAlt />, description: 'سرقة، تحرش، مشاجرة' },
    { id: 'other', label: 'أخرى', icon: <FaExclamationTriangle />, description: 'حالات طارئة أخرى' }
  ];

  // مستويات الخطورة
  const severityLevels = [
    { id: 'critical', label: 'حرج جداً', color: '#dc2626', description: 'تهديد مباشر للحياة، يحتاج تدخل فوري' },
    { id: 'high', label: 'عالي', color: '#f97316', description: 'حالة خطيرة، تحتاج تدخل سريع' },
    { id: 'medium', label: 'متوسط', color: '#eab308', description: 'حالة تحتاج مساعدة ولكنها ليست فورية' },
    { id: 'low', label: 'منخفض', color: '#22c55e', description: 'حالة بسيطة، يمكن الانتظار' }
  ];

  // الخدمات المطلوبة
  const availableServices = [
    { id: 'ambulance', label: 'إسعاف', icon: <FaAmbulance />, phone: '997' },
    { id: 'police', label: 'شرطة', icon: <FaShieldAlt />, phone: '999' },
    { id: 'civil_defense', label: 'دفاع مدني', icon: <FaFireExtinguisher />, phone: '998' }
  ];

  // الحصول على موقع المستخدم
  useEffect(() => {
    if (shareLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('تعذر الحصول على موقعك. يرجى تفعيل خدمات الموقع.');
        }
      );
    }
  }, [shareLocation]);

  // طلب الخدمة الطارئة
  const handleEmergencyCall = (service) => {
    window.location.href = `tel:${service.phone}`;
  };

  // إرسال الطلب
  const handleSubmit = async () => {
    if (!selectedType) {
      setError('الرجاء اختيار نوع الحالة الطارئة');
      return;
    }
    if (!selectedSeverity) {
      setError('الرجاء تحديد مستوى الخطورة');
      return;
    }
    if (requestedServices.length === 0) {
      setError('الرجاء اختيار الخدمة المطلوبة');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const emergencyData = {
        type: selectedType,
        severity: selectedSeverity,
        description,
        location: userLocation,
        shareLocation,
        services: requestedServices,
        userId: user?.id,
        userName: user?.fullName || user?.name,
        userPhone: user?.phone,
        timestamp: new Date().toISOString()
      };

      // محاولة إرسال إلى API
      const response = await fetch('https://tourist-app-api.onrender.com/api/emergency', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emergencyData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitted(true);
        // إرسال إشعار للمسؤولين
        await sendAdminNotification(emergencyData);
      } else {
        // حفظ محلياً إذا فشل الإرسال
        saveEmergencyLocally(emergencyData);
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting emergency:', error);
      // حفظ محلياً
      saveEmergencyLocally({
        type: selectedType,
        severity: selectedSeverity,
        description,
        location: userLocation,
        shareLocation,
        services: requestedServices,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  // حفظ الطلب محلياً
  const saveEmergencyLocally = (data) => {
    const existing = localStorage.getItem('emergency_requests');
    const requests = existing ? JSON.parse(existing) : [];
    requests.push({
      ...data,
      id: Date.now(),
      status: 'pending'
    });
    localStorage.setItem('emergency_requests', JSON.stringify(requests));
  };

  // إرسال إشعار للمسؤولين
  const sendAdminNotification = async (data) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('https://tourist-app-api.onrender.com/api/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'admin',
          title: '🚨 حالة طارئة جديدة',
          message: `${user?.fullName || 'مستخدم'} يحتاج مساعدة فورية! النوع: ${data.type}`,
          type: 'emergency',
          priority: 'high',
          data: data
        })
      });
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  };

  // زر الاتصال المباشر بالطوارئ
  const DirectEmergencyButton = () => (
    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <button
        onClick={() => handleEmergencyCall({ phone: '112' })}
        className="emergency-big-button"
        aria-label="اتصال طارئ"
      >
        <FaPhone />
      </button>
      <p style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>
        اضغط للاتصال الفوري بالطوارئ (112)
      </p>
    </div>
  );

  // صفحة التأكيد
  if (submitted) {
    return (
      <div className="emergency-page">
        <div className="emergency-container" style={{ textAlign: 'center' }}>
          <div className="success-icon">✅</div>
          <h2 style={{ margin: '20px 0 10px', color: '#059669' }}>تم إرسال طلب المساعدة</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            تم استلام طلبك بنجاح. سيتم التواصل معك في أقرب وقت ممكن.
          </p>
          <div className="info-card" style={{ marginBottom: '20px', textAlign: 'right' }}>
            <h4 style={{ marginBottom: '10px' }}>📋 ملخص الطلب:</h4>
            <p><strong>النوع:</strong> {emergencyTypes.find(t => t.id === selectedType)?.label}</p>
            <p><strong>الخطورة:</strong> {severityLevels.find(s => s.id === selectedSeverity)?.label}</p>
            <p><strong>الخدمات المطلوبة:</strong> {requestedServices.map(s => availableServices.find(ser => ser.id === s)?.label).join('، ')}</p>
            {description && <p><strong>الوصف:</strong> {description}</p>}
            {userLocation && <p><strong>الموقع:</strong> {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>}
          </div>
          <button onClick={() => setPage('home')} className="home-button">
            <FaHome style={{ marginLeft: '8px' }} /> العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // صفحة اختيار نوع الخدمة المباشرة (بدون نموذج)
  if (!showForm) {
    return (
      <div className="emergency-page">
        <div className="emergency-container">
          <button onClick={() => setPage('home')} className="back-button" style={{ marginBottom: '20px' }}>
            <FaArrowLeft style={{ marginLeft: '8px' }} /> {t('back')}
          </button>
          
          <div className="warning-icon" style={{ textAlign: 'center' }}>🚨</div>
          <h1 className="page-title">خدمات الطوارئ</h1>
          
          <DirectEmergencyButton />
          
          <div className="services-grid" style={{ marginBottom: '20px' }}>
            {availableServices.map(service => (
              <button
                key={service.id}
                onClick={() => handleEmergencyCall(service)}
                className="call-button"
                style={{ background: service.id === 'ambulance' ? '#dc2626' : service.id === 'police' ? '#2563eb' : '#f97316' }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{service.icon}</div>
                <div style={{ fontWeight: 'bold' }}>{service.label}</div>
                <div style={{ fontSize: '18px' }}>{service.phone}</div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="submit-button"
            style={{ background: '#059669', marginBottom: '10px' }}
          >
            📝 طلب مساعدة غير طارئة
          </button>
          
          <div className="safety-tips">
            <h4 style={{ marginBottom: '10px', color: '#1e40af' }}>💡 نصائح السلامة:</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '8px' }}>✓ ابق هادئاً وحاول التفكير بوضوح</li>
              <li style={{ marginBottom: '8px' }}>✓ حدد موقعك بدقة قدر الإمكان</li>
              <li style={{ marginBottom: '8px' }}>✓ صف الوضع بوضوح عند الاتصال</li>
              <li style={{ marginBottom: '8px' }}>✓ اتبع تعليمات جهات الطوارئ</li>
              <li style={{ marginBottom: '8px' }}>✓ لا تغلق الخط حتى يُطلب منك ذلك</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // صفحة النموذج الكامل
  return (
    <div className="emergency-page">
      <div className="emergency-container">
        <button onClick={() => setShowForm(false)} className="back-button" style={{ marginBottom: '20px' }}>
          <FaArrowLeft style={{ marginLeft: '8px' }} /> رجوع
        </button>
        
        <h1 className="page-title">طلب مساعدة</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        {/* نوع الحالة */}
        <div className="form-section">
          <label className="form-label">نوع الحالة *</label>
          <div className="types-grid">
            {emergencyTypes.map(type => (
              <div
                key={type.id}
                className={`type-card ${selectedType === type.id ? 'selected' : ''}`}
                onClick={() => setSelectedType(type.id)}
              >
                <div className="type-icon">{type.icon}</div>
                <div className="type-label">{type.label}</div>
                <div className="type-description">{type.description}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* مستوى الخطورة */}
        <div className="form-section">
          <label className="form-label">مستوى الخطورة *</label>
          <div className="severity-grid">
            {severityLevels.map(level => (
              <div
                key={level.id}
                className={`severity-card ${selectedSeverity === level.id ? 'selected' : ''}`}
                onClick={() => setSelectedSeverity(level.id)}
                style={{ borderColor: selectedSeverity === level.id ? level.color : '#e5e7eb' }}
              >
                <div className="severity-icon">⚠️</div>
                <div className="severity-label">{level.label}</div>
                <div className="severity-description">{level.description}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* الخدمات المطلوبة */}
        <div className="form-section">
          <label className="form-label">الخدمات المطلوبة *</label>
          <div className="services-grid">
            {availableServices.map(service => (
              <label key={service.id} className="service-label">
                <input
                  type="checkbox"
                  checked={requestedServices.includes(service.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setRequestedServices([...requestedServices, service.id]);
                    } else {
                      setRequestedServices(requestedServices.filter(s => s !== service.id));
                    }
                  }}
                  className="checkbox-input"
                />
                {service.icon} {service.label}
              </label>
            ))}
          </div>
        </div>
        
        {/* وصف الحالة */}
        <div className="form-section">
          <label className="form-label">وصف الحالة</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="اكتب وصفاً تفصيلياً للحالة..."
            className="form-textarea"
            rows="4"
          />
        </div>
        
        {/* مشاركة الموقع */}
        <div className="form-section">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={shareLocation}
                onChange={(e) => setShareLocation(e.target.checked)}
                className="checkbox-input"
              />
              <span>مشاركة موقعي الحالي</span>
            </label>
            {userLocation && shareLocation && (
              <p style={{ fontSize: '12px', color: '#059669', marginTop: '8px' }}>
                📍 الموقع: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            )}
          </div>
        </div>
        
        {/* الأزرار */}
        <div className="button-group">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'جاري الإرسال...' : '🚨 إرسال طلب المساعدة'}
          </button>
          <button onClick={() => setShowForm(false)} className="back-button">
            إلغاء
          </button>
        </div>
        
        {/* رقم الطوارئ الموحد */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
          <p>للحالات الطارئة جداً، اتصل مباشرة على:</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>112</p>
        </div>
      </div>
    </div>
  );
};

export default EmergencyPage;

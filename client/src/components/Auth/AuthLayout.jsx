// src/components/Auth/AuthLayout.jsx
import React from 'react';
import './AuthLayout.css';
import { Card, Spinner } from '../ui';

function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  type = 'user',
  loading = false,
  error = null,
  onBack = null // ✅ إضافة دالة الرجوع اختيارية
}) {
  const getTypeInfo = () => {
    switch (type) {
      case 'guide':
        return {
          label: 'مرشد سياحي',
          icon: '🧑‍🏫',
          color: '#059669',
          bgColor: '#d1fae5'
        };
      case 'admin':
        return {
          label: 'مدير النظام',
          icon: '👑',
          color: '#dc2626',
          bgColor: '#fee2e2'
        };
      case 'support':
        return {
          label: 'دعم فني',
          icon: '🛠️',
          color: '#2563eb',
          bgColor: '#dbeafe'
        };
      default:
        return {
          label: 'مستخدم',
          icon: '👤',
          color: '#4f46e5',
          bgColor: '#e0e7ff'
        };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <div className="auth-layout">
      <div className="auth-container">
        {/* خلفية متحركة */}
        <div className="auth-background"></div>
        
        {/* المحتوى */}
        <div className="auth-content">
          {/* زر الرجوع */}
          {onBack && (
            <button className="auth-back-button" onClick={onBack}>
              <span className="back-icon">←</span>
              <span>رجوع</span>
            </button>
          )}
          
          {/* الشعار */}
          <div className="auth-logo">
            <div className="logo-icon">🌍</div>
            <h2 className="logo-text">السائح</h2>
            <span className="logo-version">v1.0</span>
          </div>
          
          {/* العنوان */}
          <div className="auth-header">
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
            
            {/* شريط نوع الحساب */}
            <div 
              className="auth-type-badge"
              style={{ 
                backgroundColor: typeInfo.bgColor,
                color: typeInfo.color
              }}
            >
              <span className="badge-icon">{typeInfo.icon}</span>
              <span className="badge-text">{typeInfo.label}</span>
            </div>
          </div>
          
          {/* البطاقة الرئيسية */}
          <Card 
            className="auth-card" 
            padding="lg"
            hoverable={false}
          >
            {/* حالة التحميل */}
            {loading && (
              <div className="auth-loading">
                <Spinner size="lg" color="primary" />
                <p className="loading-text">جاري التحميل...</p>
              </div>
            )}
            
            {/* رسالة الخطأ */}
            {error && !loading && (
              <div className="auth-error">
                <div className="error-icon">⚠️</div>
                <p className="error-message">{error}</p>
              </div>
            )}
            
            {/* المحتوى */}
            {!loading && children}
          </Card>
          
          {/* الفوتر */}
          <div className="auth-footer">
            <div className="footer-links">
              <a href="/" className="footer-link">الرئيسية</a>
              <a href="/about" className="footer-link">عن التطبيق</a>
              <a href="/contact" className="footer-link">اتصل بنا</a>
              <a href="/privacy" className="footer-link">الخصوصية</a>
            </div>
            <p className="footer-copyright">
              © {new Date().getFullYear()} السائح. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;

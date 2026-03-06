// src/components/Auth/UserLogin.jsx
import React, { useState } from 'react';
import { Input, Button, Spinner } from '../ui';
import AuthLayout from './AuthLayout';
import './UserLogin.css';
import { validateEmail } from './index.js';

function UserLogin({ onLogin, isLoading = false }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // التحقق من البيانات
    const newErrors = {};
    
    // تحقق من البريد
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.message;
    }
    
    // تحقق من كلمة المرور
    if (!formData.password.trim()) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور قصيرة جداً';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // استدعاء دالة الدخول
    try {
      if (onLogin) {
        await onLogin(formData);
      }
    } catch (error) {
      setFormError(error.message || 'فشل تسجيل الدخول. حاول مرة أخرى.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // مسح الخطأ عند التعديل
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (formError) {
      setFormError('');
    }
  };

  const handleForgotPassword = () => {
    console.log('استعادة كلمة المرور للبريد:', formData.email);
    // إضافة منطق استعادة كلمة المرور هنا
  };

  return (
    <AuthLayout 
      title="تسجيل الدخول"
      subtitle="سجل دخولك للاستمتاع بخدمات التطبيق"
      type="user"
      loading={isLoading}
      error={formError}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          label="البريد الإلكتروني"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="example@email.com"
          error={errors.email}
          required
          icon={<span className="input-icon">✉️</span>}
        />

        <Input
          label="كلمة المرور"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="أدخل كلمة المرور"
          error={errors.password}
          required
          icon={<span className="input-icon">🔒</span>}
        />

        <div className="form-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              disabled={isLoading}
            />
            <span>تذكرني على هذا الجهاز</span>
          </label>
          
          <button 
            type="button"
            className="forgot-password-btn"
            onClick={handleForgotPassword}
            disabled={isLoading}
          >
            نسيت كلمة المرور؟
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
          className="login-btn"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" color="white" />
              <span>جاري تسجيل الدخول...</span>
            </>
          ) : 'تسجيل الدخول'}
        </Button>

        <div className="auth-divider">
          <span className="divider-text">أو</span>
        </div>

        <div className="social-login">
          <Button 
            variant="outline" 
            fullWidth
            className="social-btn google"
            disabled={isLoading}
          >
            <span className="social-icon">G</span>
            تسجيل الدخول باستخدام Google
          </Button>
          
          <Button 
            variant="outline" 
            fullWidth
            className="social-btn facebook"
            disabled={isLoading}
          >
            <span className="social-icon">f</span>
            تسجيل الدخول باستخدام Facebook
          </Button>
        </div>

        <div className="auth-switch">
          <p className="switch-text">
            ليس لديك حساب؟ 
            <a href="/register" className="switch-link"> سجل الآن</a>
          </p>
          <a href="/guide/login" className="switch-link guide-link">
            تسجيل دخول كمرشد سياحي →
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}

export default UserLogin;
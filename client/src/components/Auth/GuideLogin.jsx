// src/components/Auth/GuideLogin.jsx
import React, { useState } from 'react';
import { Input, Button, Spinner } from '../ui';
import AuthLayout from './AuthLayout';
import './GuideLogin.css';
import { validateEmail } from './index.js';

function GuideLogin({ onLogin, isLoading = false }) {
  const [formData, setFormData] = useState({
    licenseNumber: '',
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
    
    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'رقم الرخصة مطلوب';
    } else if (!/^[A-Z]{3}-\d{4}-\d{4}$/.test(formData.licenseNumber)) {
      newErrors.licenseNumber = 'صيغة الرخصة غير صحيحة (مثال: TRL-1234-5678)';
    }
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.message;
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 8) {
      newErrors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      if (onLogin) {
        await onLogin(formData);
      }
    } catch (error) {
      setFormError(error.message || 'فشل تسجيل الدخول. تأكد من بيانات المرشد.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // تنسيق رقم الرخصة أثناء الكتابة
    let formattedValue = value;
    if (name === 'licenseNumber') {
      formattedValue = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      
      // إضافة الشرطة التلقائية
      if (formattedValue.length === 3 && !formattedValue.includes('-')) {
        formattedValue += '-';
      } else if (formattedValue.length === 8 && formattedValue.charAt(7) !== '-') {
        formattedValue = formattedValue.slice(0, 7) + '-' + formattedValue.slice(7);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : formattedValue
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (formError) {
      setFormError('');
    }
  };

  return (
    <AuthLayout 
      title="دخول المرشدين"
      subtitle="منطقة خاصة بالمرشدين السياحيين المعتمدين"
      type="guide"
      loading={isLoading}
      error={formError}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          label="رقم الرخصة السياحية"
          name="licenseNumber"
          value={formData.licenseNumber}
          onChange={handleChange}
          placeholder="TRL-1234-5678"
          error={errors.licenseNumber}
          required
          maxLength={12}
          icon={<span className="input-icon">📋</span>}
          helperText="مثال: TRL-1234-5678"
        />

        <Input
          label="البريد الإلكتروني المسجل"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="guide@touristapp.com"
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
          placeholder="كلمة المرور الخاصة بالمرشد"
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
            <span>تذكر بيانات الدخول</span>
          </label>
        </div>

        <div className="guide-notice">
          <div className="notice-header">
            <span className="notice-icon">⚠️</span>
            <h4 className="notice-title">معلومة هامة</h4>
          </div>
          <ul className="notice-list">
            <li>هذه المنطقة للمرشدين المعتمدين فقط</li>
            <li>يجب أن تكون لديك رخصة سياحية سارية</li>
            <li>البيانات يتم التحقق منها مع الجهات المختصة</li>
          </ul>
        </div>

        <Button
          type="submit"
          variant="success"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
          className="guide-login-btn"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" color="white" />
              <span>جاري التحقق...</span>
            </>
          ) : 'دخول لوحة المرشد'}
        </Button>

        <div className="auth-switch">
          <p className="switch-text">
            ليس لديك حساب مرشد؟ 
            <a href="/guide/register" className="switch-link"> سجل كمرشد</a>
          </p>
          <a href="/login" className="switch-link user-link">
            ← تسجيل دخول كمستخدم عادي
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}

export default GuideLogin;
// src/components/Auth/GuideLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

function GuideLogin({ onLogin, isLoading = false }) {
  const navigate = useNavigate();
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
    
    const newErrors = {};
    
    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'رقم الرخصة مطلوب';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'كلمة المرور مطلوبة';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      const response = await api.guideLogin(formData.licenseNumber, formData.email, formData.password);
      
      if (response.success) {
        toast.success('تم تسجيل الدخول بنجاح');
        if (onLogin) {
          onLogin(response.user);
        }
        navigate('/guide/dashboard');
      } else {
        setFormError(response.message || 'فشل تسجيل الدخول');
      }
    } catch (error) {
      setFormError(error.message || 'فشل تسجيل الدخول. تأكد من بيانات المرشد.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-white">👤</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">دخول المرشدين</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">منطقة خاصة بالمرشدين السياحيين المعتمدين</p>
        </div>

        {formError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              رقم الرخصة السياحية
            </label>
            <input
              type="text"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              placeholder="TRL-1234-5678"
              className={`w-full p-3 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                errors.licenseNumber ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            {errors.licenseNumber && (
              <p className="mt-1 text-xs text-red-500">{errors.licenseNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="guide@touristapp.com"
              className={`w-full p-3 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              كلمة المرور
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="كلمة المرور الخاصة بالمرشد"
              className={`w-full p-3 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                errors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">تذكر بيانات الدخول</span>
            </label>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
              <span>⚠️</span>
              معلومة هامة
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>هذه المنطقة للمرشدين المعتمدين فقط</li>
              <li>يجب أن تكون لديك رخصة سياحية سارية</li>
              <li>البيانات يتم التحقق منها مع الجهات المختصة</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">🌀</span>
                <span>جاري التحقق...</span>
              </>
            ) : (
              <>
                <span>🔐</span>
                <span>دخول لوحة المرشد</span>
              </>
            )}
          </button>

          <div className="text-center space-y-2 pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ليس لديك حساب مرشد؟{' '}
              <a href="/guide/register" className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium">
                سجل كمرشد
              </a>
            </p>
            <a href="/login" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 block">
              ← تسجيل دخول كمستخدم عادي
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GuideLogin;
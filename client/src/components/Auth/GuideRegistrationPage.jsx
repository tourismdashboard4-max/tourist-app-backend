// ============================================
// Guide Registration Page - تسجيل مرشد جديد
// ============================================
import React, { useState } from 'react';
import api from '../../services/api';

function GuideRegistrationPage({ lang, onBack, onSubmit, isTestMode = false }) {
  const [formData, setFormData] = useState({
    fullName: '',
    civilId: '',
    licenseNumber: '',
    email: '',
    phone: '',
    experience: '',
    specialties: '',
    programLocation: '',
    programLocationName: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [locationError, setLocationError] = useState('');

  // ============================================
  // Validation Functions
  // ============================================
  const validateCivilId = (id) => {
    return /^\d{10}$/.test(id);
  };

  const validatePhone = (phone) => {
    return /^(05|\+9665)[0-9]{8}$/.test(phone);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateGoogleMapsUrl = (url) => {
    if (!url) return true;
    return /^https:\/\/maps\.app\.goo\.gl\/|^https:\/\/www\.google\.com\/maps\/embed\?|^https:\/\/www\.google\.com\/maps\/place\//.test(url);
  };

  // ============================================
  // Handle Input Change
  // ============================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation errors on change
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (name === 'programLocation') {
      setLocationError('');
    }
  };

  // ============================================
  // Handle Submit
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    const errors = {};
    
    // Validate Civil ID
    if (!formData.civilId) {
      errors.civilId = lang === 'ar' ? 'رقم الهوية مطلوب' : 'Civil ID is required';
    } else if (!validateCivilId(formData.civilId)) {
      errors.civilId = lang === 'ar' 
        ? 'رقم الهوية يجب أن يكون 10 أرقام' 
        : 'Civil ID must be 10 digits';
    }
    
    // Validate Phone
    if (!formData.phone) {
      errors.phone = lang === 'ar' ? 'رقم الجوال مطلوب' : 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      errors.phone = lang === 'ar' 
        ? 'رقم الجوال غير صحيح (مثال: 05xxxxxxxx أو +9665xxxxxxxx)' 
        : 'Invalid phone number (e.g., 05xxxxxxxx or +9665xxxxxxxx)';
    }
    
    // Validate Email
    if (!formData.email) {
      errors.email = lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = lang === 'ar' 
        ? 'البريد الإلكتروني غير صحيح' 
        : 'Invalid email address';
    }
    
    // Validate Full Name
    if (!formData.fullName) {
      errors.fullName = lang === 'ar' ? 'الاسم الكامل مطلوب' : 'Full name is required';
    } else if (formData.fullName.length < 3) {
      errors.fullName = lang === 'ar' 
        ? 'الاسم يجب أن يكون 3 أحرف على الأقل' 
        : 'Name must be at least 3 characters';
    }
    
    // Validate License Number
    if (!formData.licenseNumber) {
      errors.licenseNumber = lang === 'ar' ? 'رقم الرخصة مطلوب' : 'License number is required';
    }
    
    // Validate Google Maps URL (optional)
    if (formData.programLocation && !validateGoogleMapsUrl(formData.programLocation)) {
      errors.programLocation = lang === 'ar'
        ? '❌ رابط غير صحيح. يرجى استخدام رابط Google Maps صحيح'
        : '❌ Invalid URL. Please use a valid Google Maps link';
    }
    
    // If there are validation errors, display them
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Start submission
    setIsSubmitting(true);
    setValidationErrors({});
    
    try {
      console.log('📤 Sending registration data:', formData);
      
      let response;
      
      if (isTestMode) {
        // Test mode - simulate successful response
        console.log('🧪 Test mode: Simulating registration');
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = {
          success: true,
          message: 'تم إرسال طلب التسجيل بنجاح (وضع الاختبار)',
          requestId: 'TEST-' + Date.now()
        };
      } else {
        // Production mode - send to server
        response = await api.guideRegister(formData);
      }
      
      console.log('✅ Server response:', response);
      
      // Show success message
      alert(lang === 'ar' 
        ? `✅ تم إرسال طلب التسجيل بنجاح! ${response.requestId ? `رقم الطلب: ${response.requestId}` : ''}\nسيتم مراجعته من قبل الإدارة خلال 24 ساعة.`
        : `✅ Registration submitted successfully! ${response.requestId ? `Request ID: ${response.requestId}` : ''}\nYour request will be reviewed within 24 hours.`
      );
      
      // Call onSubmit callback if provided
      if (onSubmit) {
        onSubmit(response);
      }
      
      // Reset form
      setFormData({
        fullName: '',
        civilId: '',
        licenseNumber: '',
        email: '',
        phone: '',
        experience: '',
        specialties: '',
        programLocation: '',
        programLocationName: '',
      });
      
      // Go back after successful submission
      if (onBack) {
        setTimeout(() => onBack(), 2000);
      }
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      // Handle specific error messages
      let errorMessage = error.message;
      
      if (error.message.includes('duplicate') || error.message.includes('مستخدم بالفعل')) {
        errorMessage = lang === 'ar'
          ? 'هذا البريد الإلكتروني أو رقم الرخصة مسجل بالفعل'
          : 'This email or license number is already registered';
      } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        errorMessage = lang === 'ar'
          ? 'فشل الاتصال بالخادم. تأكد من تشغيل السيرفر'
          : 'Failed to connect to server. Please make sure the server is running';
      }
      
      alert(lang === 'ar' 
        ? `❌ فشل إرسال الطلب: ${errorMessage}` 
        : `❌ Failed to submit: ${errorMessage}`
      );
      
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xl">
            🧪
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-yellow-800 dark:text-yellow-300">
              {lang === 'ar' ? 'وضع الاختبار التجريبي' : 'Test Mode'}
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              {lang === 'ar' 
                ? 'لن يتم إرسال طلب التسجيل إلى الإدارة. هذه محاكاة للتجربة فقط.' 
                : 'Registration request will not be sent to administration. This is a simulation.'}
            </p>
          </div>
          <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-bold">
            {lang === 'ar' ? 'تجريبي' : 'DEMO'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm ml-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <span className="text-xl dark:text-white">‹</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {lang === 'ar' ? 'تسجيل مرشد جديد' : 'Register as Tourist Guide'}
        </h1>
        {!isTestMode && (
          <span className="mr-3 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full border border-green-300 dark:border-green-700">
            {lang === 'ar' ? 'نشط' : 'LIVE'}
          </span>
        )}
      </div>

      {/* Registration Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
        
        {/* Requirements Section */}
        <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span>📋</span>
            {lang === 'ar' ? 'متطلبات التسجيل' : 'Registration Requirements'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              <span className="text-sm">رقم الهوية الوطنية السعودية</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              <span className="text-sm">وثيقة مزاولة المهنة</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              <span className="text-sm">بريد إلكتروني صالح</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              <span className="text-sm">رقم هاتف للتواصل</span>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">📍</span>
              <span className="text-sm font-medium">
                {lang === 'ar' ? 'رابط موقع البرنامج السياحي (Google Maps) - اختياري' : 'Tour program location (Google Maps) - Optional'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.fullName ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={lang === 'ar' ? 'الاسم ثلاثي' : 'Full name'}
                required
              />
              {validationErrors.fullName && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.fullName}</p>
              )}
            </div>

            {/* Civil ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'رقم الهوية' : 'Civil ID'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="civilId"
                value={formData.civilId}
                onChange={handleInputChange}
                maxLength="10"
                className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.civilId ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="1234567890"
                required
              />
              {validationErrors.civilId && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.civilId}</p>
              )}
            </div>

            {/* License Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'رقم الرخصة' : 'License Number'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.licenseNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="TRL-1234-5678"
                required
              />
              {validationErrors.licenseNumber && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.licenseNumber}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="email@example.com"
                required
              />
              {validationErrors.email && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'رقم الجوال' : 'Phone Number'} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.phone ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="+966500000000"
                required
              />
              {validationErrors.phone && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.phone}</p>
              )}
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'سنوات الخبرة' : 'Experience'}
              </label>
              <input
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                min="0"
                max="50"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                placeholder={lang === 'ar' ? 'عدد السنوات' : 'Years'}
              />
            </div>

            {/* Program Location URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="flex items-center gap-1">
                  <span>📍</span>
                  {lang === 'ar' ? 'رابط موقع البرنامج (Google Maps)' : 'Program Location (Google Maps)'}
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400">
                    {lang === 'ar' ? 'اختياري' : 'Optional'}
                  </span>
                </span>
              </label>
              <input
                type="url"
                name="programLocation"
                value={formData.programLocation}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                  validationErrors.programLocation ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/embed?pb=..."
              />
              {validationErrors.programLocation && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.programLocation}</p>
              )}
            </div>

            {/* Location Name */}
            <div className="md:col-span-2">
              <input
                type="text"
                name="programLocationName"
                value={formData.programLocationName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                placeholder={lang === 'ar' ? 'اسم الموقع (مثال: الدرعية التاريخية)' : 'Location name (e.g., Historical Diriyah)'}
              />
            </div>

            {/* Specialties */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {lang === 'ar' ? 'التخصصات' : 'Specialties'}
              </label>
              <textarea
                name="specialties"
                value={formData.specialties}
                onChange={handleInputChange}
                rows="3"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                placeholder={lang === 'ar' 
                  ? 'مثل: تاريخ، تراث، مغامرات، تخييم، طبيعة...' 
                  : 'e.g., History, Heritage, Adventures, Camping, Nature...'}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-3 rounded-lg font-medium transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                isTestMode
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">🌀</span>
                  <span>{lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <span>{isTestMode ? '🧪' : '📤'}</span>
                  <span>
                    {isTestMode 
                      ? (lang === 'ar' ? 'إرسال طلب تجريبي' : 'Submit Demo Request')
                      : (lang === 'ar' ? 'إرسال طلب التسجيل' : 'Submit Registration')
                    }
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2"
            >
              <span>↩️</span>
              <span>{lang === 'ar' ? 'رجوع' : 'Back'}</span>
            </button>
          </div>
        </form>

        {/* Google Maps Help */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span className="text-lg">📍</span>
            <span className="font-medium">
              {lang === 'ar' ? 'كيف تحصل على رابط Google Maps؟' : 'How to get a Google Maps link?'}
            </span>
          </p>
          <ol className="mt-2 text-xs text-gray-500 dark:text-gray-400 list-decimal list-inside space-y-1">
            <li>{lang === 'ar' ? 'افتح Google Maps على هاتفك أو جهاز الكمبيوتر' : 'Open Google Maps on your phone or computer'}</li>
            <li>{lang === 'ar' ? 'ابحث عن موقع البرنامج السياحي' : 'Search for your tour program location'}</li>
            <li>{lang === 'ar' ? 'اضغط على "مشاركة" ثم "نسخ الرابط"' : 'Click "Share" then "Copy link"'}</li>
            <li>{lang === 'ar' ? 'الصق الرابط في الحقل أعلاه' : 'Paste the link in the field above'}</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">
              https://maps.app.goo.gl/abc123...
            </code>
            <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">
              https://www.google.com/maps/embed?pb=...
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuideRegistrationPage;


// ============================================
// Guide Registration Page - تسجيل مرشد جديد مع وثيقة
// ============================================
import React, { useState, useRef } from 'react';
import api from '../../services/api';

function GuideRegistrationPage({ lang, onBack, onSubmit, isTestMode = false }) {
  const fileInputRef = useRef(null);
  
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
  
  const [documentFile, setDocumentFile] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [documentError, setDocumentError] = useState('');
  
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
  // Document Upload Handler
  // ============================================
  const handleDocumentClick = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // التحقق من حجم الملف (5 ميجابايت كحد أقصى)
    if (file.size > 5 * 1024 * 1024) {
      setDocumentError(lang === 'ar' 
        ? 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت' 
        : 'File size too large. Maximum 5MB');
      return;
    }

    // التحقق من نوع الملف
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setDocumentError(lang === 'ar' 
        ? 'الرجاء اختيار ملف PDF أو صورة (JPG, PNG)' 
        : 'Please select a PDF file or image (JPG, PNG)');
      return;
    }

    setDocumentError('');
    setDocumentFile(file);
    
    // إنشاء معاينة للملف
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setDocumentPreview(null);
    }
  };

  // ============================================
  // Handle Input Change
  // ============================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
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
    
    if (!formData.fullName) {
      errors.fullName = lang === 'ar' ? 'الاسم الكامل مطلوب' : 'Full name is required';
    } else if (formData.fullName.length < 3) {
      errors.fullName = lang === 'ar' 
        ? 'الاسم يجب أن يكون 3 أحرف على الأقل' 
        : 'Name must be at least 3 characters';
    }
    
    if (!formData.civilId) {
      errors.civilId = lang === 'ar' ? 'رقم الهوية مطلوب' : 'Civil ID is required';
    } else if (!validateCivilId(formData.civilId)) {
      errors.civilId = lang === 'ar' 
        ? 'رقم الهوية يجب أن يكون 10 أرقام' 
        : 'Civil ID must be 10 digits';
    }
    
    if (!formData.licenseNumber) {
      errors.licenseNumber = lang === 'ar' ? 'رقم الرخصة مطلوب' : 'License number is required';
    }
    
    if (!formData.email) {
      errors.email = lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = lang === 'ar' 
        ? 'البريد الإلكتروني غير صحيح' 
        : 'Invalid email address';
    }
    
    if (!formData.phone) {
      errors.phone = lang === 'ar' ? 'رقم الجوال مطلوب' : 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      errors.phone = lang === 'ar' 
        ? 'رقم الجوال غير صحيح (مثال: 05xxxxxxxx أو +9665xxxxxxxx)' 
        : 'Invalid phone number (e.g., 05xxxxxxxx or +9665xxxxxxxx)';
    }
    
    if (!documentFile) {
      errors.document = lang === 'ar' 
        ? 'وثيقة مزاولة المهنة مطلوبة' 
        : 'Professional license document is required';
    }
    
    if (formData.programLocation && !validateGoogleMapsUrl(formData.programLocation)) {
      errors.programLocation = lang === 'ar'
        ? '❌ رابط غير صحيح. يرجى استخدام رابط Google Maps صحيح'
        : '❌ Invalid URL. Please use a valid Google Maps link';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setIsSubmitting(true);
    setValidationErrors({});
    
    try {
      console.log('📤 Sending registration data with document');
      
      // إنشاء FormData لإرسال الملف والبيانات معاً
      const formDataToSend = new FormData();
      
      // إضافة البيانات النصية
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // إضافة ملف الوثيقة
      formDataToSend.append('licenseDocument', documentFile);
      
      let response;
      
      if (isTestMode) {
        console.log('🧪 Test mode: Simulating registration');
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = {
          success: true,
          message: 'تم إرسال طلب التسجيل بنجاح (وضع الاختبار)',
          requestId: 'TEST-' + Date.now()
        };
      } else {
        response = await api.guideRegister(formDataToSend);
      }
      
      console.log('✅ Server response:', response);
      
      alert(lang === 'ar' 
        ? `✅ تم إرسال طلب التسجيل بنجاح! ${response.requestId ? `رقم الطلب: ${response.requestId}` : ''}\nسيتم مراجعته من قبل الإدارة خلال 24 ساعة.`
        : `✅ Registration submitted successfully! ${response.requestId ? `Request ID: ${response.requestId}` : ''}\nYour request will be reviewed within 24 hours.`
      );
      
      if (onSubmit) {
        onSubmit(response);
      }
      
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
      setDocumentFile(null);
      setDocumentPreview(null);
      
      if (onBack) {
        setTimeout(() => onBack(), 2000);
      }
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('duplicate') || error.message.includes('مستخدم بالفعل')) {
        errorMessage = lang === 'ar'
          ? 'هذا البريد الإلكتروني أو رقم الرخصة مسجل بالفعل'
          : 'This email or license number is already registered';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
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
        </div>
      )}

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
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
        
        <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span>📋</span>
            {lang === 'ar' ? 'متطلبات التسجيل' : 'Registration Requirements'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              <span className="text-sm">رقم الهوية الوطنية</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              <span className="text-sm">وثيقة مزاولة المهنة (PDF أو صورة)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              <span className="text-sm">بريد إلكتروني صالح</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
              <span className="text-sm">رقم جوال للتواصل</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Document Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {lang === 'ar' ? 'وثيقة مزاولة المهنة' : 'Professional License Document'} <span className="text-red-500">*</span>
            </label>
            
            <div 
              onClick={handleDocumentClick}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                documentError 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/10' 
                  : documentFile 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleDocumentChange}
                className="hidden"
              />
              
              {documentPreview ? (
                <div className="space-y-3">
                  <img 
                    src={documentPreview} 
                    alt="Preview" 
                    className="max-h-40 mx-auto rounded-lg shadow-sm"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {documentFile.name} ({(documentFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              ) : documentFile ? (
                <div className="space-y-3">
                  <div className="text-5xl">📄</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {documentFile.name} ({(documentFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-5xl text-gray-400">📎</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {lang === 'ar' 
                      ? 'اضغط لرفع وثيقة مزاولة المهنة (PDF أو صورة)' 
                      : 'Click to upload license document (PDF or image)'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {lang === 'ar' ? 'الحد الأقصى: 5 ميجابايت' : 'Max size: 5MB'}
                  </p>
                </div>
              )}
            </div>
            
            {documentError && (
              <p className="mt-2 text-sm text-red-500">{documentError}</p>
            )}
            {validationErrors.document && (
              <p className="mt-2 text-sm text-red-500">{validationErrors.document}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  validationErrors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={lang === 'ar' ? 'الاسم ثلاثي' : 'Full name'}
              />
              {validationErrors.fullName && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.fullName}</p>
              )}
            </div>

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
                  validationErrors.civilId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="1234567890"
              />
              {validationErrors.civilId && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.civilId}</p>
              )}
            </div>

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
                  validationErrors.licenseNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="TRL-1234-5678"
              />
              {validationErrors.licenseNumber && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.licenseNumber}</p>
              )}
            </div>

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
                  validationErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="email@example.com"
              />
              {validationErrors.email && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>
              )}
            </div>

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
                  validationErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="+966500000000"
              />
              {validationErrors.phone && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.phone}</p>
              )}
            </div>

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

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">🌀</span>
                  <span>{lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>{lang === 'ar' ? 'إرسال طلب التسجيل' : 'Submit Registration'}</span>
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
      </div>
    </div>
  );
}

export default GuideRegistrationPage;
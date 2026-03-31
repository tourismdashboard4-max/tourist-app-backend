// client/src/pages/UpgradeToGuidePage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaIdCard, 
  FaFileAlt, 
  FaPhone, 
  FaUser,
  FaUpload,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaArrowLeft,
  FaShieldAlt,
  FaGraduationCap,
  FaCreditCard,
  FaMobile,
  FaHourglassHalf,
  FaClock
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';

const UpgradeToGuidePage = ({ setPage, onUpgradeSuccess }) => {
  const { user, updateUser } = useAuth();
  const licenseFileInputRef = useRef(null);
  const idFileInputRef = useRef(null);
  
  // ✅ التحقق الشامل من أن المستخدم مرشد بالفعل
  const isGuide = user?.role === 'guide' || 
                  user?.type === 'guide' || 
                  user?.isGuide === true || 
                  user?.guide_status === 'approved';

  // حالة طلب الترقية الموجود
  const [existingRequest, setExistingRequest] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [showExistingRequestMessage, setShowExistingRequestMessage] = useState(false);
  
  const [formData, setFormData] = useState({
    civilId: '',
    licenseNumber: '',
    experience: '',
    specialties: '',
    bio: '',
    phone: user?.phone || ''
  });
  
  // ملفات الوثائق
  const [licenseDocument, setLicenseDocument] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [licenseError, setLicenseError] = useState('');
  
  const [idDocument, setIdDocument] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [idError, setIdError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // التحقق من أن المستخدم مسجل دخول
  useEffect(() => {
    if (!user) {
      toast.error('الرجاء تسجيل الدخول أولاً');
      setPage('profile');
    }
  }, [user, setPage]);

  // ✅ التحقق من أن المستخدم ليس مرشداً بالفعل
  useEffect(() => {
    if (isGuide) {
      toast.success('🎉 أنت بالفعل مرشد سياحي معتمد!');
      setTimeout(() => {
        setPage('guideDashboard');
      }, 2000);
    }
  }, [isGuide, setPage]);

  // ✅ التحقق من وجود طلب ترقية سابق
  useEffect(() => {
    const checkExistingUpgradeRequest = async () => {
      if (!user) return;
      
      // ✅ إذا كان المستخدم مرشداً بالفعل - لا حاجة للتحقق
      if (isGuide) {
        setLoadingRequest(false);
        return;
      }
      
      // ✅ إذا كان المستخدم لديه طلب مرفوض
      if (user?.guide_status === 'rejected') {
        setShowExistingRequestMessage(false);
        setLoadingRequest(false);
        return;
      }
      
      // ✅ إذا كان المستخدم لديه طلب قيد المراجعة
      if (user?.guide_status === 'pending') {
        setExistingRequest({ status: 'pending', created_at: user?.guide_request_date });
        setShowExistingRequestMessage(true);
        setLoadingRequest(false);
        return;
      }
      
      try {
        setLoadingRequest(true);
        console.log('🔍 Checking existing upgrade request for user:', user.id);
        
        const response = await api.getUserUpgradeRequestStatus();
        console.log('📥 Existing upgrade request response:', response);
        
        if (response.success && response.request) {
          setExistingRequest(response.request);
          setShowExistingRequestMessage(true);
          
          if (response.request.status === 'pending') {
            toast.error('لديك طلب ترقية قيد المراجعة بالفعل');
            setTimeout(() => {
              setPage('upgrade-status');
            }, 3000);
          } else if (response.request.status === 'approved') {
            toast.success('تمت الموافقة على طلبك بالفعل! أنت الآن مرشد سياحي');
            
            // ✅ تحديث المستخدم في السياق
            const updatedUser = { 
              ...user, 
              role: 'guide', 
              type: 'guide', 
              isGuide: true,
              guide_status: 'approved' 
            };
            updateUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('userType', 'guide');
            localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
            
            setTimeout(() => {
              setPage('guideDashboard');
            }, 2000);
          } else if (response.request.status === 'rejected') {
            toast.error('تم رفض طلبك السابق. يمكنك تقديم طلب جديد');
            setShowExistingRequestMessage(false);
          }
        }
      } catch (error) {
        // لا يوجد طلب سابق - يمكن المتابعة
        console.log('No existing upgrade request, can proceed');
        setShowExistingRequestMessage(false);
      } finally {
        setLoadingRequest(false);
      }
    };
    
    if (user && !isGuide) {
      checkExistingUpgradeRequest();
    } else {
      setLoadingRequest(false);
    }
  }, [user, setPage, updateUser, isGuide]);

  const validateCivilId = (id) => {
    return /^\d{10}$/.test(id);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+966|0)?5[0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateLicenseNumber = (license) => {
    const trimmedLicense = license.trim();
    
    const patternTRL = /^[A-Z]{3}-\d{4}-\d{4}$/;
    const patternFL = /^[A-Z]{2,3}-\d{7,10}$/;
    const patternGeneric = /^[A-Z]{1,5}-\d{4,15}$/;
    const patternNumbersOnly = /^\d{5,15}$/;
    const patternLettersOnly = /^[A-Z]{3,10}$/;
    
    return patternTRL.test(trimmedLicense) || 
           patternFL.test(trimmedLicense) || 
           patternGeneric.test(trimmedLicense) ||
           patternNumbersOnly.test(trimmedLicense) ||
           patternLettersOnly.test(trimmedLicense);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    if (name === 'licenseNumber') {
      formattedValue = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      formattedValue = formattedValue.replace(/-+/g, '-');
      
      if (formattedValue.startsWith('-')) {
        formattedValue = formattedValue.substring(1);
      }
      
      if (formattedValue.endsWith('-')) {
        formattedValue = formattedValue.slice(0, -1);
      }
    } else {
      formattedValue = value;
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLicenseDocumentChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLicenseError('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setLicenseError('الرجاء اختيار ملف PDF أو صورة (JPG, PNG)');
      return;
    }

    setLicenseError('');
    setLicenseDocument(file);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLicensePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setLicensePreview(null);
    }
  };

  const handleIdDocumentChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setIdError('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setIdError('الرجاء اختيار صورة (JPG, PNG) فقط');
      return;
    }

    setIdError('');
    setIdDocument(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const validateStep = (stepNumber) => {
    const newErrors = {};

    if (stepNumber === 1) {
      if (!formData.civilId) {
        newErrors.civilId = 'رقم الهوية مطلوب';
      } else if (!validateCivilId(formData.civilId)) {
        newErrors.civilId = 'رقم الهوية يجب أن يكون 10 أرقام';
      }

      if (!formData.licenseNumber) {
        newErrors.licenseNumber = 'رقم الرخصة مطلوب';
      } else if (!validateLicenseNumber(formData.licenseNumber)) {
        newErrors.licenseNumber = 'صيغة الرخصة غير صحيحة';
      }

      if (!formData.experience) {
        newErrors.experience = 'سنوات الخبرة مطلوبة';
      } else if (formData.experience < 0 || formData.experience > 50) {
        newErrors.experience = 'سنوات الخبرة يجب أن تكون بين 0 و 50';
      }

      if (!formData.specialties) {
        newErrors.specialties = 'التخصصات مطلوبة';
      }

      if (!formData.phone) {
        newErrors.phone = 'رقم الجوال مطلوب';
      } else if (!validatePhone(formData.phone)) {
        newErrors.phone = 'رقم الجوال غير صحيح (مثال: 05xxxxxxxx أو +9665xxxxxxxx)';
      }
    }

    if (stepNumber === 2) {
      if (!licenseDocument) {
        setLicenseError('وثيقة مزاولة المهنة مطلوبة');
        return false;
      }
      if (!idDocument) {
        setIdError('صورة البطاقة الشخصية مطلوبة');
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast.error('الرجاء الموافقة على الشروط والأحكام');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      formDataToSend.append('userId', user.id);
      formDataToSend.append('email', user.email);
      formDataToSend.append('fullName', user.fullName || user.name);
      
      if (licenseDocument) {
        formDataToSend.append('licenseDocument', licenseDocument);
      }
      
      if (idDocument) {
        formDataToSend.append('idDocument', idDocument);
      }
      
      console.log('📤 Sending upgrade request');
      
      const response = await api.upgradeToGuide(formDataToSend);
      console.log('📥 Response:', response);
      
      if (response.success) {
        toast.success(`✅ تم إرسال طلب الترقية بنجاح!`);
        
        localStorage.setItem('lastRequestId', response.requestId || Date.now().toString());
        
        // ✅ تحديث المستخدم في السياق
        const updatedUser = { 
          ...user, 
          guide_status: 'pending',
          guideRequestId: response.requestId || Date.now().toString(),
          licenseNumber: formData.licenseNumber,
          civilId: formData.civilId,
          specialties: formData.specialties,
          experience: formData.experience,
          phone: formData.phone
        };
        
        updateUser(updatedUser);
        localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
        
        if (onUpgradeSuccess) {
          onUpgradeSuccess(response);
        }
        
        setTimeout(() => {
          setPage('upgrade-status');
        }, 2000);
      } else {
        throw new Error(response.message || 'فشل إرسال الطلب');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      toast.error(error.message || 'فشل إرسال طلب الترقية');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ إذا كان المستخدم مرشداً بالفعل - عرض شاشة خاصة
  if (isGuide) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-emerald-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="text-green-600 dark:text-green-400 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
            🎉 أنت مرشد سياحي بالفعل!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            حسابك تم ترقيته إلى مرشد سياحي. يمكنك الآن إدارة برامجك السياحية.
          </p>
          <button
            onClick={() => setPage('guideDashboard')}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition"
          >
            الذهاب إلى لوحة المرشد
          </button>
        </div>
      </div>
    );
  }

  // عرض شاشة التحميل أثناء التحقق من الطلب الموجود
  if (loadingRequest) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-green-600 text-4xl mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">جاري التحقق من حالة الطلب...</p>
        </div>
      </div>
    );
  }

  // إذا كان هناك طلب قيد المراجعة
  if (existingRequest && existingRequest.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaHourglassHalf className="text-yellow-600 dark:text-yellow-400 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
            طلب ترقية قيد المراجعة
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            لديك طلب ترقية إلى مرشد سياحي قيد المراجعة بالفعل.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 text-right">
            <p className="text-sm text-blue-800 dark:text-blue-400">
              📅 تاريخ الطلب: {new Date(existingRequest.created_at).toLocaleDateString('ar-EG')}
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
              🕐 سيتم إشعارك بنتيجة الطلب خلال 24 ساعة
            </p>
          </div>
          <button
            onClick={() => setPage('upgrade-status')}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition"
          >
            متابعة حالة الطلب
          </button>
          <button
            onClick={() => setPage('profile')}
            className="w-full mt-3 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            العودة للملف الشخصي
          </button>
        </div>
      </div>
    );
  }

  // إذا كان هناك طلب تمت الموافقة عليه
  if (existingRequest && existingRequest.status === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="text-green-600 dark:text-green-400 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
            🎉 أنت الآن مرشد سياحي!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            تمت الموافقة على طلب الترقية الخاص بك. يمكنك الآن البدء في إضافة برامج سياحية.
          </p>
          <button
            onClick={() => setPage('guideDashboard')}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition"
          >
            الذهاب إلى لوحة المرشد
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div 
      className="bg-gray-50 dark:bg-gray-900" 
      style={{ 
        height: '100vh', 
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div className="py-8 px-4">
        <div className="max-w-3xl mx-auto pb-10">
          
          {/* ✅ زر العودة */}
          <div className="mb-8">
            <button
              onClick={() => setPage('profile')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 mb-4 transition"
            >
              <FaArrowLeft />
              <span>العودة إلى الملف الشخصي</span>
            </button>

            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              ترقية الحساب إلى مرشد سياحي
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              أدخل البيانات المطلوبة ليتم مراجعة طلبك من قبل الإدارة
            </p>

            {/* شريط التقدم */}
            <div className="mt-6 flex items-center justify-between">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-1 flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    step >= i 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {step > i ? '✓' : i}
                  </div>
                  {i < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step > i ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>البيانات الأساسية</span>
              <span>الوثائق</span>
              <span>مراجعة</span>
            </div>
          </div>

          {/* بيانات المستخدم الحالية */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-green-100 dark:border-green-900">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <FaUser className="text-green-600" />
              بياناتك الحالية (سيتم استخدامها تلقائياً)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">الاسم</p>
                <p className="font-medium text-gray-800 dark:text-white">{user?.fullName || user?.name}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">البريد الإلكتروني</p>
                <p className="font-medium text-gray-800 dark:text-white">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* النموذج */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            
            {/* الخطوة 1: البيانات الأساسية */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <FaIdCard className="text-blue-600" />
                  البيانات الأساسية
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* رقم الهوية */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      رقم الهوية الوطنية <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="civilId"
                      value={formData.civilId}
                      onChange={handleChange}
                      placeholder="1234567890"
                      maxLength="10"
                      className={`w-full p-3 border-2 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                        errors.civilId ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                      }`}
                    />
                    {errors.civilId && <p className="mt-1 text-xs text-red-500">{errors.civilId}</p>}
                  </div>

                  {/* رقم الجوال */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      رقم الجوال <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FaMobile className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="05xxxxxxxx"
                        dir="ltr"
                        className={`w-full p-3 pr-10 border-2 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                          errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                    <p className="mt-1 text-xs text-gray-500">
                      مثال: 0501234567 أو +966501234567
                    </p>
                  </div>

                  {/* رقم الرخصة */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      رقم وثيقة مزاولة المهنة <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      placeholder="TRL-1234-5678 أو FL-304505387"
                      className={`w-full p-3 border-2 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                        errors.licenseNumber ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                      }`}
                    />
                    {errors.licenseNumber && <p className="mt-1 text-xs text-red-500">{errors.licenseNumber}</p>}
                    <p className="mt-1 text-xs text-gray-500">
                      الصيغ المقبولة: TRL-1234-5678, FL-304505387, أو أرقام فقط
                    </p>
                  </div>

                  {/* سنوات الخبرة */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      سنوات الخبرة <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      placeholder="عدد السنوات"
                      min="0"
                      max="50"
                      className={`w-full p-3 border-2 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                        errors.experience ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                      }`}
                    />
                    {errors.experience && <p className="mt-1 text-xs text-red-500">{errors.experience}</p>}
                  </div>

                  {/* التخصصات */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      التخصصات <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="specialties"
                      value={formData.specialties}
                      onChange={handleChange}
                      placeholder="مثال: تاريخ، تراث، مغامرات، تخييم، طبيعة..."
                      className={`w-full p-3 border-2 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                        errors.specialties ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                      }`}
                    />
                    {errors.specialties && <p className="mt-1 text-xs text-red-500">{errors.specialties}</p>}
                  </div>

                  {/* نبذة عنك */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      نبذة عنك كمرشد
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows="3"
                      placeholder="اكتب نبذة مختصرة عن خبراتك ومؤهلاتك..."
                      className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-md"
                  >
                    التالي: رفع الوثائق
                  </button>
                </div>
              </motion.div>
            )}

            {/* الخطوة 2: رفع الوثائق */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <FaFileAlt className="text-blue-600" />
                  رفع الوثائق المطلوبة
                </h2>

                {/* وثيقة مزاولة المهنة */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    وثيقة مزاولة المهنة <span className="text-red-500">*</span>
                  </label>
                  
                  <div 
                    onClick={() => licenseFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                      licenseError 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/10' 
                        : licenseDocument 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500'
                    }`}
                  >
                    <input
                      ref={licenseFileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleLicenseDocumentChange}
                      className="hidden"
                    />
                    
                    {licensePreview ? (
                      <div className="space-y-4">
                        <img 
                          src={licensePreview} 
                          alt="Preview" 
                          className="max-h-48 mx-auto rounded-lg shadow-md"
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {licenseDocument.name} ({(licenseDocument.size / 1024).toFixed(1)} KB)
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLicenseDocument(null);
                            setLicensePreview(null);
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          إزالة الملف
                        </button>
                      </div>
                    ) : licenseDocument ? (
                      <div className="space-y-4">
                        <div className="text-6xl text-green-600">📄</div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {licenseDocument.name} ({(licenseDocument.size / 1024).toFixed(1)} KB)
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLicenseDocument(null);
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          إزالة الملف
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FaUpload className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="text-gray-600 dark:text-gray-400">
                          اضغط لرفع وثيقة مزاولة المهنة
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF أو صورة - حد أقصى 5 ميجابايت
                        </p>
                      </div>
                    )}
                  </div>
                  {licenseError && <p className="mt-2 text-sm text-red-500">{licenseError}</p>}
                </div>

                {/* صورة البطاقة الشخصية */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    صورة البطاقة الشخصية (الوجه الأمامي) <span className="text-red-500">*</span>
                  </label>
                  
                  <div 
                    onClick={() => idFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                      idError 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/10' 
                        : idDocument 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500'
                    }`}
                  >
                    <input
                      ref={idFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleIdDocumentChange}
                      className="hidden"
                    />
                    
                    {idPreview ? (
                      <div className="space-y-4">
                        <img 
                          src={idPreview} 
                          alt="ID Preview" 
                          className="max-h-48 mx-auto rounded-lg shadow-md"
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {idDocument.name} ({(idDocument.size / 1024).toFixed(1)} KB)
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIdDocument(null);
                            setIdPreview(null);
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          إزالة الصورة
                        </button>
                      </div>
                    ) : idDocument ? (
                      <div className="space-y-4">
                        <div className="text-6xl text-green-600">🪪</div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {idDocument.name} ({(idDocument.size / 1024).toFixed(1)} KB)
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIdDocument(null);
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          إزالة الصورة
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FaCreditCard className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="text-gray-600 dark:text-gray-400">
                          اضغط لرفع صورة البطاقة الشخصية
                        </p>
                        <p className="text-xs text-gray-500">
                          صورة فقط (JPG, PNG) - حد أقصى 5 ميجابايت
                        </p>
                      </div>
                    )}
                  </div>
                  {idError && <p className="mt-2 text-sm text-red-500">{idError}</p>}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <FaShieldAlt />
                    متطلبات الوثائق
                  </h3>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li>يجب أن تكون وثيقة مزاولة المهنة سارية المفعول</li>
                    <li>صورة البطاقة الشخصية يجب أن تكون واضحة وتظهر جميع البيانات</li>
                    <li>الوثائق صادرة من الجهات المختصة</li>
                    <li>يمكن رفع نسخة PDF أو صورة واضحة</li>
                  </ul>
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    السابق
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-md"
                  >
                    التالي: مراجعة الطلب
                  </button>
                </div>
              </motion.div>
            )}

            {/* الخطوة 3: مراجعة الطلب */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <FaCheckCircle className="text-green-600" />
                  مراجعة طلب الترقية
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3">البيانات الأساسية</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">رقم الهوية</p>
                        <p className="font-medium">{formData.civilId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">رقم الجوال</p>
                        <p className="font-medium">{formData.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">رقم الرخصة</p>
                        <p className="font-medium">{formData.licenseNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">سنوات الخبرة</p>
                        <p className="font-medium">{formData.experience} سنة</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">التخصصات</p>
                        <p className="font-medium">{formData.specialties}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3">الوثائق المرفوعة</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {licensePreview ? (
                          <img src={licensePreview} alt="license" className="w-16 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center text-3xl">
                            📄
                          </div>
                        )}
                        <div>
                          <p className="font-medium">وثيقة مزاولة المهنة</p>
                          <p className="text-xs text-gray-500">{licenseDocument?.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {idPreview ? (
                          <img src={idPreview} alt="ID" className="w-16 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-16 bg-green-100 rounded flex items-center justify-center text-3xl">
                            🪪
                          </div>
                        )}
                        <div>
                          <p className="font-medium">صورة البطاقة الشخصية</p>
                          <p className="text-xs text-gray-500">{idDocument?.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      أقر بأن جميع البيانات المقدمة صحيحة، وأوافق على شروط وأحكام منصة المرشدين السياحيين
                    </span>
                  </label>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                    <FaGraduationCap />
                    بعد إرسال الطلب، سيتم مراجعته من قبل الإدارة خلال 24 ساعة. سيتم إشعارك بنتيجة الطلب عبر البريد الإلكتروني والإشعارات.
                  </p>
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    السابق
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !agreedToTerms}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      <>
                        <FaCheckCircle />
                        <span>إرسال طلب الترقية</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </form>

          {/* ملاحظات مهمة */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
              <span>ℹ️</span>
              ملاحظات مهمة
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>جميع الحقول المميزة بـ <span className="text-red-500">*</span> إلزامية</li>
              <li>سيتم التحقق من صحة البيانات مع الجهات المختصة</li>
              <li>بعد الموافقة، ستتمكن من إضافة برامج سياحية</li>
              <li>يمكنك متابعة حالة الطلب من صفحة الملف الشخصي</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeToGuidePage;

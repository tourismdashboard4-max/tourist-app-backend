// src/components/Auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { Input, Button, Spinner, Modal } from '../ui';
import AuthLayout from './AuthLayout';
import './ForgotPassword.css';
import { validateEmail } from './index.js';

function ForgotPassword({ 
  onResetRequest, 
  onResetPassword,
  isLoading = false 
}) {
  const [step, setStep] = useState(1); // 1: إدخال البريد، 2: إدخال الكود، 3: كلمة مرور جديدة
  const [formData, setFormData] = useState({
    email: '',
    resetCode: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // عناوين الخطوات
  const stepTitles = {
    1: {
      title: 'استعادة كلمة المرور',
      subtitle: 'أدخل بريدك الإلكتروني لإرسال رمز التحقق'
    },
    2: {
      title: 'تحقق من الرمز',
      subtitle: 'أدخل الرمز الذي وصل إلى بريدك'
    },
    3: {
      title: 'كلمة مرور جديدة',
      subtitle: 'اختر كلمة مرور جديدة لحسابك'
    }
  };

  // العد التنازلي لإعادة الإرسال
  React.useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const validateStep = (currentStep) => {
    const newErrors = {};
    
    if (currentStep === 1) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.valid) {
        newErrors.email = emailValidation.message;
      }
    }
    
    if (currentStep === 2) {
      if (!formData.resetCode.trim()) {
        newErrors.resetCode = 'رمز التحقق مطلوب';
      } else if (!/^\d{6}$/.test(formData.resetCode)) {
        newErrors.resetCode = 'الرمز يجب أن يكون 6 أرقام';
      }
    }
    
    if (currentStep === 3) {
      if (!formData.newPassword.trim()) {
        newErrors.newPassword = 'كلمة المرور الجديدة مطلوبة';
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين';
      }
    }
    
    return newErrors;
  };

  const handleNextStep = async () => {
    const currentStep = step;
    const newErrors = validateStep(currentStep);
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    
    try {
      if (currentStep === 1) {
        // إرسال طلب استعادة
        if (onResetRequest) {
          await onResetRequest(formData.email);
          setCountdown(60); // 60 ثانية قبل إعادة الإرسال
        }
        setStep(2);
      } else if (currentStep === 2) {
        // التحقق من الرمز
        setStep(3);
      } else if (currentStep === 3) {
        // تغيير كلمة المرور
        if (onResetPassword) {
          await onResetPassword({
            email: formData.email,
            resetCode: formData.resetCode,
            newPassword: formData.newPassword
          });
          setShowSuccessModal(true);
        }
      }
    } catch (error) {
      setFormError(error.message || 'حدث خطأ. حاول مرة أخرى.');
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
      setFormError('');
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    try {
      if (onResetRequest) {
        await onResetRequest(formData.email);
        setCountdown(60);
        setFormError('');
      }
    } catch (error) {
      setFormError(error.message || 'فشل إعادة الإرسال');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // تقييد رمز التحقق للأرقام فقط
    let formattedValue = value;
    if (name === 'resetCode') {
      formattedValue = value.replace(/\D/g, '').slice(0, 6);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (formError) {
      setFormError('');
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setStep(1);
    setFormData({
      email: '',
      resetCode: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const renderStepIndicator = () => {
    const steps = ['البريد', 'التحقق', 'كلمة السر'];
    
    return (
      <div className="step-indicator">
        {steps.map((stepLabel, index) => (
          <div key={stepLabel} className="step-container">
            <div className={`step-circle ${index + 1 === step ? 'active' : ''} ${index + 1 < step ? 'completed' : ''}`}>
              {index + 1 < step ? '✓' : index + 1}
            </div>
            <span className="step-label">{stepLabel}</span>
            {index < steps.length - 1 && (
              <div className={`step-line ${index + 1 < step ? 'active' : ''}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="step-content">
            <div className="step-description">
              <p>أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك رمز تحقق.</p>
            </div>
            
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
              autoFocus
            />
            
            <div className="step-hint">
              <p>💡 تأكد من إدخال البريد الإلكتروني الصحيح.</p>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="step-content">
            <div className="step-description">
              <p>
                تم إرسال رمز تحقق مكون من 6 أرقام إلى 
                <strong> {formData.email}</strong>
              </p>
              <p className="email-note">تحقق من صندوق الوارد أو البريد العشوائي.</p>
            </div>
            
            <div className="code-input-container">
              <Input
                label="رمز التحقق"
                name="resetCode"
                value={formData.resetCode}
                onChange={handleChange}
                placeholder="123456"
                error={errors.resetCode}
                required
                icon={<span className="input-icon">🔢</span>}
                autoFocus
                maxLength={6}
                inputMode="numeric"
              />
              
              <div className="resend-container">
                <button
                  type="button"
                  className={`resend-btn ${countdown > 0 ? 'disabled' : ''}`}
                  onClick={handleResendCode}
                  disabled={countdown > 0 || isLoading}
                >
                  {countdown > 0 ? `إعادة الإرسال بعد ${countdown} ثانية` : 'إعادة إرسال الرمز'}
                </button>
              </div>
            </div>
            
            <div className="code-hint">
              <p>🔢 أدخل الرمز المكون من 6 أرقام الذي وصل إلى بريدك.</p>
              <p>⏱️ الرمز صالح لمدة 10 دقائق فقط.</p>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="step-content">
            <div className="step-description">
              <p>اختر كلمة مرور جديدة لحسابك.</p>
            </div>
            
            <Input
              label="كلمة المرور الجديدة"
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="كلمة مرور جديدة"
              error={errors.newPassword}
              required
              icon={<span className="input-icon">🔒</span>}
              autoFocus
            />
            
            <Input
              label="تأكيد كلمة المرور"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="أعد كتابة كلمة المرور"
              error={errors.confirmPassword}
              required
              icon={<span className="input-icon">✓</span>}
            />
            
            <div className="password-requirements">
              <p className="requirements-title">متطلبات كلمة المرور:</p>
              <ul>
                <li className={formData.newPassword.length >= 8 ? 'valid' : ''}>
                  ✓ 8 أحرف على الأقل
                </li>
                <li className={/[A-Z]/.test(formData.newPassword) ? 'valid' : ''}>
                  ✓ حرف كبير واحد على الأقل
                </li>
                <li className={/[a-z]/.test(formData.newPassword) ? 'valid' : ''}>
                  ✓ حرف صغير واحد على الأقل
                </li>
              </ul>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getButtonText = () => {
    switch (step) {
      case 1: return 'إرسال رمز التحقق';
      case 2: return 'تحقق من الرمز';
      case 3: return 'تغيير كلمة المرور';
      default: return 'متابعة';
    }
  };

  return (
    <>
      <AuthLayout
        title={stepTitles[step].title}
        subtitle={stepTitles[step].subtitle}
        type="user"
        loading={isLoading}
        error={formError}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="forgot-password-form">
          {/* مؤشر الخطوات */}
          {renderStepIndicator()}
          
          {/* محتوى الخطوة */}
          {renderStepContent()}
          
          {/* أزرار التنقل */}
          <div className="step-actions">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
                disabled={isLoading}
                className="back-btn"
              >
                ← رجوع
              </Button>
            )}
            
            <Button
              type="submit"
              variant="primary"
              fullWidth={step === 1}
              loading={isLoading}
              disabled={isLoading}
              className="next-btn"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" color="white" />
                  <span>جاري المعالجة...</span>
                </>
              ) : getButtonText()}
            </Button>
          </div>
          
          {/* روابط إضافية */}
          <div className="additional-links">
            <a href="/login" className="auth-link">
              ← العودة إلى تسجيل الدخول
            </a>
            <a href="/register" className="auth-link">
              إنشاء حساب جديد →
            </a>
          </div>
        </form>
      </AuthLayout>
      
      {/* نافذة النجاح */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        title="🎉 تم تغيير كلمة المرور بنجاح!"
        size="sm"
        closeOnOverlayClick={false}
      >
        <div className="success-modal-content">
          <div className="success-icon">✅</div>
          <p className="success-message">
            تم تغيير كلمة المرور لحسابك بنجاح.
          </p>
          <p className="success-instruction">
            يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
          </p>
          
          <div className="modal-actions">
            <Button
              variant="primary"
              onClick={handleCloseSuccessModal}
              fullWidth
            >
              تسجيل الدخول الآن
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default ForgotPassword;
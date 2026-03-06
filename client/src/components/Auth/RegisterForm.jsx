// src/components/Auth/RegisterForm.jsx
import React, { useState } from 'react';
import { Input, Button, Spinner, Modal } from '../ui';
import AuthLayout from './AuthLayout';
import './RegisterForm.css';
import { validateEmail, validatePassword, validatePhone, formatPhoneNumber } from './index.js';

function RegisterForm({ 
  onRegister, 
  isLoading = false, 
  userType = 'user' 
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    receiveNewsletter: true
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const getUserTypeInfo = () => {
    switch (userType) {
      case 'guide':
        return {
          title: 'تسجيل مرشد جديد',
          subtitle: 'انضم إلينا كمرشد سياحي معتمد',
          buttonText: 'سجل كمرشد',
          successMessage: 'تم تسجيل حساب المرشد بنجاح! سيتم مراجعة بياناتك خلال 24 ساعة.'
        };
      case 'admin':
        return {
          title: 'إنشاء حساب مدير',
          subtitle: 'منطقة إنشاء حسابات الإدارة',
          buttonText: 'إنشاء حساب مدير',
          successMessage: 'تم إنشاء حساب المدير بنجاح'
        };
      default:
        return {
          title: 'إنشاء حساب جديد',
          subtitle: 'انضم إلينا واستمتع بجميع المزايا',
          buttonText: 'إنشاء حساب',
          successMessage: 'تم إنشاء حسابك بنجاح! تحقق من بريدك لتفعيل الحساب.'
        };
    }
  };

  const typeInfo = getUserTypeInfo();

  const validateForm = () => {
    const newErrors = {};

    // التحقق من الاسم الكامل
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'الاسم الكامل مطلوب';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'الاسم يجب أن يكون 3 أحرف على الأقل';
    }

    // التحقق من البريد الإلكتروني
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.message;
    }

    // التحقق من الهاتف
    if (formData.phone) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        newErrors.phone = phoneValidation.message;
      }
    }

    // التحقق من كلمة المرور
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message;
    }

    // التحقق من تأكيد كلمة المرور
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }

    // التحقق من الموافقة على الشروط
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'يجب الموافقة على الشروط والأحكام';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // تنسيق رقم الهاتف
      const formattedData = {
        ...formData,
        phone: formData.phone ? formatPhoneNumber(formData.phone) : '',
        userType
      };

      if (onRegister) {
        await onRegister(formattedData);
        setShowSuccessModal(true);
      }
    } catch (error) {
      setFormError(error.message || 'حدث خطأ أثناء التسجيل. حاول مرة أخرى.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // تنسيق رقم الهاتف أثناء الكتابة
    let formattedValue = value;
    if (name === 'phone') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length > 0) {
        if (formattedValue.startsWith('0')) {
          formattedValue = formattedValue.substring(1);
        }
        if (formattedValue.length > 9) {
          formattedValue = formattedValue.substring(0, 9);
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : formattedValue
    }));

    // مسح الخطأ عند التعديل
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (formError) {
      setFormError('');
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // إعادة تعيين النموذج
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
      receiveNewsletter: true
    });
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '#e5e7eb' };
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    const strengthInfo = [
      { label: 'ضعيفة جداً', color: '#ef4444' },
      { label: 'ضعيفة', color: '#f97316' },
      { label: 'متوسطة', color: '#eab308' },
      { label: 'جيدة', color: '#84cc16' },
      { label: 'قوية', color: '#22c55e' },
      { label: 'قوية جداً', color: '#16a34a' }
    ];

    return strengthInfo[strength] || strengthInfo[0];
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <>
      <AuthLayout 
        title={typeInfo.title}
        subtitle={typeInfo.subtitle}
        type={userType}
        loading={isLoading}
        error={formError}
      >
        <form onSubmit={handleSubmit} className="register-form">
          {/* المعلومات الشخصية */}
          <div className="form-section">
            <h3 className="section-title">المعلومات الشخصية</h3>
            
            <Input
              label="الاسم الكامل"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="أحمد محمد علي"
              error={errors.fullName}
              required
              icon={<span className="input-icon">👤</span>}
              helperText="اكتب اسمك كما يظهر في الوثائق الرسمية"
            />

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
              label="رقم الهاتف"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="5XXXXXXXX"
              error={errors.phone}
              icon={<span className="input-icon">📱</span>}
              helperText="اختياري - مثال: 512345678"
            />
          </div>

          {/* كلمة المرور */}
          <div className="form-section">
            <h3 className="section-title">كلمة المرور</h3>
            
            <Input
              label="كلمة المرور"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="أنشئ كلمة مرور قوية"
              error={errors.password}
              required
              icon={<span className="input-icon">🔒</span>}
            />

            {/* مؤشر قوة كلمة المرور */}
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{ 
                      width: `${(passwordStrength.strength / 5) * 100}%`,
                      backgroundColor: passwordStrength.color 
                    }}
                  />
                </div>
                <span 
                  className="strength-label"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.label}
                </span>
              </div>
            )}

            <div className="password-requirements">
              <p className="requirements-title">متطلبات كلمة المرور:</p>
              <ul className="requirements-list">
                <li className={formData.password.length >= 8 ? 'valid' : ''}>
                  ✓ 8 أحرف على الأقل
                </li>
                <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>
                  ✓ حرف كبير واحد على الأقل
                </li>
                <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>
                  ✓ حرف صغير واحد على الأقل
                </li>
                <li className={/\d/.test(formData.password) ? 'valid' : ''}>
                  ✓ رقم واحد على الأقل
                </li>
              </ul>
            </div>

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
          </div>

          {/* الشروط والتفضيلات */}
          <div className="form-section">
            <h3 className="section-title">الشروط والتفضيلات</h3>
            
            <div className="checkbox-group">
              <label className={`checkbox-label ${errors.agreeToTerms ? 'error' : ''}`}>
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <span>
                  أوافق على <a href="/terms" target="_blank" rel="noopener noreferrer">الشروط والأحكام</a> و <a href="/privacy" target="_blank" rel="noopener noreferrer">سياسة الخصوصية</a>
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="checkbox-error">{errors.agreeToTerms}</p>
              )}
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="receiveNewsletter"
                  checked={formData.receiveNewsletter}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <span>
                  أرغب في استلام النشرة البريدية والعروض الخاصة
                </span>
              </label>
            </div>
          </div>

          {/* حماية من البوتات */}
          <div className="form-section">
            <div className="captcha-container">
              <p>هل أنت إنسان؟</p>
              <label className="captcha-checkbox">
                <input type="checkbox" required />
                <span>نعم، أنا لست روبوت</span>
              </label>
            </div>
          </div>

          {/* زر التسجيل */}
          <Button
            type="submit"
            variant={userType === 'guide' ? 'success' : 'primary'}
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={isLoading}
            className="register-btn"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" color="white" />
                <span>جاري إنشاء الحساب...</span>
              </>
            ) : typeInfo.buttonText}
          </Button>

          {/* روابط التنقل */}
          <div className="auth-switch">
            <p className="switch-text">
              لديك حساب بالفعل؟ 
              <a href="/login" className="switch-link"> سجل الدخول</a>
            </p>
            
            {userType === 'user' && (
              <a href="/guide/register" className="switch-link guide-link">
                ← التسجيل كمرشد سياحي
              </a>
            )}
            
            {userType === 'guide' && (
              <a href="/register" className="switch-link user-link">
                ← التسجيل كمستخدم عادي
              </a>
            )}
          </div>
        </form>
      </AuthLayout>

      {/* نافذة نجاح التسجيل */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        title="🎉 تم التسجيل بنجاح!"
        size="md"
        showCloseButton={false}
      >
        <div className="success-modal">
          <div className="success-icon">✅</div>
          <p className="success-message">{typeInfo.successMessage}</p>
          
          <div className="next-steps">
            <h4>الخطوات التالية:</h4>
            <ol>
              <li>تحقق من بريدك الإلكتروني لتفعيل الحساب</li>
              <li>أكمل ملفك الشخصي</li>
              <li>ابدأ استخدام التطبيق</li>
            </ol>
          </div>

          <div className="modal-actions">
            <Button
              variant="primary"
              onClick={handleCloseSuccessModal}
              fullWidth
            >
              تم، فهمت
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default RegisterForm;
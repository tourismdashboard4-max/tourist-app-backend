// ============================================
// LoginPage.jsx - نظام تسجيل الدخول بالبريد الإلكتروني فقط
// نسخة معدلة - تم إصلاح مشكلة تعدد الرموز
// ============================================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Key, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const LoginPage = ({ lang = 'ar', onLoginSuccess }) => {
  // ============================================
  // States
  // ============================================
  const [mode, setMode] = useState('login'); // login, register, forgot
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: userInfo (للتسجيل فقط)
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [userData, setUserData] = useState({
    fullName: '',
    password: '',
    confirmPassword: ''
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  // متغير لتتبع الرمز الحالي الصالح (اختياري)
  const [currentValidOTP, setCurrentValidOTP] = useState('');

  // ============================================
  // Validation Functions
  // ============================================
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateOTP = (code) => {
    return /^\d{6}$/.test(code);
  };

  const validatePassword = (password) => {
    if (password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    if (password.length > 14) return 'كلمة المرور يجب أن لا تتجاوز 14 حرف';
    return '';
  };

  const validateName = (name) => {
    if (!name) return 'الاسم مطلوب';
    if (name.length < 3) return 'الاسم يجب أن يكون 3 أحرف على الأقل';
    return '';
  };

  // ============================================
  // Handlers
  // ============================================
  const handleSendOTP = async () => {
    setErrors({});
    
    if (!email) {
      setErrors({ email: lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required' });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email address' });
      return;
    }

    setLoading(true);
    try {
      console.log('📧 Sending OTP to email:', email);
      const response = await api.sendOTP(email);
      
      setOtpSent(true);
      setStep(2);
      
      setSuccess(lang === 'ar' ? 'تم إرسال رمز التحقق إلى بريدك' : 'Verification code sent to your email');
      
      // Timer 60 seconds
      setTimer(60);
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setErrors({});

    if (!validateOTP(otp)) {
      setErrors({ otp: lang === 'ar' ? 'رمز التحقق يجب أن يكون 6 أرقام' : 'OTP must be 6 digits' });
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Verifying OTP with data:', { email, otp });
      
      const response = await api.verifyOTP(email, otp);
      
      console.log('📥 Verify response:', response);
      
      if (response.success) {
        if (mode === 'forgot') {
          // ✅ في وضع نسيت كلمة المرور، ننتقل مباشرة لخطوة تغيير كلمة المرور
          setStep(3);
          setSuccess(lang === 'ar' ? 'تم التحقق، أدخل كلمة المرور الجديدة' : 'Verified, enter new password');
        } else if (response.isNewUser) {
          // ✅ مستخدم جديد في وضع التسجيل - انتقل لخطوة إدخال البيانات
          setStep(3);
          setSuccess(lang === 'ar' ? 'تم التحقق، أكمل بياناتك' : 'Verified, complete your info');
        } else {
          // ✅ مستخدم موجود - سجل دخوله مباشرة
          if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user)); // حفظ بيانات المستخدم
          }
          onLoginSuccess(response);
        }
      } else {
        setErrors({ otp: response.message || 'رمز التحقق غير صحيح' });
      }
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      setErrors({ otp: error.message || 'حدث خطأ في التحقق' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const newErrors = {};

    const nameError = validateName(userData.fullName);
    if (nameError) newErrors.fullName = nameError;

    const passwordError = validatePassword(userData.password);
    if (passwordError) newErrors.password = passwordError;

    if (userData.password !== userData.confirmPassword) {
      newErrors.confirmPassword = lang === 'ar' ? 'كلمة المرور غير متطابقة' : 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Registering with data:', { email, fullName: userData.fullName });
      
      const response = await api.register(email, userData.fullName, userData.password);
      
      if (response.success) {
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user)); // حفظ بيانات المستخدم
        }
        onLoginSuccess(response);
      }
    } catch (error) {
      console.error('❌ Register error:', error);
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const passwordError = validatePassword(userData.password);
    if (passwordError) {
      setErrors({ password: passwordError });
      return;
    }
    
    if (userData.password !== userData.confirmPassword) {
      setErrors({ confirmPassword: lang === 'ar' ? 'كلمة المرور غير متطابقة' : 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Resetting password for:', email);
      console.log('🔑 Using OTP:', otp);
      
      const response = await api.resetPassword(email, otp, userData.password);
      
      console.log('📥 Reset password response:', response);
      
      if (response.success) {
        setSuccess(lang === 'ar' ? '✅ تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
        
        // العودة إلى صفحة تسجيل الدخول بعد ثانيتين
        setTimeout(() => {
          setMode('login');
          setStep(1);
          setEmail('');
          setOtp('');
          setUserData({ fullName: '', password: '', confirmPassword: '' });
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Reset password error:', error);
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setErrors({});

    if (!loginEmail || !loginPassword) {
      setErrors({ 
        loginEmail: !loginEmail ? (lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email required') : '',
        loginPassword: !loginPassword ? (lang === 'ar' ? 'كلمة المرور مطلوبة' : 'Password required') : ''
      });
      return;
    }

    if (!validateEmail(loginEmail)) {
      setErrors({ loginEmail: lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email address' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.login(loginEmail, loginPassword);
      if (response.success) {
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user)); // حفظ بيانات المستخدم
        }
        onLoginSuccess(response);
      }
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // هذه الدالة الآن مخصصة فقط لخطوة إدخال البريد الإلكتروني (step 1)
    if (step !== 1) return;

    if (!email) {
      setErrors({ email: lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required' });
      return;
    }
    if (!validateEmail(email)) {
      setErrors({ email: lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email address' });
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Sending forgot password request for:', email);
      const response = await api.forgotPassword(email);
      
      if (response.success) {
        setStep(2);
        setSuccess(lang === 'ar' ? 'تم إرسال رمز التحقق إلى بريدك' : 'Verification code sent');
        
        setTimer(60);
        const interval = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  // دالة منفصلة لإعادة إرسال رمز التحقق (لمنع تعدد الرموز)
  const handleResendOTP = async () => {
    if (timer > 0) return;

    setLoading(true);
    try {
      if (mode === 'forgot') {
        console.log('🔄 Resending forgot password OTP for:', email);
        const response = await api.forgotPassword(email);
        if (response.success) {
          setSuccess(lang === 'ar' ? 'تم إرسال رمز جديد' : 'New code sent');
          setTimer(60);
          const interval = setInterval(() => {
            setTimer((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        await handleSendOTP();
      }
    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Render Functions
  // ============================================
  const renderLoginForm = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-5"
    >
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center mb-6">
        {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
      </h2>

      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
          </label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="example@email.com"
              className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                errors.loginEmail ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
          </div>
          {errors.loginEmail && <p className="mt-1 text-xs text-red-500">{errors.loginEmail}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {lang === 'ar' ? 'كلمة المرور' : 'Password'}
          </label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
                errors.loginPassword ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
          </div>
          {errors.loginPassword && <p className="mt-1 text-xs text-red-500">{errors.loginPassword}</p>}
        </div>

        {/* Error Message */}
        {errors.general && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{errors.general}</p>
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleEmailLogin}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? (
            <>
              <span className="animate-spin">🌀</span>
              <span>{lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging in...'}</span>
            </>
          ) : (
            <>
              <Key size={20} />
              <span>{lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</span>
            </>
          )}
        </button>

        {/* Forgot Password Link */}
        <div className="text-center">
          <button
            onClick={() => {
              setMode('forgot');
              setStep(1);
              setEmail('');
              setOtp('');
              setErrors({});
            }}
            className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
          >
            {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
          </button>
        </div>

        {/* New User Register Link */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
              {lang === 'ar' ? 'ليس لديك حساب؟' : 'New user?'}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setMode('register');
            setStep(1);
            setEmail('');
            setOtp('');
            setErrors({});
          }}
          className="w-full py-3 border-2 border-green-600 text-green-600 rounded-xl font-bold hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30 transition-all flex items-center justify-center gap-2"
        >
          <User size={20} />
          <span>{lang === 'ar' ? 'مستخدم جديد' : 'Create account'}</span>
        </button>
      </div>
    </motion.div>
  );

  // دالة منفصلة لخطوة إدخال البريد في وضع "نسيت كلمة المرور"
  const renderForgotEmailStep = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {lang === 'ar' ? 'نسيت كلمة المرور' : 'Forgot Password'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {lang === 'ar' ? 'أدخل بريدك الإلكتروني لاستعادة كلمة المرور' : 'Enter your email to reset password'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
        </label>
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
      </div>

      <button
        onClick={handleForgotPassword}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? (
          <span className="animate-spin">🌀</span>
        ) : (
          <ArrowRight size={20} />
        )}
        <span>{lang === 'ar' ? 'استمرار' : 'Continue'}</span>
      </button>
    </div>
  );

  // دالة منفصلة لخطوة إدخال كلمة المرور الجديدة في وضع "نسيت كلمة المرور"
  const renderNewPasswordStep = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {lang === 'ar' ? 'كلمة مرور جديدة' : 'New Password'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {lang === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter your new password'}
        </p>
      </div>

      {/* New Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
        </label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="password"
            value={userData.password}
            onChange={(e) => setUserData({ ...userData, password: e.target.value })}
            placeholder="••••••••"
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
        </label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="password"
            value={userData.confirmPassword}
            onChange={(e) => setUserData({ ...userData, confirmPassword: e.target.value })}
            placeholder="••••••••"
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
      </div>

      <button
        onClick={handleResetPassword}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? (
          <span className="animate-spin">🌀</span>
        ) : (
          <CheckCircle size={20} />
        )}
        <span>{lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
      </button>
    </div>
  );

  const renderEmailStep = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {lang === 'ar' ? 'أهلاً بك في تطبيق السائح' : 'Welcome to Tourist App'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {lang === 'ar' ? 'أدخل بريدك الإلكتروني للبدء' : 'Enter your email to start'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
        </label>
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
      </div>

      <button
        onClick={mode === 'forgot' ? handleForgotPassword : handleSendOTP}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? (
          <span className="animate-spin">🌀</span>
        ) : (
          <ArrowRight size={20} />
        )}
        <span>{lang === 'ar' ? 'استمرار' : 'Continue'}</span>
      </button>
    </div>
  );

  const renderOTPStep = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {lang === 'ar' ? 'رمز التحقق' : 'Verification Code'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {lang === 'ar' 
            ? `تم إرسال رمز التحقق إلى ${email}`
            : `Verification code sent to ${email}`}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {lang === 'ar' ? 'أدخل رمز التحقق' : 'Enter verification code'}
        </label>
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength="6"
          className={`w-full p-3 text-center text-2xl tracking-widest border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
            errors.otp ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
          }`}
        />
        {errors.otp && <p className="mt-1 text-xs text-red-500">{errors.otp}</p>}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(1)}
          className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400"
        >
          {lang === 'ar' ? 'تغيير البريد' : 'Change email'}
        </button>
        <button
          onClick={handleResendOTP}
          disabled={timer > 0 || loading}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 disabled:opacity-50"
        >
          {timer > 0 
            ? lang === 'ar' ? `إعادة الإرسال بعد ${timer} ثانية` : `Resend in ${timer}s`
            : lang === 'ar' ? 'إعادة إرسال' : 'Resend'}
        </button>
      </div>

      <button
        onClick={handleVerifyOTP}
        disabled={loading || otp.length !== 6}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? (
          <span className="animate-spin">🌀</span>
        ) : (
          <CheckCircle size={20} />
        )}
        <span>{lang === 'ar' ? 'تحقق' : 'Verify'}</span>
      </button>
    </div>
  );

  const renderUserInfoStep = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {lang === 'ar' ? 'أكمل بياناتك' : 'Complete your info'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {lang === 'ar' ? 'أدخل اسمك وكلمة المرور' : 'Enter your name and password'}
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
        </label>
        <div className="relative">
          <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={userData.fullName}
            onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
            placeholder={lang === 'ar' ? 'الاسم الثنائي أو الثلاثي' : 'Your name'}
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.fullName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {lang === 'ar' ? 'كلمة المرور' : 'Password'}
        </label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="password"
            value={userData.password}
            onChange={(e) => setUserData({ ...userData, password: e.target.value })}
            placeholder="••••••••"
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
        </label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="password"
            value={userData.confirmPassword}
            onChange={(e) => setUserData({ ...userData, confirmPassword: e.target.value })}
            placeholder="••••••••"
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
      </div>

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? (
          <span className="animate-spin">🌀</span>
        ) : (
          <CheckCircle size={20} />
        )}
        <span>{lang === 'ar' ? 'تسجيل' : 'Register'}</span>
      </button>
    </div>
  );

  const renderForgotPassword = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setMode('login')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          {lang === 'ar' ? 'نسيت كلمة المرور' : 'Forgot Password'}
        </h2>
      </div>

      {step === 1 && renderForgotEmailStep()}
      {step === 2 && renderOTPStep()}
      {step === 3 && renderNewPasswordStep()}
    </motion.div>
  );

  // ============================================
  // Main Render
  // ============================================
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <AnimatePresence mode="wait">
            {mode === 'login' && renderLoginForm()}
            {mode === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {step === 1 && renderEmailStep()}
                {step === 2 && renderOTPStep()}
                {step === 3 && renderUserInfoStep()}
              </motion.div>
            )}
            {mode === 'forgot' && renderForgotPassword()}
          </AnimatePresence>

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <p className="text-sm text-green-600 dark:text-green-400 text-center flex items-center justify-center gap-2">
                <CheckCircle size={16} />
                {success}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
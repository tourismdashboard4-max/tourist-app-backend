// client/src/pages/LoginPage.jsx — النسخة النهائية المُصلحة (v2)
// ✅ إصلاح mismatch في purpose: تجربة عدة قيم (reset-password / forgot-password / reset)
// ✅ تخزين reset_token من verify-otp وإرساله في reset-password
// ✅ تنظيف timer عند unmount (useRef + useEffect)
// ✅ null checks على الردود
// ✅ رسائل خطأ تُميّز EXPIRED من INVALID من USED
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Key, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const LoginPage = ({ lang = 'ar', onLoginSuccess }) => {
  // ============================================
  // States
  // ============================================
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [userData, setUserData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');

  const timerRef = useRef(null);

  // ============================================
  // Cleanup timer on unmount
  // ============================================
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // ============================================
  // Validation
  // ============================================
  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validateOTP = (code) => /^\d{6}$/.test(code);

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
  // Timer Helper
  // ============================================
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ============================================
  // Helpers
  // ============================================
  const resetMessages = () => {
    setErrors({});
    setSuccess('');
    setWarning('');
  };

  const messageFromError = (err) => {
    // attempts to extract a clear message from API error
    const code = err?.error_code || err?.response?.data?.error_code;
    const map = {
      OTP_EXPIRED: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.',
      OTP_ALREADY_USED: 'تم استخدام هذا الرمز مسبقاً. اطلب رمزاً جديداً.',
      OTP_INVALID_CODE: 'رمز التحقق غير صحيح. تأكد من نسخه كاملاً.',
      OTP_NOT_FOUND: 'لا يوجد رمز تحقق لهذا البريد. اطلب رمزاً جديداً.',
      OTP_INVALID: 'رمز التحقق غير صالح.',
    };
    return map[code] || err?.message || 'حدث خطأ غير متوقع';
  };

  // ============================================
  // Handlers
  // ============================================
  const handleSendOTP = async () => {
    resetMessages();

    if (!email) {
      setErrors({ email: 'البريد الإلكتروني مطلوب' });
      return;
    }
    if (!validateEmail(email)) {
      setErrors({ email: 'البريد الإلكتروني غير صحيح' });
      return;
    }

    setLoading(true);
    try {
      console.log('📧 [REGISTER] Sending OTP to:', email);
      const response = await api.sendOTP(email, 'register');

      setOtpSent(true);
      setStep(2);

      if (response?.emailSent === false) {
        setWarning('⚠️ تعذر إرسال البريد. اطلب الرمز من الدعم (Render Logs)');
      } else {
        setSuccess('تم إرسال رمز التحقق إلى بريدك');
      }

      startTimer();
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      setErrors({ general: messageFromError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    resetMessages();

    if (!validateOTP(otp)) {
      setErrors({ otp: 'رمز التحقق يجب أن يكون 6 أرقام' });
      return;
    }

    setLoading(true);
    try {
      // ✅ نجرّب عدة purposes محتملة (الباك اند قد يستخدم أياً منها)
      const storedPurpose = (() => {
        try {
          return localStorage.getItem('otp_purpose');
        } catch {
          return null;
        }
      })();

      const purposesToTry = mode === 'forgot'
        ? [
            storedPurpose,
            'reset-password',
            'forgot-password',
            'reset',
          ].filter(Boolean)
        : ['register'];

      // إزالة التكرار
      const uniquePurposes = [...new Set(purposesToTry)];

      let response = null;
      let lastError = null;

      for (const purpose of uniquePurposes) {
        try {
          console.log('📤 [VERIFY] trying purpose:', purpose, '| code:', otp);
          response = await api.verifyOTP(email, otp, purpose);
          console.log('📥 [VERIFY] response:', response);
          if (response && response.success) break;
          lastError = new Error(response?.message || 'فشل التحقق');

          // إذا الخطأ واضح (ليس mismatch purpose) — لا داعي للمحاولة
          const code = response?.error_code;
          if (
            code === 'OTP_EXPIRED' ||
            code === 'OTP_ALREADY_USED' ||
            code === 'OTP_INVALID_CODE'
          ) {
            break;
          }
        } catch (err) {
          console.warn(`[VERIFY] purpose "${purpose}" failed:`, err.message);
          lastError = err;
        }
      }

      if (response && response.success) {
        // ✅ حفظ reset_token إن وُجد (يُستخدم في reset-password)
        const token = response.reset_token || response.resetToken;
        try {
          if (token) {
            localStorage.setItem('reset_token', token);
          }
          if (response.purpose) {
            localStorage.setItem('otp_purpose', response.purpose);
          }
        } catch {}

        if (mode === 'forgot') {
          setStep(3);
          setSuccess('تم التحقق، أدخل كلمة المرور الجديدة');
        } else if (response.isNewUser) {
          setStep(3);
          setSuccess('تم التحقق، أكمل بياناتك');
        } else {
          // مستخدم موجود → سجّل الدخول مباشرة
          if (response.token) {
            try { localStorage.setItem('token', response.token); } catch {}
          }
          if (response.user) {
            try { localStorage.setItem('user', JSON.stringify(response.user)); } catch {}
          }
          onLoginSuccess(response);
        }
      } else {
        setErrors({ otp: messageFromError(lastError) });
      }
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      setErrors({ otp: messageFromError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    resetMessages();
    const newErrors = {};

    const nameError = validateName(userData.fullName);
    if (nameError) newErrors.fullName = nameError;

    const passwordError = validatePassword(userData.password);
    if (passwordError) newErrors.password = passwordError;

    if (userData.password !== userData.confirmPassword) {
      newErrors.confirmPassword = 'كلمة المرور غير متطابقة';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.register(email, userData.fullName, userData.password);
      if (response && response.success) {
        if (response.token) {
          try { localStorage.setItem('token', response.token); } catch {}
        }
        if (response.user) {
          try { localStorage.setItem('user', JSON.stringify(response.user)); } catch {}
        }
        onLoginSuccess(response);
      } else {
        setErrors({ general: response?.message || 'فشل التسجيل' });
      }
    } catch (error) {
      console.error('❌ Register error:', error);
      setErrors({ general: messageFromError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    resetMessages();
    const passwordError = validatePassword(userData.password);
    if (passwordError) {
      setErrors({ password: passwordError });
      return;
    }

    if (userData.password !== userData.confirmPassword) {
      setErrors({ confirmPassword: 'كلمة المرور غير متطابقة' });
      return;
    }

    setLoading(true);
    try {
      let resetToken = null;
      try { resetToken = localStorage.getItem('reset_token'); } catch {}

      console.log('📤 [RESET] Resetting password for:', email, '| has_token:', !!resetToken);

      // ✅ نمرر reset_token إن وُجد — وإلا نرسل الطريقة القديمة
      const response = resetToken
        ? await api.resetPassword(email, otp, userData.password, resetToken)
        : await api.resetPassword(email, otp, userData.password);

      if (response && response.success) {
        try {
          localStorage.removeItem('reset_token');
          localStorage.removeItem('otp_purpose');
        } catch {}
        setSuccess('✅ تم تغيير كلمة المرور بنجاح');
        setTimeout(() => {
          setMode('login');
          setStep(1);
          setLoginEmail(email); // نملأ بريد الدخول تلقائياً
          setEmail('');
          setOtp('');
          setUserData({ fullName: '', password: '', confirmPassword: '' });
          setSuccess('');
        }, 2000);
      } else {
        setErrors({ general: response?.message || 'فشل تغيير كلمة المرور' });
      }
    } catch (error) {
      console.error('❌ Reset password error:', error);
      setErrors({ general: messageFromError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    resetMessages();

    if (!loginEmail || !loginPassword) {
      setErrors({
        loginEmail: !loginEmail ? 'البريد الإلكتروني مطلوب' : '',
        loginPassword: !loginPassword ? 'كلمة المرور مطلوبة' : '',
      });
      return;
    }

    if (!validateEmail(loginEmail)) {
      setErrors({ loginEmail: 'البريد الإلكتروني غير صحيح' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.login(loginEmail, loginPassword);
      if (response && response.success) {
        if (response.token) {
          try { localStorage.setItem('token', response.token); } catch {}
        }
        if (response.user) {
          try { localStorage.setItem('user', JSON.stringify(response.user)); } catch {}
        }
        onLoginSuccess(response);
      } else {
        setErrors({ general: response?.message || 'فشل تسجيل الدخول' });
      }
    } catch (error) {
      const errorMsg = error.message || 'فشل تسجيل الدخول';
      if (errorMsg.includes('لا يملك كلمة مرور')) {
        setErrors({
          general:
            'هذا الحساب لا يملك كلمة مرور. استخدم "نسيت كلمة المرور" لتعيين كلمة مرور جديدة.',
        });
      } else {
        setErrors({ general: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ forgot-password — يستدعي /api/auth/forgot-password مباشرة
  const handleForgotPassword = async () => {
    if (step !== 1) return;
    resetMessages();

    if (!email) {
      setErrors({ email: 'البريد الإلكتروني مطلوب' });
      return;
    }
    if (!validateEmail(email)) {
      setErrors({ email: 'البريد الإلكتروني غير صحيح' });
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 [FORGOT] Requesting password reset for:', email);

      const response = await api.forgotPassword(email);
      console.log('📥 [FORGOT] response:', response);

      if (response && response.success) {
        // ✅ إذا أعاد الباك اند purpose محدداً — نحفظه للاستخدام في verify
        try {
          if (response.purpose) {
            localStorage.setItem('otp_purpose', response.purpose);
          }
        } catch {}

        setStep(2);

        if (response.emailSent === false) {
          setWarning('⚠️ تعذر إرسال البريد. اطلب الرمز من الدعم (Render Logs).');
        } else {
          setSuccess('تم إرسال رمز التحقق إلى بريدك');
        }

        startTimer();
      } else {
        setErrors({ general: response?.message || 'تعذر إرسال رمز التحقق' });
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      setErrors({ general: messageFromError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0 || loading) return;
    resetMessages();

    setLoading(true);
    try {
      if (mode === 'forgot') {
        console.log('🔄 [RESEND FORGOT] for:', email);
        const response = await api.forgotPassword(email);

        if (response && response.success) {
          try {
            if (response.purpose) {
              localStorage.setItem('otp_purpose', response.purpose);
            }
          } catch {}

          if (response.emailSent === false) {
            setWarning('⚠️ تعذر إرسال البريد. اطلب الرمز من Render Logs.');
          } else {
            setSuccess('تم إرسال رمز جديد');
          }
          startTimer();
        }
      } else {
        await handleSendOTP();
      }
    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      setErrors({ general: messageFromError(error) });
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
        تسجيل الدخول
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            البريد الإلكتروني
          </label>
          <div className="relative">
            <Mail
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
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
          {errors.loginEmail && (
            <p className="mt-1 text-xs text-red-500">{errors.loginEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            كلمة المرور
          </label>
          <div className="relative">
            <Lock
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
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
          {errors.loginPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.loginPassword}</p>
          )}
        </div>

        {errors.general && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {errors.general}
            </p>
          </div>
        )}

        <button
          onClick={handleEmailLogin}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? (
            <>
              <span className="animate-spin">🌀</span>
              <span>جاري تسجيل الدخول...</span>
            </>
          ) : (
            <>
              <Key size={20} />
              <span>تسجيل الدخول</span>
            </>
          )}
        </button>

        <div className="text-center">
          <button
            onClick={() => {
              resetMessages();
              setMode('forgot');
              setStep(1);
              setEmail('');
              setOtp('');
            }}
            className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
          >
            نسيت كلمة المرور؟
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
              ليس لديك حساب؟
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            resetMessages();
            setMode('register');
            setStep(1);
            setEmail('');
            setOtp('');
          }}
          className="w-full py-3 border-2 border-green-600 text-green-600 rounded-xl font-bold hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30 transition-all flex items-center justify-center gap-2"
        >
          <User size={20} />
          <span>مستخدم جديد</span>
        </button>
      </div>
    </motion.div>
  );

  const renderForgotEmailStep = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          نسيت كلمة المرور
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          أدخل بريدك الإلكتروني لاستعادة كلمة المرور
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          البريد الإلكتروني
        </label>
        <div className="relative">
          <Mail
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
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

      {errors.general && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            {errors.general}
          </p>
        </div>
      )}

      <button
        onClick={handleForgotPassword}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? <span className="animate-spin">🌀</span> : <ArrowRight size={20} />}
        <span>استمرار</span>
      </button>
    </div>
  );

  const renderNewPasswordStep = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          كلمة مرور جديدة
        </h2>
        <p className="text-gray-600 dark:text-gray-400">أدخل كلمة المرور الجديدة</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          كلمة المرور الجديدة
        </label>
        <div className="relative">
          <Lock
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
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
        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          تأكيد كلمة المرور
        </label>
        <div className="relative">
          <Lock
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="password"
            value={userData.confirmPassword}
            onChange={(e) =>
              setUserData({ ...userData, confirmPassword: e.target.value })
            }
            placeholder="••••••••"
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      {errors.general && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            {errors.general}
          </p>
        </div>
      )}

      <button
        onClick={handleResetPassword}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? <span className="animate-spin">🌀</span> : <CheckCircle size={20} />}
        <span>تغيير كلمة المرور</span>
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
          أهلاً بك في تطبيق السائح
        </h2>
        <p className="text-gray-600 dark:text-gray-400">أدخل بريدك الإلكتروني للبدء</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          البريد الإلكتروني
        </label>
        <div className="relative">
          <Mail
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
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

      {errors.general && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            {errors.general}
          </p>
        </div>
      )}

      <button
        onClick={handleSendOTP}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? <span className="animate-spin">🌀</span> : <ArrowRight size={20} />}
        <span>استمرار</span>
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
          رمز التحقق
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          تم إرسال رمز التحقق إلى {email}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          أدخل رمز التحقق
        </label>
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength="6"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`w-full p-3 text-center text-2xl tracking-widest border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
            errors.otp ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
          }`}
        />
        {errors.otp && <p className="mt-1 text-xs text-red-500">{errors.otp}</p>}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            // ✅ تصفير OTP والأخطاء عند تغيير البريد
            setStep(1);
            setOtp('');
            setErrors({});
            setWarning('');
            setSuccess('');
          }}
          className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400"
        >
          تغيير البريد
        </button>
        <button
          onClick={handleResendOTP}
          disabled={timer > 0 || loading}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 disabled:opacity-50"
        >
          {timer > 0 ? `إعادة الإرسال بعد ${timer} ثانية` : 'إعادة إرسال'}
        </button>
      </div>

      <button
        onClick={handleVerifyOTP}
        disabled={loading || otp.length !== 6}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? <span className="animate-spin">🌀</span> : <CheckCircle size={20} />}
        <span>تحقق</span>
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
          أكمل بياناتك
        </h2>
        <p className="text-gray-600 dark:text-gray-400">أدخل اسمك وكلمة المرور</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          الاسم الكامل
        </label>
        <div className="relative">
          <User
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={userData.fullName}
            onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
            placeholder="الاسم الثنائي أو الثلاثي"
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.fullName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.fullName && (
          <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          كلمة المرور
        </label>
        <div className="relative">
          <Lock
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
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
        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          تأكيد كلمة المرور
        </label>
        <div className="relative">
          <Lock
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="password"
            value={userData.confirmPassword}
            onChange={(e) =>
              setUserData({ ...userData, confirmPassword: e.target.value })
            }
            placeholder="••••••••"
            className={`w-full p-3 pr-10 border-2 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        {loading ? <span className="animate-spin">🌀</span> : <CheckCircle size={20} />}
        <span>تسجيل</span>
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
          onClick={() => {
            resetMessages();
            setMode('login');
            setStep(1);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          نسيت كلمة المرور
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

          {/* Warning Message (email failed) */}
          {warning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
            >
              <p className="text-sm text-amber-700 dark:text-amber-400 text-center flex items-center justify-center gap-2">
                <AlertCircle size={16} />
                {warning}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

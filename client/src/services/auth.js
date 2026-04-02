// client/src/services/auth.js

// ============================================
// خدمة المصادقة - Auth Service
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tourist-app-api.onrender.com';

// ============================================
// ✅ دوال OTP - رموز التحقق
// ============================================

// 📧 إرسال رمز التحقق للبريد الإلكتروني (للتسجيل)
export const sendOTP = async (email) => {
  try {
    console.log('📤 Sending OTP request for:', email);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 OTP response:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل إرسال رمز التحقق');
    }

    return data;
  } catch (error) {
    console.error('❌ Send OTP error:', error);
    throw error;
  }
};

// ✅ التحقق من الرمز (مع دعم الغرض)
export const verifyOTP = async (email, code, purpose = 'register') => {
  try {
    console.log('📤 Verifying OTP with data:', { email, code, purpose });
    
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, purpose }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Verify response:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل التحقق');
    }

    return data;
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    throw error;
  }
};

// ✅ إعادة إرسال الرمز
export const resendOTP = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل إعادة الإرسال');
    }

    return data;
  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    throw error;
  }
};

// ============================================
// 👤 دوال المستخدمين العاديين
// ============================================

// ✅ تسجيل مستخدم جديد
export const register = async (email, fullName, password) => {
  try {
    console.log('📤 Registering new user:', { email, fullName });
    
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName, password }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Register response:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل إنشاء الحساب');
    }

    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error('❌ Register error:', error);
    throw error;
  }
};

// ✅ تسجيل دخول
export const login = async (email, password) => {
  try {
    console.log('📤 Login attempt for:', email);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Login response:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل تسجيل الدخول');
    }

    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userType', 'user');
    }

    return data;
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
};

// ✅ استعادة كلمة المرور (إرسال رمز)
export const forgotPassword = async (email) => {
  try {
    console.log('📤 Forgot password request for:', email);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Forgot password response:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل إرسال رمز الاستعادة');
    }

    return data;
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    throw error;
  }
};

// ✅ إعادة تعيين كلمة المرور
export const resetPassword = async (email, code, newPassword) => {
  try {
    console.log('📤 Reset password request:', { email, code, newPassword });
    
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Reset password response:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل إعادة تعيين كلمة المرور');
    }

    return data;
  } catch (error) {
    console.error('❌ Reset password error:', error);
    throw error;
  }
};

// ✅ تسجيل الخروج
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userType');
  console.log('👋 Logged out successfully');
  window.location.href = '/';
};

// ✅ الحصول على المستخدم الحالي من التخزين المحلي
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// ✅ التحقق من حالة تسجيل الدخول
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

// ✅ الحصول على التوكن
export const getToken = () => {
  return localStorage.getItem('token');
};

// ============================================
// 📱 دوال التحقق من رقم الجوال
// ============================================

// 📱 إرسال رمز التحقق للجوال
export const sendPhoneVerification = async (userId, phoneNumber) => {
  try {
    const token = localStorage.getItem('token');
    console.log('📤 Sending phone verification:', { userId, phoneNumber });
    
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-phone/send`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phoneNumber }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل إرسال رمز التحقق');
    }

    return data;
  } catch (error) {
    console.error('❌ Send phone verification error:', error);
    throw error;
  }
};

// 📱 التحقق من رمز الجوال
export const verifyPhoneCode = async (userId, phoneNumber, code) => {
  try {
    const token = localStorage.getItem('token');
    console.log('📤 Verifying phone code:', { userId, phoneNumber, code });
    
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-phone/verify`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phoneNumber, code }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل التحقق');
    }

    return data;
  } catch (error) {
    console.error('❌ Verify phone code error:', error);
    throw error;
  }
};

// 📱 إعادة إرسال رمز الجوال
export const resendPhoneVerification = async (userId, phoneNumber) => {
  try {
    const token = localStorage.getItem('token');
    console.log('📤 Resending phone verification:', { userId, phoneNumber });
    
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-phone/resend`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phoneNumber }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل إعادة الإرسال');
    }

    return data;
  } catch (error) {
    console.error('❌ Resend phone verification error:', error);
    throw error;
  }
};

// ✅ تحديث رقم الجوال
export const updateUserPhone = async (userId, phoneNumber) => {
  try {
    const token = localStorage.getItem('token');
    console.log('📤 Updating phone number:', { userId, phoneNumber });
    
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/phone`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone: phoneNumber, verified: true }),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'فشل تحديث رقم الجوال');
    }

    return data;
  } catch (error) {
    console.error('❌ Update phone error:', error);
    throw error;
  }
};

// 🔍 التحقق من صحة رقم الجوال السعودي
export const validateSaudiPhone = (phoneNumber) => {
  const cleanPhone = phoneNumber.replace(/\s/g, '');
  const patterns = [
    /^05[0-9]{8}$/,           // 05xxxxxxxx
    /^5[0-9]{8}$/,            // 5xxxxxxxx
    /^\+9665[0-9]{8}$/,       // +9665xxxxxxxx
    /^009665[0-9]{8}$/,       // 009665xxxxxxxx
    /^9665[0-9]{8}$/          // 9665xxxxxxxx
  ];
  return patterns.some(pattern => pattern.test(cleanPhone));
};

// 🔄 تحويل رقم الجوال إلى صيغة موحدة
export const normalizePhoneNumber = (phoneNumber) => {
  const cleanPhone = phoneNumber.replace(/\s/g, '');
  if (cleanPhone.startsWith('+966')) return '0' + cleanPhone.slice(4);
  if (cleanPhone.startsWith('00966')) return '0' + cleanPhone.slice(5);
  if (cleanPhone.startsWith('966')) return '0' + cleanPhone.slice(3);
  if (cleanPhone.startsWith('5')) return '0' + cleanPhone;
  return cleanPhone;
};

// تصدير جميع الدوال في كائن واحد للاستخدام السهل
const auth = {
  sendOTP,
  verifyOTP,
  resendOTP,
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
  getCurrentUser,
  isAuthenticated,
  getToken,
  sendPhoneVerification,
  verifyPhoneCode,
  resendPhoneVerification,
  updateUserPhone,
  validateSaudiPhone,
  normalizePhoneNumber
};

export default auth;

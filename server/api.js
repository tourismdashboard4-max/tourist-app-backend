// ============================================
// API Service - Tourist App
// ============================================

const API_URL = 'http://localhost:5002';

// ============================================
// ✅ Auth API - المصادقة
// ============================================

// 📧 إرسال رمز التحقق - السيرفر هو من يولد الرمز
export const sendOTP = async (email) => {
  try {
    console.log('📤 Sending OTP request for:', email);
    
    const response = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 OTP response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'فشل إرسال رمز التحقق');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Send OTP error:', error);
    throw error;
  }
};

// ✅ التحقق من الرمز وتسجيل المستخدم
export const verifyOTP = async (email, code, fullName, password) => {
  try {
    console.log('📤 Verifying OTP for:', email, 'Code:', code);
    
    const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, fullName, password }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Verify response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'فشل التحقق من الرمز');
    }
    
    // حفظ بيانات المستخدم والتوكن
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    throw error;
  }
};

// ✅ تسجيل الدخول
export const login = async (email, password) => {
  try {
    console.log('📤 Login attempt for:', email);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Login response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'فشل تسجيل الدخول');
    }
    
    // حفظ بيانات المستخدم والتوكن
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
};

// ✅ استعادة كلمة المرور (نسيان كلمة المرور)
export const forgotPassword = async (email) => {
  try {
    console.log('📤 Forgot password request for:', email);
    
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Forgot password response:', data);
    
    if (!data.success) {
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
    console.log('📤 Reset password for:', email);
    
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, newPassword }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Reset password response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'فشل تغيير كلمة المرور');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Reset password error:', error);
    throw error;
  }
};

// ============================================
// ✅ User API - المستخدم
// ============================================

// الحصول على ملف المستخدم
export const getUserProfile = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/auth/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'فشل تحميل الملف الشخصي');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Get profile error:', error);
    throw error;
  }
};

// تحديث الملف الشخصي
export const updateUserProfile = async (userId, userData) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/auth/profile/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'فشل تحديث الملف الشخصي');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Update profile error:', error);
    throw error;
  }
};

// ============================================
// ✅ Guides API - المرشدين
// ============================================

// تسجيل مرشد جديد
export const registerGuide = async (guideData) => {
  try {
    console.log('📤 Registering new guide:', guideData);
    
    const response = await fetch(`${API_URL}/api/guides/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(guideData),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Guide registration response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'فشل تسجيل المرشد');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Register guide error:', error);
    throw error;
  }
};

// تسجيل دخول مرشد
export const loginGuide = async (email, password) => {
  try {
    console.log('📤 Guide login attempt:', email);
    
    const response = await fetch(`${API_URL}/api/guides/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Guide login response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'فشل تسجيل دخول المرشد');
    }
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userType', 'guide');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Guide login error:', error);
    throw error;
  }
};


// ============================================
// ✅ Phone Verification API - التحقق من رقم الجوال
// ============================================

// 📱 إرسال رمز التحقق إلى رقم الجوال
export const sendPhoneVerification = async (userId, phoneNumber) => {
  try {
    console.log('📤 Sending phone verification to:', phoneNumber);
    
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/auth/verify-phone/send`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, phoneNumber }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Phone verification response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'فشل إرسال رمز التحقق');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Send phone verification error:', error);
    throw error;
  }
};

// ✅ التحقق من الرمز المرسل إلى الجوال
export const verifyPhoneCode = async (userId, phoneNumber, code) => {
  try {
    console.log('📤 Verifying phone code for:', phoneNumber);
    
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/auth/verify-phone/verify`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, phoneNumber, code }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Phone code verification response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'رمز التحقق غير صحيح');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Verify phone code error:', error);
    throw error;
  }
};

// 🔄 إعادة إرسال رمز التحقق
export const resendPhoneVerification = async (userId, phoneNumber) => {
  try {
    console.log('📤 Resending phone verification to:', phoneNumber);
    
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/auth/verify-phone/resend`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, phoneNumber }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Resend verification response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'فشل إعادة إرسال الرمز');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Resend verification error:', error);
    throw error;
  }
};

// ✅ تحديث رقم الجوال بعد التحقق
export const updateUserPhone = async (userId, phoneNumber) => {
  try {
    console.log('📤 Updating phone number for user:', userId);
    
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/users/${userId}/phone`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: phoneNumber, verified: true }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('📥 Update phone response:', data);
    
    if (!data.success) {
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
  // إزالة المسافات
  const cleanPhone = phoneNumber.replace(/\s/g, '');
  
  // أنماط الأرقام السعودية الصحيحة
  const patterns = [
    /^05[0-9]{8}$/,           // 05xxxxxxxx
    /^5[0-9]{8}$/,            // 5xxxxxxxx
    /^\+9665[0-9]{8}$/,       // +9665xxxxxxxx
    /^009665[0-9]{8}$/,       // 009665xxxxxxxx
    /^9665[0-9]{8}$/          // 9665xxxxxxxx
  ];
  
  return patterns.some(pattern => pattern.test(cleanPhone));
};

// 🔄 تحويل رقم الجوال إلى صيغة موحدة (بدون +966)
export const normalizePhoneNumber = (phoneNumber) => {
  const cleanPhone = phoneNumber.replace(/\s/g, '');
  
  if (cleanPhone.startsWith('+966')) {
    return '0' + cleanPhone.slice(4);
  }
  if (cleanPhone.startsWith('00966')) {
    return '0' + cleanPhone.slice(5);
  }
  if (cleanPhone.startsWith('966')) {
    return '0' + cleanPhone.slice(3);
  }
  if (cleanPhone.startsWith('5')) {
    return '0' + cleanPhone;
  }
  return cleanPhone;
};
// ============================================
// ✅ Utility Functions - دوال مساعدة
// ============================================

// تسجيل الخروج
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userType');
  window.location.href = '/';
};

// التحقق من حالة تسجيل الدخول
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

// الحصول على المستخدم الحالي
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// الحصول على التوكن
export const getToken = () => {
  return localStorage.getItem('token');
};

export default {
  sendOTP,
  verifyOTP,
  login,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  registerGuide,
  loginGuide,
  logout,
  isAuthenticated,
  getCurrentUser,
  getToken
};

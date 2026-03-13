// ============================================
// API Service - Tourist App
// ============================================

// استخدم المتغير البيئي أو الرابط السحابي مباشرة
const API_URL = import.meta.env.VITE_API_URL || 'https://tourist-app-api.onrender.com';

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
// باقي الملف كما هو (لم يتغير)
// ============================================
// ... (جميع الدوال الأخرى تبقى كما هي)

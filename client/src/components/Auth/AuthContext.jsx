// src/components/Auth/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { AUTH_TYPES, AUTH_STATUS } from './index.js';
import api from '../../services/api.js'; // ✅ استيراد api الحقيقي

// إنشاء السياق
const AuthContext = createContext();

// Hook مخصص لاستخدام السياق
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth يجب استخدامه داخل AuthProvider');
  }
  return context;
};

// Provider المكون الرئيسي
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState(AUTH_STATUS.IDLE);

  // تحميل بيانات المستخدم من localStorage عند التحميل
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const storedUser = localStorage.getItem('touristAppUser'); // ✅ تغيير المفتاح
        const storedToken = localStorage.getItem('touristAppToken'); // ✅ تغيير المفتاح
        
        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // ✅ التحقق من صحة التوكن مع الخادم
          api.verifyToken(storedToken).then(result => {
            if (!result.valid) {
              logout();
            }
          });
        }
      } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error);
        localStorage.removeItem('touristAppUser');
        localStorage.removeItem('touristAppToken');
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // ✅ تسجيل الدخول - اتصال حقيقي بالـ API
  const login = async (email, password, userType = AUTH_TYPES.USER) => {
    setAuthStatus(AUTH_STATUS.LOADING);
    
    try {
      // ✅ استخدام API الحقيقي
      const response = await api.login(email, password);
      
      if (response.token) {
        const userData = response.user;
        
        // تخزين البيانات
        localStorage.setItem('touristAppUser', JSON.stringify(userData));
        localStorage.setItem('touristAppToken', response.token);
        localStorage.setItem('userType', userData.type || userData.role);
        
        setUser(userData);
        setAuthStatus(AUTH_STATUS.SUCCESS);
        
        return { success: true, user: userData, token: response.token };
      } else {
        throw new Error(response.message || 'فشل تسجيل الدخول');
      }
    } catch (error) {
      setAuthStatus(AUTH_STATUS.ERROR);
      throw new Error('فشل تسجيل الدخول: ' + error.message);
    }
  };

  // ✅ تسجيل الدخول كمرشد - اتصال حقيقي بالـ API
  const guideLogin = async (licenseNumber, email, password) => {
    setAuthStatus(AUTH_STATUS.LOADING);
    
    try {
      // ✅ استخدام API الحقيقي للمرشدين
      const response = await api.guideLogin(licenseNumber, email, password);
      
      if (response.token) {
        const userData = response.user;
        
        localStorage.setItem('touristAppUser', JSON.stringify(userData));
        localStorage.setItem('touristAppToken', response.token);
        localStorage.setItem('userType', 'guide');
        
        setUser(userData);
        setAuthStatus(AUTH_STATUS.SUCCESS);
        
        return { success: true, user: userData, token: response.token };
      } else {
        throw new Error(response.message || 'فشل تسجيل دخول المرشد');
      }
    } catch (error) {
      setAuthStatus(AUTH_STATUS.ERROR);
      throw new Error('فشل تسجيل دخول المرشد: ' + error.message);
    }
  };

  // ✅ التسجيل - اتصال حقيقي بالـ API
  const register = async (userData) => {
    setAuthStatus(AUTH_STATUS.LOADING);
    
    try {
      // ✅ استخدام API الحقيقي
      const response = await api.register(userData.email, userData.fullName, userData.password);
      
      if (response.token) {
        const newUser = response.user;
        
        localStorage.setItem('touristAppUser', JSON.stringify(newUser));
        localStorage.setItem('touristAppToken', response.token);
        
        setUser(newUser);
        setAuthStatus(AUTH_STATUS.SUCCESS);
        
        return { success: true, user: newUser, token: response.token };
      } else {
        throw new Error(response.message || 'فشل التسجيل');
      }
    } catch (error) {
      setAuthStatus(AUTH_STATUS.ERROR);
      throw new Error('فشل التسجيل: ' + error.message);
    }
  };

  // ✅ تسجيل الخروج
  const logout = () => {
    localStorage.removeItem('touristAppUser');
    localStorage.removeItem('touristAppToken');
    localStorage.removeItem('userType');
    setUser(null);
    setAuthStatus(AUTH_STATUS.IDLE);
  };

  // ✅ استعادة كلمة المرور - اتصال حقيقي
  const forgotPassword = async (email) => {
    setAuthStatus(AUTH_STATUS.LOADING);
    
    try {
      const response = await api.forgotPassword(email);
      setAuthStatus(AUTH_STATUS.SUCCESS);
      return { success: true, message: response.message || 'تم إرسال رابط الاستعادة إلى بريدك' };
    } catch (error) {
      setAuthStatus(AUTH_STATUS.ERROR);
      throw new Error('فشل إرسال رابط الاستعادة: ' + error.message);
    }
  };

  // ✅ تحديث بيانات المستخدم - اتصال حقيقي
  const updateUser = async (updates) => {
    if (!user) return;
    
    try {
      const response = await api.updateUserProfile(user.id, updates);
      
      if (response.success) {
        const updatedUser = { ...user, ...response.user };
        localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return { success: true, user: updatedUser };
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // ✅ رفع الصورة الشخصية
  const uploadAvatar = async (file) => {
    if (!user) return;
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.uploadAvatar(user.id, formData);
      
      if (response.success) {
        const updatedUser = { ...user, avatar: response.avatar };
        localStorage.setItem('touristAppUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return { success: true, avatar: response.avatar };
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  // ✅ التحقق من الصلاحيات
  const hasPermission = (permission) => {
    if (!user) return false;
    
    // صلاحيات المسؤول
    if (user.role === 'admin') return true;
    
    // صلاحيات الدعم الفني
    if (user.role === 'support' && permission.startsWith('support_')) return true;
    
    // صلاحيات المرشد
    if ((user.role === 'guide' || user.isGuide) && permission.startsWith('guide_')) return true;
    
    return false;
  };

  // ✅ التحقق من نوع المستخدم
  const isUserType = (type) => {
    if (!user) return false;
    
    if (type === 'guide') {
      return user.role === 'guide' || user.isGuide === true;
    }
    if (type === 'admin') {
      return user.role === 'admin';
    }
    if (type === 'support') {
      return user.role === 'support';
    }
    return user.role === 'user' || (!user.role && !user.isGuide);
  };

  // ✅ قيمة السياق
  const value = {
    user,
    loading,
    authStatus,
    isAuthenticated: !!user,
    login,
    guideLogin,
    register,
    logout,
    forgotPassword,
    updateUser,
    uploadAvatar, // ✅ إضافة دالة رفع الصورة
    hasPermission,
    isUserType,
    isUser: isUserType('user'),
    isGuide: isUserType('guide'),
    isAdmin: isUserType('admin'),
    isSupport: isUserType('support')
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// HOC لحماية المسارات
export const withAuth = (Component) => {
  return function WithAuthComponent(props) {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="auth-loading-container">
          <div className="auth-spinner">🌀</div>
          <p>جاري التحقق من المصادقة...</p>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      window.location.href = '/login';
      return null;
    }
    
    return <Component {...props} />;
  };
};

// HOC لحماية المرشدين فقط
export const withGuideAuth = (Component) => {
  return function WithGuideAuthComponent(props) {
    const { isGuide, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="auth-loading-container">
          <div className="auth-spinner">🌀</div>
          <p>جاري التحقق من صلاحيات المرشد...</p>
        </div>
      );
    }
    
    if (!isGuide) {
      window.location.href = '/guide/login';
      return null;
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;

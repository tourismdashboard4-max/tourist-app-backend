// src/components/Auth/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { AUTH_TYPES, AUTH_STATUS } from './index.js';

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
        const storedUser = localStorage.getItem('tourist_app_user');
        const storedToken = localStorage.getItem('tourist_app_token');
        
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error);
        localStorage.removeItem('tourist_app_user');
        localStorage.removeItem('tourist_app_token');
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // تسجيل الدخول
  const login = async (email, password, userType = AUTH_TYPES.USER) => {
    setAuthStatus(AUTH_STATUS.LOADING);
    
    try {
      // محاكاة API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // بيانات مستخدم وهمية للاختبار
      const mockUser = {
        id: Date.now().toString(),
        email,
        fullName: email.split('@')[0],
        userType,
        phone: '0512345678',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=random`,
        createdAt: new Date().toISOString(),
        permissions: userType === AUTH_TYPES.GUIDE ? ['create_tours', 'manage_bookings'] : ['browse_tours', 'book_tours']
      };

      const mockToken = 'mock_jwt_token_' + Date.now();
      
      // حفظ في localStorage
      localStorage.setItem('tourist_app_user', JSON.stringify(mockUser));
      localStorage.setItem('tourist_app_token', mockToken);
      
      setUser(mockUser);
      setAuthStatus(AUTH_STATUS.SUCCESS);
      
      return { success: true, user: mockUser, token: mockToken };
    } catch (error) {
      setAuthStatus(AUTH_STATUS.ERROR);
      throw new Error('فشل تسجيل الدخول: ' + error.message);
    }
  };

  // تسجيل الدخول كمرشد
  const guideLogin = async (licenseNumber, email, password) => {
    setAuthStatus(AUTH_STATUS.LOADING);
    
    try {
      // محاكاة API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // بيانات مرشد وهمية
      const mockGuide = {
        id: Date.now().toString(),
        email,
        licenseNumber,
        fullName: `المرشد ${licenseNumber}`,
        userType: AUTH_TYPES.GUIDE,
        phone: '0512345678',
        avatar: `https://ui-avatars.com/api/?name=Guide&background=green`,
        rating: 4.5,
        toursCount: 12,
        verified: true,
        specialties: ['سياحة تاريخية', 'رحلات برية'],
        languages: ['العربية', 'الإنجليزية'],
        createdAt: new Date().toISOString(),
        permissions: ['create_tours', 'manage_bookings', 'chat_with_users', 'manage_profile']
      };

      const mockToken = 'mock_guide_token_' + Date.now();
      
      localStorage.setItem('tourist_app_user', JSON.stringify(mockGuide));
      localStorage.setItem('tourist_app_token', mockToken);
      
      setUser(mockGuide);
      setAuthStatus(AUTH_STATUS.SUCCESS);
      
      return { success: true, user: mockGuide, token: mockToken };
    } catch (error) {
      setAuthStatus(AUTH_STATUS.ERROR);
      throw new Error('فشل تسجيل دخول المرشد: ' + error.message);
    }
  };

  // التسجيل
  const register = async (userData) => {
    setAuthStatus(AUTH_STATUS.LOADING);
    
    try {
      // محاكاة API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newUser = {
        id: Date.now().toString(),
        ...userData,
        createdAt: new Date().toISOString(),
        verified: false,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=random`
      };

      const mockToken = 'mock_register_token_' + Date.now();
      
      localStorage.setItem('tourist_app_user', JSON.stringify(newUser));
      localStorage.setItem('tourist_app_token', mockToken);
      
      setUser(newUser);
      setAuthStatus(AUTH_STATUS.SUCCESS);
      
      return { success: true, user: newUser, token: mockToken };
    } catch (error) {
      setAuthStatus(AUTH_STATUS.ERROR);
      throw new Error('فشل التسجيل: ' + error.message);
    }
  };

  // تسجيل الخروج
  const logout = () => {
    localStorage.removeItem('tourist_app_user');
    localStorage.removeItem('tourist_app_token');
    setUser(null);
    setAuthStatus(AUTH_STATUS.IDLE);
  };

  // استعادة كلمة المرور
  const forgotPassword = async (email) => {
    setAuthStatus(AUTH_STATUS.LOADING);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAuthStatus(AUTH_STATUS.SUCCESS);
      return { success: true, message: 'تم إرسال رابط الاستعادة إلى بريدك' };
    } catch (error) {
      setAuthStatus(AUTH_STATUS.ERROR);
      throw new Error('فشل إرسال رابط الاستعادة');
    }
  };

  // تحديث بيانات المستخدم
  const updateUser = (updates) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('tourist_app_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // التحقق من الصلاحيات
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  // التحقق من نوع المستخدم
  const isUserType = (type) => {
    return user?.userType === type;
  };

  // قيمة السياق
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
    hasPermission,
    isUserType,
    isUser: user?.userType === AUTH_TYPES.USER,
    isGuide: user?.userType === AUTH_TYPES.GUIDE,
    isAdmin: user?.userType === AUTH_TYPES.ADMIN
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
// client/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // تحميل المستخدم من localStorage عند بدء التشغيل
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        const storedUserType = localStorage.getItem('userType');
        
        console.log('🔍 Loading from localStorage:', { 
          hasUser: !!storedUser, 
          hasToken: !!storedToken,
          userType: storedUserType
        });
        
        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          console.log('✅ User loaded from storage:', parsedUser);
          setUser(parsedUser);
          setToken(storedToken);
        } else {
          console.log('ℹ️ No user data in localStorage');
        }
      } catch (e) {
        console.error('❌ Error parsing stored user:', e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    loadUserFromStorage();
  }, []);

  // التحقق من صحة التوكن مع السيرفر
  useEffect(() => {
    if (token && user && !loading) {
      verifyTokenWithServer();
    }
  }, [token, user, loading]);

  const verifyTokenWithServer = async () => {
    try {
      const response = await api.verifyToken(token);
      if (!response.valid) {
        console.warn('⚠️ Token invalid, logging out');
        logout();
      } else {
        console.log('✅ Token is valid');
      }
    } catch (error) {
      console.error('Token verification error:', error);
    }
  };

  // ============================================
  // تسجيل الدخول الموحد (للمستخدمين العاديين)
  // ============================================
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📤 Attempting login for:', email);
      const response = await api.login(email, password);
      console.log('📥 Login response:', response);
      
      if (response.success) {
        const { token, user } = response;
        
        // التحقق من نوع المستخدم
        if (user.type === 'guide') {
          toast.error('هذا الحساب خاص بالمرشدين. يرجى استخدام بوابة دخول المرشدين');
          return { success: false, message: 'هذا الحساب خاص بالمرشدين' };
        }
        
        // حفظ بيانات المستخدم العادي
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userType', 'user');
        
        setToken(token);
        setUser(user);
        
        console.log('✅ User logged in:', user);
        toast.success(`مرحباً ${user.fullName || user.name || user.email}`);
        return { success: true, user };
      } else {
        setError(response.message);
        toast.error(response.message);
        return { success: false, message: response.message };
      }
    } catch (error) {
      const message = error.message || 'فشل تسجيل الدخول';
      setError(message);
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // تسجيل الخروج
  // ============================================
  const logout = () => {
    console.log('👋 Logging out user:', user?.email);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    setToken(null);
    setUser(null);
    toast.success('تم تسجيل الخروج بنجاح');
  };

  // ============================================
  // تحديث بيانات المستخدم
  // ============================================
  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
    localStorage.setItem('user', JSON.stringify({ ...user, ...userData }));
  };

  const value = {
    user,
    token,
    loading,
    error,
    initialized,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isGuide: user?.type === 'guide',
    isUser: user?.type === 'user' || user?.type === 'tourist',
  };

  // للتشخيص
  console.log('🔄 AuthContext State:', {
    isAuthenticated: !!user,
    user: user ? { 
      id: user.id || user._id, 
      name: user.fullName || user.name, 
      email: user.email,
      type: user.type 
    } : null,
    hasToken: !!token,
    loading,
    initialized
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
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
          
          // ✅ تعيين isGuide بشكل صحيح
          const isGuide = parsedUser.role === 'guide' || 
                          parsedUser.type === 'guide' || 
                          parsedUser.isGuide === true ||
                          parsedUser.guide_status === 'approved';
          
          const updatedUser = {
            ...parsedUser,
            isGuide: isGuide,
            guideVerified: parsedUser.guide_status === 'approved'
          };
          
          console.log('✅ User loaded from storage:', { 
            id: updatedUser.id, 
            role: updatedUser.role, 
            type: updatedUser.type,
            isGuide: updatedUser.isGuide,
            guide_status: updatedUser.guide_status
          });
          
          setUser(updatedUser);
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
        
        // ✅ تعيين isGuide
        const isGuide = user.role === 'guide' || user.type === 'guide' || user.isGuide === true;
        
        const updatedUser = {
          ...user,
          isGuide: isGuide,
          guideVerified: user.guide_status === 'approved'
        };
        
        // التحقق من نوع المستخدم
        if (isGuide) {
          toast.error('هذا الحساب خاص بالمرشدين. يرجى استخدام بوابة دخول المرشدين');
          return { success: false, message: 'هذا الحساب خاص بالمرشدين' };
        }
        
        // حفظ بيانات المستخدم العادي
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('userType', 'user');
        
        setToken(token);
        setUser(updatedUser);
        
        console.log('✅ User logged in:', updatedUser);
        toast.success(`مرحباً ${updatedUser.fullName || updatedUser.name || updatedUser.email}`);
        return { success: true, user: updatedUser };
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
  // تسجيل دخول المرشدين
  // ============================================
  const guideLogin = async (licenseNumber, email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📤 Attempting guide login for:', email);
      const response = await api.guideLogin(licenseNumber, email, password);
      console.log('📥 Guide login response:', response);
      
      if (response.success) {
        const { token, user } = response;
        
        // ✅ تعيين isGuide
        const isGuide = true;
        
        const updatedUser = {
          ...user,
          isGuide: true,
          guideVerified: user.guide_status === 'approved',
          type: 'guide'
        };
        
        // حفظ بيانات المرشد
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('userType', 'guide');
        
        setToken(token);
        setUser(updatedUser);
        
        console.log('✅ Guide logged in:', updatedUser);
        toast.success(`مرحباً المرشد ${updatedUser.fullName || updatedUser.name}`);
        return { success: true, user: updatedUser };
      } else {
        setError(response.message);
        toast.error(response.message);
        return { success: false, message: response.message };
      }
    } catch (error) {
      const message = error.message || 'فشل تسجيل دخول المرشد';
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
    const updatedUser = { ...user, ...userData };
    
    // ✅ تحديث isGuide بناءً على role
    if (updatedUser.role === 'guide' || updatedUser.type === 'guide') {
      updatedUser.isGuide = true;
      updatedUser.guideVerified = updatedUser.guide_status === 'approved';
      localStorage.setItem('userType', 'guide');
    } else {
      updatedUser.isGuide = false;
      localStorage.setItem('userType', 'user');
    }
    
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    console.log('🔄 User updated:', { 
      id: updatedUser.id, 
      role: updatedUser.role, 
      type: updatedUser.type,
      isGuide: updatedUser.isGuide 
    });
  };

  const value = {
    user,
    token,
    loading,
    error,
    initialized,
    login,
    guideLogin,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isGuide: user?.isGuide === true || user?.role === 'guide' || user?.type === 'guide',
    isUser: user?.type === 'user' || user?.type === 'tourist' || (!user?.isGuide && user?.role !== 'guide'),
  };

  // للتشخيص
  console.log('🔄 AuthContext State:', {
    isAuthenticated: !!user,
    user: user ? { 
      id: user.id, 
      name: user.fullName || user.name, 
      email: user.email,
      role: user.role,
      type: user.type,
      isGuide: user.isGuide,
      guide_status: user.guide_status
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

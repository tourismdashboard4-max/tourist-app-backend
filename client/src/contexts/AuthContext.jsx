// client/src/contexts/AuthContext.jsx
// ✅ النسخة النهائية - مع الحفاظ على إعدادات الثيم عند تسجيل الخروج ومنع إعادة التحميل بعد الخروج

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  
  // ✅ إضافة ref لمنع إعادة تحميل المستخدم أثناء تسجيل الخروج
  const isLoggingOutRef = useRef(false);

  // ✅ دالة مساعدة لمسح كافة بيانات الجلسة مع الحفاظ على إعدادات الثيم
  const clearAllStorage = useCallback(() => {
    // ✅ حفظ إعدادات الثيم قبل المسح
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedAutoTheme = localStorage.getItem('autoTheme');
    
    const keysToRemove = [
      'token',
      'user',
      'userType',
      'touristAppUser',
      'touristAppToken',
      'selectedTicketId',
      'selectedChatType',
      'directChatParams',
      'chatType',
      'supportParams',
      'forceTicketId',
      'forceChatType'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // مسح أي مفاتيح مؤقتة أو خاصة بالمحادثات
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('temp_') || key.startsWith('chat_') || key.startsWith('notif_')) {
        localStorage.removeItem(key);
      }
    });
    
    // ✅ استعادة إعدادات الثيم
    if (savedDarkMode !== null) {
      localStorage.setItem('darkMode', savedDarkMode);
      console.log('🎨 Dark mode preserved:', savedDarkMode);
    }
    if (savedAutoTheme !== null) {
      localStorage.setItem('autoTheme', savedAutoTheme);
      console.log('🎨 Auto theme preserved:', savedAutoTheme);
    }
  }, []);

  // تحميل المستخدم من localStorage عند بدء التشغيل
  useEffect(() => {
    const loadUserFromStorage = () => {
      // ✅ إذا كنا في عملية تسجيل خروج، لا نعيد تحميل أي شيء
      if (isLoggingOutRef.current) {
        console.log('⏸️ Skipping loadUserFromStorage because logout in progress');
        setLoading(false);
        setInitialized(true);
        return;
      }
      
      try {
        // ✅ حفظ الثيم قبل تحميل المستخدم
        const savedDarkMode = localStorage.getItem('darkMode');
        const savedAutoTheme = localStorage.getItem('autoTheme');
        
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        const storedUserType = localStorage.getItem('userType');
        
        console.log('🔍 Loading from localStorage:', { 
          hasUser: !!storedUser, 
          hasToken: !!storedToken,
          userType: storedUserType,
          darkMode: savedDarkMode,
          autoTheme: savedAutoTheme
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
          setUser(null);
          setToken(null);
        }
      } catch (e) {
        console.error('❌ Error parsing stored user:', e);
        clearAllStorage();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    loadUserFromStorage();
  }, [clearAllStorage]); // clearAllStorage مستقرة، لا مشكلة

  // الاستماع إلى أحداث التخزين من النوافذ الأخرى (لتسجيل الخروج المتزامن)
  useEffect(() => {
    const handleStorageChange = (event) => {
      // ✅ تجاهل الأحداث إذا كنا في عملية تسجيل خروج
      if (isLoggingOutRef.current) return;
      
      if (event.key === 'token' && !event.newValue) {
        // تم حذف التوكن من نافذة أخرى -> تسجيل خروج
        console.log('🔄 Token removed in another tab, logging out');
        setUser(null);
        setToken(null);
        toast.success('تم تسجيل الخروج من نافذة أخرى');
      } else if (event.key === 'user' && !event.newValue) {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // التحقق من صحة التوكن مع السيرفر (مرة واحدة بعد التحميل)
  useEffect(() => {
    if (token && user && !loading && !isLoggingOutRef.current) {
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
          setLoading(false);
          return { success: false, message: 'هذا الحساب خاص بالمرشدين' };
        }
        
        // ✅ حفظ الثيم قبل مسح البيانات
        const savedDarkMode = localStorage.getItem('darkMode');
        const savedAutoTheme = localStorage.getItem('autoTheme');
        
        // تنظيف أي بيانات قديمة
        clearAllStorage();
        
        // ✅ استعادة الثيم
        if (savedDarkMode !== null) localStorage.setItem('darkMode', savedDarkMode);
        if (savedAutoTheme !== null) localStorage.setItem('autoTheme', savedAutoTheme);
        
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
        
        // ✅ حفظ الثيم قبل مسح البيانات
        const savedDarkMode = localStorage.getItem('darkMode');
        const savedAutoTheme = localStorage.getItem('autoTheme');
        
        // تنظيف أي بيانات قديمة
        clearAllStorage();
        
        // ✅ استعادة الثيم
        if (savedDarkMode !== null) localStorage.setItem('darkMode', savedDarkMode);
        if (savedAutoTheme !== null) localStorage.setItem('autoTheme', savedAutoTheme);
        
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
  // تسجيل الخروج المُحسَّن - مع الحفاظ على الثيم ومنع إعادة التحميل
  // ============================================
  const logout = useCallback(() => {
    console.log('👋 Logging out user:', user?.email || 'unknown');
    
    // ✅ تعيين علامة لمنع أي محاولة لإعادة تحميل المستخدم أثناء الخروج
    isLoggingOutRef.current = true;
    
    // ✅ حفظ إعدادات الثيم
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedAutoTheme = localStorage.getItem('autoTheme');
    
    console.log('🎨 Saving theme before logout:', { savedDarkMode, savedAutoTheme });
    
    // 1. مسح جميع التخزينات المحلية (مع الحفاظ على الثيم)
    clearAllStorage();
    
    // 2. استعادة إعدادات الثيم
    if (savedDarkMode !== null) {
      localStorage.setItem('darkMode', savedDarkMode);
    }
    if (savedAutoTheme !== null) {
      localStorage.setItem('autoTheme', savedAutoTheme);
    }
    
    // 3. إعادة تعيين حالة React
    setToken(null);
    setUser(null);
    
    // 4. إغلاق أي اتصالات WebSocket نشطة
    if (window.socket && typeof window.socket.disconnect === 'function') {
      window.socket.disconnect();
      window.socket = null;
    }
    
    // 5. عرض رسالة للمستخدم
    toast.success('تم تسجيل الخروج بنجاح');
    
    console.log('🎨 Theme after logout:', {
      darkMode: localStorage.getItem('darkMode'),
      autoTheme: localStorage.getItem('autoTheme')
    });
    
    // 6. بعد فترة قصيرة، نسمح بإعادة التحميل (في حال حدث أي شيء آخر)
    setTimeout(() => {
      isLoggingOutRef.current = false;
      console.log('🔓 Logout flag reset, re-initialization allowed');
    }, 500);
    
  }, [clearAllStorage, user]);

  // ============================================
  // تحديث بيانات المستخدم
  // ============================================
  const updateUser = useCallback((userData) => {
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
  }, [user]);

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

// client/src/contexts/AuthContext.jsx
// ✅ النسخة النهائية - تم إصلاح مشكلة عودة الاسم القديم
// ✅ استخدام setUser بالشكل الوظيفي (functional update)
// ✅ منع التحديثات المتضاربة باستخدام isUpdatingRef
// ✅ منع تحديث الاسم إذا لم يتغير فعلياً
// ✅ منع إعادة تحميل المستخدم من localStorage بعد التحديث
// ✅ جلب بيانات المستخدم الطازجة من الخادم بعد تسجيل الدخول لضمان التزامن

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
  
  // refs لمنع التحديثات المتضاربة
  const isLoggingOutRef = useRef(false);
  const isUpdatingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const lastUserNameRef = useRef('');

  // دالة مساعدة لمسح كافة بيانات الجلسة مع الحفاظ على إعدادات الثيم
  const clearAllStorage = useCallback(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedAutoTheme = localStorage.getItem('autoTheme');
    
    const keysToRemove = [
      'token', 'user', 'userType', 'touristAppUser', 'touristAppToken',
      'selectedTicketId', 'selectedChatType', 'directChatParams',
      'chatType', 'supportParams', 'forceTicketId', 'forceChatType'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('temp_') || key.startsWith('chat_') || key.startsWith('notif_')) {
        localStorage.removeItem(key);
      }
    });
    
    if (savedDarkMode !== null) localStorage.setItem('darkMode', savedDarkMode);
    if (savedAutoTheme !== null) localStorage.setItem('autoTheme', savedAutoTheme);
  }, []);

  // تحميل المستخدم من localStorage عند بدء التشغيل (مرة واحدة فقط)
  useEffect(() => {
    if (initialLoadDoneRef.current) return;
    
    const loadUserFromStorage = () => {
      if (isLoggingOutRef.current) {
        console.log('⏸️ Skipping loadUserFromStorage because logout in progress');
        setLoading(false);
        setInitialized(true);
        return;
      }
      
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          const isGuide = parsedUser.role === 'guide' || 
                          parsedUser.type === 'guide' || 
                          parsedUser.isGuide === true ||
                          parsedUser.guide_status === 'approved';
          
          const updatedUser = {
            ...parsedUser,
            isGuide: isGuide,
            guideVerified: parsedUser.guide_status === 'approved'
          };
          
          console.log('✅ User loaded from storage:', { id: updatedUser.id, name: updatedUser.fullName || updatedUser.name });
          setUser(updatedUser);
          setToken(storedToken);
          lastUserNameRef.current = updatedUser.fullName || updatedUser.name || '';
        } else {
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
        initialLoadDoneRef.current = true;
      }
    };

    loadUserFromStorage();
  }, [clearAllStorage]);

  // الاستماع لتغييرات localStorage من النوافذ الأخرى (مع تجاهل التحديثات الذاتية)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (isLoggingOutRef.current || isUpdatingRef.current) return;
      
      if (event.key === 'token' && !event.newValue) {
        console.log('🔄 Token removed in another tab, logging out');
        setUser(null);
        setToken(null);
        toast.success('تم تسجيل الخروج من نافذة أخرى');
      } else if (event.key === 'user' && event.newValue) {
        try {
          const newUser = JSON.parse(event.newValue);
          if (newUser && newUser.id === user?.id) {
            const newName = newUser.fullName || newUser.name || '';
            // فقط قم بتحديث إذا كان الاسم مختلفاً
            if (newName !== lastUserNameRef.current) {
              console.log('🔄 User updated from another tab:', newName);
              setUser(newUser);
              lastUserNameRef.current = newName;
            }
          }
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.id]);

  // التحقق من صحة التوكن مع السيرفر
  useEffect(() => {
    if (token && user && !loading && !isLoggingOutRef.current) {
      const verify = async () => {
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
      verify();
    }
  }, [token, user, loading]);

  // ============================================
  // ⭐ دالة تحديث المستخدم (محسّنة - functional update)
  // ============================================
  const updateUser = useCallback((userData) => {
    if (!userData) {
      console.warn('⚠️ updateUser called with null/undefined');
      return;
    }
    
    // منع التحديثات المتضاربة
    if (isUpdatingRef.current) {
      console.log('⏸️ Update already in progress, skipping');
      return;
    }
    isUpdatingRef.current = true;
    
    try {
      // استخدام functional update لضمان الحصول على أحدث قيمة للـ user
      setUser((prevUser) => {
        const currentUser = prevUser || {};
        
        // التحقق من عدم تغيير الاسم (لتجنب التحديثات غير الضرورية)
        const newName = userData.fullName || userData.name || currentUser.fullName || currentUser.name || '';
        const currentName = currentUser.fullName || currentUser.name || '';
        
        if (newName === currentName && Object.keys(userData).length === 1) {
          console.log('⚠️ Skipping update: name unchanged');
          return currentUser;
        }
        
        // دمج البيانات مع التأكد من عدم فقدان الحقول المهمة
        const updatedUser = {
          ...currentUser,
          ...userData,
          // التأكد من تعيين isGuide بشكل صحيح
          isGuide: userData.role === 'guide' || 
                    userData.type === 'guide' || 
                    userData.isGuide === true ||
                    userData.guide_status === 'approved' ||
                    currentUser.isGuide === true
        };
        
        console.log('🔄 Updating user (functional):', { 
          oldName: currentName, 
          newName: updatedUser.fullName || updatedUser.name,
          id: updatedUser.id 
        });
        
        // تحديث localStorage فوراً
        try {
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // إذا كان هناك تغيير في نوع المستخدم (مرشد/عادي)، تحديث userType
          if (updatedUser.isGuide) {
            localStorage.setItem('userType', 'guide');
          } else {
            localStorage.setItem('userType', 'user');
          }
          
          // تحديث ref لتتبع آخر اسم تم حفظه
          lastUserNameRef.current = updatedUser.fullName || updatedUser.name || '';
          console.log('✅ User saved to localStorage:', lastUserNameRef.current);
        } catch (storageError) {
          console.error('❌ Failed to save user to localStorage:', storageError);
        }
        
        return updatedUser;
      });
    } catch (error) {
      console.error('❌ Failed to update user:', error);
    } finally {
      // إطلاق التحديث بعد فترة قصيرة
      setTimeout(() => {
        isUpdatingRef.current = false;
        console.log('🔓 Update flags reset');
      }, 200);
    }
  }, []);

  // ============================================
  // دالة مساعدة لجلب بيانات المستخدم الطازجة من الخادم
  // ============================================
  const fetchFreshUserData = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const response = await api.getUserProfile(userId);
      if (response.success && response.user) {
        return response.user;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch fresh user data:', error);
      return null;
    }
  }, []);

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
        const { token, user: userData } = response;
        
        const isGuide = userData.role === 'guide' || userData.type === 'guide' || userData.isGuide === true;
        
        let updatedUser = {
          ...userData,
          isGuide: isGuide,
          guideVerified: userData.guide_status === 'approved'
        };
        
        if (isGuide) {
          toast.error('هذا الحساب خاص بالمرشدين. يرجى استخدام بوابة دخول المرشدين');
          setLoading(false);
          return { success: false, message: 'هذا الحساب خاص بالمرشدين' };
        }
        
        // ✅ جلب البيانات الطازجة من الخادم لضمان الحصول على أحدث الأسماء
        const freshUser = await fetchFreshUserData(userData.id);
        if (freshUser) {
          console.log('🔄 Got fresh user data from server:', freshUser);
          updatedUser = {
            ...updatedUser,
            fullName: freshUser.full_name || freshUser.fullName || freshUser.name || updatedUser.name,
            name: freshUser.name || updatedUser.name,
            avatar_url: freshUser.avatar_url || updatedUser.avatar_url,
            phone: freshUser.phone || updatedUser.phone,
            username: freshUser.username || updatedUser.username,
          };
        }
        
        const savedDarkMode = localStorage.getItem('darkMode');
        const savedAutoTheme = localStorage.getItem('autoTheme');
        
        clearAllStorage();
        
        if (savedDarkMode !== null) localStorage.setItem('darkMode', savedDarkMode);
        if (savedAutoTheme !== null) localStorage.setItem('autoTheme', savedAutoTheme);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('userType', 'user');
        
        setToken(token);
        setUser(updatedUser);
        lastUserNameRef.current = updatedUser.fullName || updatedUser.name || '';
        
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
  // تسجيل دخول المرشدين (محسّن أيضاً)
  // ============================================
  const guideLogin = async (licenseNumber, email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📤 Attempting guide login for:', email);
      const response = await api.guideLogin(licenseNumber, email, password);
      console.log('📥 Guide login response:', response);
      
      if (response.success) {
        const { token, user: userData } = response;
        
        let updatedUser = {
          ...userData,
          isGuide: true,
          guideVerified: userData.guide_status === 'approved',
          type: 'guide'
        };
        
        // ✅ جلب البيانات الطازجة من الخادم
        const freshUser = await fetchFreshUserData(userData.id);
        if (freshUser) {
          console.log('🔄 Got fresh guide data from server:', freshUser);
          updatedUser = {
            ...updatedUser,
            fullName: freshUser.full_name || freshUser.fullName || freshUser.name || updatedUser.name,
            name: freshUser.name || updatedUser.name,
            avatar_url: freshUser.avatar_url || updatedUser.avatar_url,
            phone: freshUser.phone || updatedUser.phone,
            username: freshUser.username || updatedUser.username,
          };
        }
        
        const savedDarkMode = localStorage.getItem('darkMode');
        const savedAutoTheme = localStorage.getItem('autoTheme');
        
        clearAllStorage();
        
        if (savedDarkMode !== null) localStorage.setItem('darkMode', savedDarkMode);
        if (savedAutoTheme !== null) localStorage.setItem('autoTheme', savedAutoTheme);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('userType', 'guide');
        
        setToken(token);
        setUser(updatedUser);
        lastUserNameRef.current = updatedUser.fullName || updatedUser.name || '';
        
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
  const logout = useCallback(() => {
    console.log('👋 Logging out user:', user?.email || 'unknown');
    
    isLoggingOutRef.current = true;
    
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedAutoTheme = localStorage.getItem('autoTheme');
    
    clearAllStorage();
    
    if (savedDarkMode !== null) localStorage.setItem('darkMode', savedDarkMode);
    if (savedAutoTheme !== null) localStorage.setItem('autoTheme', savedAutoTheme);
    
    setToken(null);
    setUser(null);
    lastUserNameRef.current = '';
    
    if (window.socket && typeof window.socket.disconnect === 'function') {
      window.socket.disconnect();
      window.socket = null;
    }
    
    toast.success('تم تسجيل الخروج بنجاح');
    
    setTimeout(() => {
      isLoggingOutRef.current = false;
      console.log('🔓 Logout flag reset, re-initialization allowed');
    }, 500);
    
  }, [clearAllStorage, user]);

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

export default AuthContext;

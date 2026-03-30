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
  const [uploadingAvatar, setUploadingAvatar] = useState(false); // ✅ حالة رفع الصورة

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
        
        // ✅ التأكد من وجود avatar_url في بيانات المستخدم
        const userWithAvatar = {
          ...user,
          avatar_url: user.avatar_url || null
        };
        
        // حفظ بيانات المستخدم العادي
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithAvatar));
        localStorage.setItem('userType', 'user');
        
        setToken(token);
        setUser(userWithAvatar);
        
        console.log('✅ User logged in:', userWithAvatar);
        toast.success(`مرحباً ${user.fullName || user.name || user.email}`);
        return { success: true, user: userWithAvatar };
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
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    console.log('🔄 User updated:', updatedUser);
  };

  // ============================================
  // ✅ رفع الصورة الشخصية (AVATAR)
  // ============================================
  const uploadAvatar = async (file) => {
    if (!file) {
      toast.error('الرجاء اختيار صورة');
      return { success: false, message: 'No file selected' };
    }

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم. يرجى رفع صورة (JPEG, PNG, GIF, WEBP)');
      return { success: false, message: 'Invalid file type' };
    }

    // التحقق من حجم الملف (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً. الحد الأقصى 5MB');
      return { success: false, message: 'File too large' };
    }

    try {
      setUploadingAvatar(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      console.log('📤 Uploading avatar for user:', user?.id);
      
      const response = await api.uploadAvatar(formData);
      console.log('📥 Upload response:', response);
      
      if (response.success) {
        // تحديث المستخدم بالصورة الجديدة
        updateUser({ avatar_url: response.avatarUrl });
        
        toast.success('تم تحديث الصورة الشخصية بنجاح');
        return { success: true, avatarUrl: response.avatarUrl };
      } else {
        toast.error(response.message || 'فشل رفع الصورة');
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('❌ Avatar upload error:', error);
      
      // معالجة أخطاء محددة
      if (error.message?.includes('401')) {
        toast.error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى');
        logout();
      } else if (error.message?.includes('413')) {
        toast.error('الصورة كبيرة جداً');
      } else {
        toast.error('فشل رفع الصورة. يرجى المحاولة مرة أخرى');
      }
      
      return { success: false, error };
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ============================================
  // ✅ حذف الصورة الشخصية
  // ============================================
  const deleteAvatar = async () => {
    if (!user?.avatar_url) {
      return { success: false, message: 'لا توجد صورة لحذفها' };
    }

    try {
      setUploadingAvatar(true);
      
      // استخراج اسم الملف من URL
      const fileName = user.avatar_url.split('/').pop();
      
      const response = await api.deleteAvatar(fileName);
      
      if (response.success) {
        updateUser({ avatar_url: null });
        toast.success('تم حذف الصورة الشخصية');
        return { success: true };
      } else {
        toast.error(response.message || 'فشل حذف الصورة');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Avatar delete error:', error);
      toast.error('فشل حذف الصورة');
      return { success: false, error };
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ============================================
  // ✅ الحصول على رابط الصورة الشخصية (مع fallback)
  // ============================================
  const getAvatarUrl = () => {
    return user?.avatar_url || null;
  };

  const value = {
    user,
    token,
    loading,
    error,
    initialized,
    uploadingAvatar,      // ✅ حالة رفع الصورة
    login,
    logout,
    updateUser,
    uploadAvatar,         // ✅ رفع الصورة
    deleteAvatar,         // ✅ حذف الصورة
    getAvatarUrl,         // ✅ الحصول على رابط الصورة
    isAuthenticated: !!user,
    isGuide: user?.type === 'guide',
    isUser: user?.type === 'user' || user?.type === 'tourist',
    hasAvatar: !!user?.avatar_url,  // ✅ هل توجد صورة؟
  };

  // للتشخيص
  console.log('🔄 AuthContext State:', {
    isAuthenticated: !!user,
    user: user ? { 
      id: user.id || user._id, 
      name: user.fullName || user.name, 
      email: user.email,
      type: user.type,
      hasAvatar: !!user.avatar_url,
      avatar_url: user.avatar_url
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

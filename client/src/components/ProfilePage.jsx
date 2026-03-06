import React, { useState, useEffect } from 'react';
import { User, Mail, Edit2, LogOut, Settings, Star, Calendar, Shield, Camera, MapPin, Heart, Phone, Save, X, Bell, Globe } from 'lucide-react';
import api from '../services/api';

const ProfilePage = ({ user, setPage, setShowLogin, onLogout, lang = 'ar' }) => {
  const [userData, setUserData] = useState(user || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: '',
    phone: ''
  });
  const [stats, setStats] = useState({
    trips: 0,
    reviews: 0,
    favorites: 0
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      loadUserStats();
      setEditData({
        fullName: userData.fullName || '',
        phone: userData.phone || ''
      });
    }
  }, [userData]);

  const loadUserStats = async () => {
    try {
      setStats({
        trips: 12,
        reviews: 8,
        favorites: 24
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  const handleEditToggle = () => {
    console.log('🔵 زر تعديل الملف تم الضغط عليه');
    console.log('🔵 isEditing before:', isEditing);
    setIsEditing(!isEditing);
  };

  useEffect(() => {
    console.log('🟢 isEditing changed to:', isEditing);
    if (!isEditing && userData) {
      setEditData({
        fullName: userData.fullName || '',
        phone: userData.phone || ''
      });
    }
  }, [isEditing, userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      const response = await api.updateUserProfile(userData.id, {
        fullName: editData.fullName,
        phone: editData.phone
      });
      
      if (response.success) {
        const updatedUser = { ...userData, ...editData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        setIsEditing(false);
        alert('✅ تم تحديث الملف الشخصي');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('❌ فشل تحديث الملف الشخصي');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. الرجاء اختيار صورة أقل من 2 ميجابايت');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار صورة فقط');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setLoading(true);
    try {
      const response = await api.uploadAvatar(userData.id, formData);
      if (response.success) {
        const updatedUser = { ...userData, avatar: response.avatar };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        alert('✅ تم تحديث الصورة بنجاح');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('❌ فشل تحديث الصورة');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUserData(null);
    if (onLogout) onLogout();
    window.location.href = '/';
  };

  // ✅ دوال التنقل
  const navigateToSettings = () => {
    setPage('settings');
  };

  const navigateToNotifications = () => {
    alert('🚧 صفحة الإشعارات قيد التطوير');
  };

  const navigateToLanguage = () => {
    alert('🌐 سيتم إضافة خيارات اللغة قريباً');
  };

  // إذا كان المستخدم غير مسجل (زائر)
  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">مرحباً زائر</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            سجل دخول للاستفادة من جميع الميزات
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setShowLogin(true)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => setShowLogin(true)}
              className="w-full border-2 border-green-600 text-green-600 dark:border-green-400 dark:text-green-400 py-3 rounded-xl font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
            >
              إنشاء حساب جديد
            </button>
          </div>
        </div>
      </div>
    );
  }

  // مستخدم مسجل - اعرض بياناته
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* الغلاف العلوي */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-40 relative">
        <button 
          onClick={() => setPage('settings')}
          className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition text-white"
        >
          <Settings size={20} />
        </button>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 -mt-20">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* رأس الملف الشخصي */}
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* الصورة الشخصية */}
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden">
                  {userData.avatar ? (
                    <img 
                      src={userData.avatar} 
                      alt={userData.fullName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center">${userData.fullName?.charAt(0) || 'U'}</div>`;
                      }}
                    />
                  ) : (
                    userData.fullName?.charAt(0) || 'U'
                  )}
                </div>
                
                <button 
                  onClick={() => document.getElementById('avatar-upload').click()}
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  disabled={loading}
                >
                  <Camera size={24} />
                </button>
                
                <input 
                  type="file" 
                  id="avatar-upload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>
              
              {/* المعلومات الأساسية */}
              <div className="flex-1 text-center md:text-right">
                {isEditing ? (
                  <div className="space-y-3 mb-4">
                    <input
                      type="text"
                      name="fullName"
                      value={editData.fullName}
                      onChange={handleInputChange}
                      placeholder="الاسم الكامل"
                      className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={editData.phone}
                      onChange={handleInputChange}
                      placeholder="رقم الجوال (05xxxxxxxx)"
                      className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      dir="ltr"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                      {userData.fullName}
                    </h1>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600 dark:text-gray-300">
                        <Mail size={16} />
                        <span>{userData.email}</span>
                      </div>
                      
                      {userData.phone && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600 dark:text-gray-300">
                          <Phone size={16} />
                          <span dir="ltr">{userData.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        userData.type === 'guide' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {userData.type === 'guide' ? (
                          <span className="flex items-center gap-1">
                            <Shield size={14} />
                            مرشد سياحي
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            مستخدم عادي
                          </span>
                        )}
                      </span>
                      
                      <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar size={14} />
                        {new Date(userData.createdAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </>
                )}

                {/* أزرار التحكم */}
                <div className="flex gap-2 justify-center md:justify-start">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={handleSaveProfile}
                        disabled={saveLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {saveLoading ? (
                          <>
                            <span className="animate-spin">🌀</span>
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            حفظ
                          </>
                        )}
                      </button>
                      <button 
                        onClick={handleEditToggle}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm flex items-center gap-2"
                      >
                        <X size={16} />
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={handleEditToggle}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-2"
                    >
                      <Edit2 size={16} />
                      تعديل الملف
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* إحصائيات */}
          <div className="grid grid-cols-3 divide-x dark:divide-gray-700 border-b dark:border-gray-700">
            <div className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.trips}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <MapPin size={14} />
                رحلات
              </div>
            </div>
            <div className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.reviews}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <Star size={14} />
                تقييمات
              </div>
            </div>
            <div className="p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.favorites}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <Heart size={14} />
                مفضلة
              </div>
            </div>
          </div>

          {/* قائمة الإعدادات */}
          <div className="p-6 space-y-3">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">الإعدادات</h3>
            
            <button 
              onClick={navigateToSettings}
              className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-right hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-between group"
            >
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-3">
                <Settings size={18} className="text-gray-600" />
                الإعدادات العامة
              </span>
              <span className="text-gray-400 group-hover:translate-x-1 transition-transform">←</span>
            </button>
            
            <button 
              onClick={navigateToNotifications}
              className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-right hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-between group"
            >
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-3">
                <Bell size={18} className="text-yellow-600" />
                الإشعارات
              </span>
              <span className="text-gray-400 group-hover:translate-x-1 transition-transform">←</span>
            </button>
            
            <button 
              onClick={navigateToLanguage}
              className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-right hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-between group"
            >
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-3">
                <Globe size={18} className="text-purple-600" />
                اللغة
              </span>
              <span className="text-gray-400">{lang === 'ar' ? 'العربية' : 'English'}</span>
            </button>
            
            <div className="border-t dark:border-gray-700 my-4"></div>
            
            <button 
              onClick={handleLogout}
              className="w-full p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-right hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-between group"
            >
              <span className="text-red-600 dark:text-red-400 flex items-center gap-3">
                <LogOut size={18} />
                تسجيل الخروج
              </span>
              <span className="text-red-400 group-hover:translate-x-1 transition-transform">←</span>
            </button>
          </div>
        </div>

        {/* نشاطات المستخدم */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">آخر النشاطات</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-gray-800 dark:text-white font-medium">جولة في الدرعية</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">منذ يومين</p>
              </div>
              <span className="text-sm text-green-600 dark:text-green-400">مكتملة</span>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-gray-800 dark:text-white font-medium">تقييم مرشد</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">منذ ٥ أيام</p>
              </div>
              <span className="text-sm text-blue-600 dark:text-blue-400">جديد</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 
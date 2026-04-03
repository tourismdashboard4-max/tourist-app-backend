// client/src/pages/GuideDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Package, CheckCircle, XCircle, Edit2, Trash2,
  Users, DollarSign, Clock, MapPin, Eye, EyeOff,
  ArrowLeft, Shield, RefreshCw, Search, Navigation,
  Star, Calendar, AlertCircle, Map, Layers, Image, Upload, Camera
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const GuideDashboard = ({ lang, guide, setPage, user, setUserPrograms, onProgramAdded }) => {
  const { updateUser } = useAuth();
  
  const [programs, setPrograms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);
  const editImageInputRef = useRef(null);
  
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalRevenue: 0,
    pendingRequests: 0,
    activePrograms: 0
  });
  
  const [newProgram, setNewProgram] = useState({
    name: "",
    description: "",
    location: "",
    price: "",
    duration: "",
    maxParticipants: "",
    location_lat: "",
    location_lng: "",
    image: null,
    imagePreview: null
  });

  // ✅ التحقق من أن المستخدم مرشد
  const isGuide = user?.role === 'guide' || 
                  user?.type === 'guide' || 
                  user?.isGuide === true || 
                  user?.guide_status === 'approved';

  // ✅ تحديث الخريطة بالبرامج النشطة وحفظها في localStorage العام
  const updateMapWithPrograms = useCallback((programsList) => {
    if (setUserPrograms) {
      const activePrograms = programsList.filter(p => p.status === 'active');
      const mapPrograms = activePrograms.map(p => ({
        id: p.id,
        name_ar: p.name,
        name_en: p.name,
        guide_name: p.guide_name || user?.fullName || guide?.name || "مرشد سياحي",
        guide_id: p.guide_id || user?.id || guide?.id,
        coords: p.coords || (p.location_lng && p.location_lat ? [p.location_lng, p.location_lat] : null),
        price: p.price,
        duration: p.duration,
        rating: p.rating || 4.5,
        distance: p.distance || null,
        active: true,
        location_name: p.location_name || p.location,
        description: p.description,
        maxParticipants: p.maxParticipants,
        currentParticipants: p.participants || 0,
        participants: p.participants || 0,
        created_at: p.created_at,
        image: p.image || null
      })).filter(p => p.coords !== null);
      
      setUserPrograms(mapPrograms);
      console.log('🗺️ Updated map with programs:', mapPrograms.length);
      
      // ✅ حفظ في localStorage العام ليتمكن جميع المستخدمين من رؤيتها
      localStorage.setItem('public_programs', JSON.stringify(mapPrograms));
      console.log('💾 Saved to public storage:', mapPrograms.length);
    }
  }, [setUserPrograms, user?.fullName, guide?.name, user?.id, guide?.id]);

  // ✅ حفظ البرامج في localStorage الخاص بالمرشد
  const saveProgramsToLocal = useCallback((programsList) => {
    const guideId = user?.id || guide?.id;
    if (guideId) {
      localStorage.setItem(`guide_programs_${guideId}`, JSON.stringify(programsList));
      console.log('💾 Saved', programsList.length, 'programs to guide storage');
    }
    // ✅ تحديث التخزين العام أيضاً
    updateMapWithPrograms(programsList);
  }, [user?.id, guide?.id, updateMapWithPrograms]);

  // ✅ رفع الصورة وتحويلها إلى Base64
  const uploadProgramImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ✅ معالجة اختيار صورة للإضافة
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار ملف صورة صالح');
      return;
    }
    
    setUploadingImage(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProgram(prev => ({
        ...prev,
        image: file,
        imagePreview: reader.result
      }));
      setUploadingImage(false);
      toast.success('تم تحميل الصورة بنجاح');
    };
    reader.onerror = () => {
      setUploadingImage(false);
      toast.error('فشل تحميل الصورة');
    };
    reader.readAsDataURL(file);
  };

  // ✅ معالجة اختيار صورة للتعديل
  const handleEditImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار ملف صورة صالح');
      return;
    }
    
    setUploadingImage(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProgram(prev => ({
        ...prev,
        image: file,
        imagePreview: reader.result
      }));
      setUploadingImage(false);
      toast.success('تم تحديث الصورة');
    };
    reader.onerror = () => {
      setUploadingImage(false);
      toast.error('فشل تحميل الصورة');
    };
    reader.readAsDataURL(file);
  };

  // ✅ الحصول على إحداثيات الموقع باستخدام Mapbox
  const getCoordinatesFromLocation = async (locationName) => {
    if (!locationName) return null;
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw&limit=1`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng, coords: [lng, lat], place_name: data.features[0].place_name };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  // ✅ تحميل البرامج من localStorage عند بدء التشغيل
  const loadInitialPrograms = useCallback(() => {
    const guideId = user?.id || guide?.id;
    if (guideId) {
      const saved = localStorage.getItem(`guide_programs_${guideId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            setPrograms(parsed);
            updateMapWithPrograms(parsed);
            
            const activeProgs = parsed.filter(p => p.status === 'active');
            setStats({
              totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
              totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0),
              pendingRequests: requests.filter(r => r.status === 'pending').length,
              activePrograms: activeProgs.length
            });
            console.log('📦 Loaded', parsed.length, 'programs from localStorage');
            return true;
          }
        } catch (e) {
          console.error('Error parsing saved programs:', e);
        }
      }
    }
    return false;
  }, [user?.id, guide?.id, updateMapWithPrograms, requests]);

  // ✅ تحميل البرامج عند بدء التشغيل (مرة واحدة فقط)
  useEffect(() => {
    loadInitialPrograms();
    setLoading(false);
  }, [loadInitialPrograms]);

  // ✅ إضافة برنامج جديد مع صورة وحفظ في قاعدة البيانات
  const handleAddProgram = async () => {
    if (!newProgram.name.trim()) {
      toast.error(lang === 'ar' ? 'الرجاء إدخال اسم البرنامج' : 'Please enter program name');
      return;
    }
    
    if (!newProgram.location.trim()) {
      toast.error(lang === 'ar' ? 'الرجاء إدخال موقع البرنامج' : 'Please enter program location');
      return;
    }
    
    setLoading(true);
    try {
      const guideId = user?.id || guide?.id;
      
      toast.loading('جاري تحديد موقع البرنامج على الخريطة...', { id: 'geocoding' });
      
      let locationData = await getCoordinatesFromLocation(newProgram.location);
      
      if (!locationData) {
        locationData = { lat: 24.7136, lng: 46.6753, coords: [46.6753, 24.7136], place_name: 'الرياض، المملكة العربية السعودية' };
        toast.warning('لم نتمكن من تحديد الموقع بدقة، سيتم استخدام موقع افتراضي', { id: 'geocoding' });
      } else {
        toast.success('تم تحديد موقع البرنامج بنجاح', { id: 'geocoding' });
      }
      
      let imageUrl = null;
      if (newProgram.image) {
        imageUrl = await uploadProgramImage(newProgram.image);
      }
      
      const newProgramObj = {
        id: Date.now(),
        name: newProgram.name,
        description: newProgram.description,
        price: parseFloat(newProgram.price) || 0,
        duration: newProgram.duration || "غير محدد",
        maxParticipants: parseInt(newProgram.maxParticipants) || 20,
        location: newProgram.location,
        location_name: locationData.place_name || newProgram.location,
        coords: locationData.coords,
        location_lat: locationData.lat,
        location_lng: locationData.lng,
        status: 'active',
        participants: 0,
        guide_id: guideId,
        guide_name: user?.fullName || guide?.name,
        created_at: new Date().toISOString(),
        rating: 4.5,
        image: imageUrl
      };
      
      // ✅ حفظ في قاعدة البيانات عبر API
      try {
        const token = localStorage.getItem('token');
        console.log('📤 Sending program to API:', newProgramObj);
        
        const response = await fetch('https://tourist-app-api.onrender.com/api/programs', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            guide_id: guideId,
            name: newProgram.name,
            description: newProgram.description,
            price: parseFloat(newProgram.price) || 0,
            duration: newProgram.duration,
            max_participants: parseInt(newProgram.maxParticipants) || 20,
            location: newProgram.location,
            location_name: locationData.place_name,
            location_lat: locationData.lat,
            location_lng: locationData.lng,
            image: imageUrl,
            status: 'active'
          })
        });
        
        const data = await response.json();
        if (data.success && data.program) {
          newProgramObj.id = data.program.id;
          console.log('✅ Program saved to database:', data.program);
          toast.success('تم حفظ البرنامج في قاعدة البيانات');
        } else {
          console.log('⚠️ API response:', data);
          toast.warning('تم الحفظ محلياً فقط');
        }
      } catch (apiError) {
        console.error('❌ API error, saving to localStorage only:', apiError);
        toast.error('فشل الحفظ في قاعدة البيانات، تم الحفظ محلياً فقط');
      }
      
      // حفظ في localStorage
      const updatedPrograms = [...programs, newProgramObj];
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      
      const activeProgs = updatedPrograms.filter(p => p.status === 'active');
      setStats({
        totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
        totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0),
        pendingRequests: stats.pendingRequests,
        activePrograms: activeProgs.length
      });
      
      setNewProgram({
        name: "", description: "", location: "", price: "", duration: "", maxParticipants: "", location_lat: "", location_lng: "", image: null, imagePreview: null
      });
      setShowAddProgram(false);
      
      if (onProgramAdded) onProgramAdded();
      toast.success(lang === 'ar' ? '✅ تم إضافة البرنامج وسيظهر للجميع على الخريطة' : '✅ Program added and will appear on the map');
      
    } catch (error) {
      console.error('Error adding program:', error);
      toast.error(lang === 'ar' ? '❌ حدث خطأ في إضافة البرنامج' : '❌ Error adding program');
    } finally {
      setLoading(false);
    }
  };

  // ✅ تحديث حالة البرنامج
  const toggleProgramStatus = async (programId, currentStatus) => {
    setLoading(true);
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      // محاولة تحديث في API
      try {
        const token = localStorage.getItem('token');
        await fetch(`https://tourist-app-api.onrender.com/api/programs/${programId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (apiError) {
        console.log('API status update failed:', apiError);
      }
      
      const updatedPrograms = programs.map(program => 
        program.id === programId ? { ...program, status: newStatus } : program
      );
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      
      const activeProgs = updatedPrograms.filter(p => p.status === 'active');
      setStats(prev => ({
        ...prev,
        activePrograms: activeProgs.length,
        totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
        totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0)
      }));
      
      if (onProgramAdded) onProgramAdded();
      toast.success(lang === 'ar' 
        ? (newStatus === 'active' ? '✅ تم تفعيل البرنامج وسيظهر للجميع' : '⏸ تم إيقاف البرنامج ولن يظهر للجميع')
        : (newStatus === 'active' ? '✅ Program activated and will appear to everyone' : '⏸ Program deactivated and will not appear'));
        
    } catch (error) {
      console.error('Error toggling program status:', error);
      toast.error(lang === 'ar' ? '❌ فشل تحديث حالة البرنامج' : '❌ Failed to update program status');
    } finally {
      setLoading(false);
    }
  };

  // ✅ دالة حذف البرنامج
  const handleDeleteProgram = async (programId) => {
    if (!confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من حذف هذا البرنامج؟ لا يمكن التراجع عن هذا الإجراء.' : '⚠️ Are you sure you want to delete this program? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      // محاولة حذف من API
      try {
        const token = localStorage.getItem('token');
        await fetch(`https://tourist-app-api.onrender.com/api/programs/${programId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (apiError) {
        console.log('API delete failed:', apiError);
      }
      
      const updatedPrograms = programs.filter(p => p.id !== programId);
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      
      if (onProgramAdded) onProgramAdded();
      toast.success(lang === 'ar' ? '✅ تم حذف البرنامج بنجاح' : '✅ Program deleted successfully');
      
    } catch (error) {
      console.error('Error deleting program:', error);
      toast.error(lang === 'ar' ? '❌ حدث خطأ في حذف البرنامج' : '❌ Error deleting program');
    } finally {
      setLoading(false);
    }
  };

  // ✅ دالة فتح نافذة التعديل
  const openEditModal = (program) => {
    setEditingProgram(program);
    setNewProgram({
      name: program.name || "",
      description: program.description || "",
      location: program.location_name || program.location || "",
      price: program.price || "",
      duration: program.duration || "",
      maxParticipants: program.maxParticipants || "",
      location_lat: program.location_lat || "",
      location_lng: program.location_lng || "",
      image: null,
      imagePreview: program.image || null
    });
    setShowEditModal(true);
  };

  // ✅ دالة تحديث البرنامج
  const handleUpdateProgram = async () => {
    if (!editingProgram) {
      toast.error(lang === 'ar' ? 'لا يوجد برنامج للتعديل' : 'No program to edit');
      return;
    }
    
    setLoading(true);
    try {
      let imageUrl = editingProgram.image;
      
      if (newProgram.image && newProgram.image !== editingProgram.image) {
        imageUrl = await uploadProgramImage(newProgram.image);
      }
      
      const updateData = {
        name: newProgram.name,
        description: newProgram.description,
        price: parseFloat(newProgram.price),
        duration: newProgram.duration,
        maxParticipants: parseInt(newProgram.maxParticipants),
        location: newProgram.location,
        location_name: newProgram.location,
        location_lat: parseFloat(newProgram.location_lat) || editingProgram.location_lat,
        location_lng: parseFloat(newProgram.location_lng) || editingProgram.location_lng,
        image: imageUrl,
        status: editingProgram.status
      };
      
      // محاولة تحديث في API
      try {
        const token = localStorage.getItem('token');
        await fetch(`https://tourist-app-api.onrender.com/api/programs/${editingProgram.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
      } catch (apiError) {
        console.log('API update failed:', apiError);
      }
      
      const updatedPrograms = programs.map(p => 
        p.id === editingProgram.id 
          ? { ...p, ...updateData }
          : p
      );
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      
      setShowEditModal(false);
      setEditingProgram(null);
      setNewProgram({
        name: "", description: "", location: "", price: "", duration: "", maxParticipants: "", location_lat: "", location_lng: "", image: null, imagePreview: null
      });
      
      if (onProgramAdded) onProgramAdded();
      toast.success(lang === 'ar' ? '✅ تم تحديث البرنامج بنجاح' : '✅ Program updated successfully');
      
    } catch (error) {
      console.error('Error updating program:', error);
      toast.error(lang === 'ar' ? '❌ حدث خطأ في تحديث البرنامج' : '❌ Error updating program');
    } finally {
      setLoading(false);
    }
  };

  // ✅ تصفية البرامج
  const filteredPrograms = programs.filter(program => {
    if (statusFilter !== 'all' && program.status !== statusFilter) return false;
    if (searchTerm && !program.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // ✅ إذا لم يكن المستخدم مرشداً
  if (!isGuide) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {lang === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {lang === 'ar' 
              ? 'هذه الصفحة مخصصة للمرشدين السياحيين فقط.'
              : 'This page is only available for tour guides.'}
          </p>
          <button
            onClick={() => setPage('profile')}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
          >
            {lang === 'ar' ? 'العودة للملف الشخصي' : 'Back to Profile'}
          </button>
        </div>
      </div>
    );
  }

  if (loading && programs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'ar' ? 'جاري تحميل لوحة المرشد...' : 'Loading guide dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      {/* زر العودة */}
      <div className="mb-4">
        <button
          onClick={() => setPage('home')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 transition"
        >
          <ArrowLeft size={20} />
          <span>{lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
        </button>
      </div>

      {/* رأس الصفحة */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{lang === "ar" ? "لوحة تحكم المرشد" : "Guide Dashboard"}</h1>
            <p className="opacity-90 mt-1">{user?.fullName || guide?.name || "مرشد سياحي"}</p>
            <div className="flex items-center mt-2">
              <CheckCircle className="w-5 h-5 ml-1" />
              <span className="text-sm">{lang === "ar" ? "حساب مرشد معتمد" : "Verified Guide Account"}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.activePrograms}</div>
            <div className="text-sm opacity-90">{lang === "ar" ? "برنامج نشط" : "Active Programs"}</div>
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <Users className="w-6 h-6 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {stats.totalParticipants}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{lang === "ar" ? "مشاركين" : "Participants"}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <DollarSign className="w-6 h-6 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {stats.totalRevenue} ريال
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{lang === "ar" ? "إجمالي الإيرادات" : "Total Revenue"}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <Clock className="w-6 h-6 text-yellow-600 mb-2" />
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {stats.pendingRequests}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{lang === "ar" ? "طلبات جديدة" : "New Requests"}</div>
        </div>
      </div>

      {/* طلبات المشاركة */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {lang === "ar" ? "طلبات المشاركة" : "Participation Requests"}
          </h2>
          {stats.pendingRequests > 0 && (
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded text-sm">
              {stats.pendingRequests} {lang === "ar" ? "قيد الانتظار" : "Pending"}
            </span>
          )}
        </div>
        
        {requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">
              {lang === "ar" ? "لا توجد طلبات مشاركة حالياً" : "No participation requests yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-white">{request.user_name || request.userName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{request.program_name || request.programName}</p>
                    <p className="text-xs text-gray-500">{new Date(request.created_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      request.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      request.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {request.status === "pending" ? (lang === "ar" ? "بانتظار الموافقة" : "Pending") :
                       request.status === "approved" ? (lang === "ar" ? "موافق عليه" : "Approved") : 
                       (lang === "ar" ? "مكتمل" : "Completed")}
                    </span>
                    
                    {request.status === "pending" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setRequests(prev => prev.map(r => 
                              r.id === request.id ? { ...r, status: "approved" } : r
                            ));
                            setStats(prev => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
                            toast.success(lang === 'ar' ? '✅ تمت الموافقة على الطلب' : '✅ Request approved');
                          }}
                          className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs hover:bg-green-200 transition"
                        >
                          {lang === "ar" ? "موافقة" : "Approve"}
                        </button>
                        <button
                          onClick={() => {
                            setRequests(prev => prev.map(r => 
                              r.id === request.id ? { ...r, status: "rejected" } : r
                            ));
                            setStats(prev => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
                            toast.success(lang === 'ar' ? '❌ تم رفض الطلب' : '❌ Request rejected');
                          }}
                          className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs hover:bg-red-200 transition"
                        >
                          {lang === "ar" ? "رفض" : "Reject"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* برامج المرشد */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {lang === "ar" ? "برامجي السياحية" : "My Programs"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {lang === "ar" 
                ? "📍 البرامج النشطة تظهر تلقائياً على الخريطة الرئيسية" 
                : "📍 Active programs appear automatically on the main map"}
            </p>
          </div>
          <button
            onClick={() => setShowAddProgram(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition flex items-center gap-2 text-sm shadow-md"
          >
            <Plus className="w-4 h-4" />
            {lang === "ar" ? "إضافة برنامج جديد" : "Add New Program"}
          </button>
        </div>

        {/* شريط البحث والتصفية */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={lang === "ar" ? "بحث في البرامج..." : "Search programs..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          >
            <option value="all">{lang === "ar" ? "الكل" : "All"}</option>
            <option value="active">{lang === "ar" ? "نشط" : "Active"}</option>
            <option value="inactive">{lang === "ar" ? "غير نشط" : "Inactive"}</option>
          </select>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-3 text-lg">
              {searchTerm ? (lang === "ar" ? "لا توجد نتائج مطابقة" : "No matching results") : (lang === "ar" ? "لا توجد برامج بعد" : "No programs yet")}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              {lang === "ar" 
                ? "أضف برنامجك الأول وسيظهر على الخريطة لجميع المستخدمين" 
                : "Add your first program and it will appear on the map for all users"}
            </p>
            <button
              onClick={() => setShowAddProgram(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2 mx-auto shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">{lang === "ar" ? "➕ أضف برنامجك الأول" : "➕ Add Your First Program"}</span>
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {lang === "ar" ? `📊 لديك ${filteredPrograms.length} برنامج` : `📊 You have ${filteredPrograms.length} program(s)`}
              </span>
              <button 
                onClick={() => {
                  updateMapWithPrograms(programs);
                  toast.success(lang === 'ar' ? '🗺️ تم تحديث الخريطة' : '🗺️ Map updated');
                }}
                className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {lang === "ar" ? "تحديث الخريطة" : "Refresh Map"}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPrograms.map((program) => (
                <div key={program.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    {/* صورة البرنامج */}
                    <div className="flex-shrink-0">
                      {program.image ? (
                        <img 
                          src={program.image} 
                          alt={program.name}
                          className="w-20 h-20 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div class="w-20 h-20 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center"><svg class="w-8 h-8 text-green-500" ...></svg></div>';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                          <Package className="w-8 h-8 text-green-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{program.name}</h3>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          program.status === "active" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {program.status === "active" ? (lang === "ar" ? "✓ نشط" : "Active") : (lang === "ar" ? "○ غير نشط" : "Inactive")}
                        </span>
                        {program.coords && (
                          <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {lang === "ar" ? "يظهر على الخريطة" : "On Map"}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">{program.description || (lang === "ar" ? "لا يوجد وصف" : "No description")}</p>
                      
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="text-sm">
                          <div className="text-gray-500 text-xs">{lang === "ar" ? "السعر" : "Price"}</div>
                          <div className="font-medium text-green-600">{program.price} ريال</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-500 text-xs">{lang === "ar" ? "المدة" : "Duration"}</div>
                          <div className="font-medium">{program.duration}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-500 text-xs">{lang === "ar" ? "المشاركين" : "Participants"}</div>
                          <div className="font-medium">{program.participants || 0}/{program.maxParticipants || 20}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-3 h-3 text-green-600" />
                        <span className="text-xs truncate">{program.location_name || program.location || (lang === "ar" ? "موقع غير محدد" : "Location not specified")}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleProgramStatus(program.id, program.status)}
                        className={`px-3 py-1.5 rounded-xl text-sm transition flex items-center gap-1 font-medium ${
                          program.status === "active"
                            ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                        title={program.status === "active" ? (lang === "ar" ? "إيقاف البرنامج" : "Deactivate") : (lang === "ar" ? "تفعيل البرنامج" : "Activate")}
                      >
                        {program.status === "active" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{program.status === "active" ? (lang === "ar" ? "إيقاف" : "Off") : (lang === "ar" ? "تفعيل" : "On")}</span>
                      </button>
                      
                      <button
                        onClick={() => openEditModal(program)}
                        className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-xl text-sm hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 transition flex items-center gap-1 font-medium"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{lang === "ar" ? "تعديل" : "Edit"}</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProgram(program.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-xl text-sm hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === "ar" ? "حذف" : "Delete"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* نافذة إضافة برنامج جديد مع رفع الصورة */}
      {showAddProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 rounded-t-2xl sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-white" />
                  <h3 className="text-white font-bold text-xl">{lang === "ar" ? "إضافة برنامج سياحي جديد" : "Add New Tour Program"}</h3>
                </div>
                <button onClick={() => setShowAddProgram(false)} className="text-white/80 hover:text-white transition">
                  <XCircle size={28} />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-2">
                {lang === "ar" 
                  ? '📍 سيظهر هذا البرنامج على الخريطة الرئيسية ليراها جميع المستخدمين ويمكنهم حجزه' 
                  : '📍 This program will appear on the main map for all users to see and book'}
              </p>
            </div>
            
            <div className="p-6 space-y-5">
              {/* رفع الصورة */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "صورة البرنامج" : "Program Image"}
                </label>
                <div 
                  onClick={() => imageInputRef.current?.click()}
                  className="relative w-full h-40 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-green-500 transition overflow-hidden"
                >
                  {newProgram.imagePreview ? (
                    <img 
                      src={newProgram.imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Camera className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {lang === "ar" ? "اضغط لرفع صورة" : "Click to upload image"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {lang === "ar" ? "jpg, png, gif - حد أقصى 2MB" : "jpg, png, gif - max 2MB"}
                      </p>
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                    </div>
                  )}
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "اسم البرنامج *" : "Program Name *"}
                </label>
                <input
                  type="text"
                  placeholder={lang === "ar" ? "مثال: جولة تاريخية في الدرعية" : "e.g., Historical Tour in Diriyah"}
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "وصف البرنامج" : "Program Description"}
                </label>
                <textarea
                  placeholder={lang === "ar" ? "وصف تفصيلي للبرنامج..." : "Detailed program description..."}
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  rows="3"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {lang === "ar" ? "السعر (ريال)" : "Price (SAR)"}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProgram.price}
                    onChange={(e) => setNewProgram({...newProgram, price: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {lang === "ar" ? "المدة" : "Duration"}
                  </label>
                  <input
                    type="text"
                    placeholder="3 ساعات"
                    value={newProgram.duration}
                    onChange={(e) => setNewProgram({...newProgram, duration: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "الموقع *" : "Location *"}
                </label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={lang === "ar" ? "الرياض، الدرعية" : "Riyadh, Diriyah"}
                    value={newProgram.location}
                    onChange={(e) => setNewProgram({...newProgram, location: e.target.value})}
                    className="w-full p-3 pr-10 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "العدد الأقصى للمشاركين" : "Maximum Participants"}
                </label>
                <input
                  type="number"
                  placeholder="20"
                  value={newProgram.maxParticipants}
                  onChange={(e) => setNewProgram({...newProgram, maxParticipants: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl">
                <p className="text-sm text-green-700 dark:text-green-400 text-center flex items-center justify-center gap-2">
                  <Map className="w-4 h-4" />
                  {lang === "ar" 
                    ? '🌍 بعد إضافة البرنامج، سيظهر فوراً على الخريطة الرئيسية' 
                    : '🌍 After adding the program, it will immediately appear on the main map'}
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddProgram}
                  disabled={loading || uploadingImage}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                >
                  {loading || uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>{lang === "ar" ? "جاري الإضافة..." : "Adding..."}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>{lang === "ar" ? "إضافة البرنامج ونشره على الخريطة" : "Add Program & Publish to Map"}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowAddProgram(false)}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل البرنامج مع رفع الصورة */}
      {showEditModal && editingProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-6 h-6 text-white" />
                  <h3 className="text-white font-bold text-xl">{lang === "ar" ? "تعديل البرنامج" : "Edit Program"}</h3>
                </div>
                <button onClick={() => {
                  setShowEditModal(false);
                  setEditingProgram(null);
                }} className="text-white/80 hover:text-white transition">
                  <XCircle size={28} />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-2">
                📍 {lang === "ar" 
                  ? 'بعد التعديل، سيتم تحديث البرنامج على الخريطة تلقائياً' 
                  : 'After editing, the program will be automatically updated on the map'}
              </p>
            </div>
            
            <div className="p-6 space-y-5">
              {/* تعديل الصورة */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "صورة البرنامج" : "Program Image"}
                </label>
                <div 
                  onClick={() => editImageInputRef.current?.click()}
                  className="relative w-full h-40 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-yellow-500 transition overflow-hidden"
                >
                  {newProgram.imagePreview ? (
                    <img 
                      src={newProgram.imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Image className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {lang === "ar" ? "تغيير الصورة" : "Change image"}
                      </p>
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                    </div>
                  )}
                </div>
                <input
                  ref={editImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageSelect}
                  className="hidden"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "اسم البرنامج *" : "Program Name *"}
                </label>
                <input
                  type="text"
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "وصف البرنامج" : "Program Description"}
                </label>
                <textarea
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  rows="3"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {lang === "ar" ? "السعر (ريال)" : "Price (SAR)"}
                  </label>
                  <input
                    type="number"
                    value={newProgram.price}
                    onChange={(e) => setNewProgram({...newProgram, price: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {lang === "ar" ? "المدة" : "Duration"}
                  </label>
                  <input
                    type="text"
                    value={newProgram.duration}
                    onChange={(e) => setNewProgram({...newProgram, duration: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "الموقع" : "Location"}
                </label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={newProgram.location}
                    onChange={(e) => setNewProgram({...newProgram, location: e.target.value})}
                    className="w-full p-3 pr-10 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "ar" ? "العدد الأقصى" : "Maximum Participants"}
                </label>
                <input
                  type="number"
                  value={newProgram.maxParticipants}
                  onChange={(e) => setNewProgram({...newProgram, maxParticipants: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateProgram}
                  disabled={loading || uploadingImage}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold hover:from-yellow-700 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading || uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>{lang === "ar" ? "جاري الحفظ..." : "Saving..."}</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-5 h-5" />
                      <span>{lang === "ar" ? "حفظ التغييرات وتحديث الخريطة" : "Save Changes & Update Map"}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProgram(null);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideDashboard;

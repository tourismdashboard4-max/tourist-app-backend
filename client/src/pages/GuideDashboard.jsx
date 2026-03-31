// client/src/pages/GuideDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Package, CheckCircle, XCircle, Edit2, Trash2,
  Users, DollarSign, Clock, MapPin, Eye, EyeOff,
  ArrowLeft, Shield, RefreshCw
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
    location_lng: ""
  });

  // ✅ حفظ البرامج في localStorage العام (ليراها جميع المستخدمين)
  const saveToPublicStorage = (programsList) => {
    const activePrograms = programsList.filter(p => p.status === 'active');
    const publicPrograms = activePrograms.map(p => ({
      id: p.id,
      name: p.name,
      name_ar: p.name,
      name_en: p.name,
      guide_name: p.guide_name,
      guide_id: p.guide_id,
      coords: p.coords,
      location_lng: p.location_lng,
      location_lat: p.location_lat,
      price: p.price,
      duration: p.duration,
      description: p.description,
      location_name: p.location_name || p.location,
      maxParticipants: p.maxParticipants,
      participants: p.participants || 0,
      status: p.status,
      created_at: p.created_at
    }));
    
    localStorage.setItem('public_programs', JSON.stringify(publicPrograms));
    console.log('💾 Saved', publicPrograms.length, 'programs to public storage');
    
    // تحديث الخريطة مباشرة
    if (setUserPrograms) {
      setUserPrograms(publicPrograms);
    }
  };

  // ✅ تحميل البرامج العامة عند بدء التشغيل
  const loadPublicPrograms = () => {
    const saved = localStorage.getItem('public_programs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (setUserPrograms && parsed.length > 0) {
          setUserPrograms(parsed);
          console.log('📦 Loaded', parsed.length, 'public programs');
        }
      } catch(e) {
        console.error('Error parsing public programs:', e);
      }
    }
  };

  // ✅ التحقق من أن المستخدم مرشد
  const isGuide = user?.role === 'guide' || 
                  user?.type === 'guide' || 
                  user?.isGuide === true || 
                  user?.guide_status === 'approved';

  // ✅ تحديث الخريطة بالبرامج النشطة
  const updateMapWithPrograms = (programsList) => {
    if (setUserPrograms) {
      const activePrograms = programsList.filter(p => p.status === 'active');
      const mapPrograms = activePrograms.map(p => ({
        id: p.id,
        name_ar: p.name,
        name_en: p.name,
        guide_name: p.guide_name || user?.fullName || guide?.name || "مرشد سياحي",
        guide_id: p.guide_id || user?.id || guide?.id,
        coords: p.coords || [p.location_lng, p.location_lat],
        price: p.price,
        duration: p.duration,
        rating: p.rating || null,
        distance: null,
        active: true,
        location_name: p.location_name || p.location,
        description: p.description,
        maxParticipants: p.maxParticipants,
        currentParticipants: p.participants || 0,
        participants: p.participants || 0,
        created_at: p.created_at
      }));
      setUserPrograms(mapPrograms);
      console.log('🗺️ Updated map with programs:', mapPrograms.length);
    }
  };

  // ✅ حفظ البرامج في localStorage الخاص بالمرشد
  const saveProgramsToLocal = (programsList) => {
    const guideId = user?.id || guide?.id;
    if (guideId) {
      localStorage.setItem(`guide_programs_${guideId}`, JSON.stringify(programsList));
      console.log('💾 Saved', programsList.length, 'programs to localStorage (guide)');
    }
    // ✅ حفظ في التخزين العام أيضاً
    saveToPublicStorage(programsList);
  };

  // ✅ الحصول على جميع البرامج العامة
  const getAllPublicPrograms = () => {
    const saved = localStorage.getItem('public_programs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch(e) {
        return [];
      }
    }
    return [];
  };

  // ✅ تحميل البرامج العامة عند بدء التشغيل
  useEffect(() => {
    const publicPrograms = getAllPublicPrograms();
    if (publicPrograms.length > 0 && setUserPrograms) {
      setUserPrograms(publicPrograms);
      console.log('📦 Loaded', publicPrograms.length, 'public programs on startup');
    }
  }, []);

  // ✅ تحميل البرامج من localStorage الخاص بالمرشد
  const loadProgramsFromLocal = () => {
    const guideId = user?.id || guide?.id;
    if (guideId) {
      const saved = localStorage.getItem(`guide_programs_${guideId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPrograms(parsed);
          updateMapWithPrograms(parsed);
          saveToPublicStorage(parsed);
          
          const activeProgs = parsed.filter(p => p.status === 'active');
          setStats({
            totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
            totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0),
            pendingRequests: requests.filter(r => r.status === 'pending').length,
            activePrograms: activeProgs.length
          });
          console.log('📦 Loaded', parsed.length, 'programs from localStorage (guide)');
          return true;
        } catch (e) {
          console.error('Error parsing saved programs:', e);
        }
      }
    }
    return false;
  };

  // ✅ تحديث الخريطة تلقائياً عند تغيير البرامج
  useEffect(() => {
    if (setUserPrograms && programs.length > 0) {
      const activePrograms = programs.filter(p => p.status === 'active');
      const mapPrograms = activePrograms.map(p => ({
        id: p.id,
        name_ar: p.name,
        name_en: p.name,
        guide_name: p.guide_name || user?.fullName || guide?.name || "مرشد سياحي",
        guide_id: p.guide_id || user?.id || guide?.id,
        coords: p.coords || [p.location_lng, p.location_lat],
        price: p.price,
        duration: p.duration,
        rating: null,
        distance: null,
        active: true,
        location_name: p.location_name || p.location,
        description: p.description,
        maxParticipants: p.maxParticipants,
        currentParticipants: p.participants || 0,
        participants: p.participants || 0
      }));
      setUserPrograms(mapPrograms);
      console.log('🗺️ [Auto] Updated map with', mapPrograms.length, 'programs');
      if (onProgramAdded) onProgramAdded();
    } else if (setUserPrograms && programs.length === 0) {
      setUserPrograms([]);
      console.log('🗺️ [Auto] No programs to display');
    }
  }, [programs, setUserPrograms, onProgramAdded, user, guide]);

  // ✅ تحميل البرامج المحفوظة عند بدء التشغيل للمرشد
  useEffect(() => {
    const guideId = user?.id || guide?.id;
    if (guideId) {
      const saved = localStorage.getItem(`guide_programs_${guideId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            setPrograms(parsed);
            console.log('📦 Startup: Loaded', parsed.length, 'programs from localStorage');
            
            if (setUserPrograms) {
              const activePrograms = parsed.filter(p => p.status === 'active');
              const mapPrograms = activePrograms.map(p => ({
                id: p.id,
                name_ar: p.name,
                name_en: p.name,
                guide_name: p.guide_name || user?.fullName || guide?.name,
                guide_id: p.guide_id || guideId,
                coords: p.coords,
                price: p.price,
                duration: p.duration,
                rating: null,
                distance: null,
                active: true,
                location_name: p.location_name,
                description: p.description,
                maxParticipants: p.maxParticipants,
                currentParticipants: p.participants || 0
              }));
              setUserPrograms(mapPrograms);
              if (onProgramAdded) onProgramAdded();
            }
          }
        } catch(e) {
          console.error('Error parsing saved programs:', e);
        }
      }
    }
  }, [user?.id, guide?.id]);

  // ✅ جلب برامج المرشد من API
  const fetchGuidePrograms = async () => {
    if (!isGuide) {
      console.log('User is not a guide');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const guideId = user?.id || guide?.id;
      
      if (!guideId) {
        console.error('No guide ID found');
        if (!loadProgramsFromLocal()) {
          setPrograms([]);
        }
        setLoading(false);
        return;
      }
      
      console.log('📥 Fetching programs for guide:', guideId);
      
      try {
        const response = await api.get(`/api/guides/${guideId}/programs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data?.success && response.data.programs) {
          const programsData = response.data.programs;
          setPrograms(programsData);
          saveProgramsToLocal(programsData);
          saveToPublicStorage(programsData);
          updateMapWithPrograms(programsData);
          
          const activeProgs = programsData.filter(p => p.status === 'active');
          setStats({
            totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
            totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0),
            pendingRequests: requests.filter(r => r.status === 'pending').length,
            activePrograms: activeProgs.length
          });
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.log('API not available, using localStorage');
      }
      
      if (!loadProgramsFromLocal()) {
        setPrograms([]);
      }
      
    } catch (error) {
      console.error('Error fetching guide programs:', error);
      loadProgramsFromLocal();
    } finally {
      setLoading(false);
    }
  };

  // ✅ جلب طلبات المشاركة
  const fetchRequests = async () => {
    if (!isGuide) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/programs/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success) {
        setRequests(response.data.requests || []);
        setStats(prev => ({ ...prev, pendingRequests: (response.data.requests || []).filter(r => r.status === 'pending').length }));
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      const saved = localStorage.getItem('guide_requests');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setRequests(parsed);
          setStats(prev => ({ ...prev, pendingRequests: parsed.filter(r => r.status === 'pending').length }));
        } catch (e) {}
      }
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
      location_lng: program.location_lng || ""
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
      const token = localStorage.getItem('token');
      const guideId = user?.id || guide?.id;
      
      if (!guideId) {
        toast.error(lang === 'ar' ? 'لم يتم العثور على معرف المرشد' : 'Guide ID not found');
        setLoading(false);
        return;
      }
      
      const updateData = {
        name: newProgram.name,
        description: newProgram.description,
        price: parseFloat(newProgram.price),
        duration: newProgram.duration,
        maxParticipants: parseInt(newProgram.maxParticipants),
        location: newProgram.location,
        location_lat: parseFloat(newProgram.location_lat) || editingProgram.location_lat,
        location_lng: parseFloat(newProgram.location_lng) || editingProgram.location_lng,
        status: editingProgram.status
      };
      
      try {
        const response = await api.put(`/api/guides/${guideId}/programs/${editingProgram.id}`, updateData, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data?.success) {
          toast.success(lang === 'ar' ? '✅ تم تحديث البرنامج بنجاح' : '✅ Program updated successfully');
        }
      } catch (apiError) {
        console.log('API update failed, updating locally');
      }
      
      const updatedPrograms = programs.map(p => 
        p.id === editingProgram.id 
          ? { ...p, ...updateData, location_name: newProgram.location }
          : p
      );
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      saveToPublicStorage(updatedPrograms);
      updateMapWithPrograms(updatedPrograms);
      
      setShowEditModal(false);
      setEditingProgram(null);
      setNewProgram({
        name: "", description: "", location: "", price: "", duration: "", maxParticipants: "", location_lat: "", location_lng: ""
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

  // ✅ دالة حذف البرنامج
  const handleDeleteProgram = async (programId) => {
    if (!confirm(lang === 'ar' ? '⚠️ هل أنت متأكد من حذف هذا البرنامج؟ لا يمكن التراجع عن هذا الإجراء.' : '⚠️ Are you sure you want to delete this program? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const guideId = user?.id || guide?.id;
      
      try {
        await api.delete(`/api/guides/${guideId}/programs/${programId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (apiError) {
        console.log('API delete failed, deleting locally');
      }
      
      const updatedPrograms = programs.filter(p => p.id !== programId);
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      saveToPublicStorage(updatedPrograms);
      updateMapWithPrograms(updatedPrograms);
      
      if (onProgramAdded) onProgramAdded();
      toast.success(lang === 'ar' ? '✅ تم حذف البرنامج بنجاح' : '✅ Program deleted successfully');
      
    } catch (error) {
      console.error('Error deleting program:', error);
      toast.error(lang === 'ar' ? '❌ حدث خطأ في حذف البرنامج' : '❌ Error deleting program');
    } finally {
      setLoading(false);
    }
  };

  // ✅ إضافة برنامج جديد
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
      
      let coords = null;
      try {
        const geoResponse = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(newProgram.location)}.json?access_token=pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWRyem0xciJ9.sl39WFOhm4m-kOOYtGqONw&limit=1`);
        const geoData = await geoResponse.json();
        if (geoData.features && geoData.features.length > 0) {
          coords = geoData.features[0].center;
        }
      } catch (e) {
        console.log('Geocoding error, using default coordinates');
      }
      
      const newProgramObj = {
        id: Date.now(),
        name: newProgram.name,
        description: newProgram.description,
        price: parseFloat(newProgram.price) || 0,
        duration: newProgram.duration || "غير محدد",
        maxParticipants: parseInt(newProgram.maxParticipants) || 20,
        location: newProgram.location,
        location_name: newProgram.location,
        coords: coords,
        location_lat: coords ? coords[1] : null,
        location_lng: coords ? coords[0] : null,
        status: 'active',
        participants: 0,
        guide_id: guideId,
        guide_name: user?.fullName || guide?.name,
        created_at: new Date().toISOString()
      };
      
      try {
        const token = localStorage.getItem('token');
        const response = await api.post(`/api/guides/${guideId}/programs`, newProgramObj, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.data?.success && response.data.program) {
          newProgramObj.id = response.data.program.id;
        }
      } catch (apiError) {
        console.log('API save failed, saving locally only');
      }
      
      const updatedPrograms = [...programs, newProgramObj];
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      saveToPublicStorage(updatedPrograms);
      updateMapWithPrograms(updatedPrograms);
      
      const activeProgs = updatedPrograms.filter(p => p.status === 'active');
      setStats({
        totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
        totalRevenue: activeProgs.reduce((sum, p) => sum + (p.participants || 0) * (p.price || 0), 0),
        pendingRequests: stats.pendingRequests,
        activePrograms: activeProgs.length
      });
      
      setNewProgram({
        name: "", description: "", location: "", price: "", duration: "", maxParticipants: "", location_lat: "", location_lng: ""
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
      const guideId = user?.id || guide?.id;
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      try {
        const token = localStorage.getItem('token');
        await api.put(`/api/guides/${guideId}/programs/${programId}/status`, { status: newStatus }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (apiError) {
        console.log('API status update failed, updating locally');
      }
      
      const updatedPrograms = programs.map(program => 
        program.id === programId ? { ...program, status: newStatus } : program
      );
      setPrograms(updatedPrograms);
      saveProgramsToLocal(updatedPrograms);
      saveToPublicStorage(updatedPrograms);
      updateMapWithPrograms(updatedPrograms);
      
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

  // ✅ تحديث حالة الطلب
  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.put(`/api/programs/requests/${requestId}`, { status: newStatus }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data?.success) {
        toast.success(lang === 'ar' 
          ? (newStatus === 'approved' ? '✅ تمت الموافقة على الطلب' : '❌ تم رفض الطلب')
          : (newStatus === 'approved' ? '✅ Request approved' : '❌ Request rejected'));
        await fetchRequests();
        await fetchGuidePrograms();
        
        if (onProgramAdded) onProgramAdded();
      }
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error(lang === 'ar' ? '❌ فشل تحديث حالة الطلب' : '❌ Failed to update request');
    }
  };

  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    if (isGuide) {
      fetchGuidePrograms();
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [isGuide]);

  // ✅ تحميل البرامج العامة عند بدء التشغيل
  useEffect(() => {
    loadPublicPrograms();
  }, []);

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
                          onClick={() => updateRequestStatus(request.id, "approved")}
                          className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs hover:bg-green-200 transition"
                        >
                          {lang === "ar" ? "موافقة" : "Approve"}
                        </button>
                        <button
                          onClick={() => updateRequestStatus(request.id, "rejected")}
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            {lang === "ar" ? "إضافة برنامج" : "Add Program"}
          </button>
        </div>

        {programs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {lang === "ar" ? "لا توجد برامج بعد" : "No programs yet"}
            </p>
            <button
              onClick={() => setShowAddProgram(true)}
              className="text-green-600 hover:text-green-700 text-sm font-medium"
            >
              {lang === "ar" ? "+ أضف برنامجك الأول" : "+ Add your first program"}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {lang === "ar" ? `📊 لديك ${programs.length} برنامج` : `📊 You have ${programs.length} program(s)`}
              </span>
              <button 
                onClick={() => {
                  updateMapWithPrograms(programs);
                  toast.success(lang === 'ar' ? 'تم تحديث الخريطة' : 'Map updated');
                }}
                className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {lang === "ar" ? "تحديث الخريطة" : "Refresh Map"}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {programs.map((program) => (
                <div key={program.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{program.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          program.status === "active" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {program.status === "active" ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "متوقف" : "Inactive")}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{program.description || (lang === "ar" ? "لا يوجد وصف" : "No description")}</p>
                      
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-sm">
                          <div className="text-gray-500 text-xs">{lang === "ar" ? "السعر" : "Price"}</div>
                          <div className="font-medium">{program.price} ريال</div>
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
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{program.location_name || program.location || (lang === "ar" ? "موقع غير محدد" : "Location not specified")}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => toggleProgramStatus(program.id, program.status)}
                        className={`px-3 py-1.5 rounded text-sm transition flex items-center gap-1 ${
                          program.status === "active"
                            ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                        title={program.status === "active" ? (lang === "ar" ? "إيقاف البرنامج (لن يظهر للجميع)" : "Deactivate program") : (lang === "ar" ? "تفعيل البرنامج (سيظهر للجميع)" : "Activate program")}
                      >
                        {program.status === "active" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{program.status === "active" ? (lang === "ar" ? "إيقاف" : "Off") : (lang === "ar" ? "تفعيل" : "On")}</span>
                      </button>
                      
                      <button
                        onClick={() => openEditModal(program)}
                        className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 transition flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{lang === "ar" ? "تعديل" : "Edit"}</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProgram(program.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition flex items-center gap-1"
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

      {/* نافذة إضافة برنامج جديد */}
      {showAddProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">{lang === "ar" ? "إضافة برنامج جديد" : "Add New Program"}</h3>
                <button onClick={() => setShowAddProgram(false)} className="text-white/80 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  📍 {lang === "ar" ? 'سيظهر هذا البرنامج على الخريطة الرئيسية ليراه جميع المستخدمين' : 'This program will appear on the main map for all users to see'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {lang === "ar" ? "اسم البرنامج *" : "Program Name *"}
                </label>
                <input
                  type="text"
                  placeholder={lang === "ar" ? "مثال: جولة تاريخية في الدرعية" : "e.g., Historical Tour in Diriyah"}
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {lang === "ar" ? "وصف البرنامج" : "Program Description"}
                </label>
                <textarea
                  placeholder={lang === "ar" ? "وصف تفصيلي للبرنامج..." : "Detailed program description..."}
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  rows="3"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "السعر (ريال)" : "Price (SAR)"}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProgram.price}
                    onChange={(e) => setNewProgram({...newProgram, price: e.target.value})}
                    className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "المدة" : "Duration"}
                  </label>
                  <input
                    type="text"
                    placeholder="3 ساعات"
                    value={newProgram.duration}
                    onChange={(e) => setNewProgram({...newProgram, duration: e.target.value})}
                    className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "الموقع *" : "Location *"}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === "ar" ? "الرياض، الدرعية" : "Riyadh, Diriyah"}
                    value={newProgram.location}
                    onChange={(e) => setNewProgram({...newProgram, location: e.target.value})}
                    className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {lang === "ar" ? 'سيتم تحديد موقع البرنامج تلقائياً على الخريطة بناءً على العنوان' : 'The program location will be automatically marked on the map based on the address'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "العدد الأقصى" : "Max Participants"}
                  </label>
                  <input
                    type="number"
                    placeholder="20"
                    value={newProgram.maxParticipants}
                    onChange={(e) => setNewProgram({...newProgram, maxParticipants: e.target.value})}
                    className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddProgram}
                  disabled={loading}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? (lang === "ar" ? "جاري الإضافة..." : "Adding...") : (lang === "ar" ? "إضافة البرنامج" : "Add Program")}
                </button>
                <button
                  onClick={() => setShowAddProgram(false)}
                  className="px-6 py-3 border dark:border-gray-600 rounded-lg font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل البرنامج */}
      {showEditModal && editingProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">{lang === "ar" ? "تعديل البرنامج" : "Edit Program"}</h3>
                <button onClick={() => {
                  setShowEditModal(false);
                  setEditingProgram(null);
                }} className="text-white/80 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  📍 {lang === "ar" ? 'بعد التعديل، سيتم تحديث البرنامج على الخريطة تلقائياً' : 'After editing, the program will be automatically updated on the map'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {lang === "ar" ? "اسم البرنامج *" : "Program Name *"}
                </label>
                <input
                  type="text"
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {lang === "ar" ? "وصف البرنامج" : "Program Description"}
                </label>
                <textarea
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                  className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  rows="3"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "السعر (ريال)" : "Price (SAR)"}
                  </label>
                  <input
                    type="number"
                    value={newProgram.price}
                    onChange={(e) => setNewProgram({...newProgram, price: e.target.value})}
                    className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "المدة" : "Duration"}
                  </label>
                  <input
                    type="text"
                    value={newProgram.duration}
                    onChange={(e) => setNewProgram({...newProgram, duration: e.target.value})}
                    className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "الموقع" : "Location"}
                  </label>
                  <input
                    type="text"
                    value={newProgram.location}
                    onChange={(e) => setNewProgram({...newProgram, location: e.target.value})}
                    className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === "ar" ? "العدد الأقصى" : "Max Participants"}
                  </label>
                  <input
                    type="number"
                    value={newProgram.maxParticipants}
                    onChange={(e) => setNewProgram({...newProgram, maxParticipants: e.target.value})}
                    className="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateProgram}
                  disabled={loading}
                  className="flex-1 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition disabled:opacity-50"
                >
                  {loading ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ التغييرات" : "Save Changes")}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProgram(null);
                  }}
                  className="px-6 py-3 border dark:border-gray-600 rounded-lg font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
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

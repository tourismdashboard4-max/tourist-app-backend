// client/src/pages/MyTripsPage.jsx
// ✅ النسخة النهائية – إلغاء فوري دون إعادة تحميل، مع تمرير صور يعمل
// ✅ عرض الحجوزات كبطاقات مستطيلة كاملة العرض
// ✅ إزالة المكررات (نفس البرنامج يظهر مرة واحدة فقط)

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck, ArrowLeft, User, Clock, CheckCircle, XCircle,
  Package, Award, Users, Star, MessageCircle, RefreshCw, Ban,
  Edit, MapPin, Navigation
} from 'lucide-react';
import { FaEdit, FaUser, FaCalendarAlt, FaSave, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_BASE = 'https://tourist-app-api.onrender.com';
const LOCAL_BOOKINGS_KEY = (userId) => `local_bookings_${userId}`;
const CANCELLED_TICKETS_KEY = (userId) => `cancelled_tickets_${userId}`;

// ===== دوال الصور والكاش =====
const IMAGE_CACHE_KEY = 'guide_programs_images_cache';
const LEGACY_IMAGE_KEY = (programId) => `program_images_${programId}`;

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const validateImage = async (url) => {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch { return false; }
};

const filterValidImages = async (images) => {
  if (!images || images.length === 0) return [];
  const valid = [];
  for (const img of images) {
    const url = buildImageUrl(img);
    if (!url) continue;
    const isValid = await validateImage(url);
    if (isValid) valid.push(url);
    else console.warn(`⚠️ صورة غير صالحة: ${url}`);
  }
  return valid;
};

const saveImagesToCache = (programId, images) => {
  try {
    const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    if (images && images.length > 0) {
      const imagesWithId = images.map(url => ({
        url: typeof url === 'string' ? url : (url.url || url.image_url || null),
        is_primary: url.is_primary !== undefined ? url.is_primary : false,
        id: url.id || null
      }));
      cache[programId] = { images: imagesWithId, timestamp: Date.now() };
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    } else {
      delete cache[programId];
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (e) { console.warn('Failed to save images to cache:', e); }
};

const getImagesFromCache = (programId) => {
  try {
    const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    const entry = cache[programId];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > 3600000) {
      delete cache[programId];
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.images.map(img => img.url).filter(Boolean);
  } catch (e) { return null; }
};

const getLegacyImages = (programId) => {
  try {
    const key = LEGACY_IMAGE_KEY(programId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const images = JSON.parse(saved);
      if (images && images.length > 0) return images;
    }
    return null;
  } catch (e) { return null; }
};

const saveProgramImages = async (programId, images) => {
  try {
    if (!programId) return;
    const validImages = await filterValidImages(images);
    if (validImages.length === 0) {
      saveImagesToCache(programId, []);
      const key = LEGACY_IMAGE_KEY(programId);
      localStorage.removeItem(key);
      return;
    }
    saveImagesToCache(programId, validImages);
    const key = LEGACY_IMAGE_KEY(programId);
    localStorage.setItem(key, JSON.stringify(validImages));
  } catch (error) { console.error('Error saving program images:', error); }
};

const getProgramImages = (programId) => {
  try {
    if (!programId) return null;
    const cached = getImagesFromCache(programId);
    if (cached && cached.length > 0) return cached;
    const legacy = getLegacyImages(programId);
    if (legacy && legacy.length > 0) {
      saveImagesToCache(programId, legacy);
      return legacy;
    }
    return null;
  } catch (error) { return null; }
};

// ===== دوال المسافات والأنشطة =====
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const getActivityType = (program, lang) => {
  const text = ((program?.name || '') + ' ' + (program?.description || '')).toLowerCase();
  if (text.includes('بحر') || text.includes('بحري')) return { ar: 'رحلات بحرية', en: 'Marine trips', icon: '🌊' };
  if (text.includes('تسلق') || text.includes('جبل')) return { ar: 'تسلق جبال', en: 'Mountain climbing', icon: '⛰️' };
  if (text.includes('سفاري')) return { ar: 'رحلات سفاري', en: 'Safari trips', icon: '🦁' };
  if (text.includes('براشوت') || text.includes('مظلة')) return { ar: 'رحلات براشوت', en: 'Parachute trips', icon: '🪂' };
  return { ar: 'برنامج سياحي', en: 'Tour program', icon: '🏞️' };
};

// ===== دوال إدارة الحجوزات =====
const getCancelledTicketIds = (userId) => {
  if (!userId) return [];
  const key = CANCELLED_TICKETS_KEY(userId);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

const addCancelledTicket = (userId, ticketId) => {
  if (!userId || !ticketId) return;
  const key = CANCELLED_TICKETS_KEY(userId);
  const current = getCancelledTicketIds(userId);
  if (!current.includes(ticketId)) {
    current.push(ticketId);
    localStorage.setItem(key, JSON.stringify(current));
    console.log(`✅ تم إضافة التذكرة ${ticketId} إلى القائمة السوداء`);
  }
};

// ✅ دالة لإزالة المكررات من قائمة التذاكر بناءً على program_id
const deduplicateByProgramId = (list) => {
  const map = new Map();
  list.forEach(item => {
    const pid = item.metadata?.program_id;
    if (pid) {
      const existing = map.get(pid);
      if (!existing) {
        map.set(pid, item);
      } else {
        const isPending = (item.status === 'pending' || item.status === 'open');
        const existingIsPending = (existing.status === 'pending' || existing.status === 'open');
        if (isPending && !existingIsPending) {
          map.set(pid, item);
        } else if (!isPending && existingIsPending) {
          // نحتفظ بالـ pending
        } else {
          if (new Date(item.created_at) > new Date(existing.created_at)) {
            map.set(pid, item);
          }
        }
      }
    }
  });
  return Array.from(map.values());
};

function MyTripsPage({ lang, user, setPage }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingBookings, setPendingBookings] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [guidePendingBookings, setGuidePendingBookings] = useState([]);
  const [guideCompletedTrips, setGuideCompletedTrips] = useState([]);
  const [guideRatingsTrips, setGuideRatingsTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [processingBookingId, setProcessingBookingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [editModal, setEditModal] = useState({ open: false, booking: null, participants: 1, notes: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [imageIndices, setImageIndices] = useState({});

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  const loadLocalBookings = () => {
    if (!user?.id) return [];
    const key = LOCAL_BOOKINGS_KEY(user.id);
    const stored = localStorage.getItem(key);
    const bookings = stored ? JSON.parse(stored) : [];
    console.log(`📦 الحجوزات المحلية للمستخدم ${user.id}:`, bookings);
    return bookings;
  };

  const addDemoBooking = () => {
    if (!isGuide) return;
    const key = LOCAL_BOOKINGS_KEY(user.id);
    const existing = localStorage.getItem(key);
    let bookings = existing ? JSON.parse(existing) : [];
    const hasPending = bookings.some(b => b.program_id === 999 && b.status !== 'cancelled');
    if (hasPending) {
      toast.error(lang === 'ar' ? 'يوجد حجز معلق لهذا البرنامج التجريبي بالفعل' : 'There is already a pending booking for this demo program');
      return;
    }
    if (bookings.filter(b => b.user_id === 9999).length >= 5) {
      toast(lang === 'ar' ? 'تم الوصول إلى الحد الأقصى من الحجوزات التجريبية' : 'Maximum demo bookings reached', { icon: 'ℹ️' });
      return;
    }
    const demoBooking = {
      id: Date.now(),
      user_id: 9999,
      user_name: "مسافر تجريبي",
      program_name: "رحلة تجريبية",
      program_price: 150,
      user_balance: 500,
      created_at: new Date().toISOString(),
      status: 'pending',
      guide_id: user.id,
      program_id: 999,
      participants: 2,
      notes: 'حجز تجريبي',
      updated_at: null
    };
    bookings.push(demoBooking);
    localStorage.setItem(key, JSON.stringify(bookings));
    toast.success(lang === 'ar' ? '✅ تم إضافة حجز تجريبي (للاختبار)' : '✅ Demo booking added (for testing)');
    fetchAllTickets();
  };

  const fetchUserIds = async () => {
    let userUuid = null;
    let userNumericId = null;
    if (user?.id) {
      const idStr = String(user.id);
      if (idStr.includes('-') || idStr.length === 36) {
        userUuid = idStr;
      } else if (!isNaN(Number(idStr))) {
        userNumericId = Number(idStr);
      }
    }
    if (user?.old_id && !userNumericId) userNumericId = Number(user.old_id);
    if (!userUuid && (userNumericId || user?.id)) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/users/${userNumericId || user.id}`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
        const data = await res.json();
        if (data.success && data.user) {
          if (data.user.id && typeof data.user.id === 'string' && data.user.id.includes('-')) userUuid = data.user.id;
          if (!userNumericId && data.user.old_id) userNumericId = Number(data.user.old_id);
        }
      } catch (e) { console.warn(e); }
    }
    return { userUuid, userNumericId };
  };

  const isBookingTicket = (ticket) => {
    const metadata = ticket.metadata || {};
    if (metadata.program_id != null) return true;
    if (metadata.is_booking === true) return true;
    if (ticket.type === 'booking') return true;
    const subject = (ticket.subject || '').toLowerCase();
    const message = (ticket.message || '').toLowerCase();
    if (subject.includes('طلب حجز برنامج') || subject.includes('booking request')) return true;
    if (message.includes('أود حجز البرنامج') || message.includes('i would like to book')) return true;
    if (ticket.type === 'general' && (subject.includes('حجز') || message.includes('حجز'))) return true;
    return false;
  };

  const fetchAllTickets = async () => {
    if (!user?.id) return;
    setLoading(true);
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/support/tickets`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const data = await response.json();
      let allTickets = [];
      if (response.ok && data.success && Array.isArray(data.tickets)) {
        const cancelledIds = getCancelledTicketIds(user.id);
        allTickets = data.tickets.filter(t => !cancelledIds.includes(t.id));
        console.log(`📡 عدد التذاكر من الخادم (بعد استبعاد الملغاة): ${allTickets.length}`);
      }

      const localBookings = loadLocalBookings();
      const localAsTickets = localBookings.map(lb => ({
        id: lb.id,
        user_id: lb.user_id,
        type: 'booking',
        status: lb.status || 'pending',
        subject: `طلب حجز برنامج: ${lb.program_name}`,
        message: '',
        created_at: lb.created_at,
        metadata: {
          program_id: lb.program_id,
          program_name: lb.program_name,
          program_price: lb.program_price,
          guide_id: lb.guide_id,
          tourist_name: lb.user_name,
          user_balance: lb.user_balance,
          is_booking: true,
          participants: lb.participants || 1,
          notes: lb.notes || '',
          updated_at: lb.updated_at || null,
          isLocal: true
        }
      }));

      // 🔥 منع التكرار: استخدام Map بالمفتاح (program_id) للتذاكر من الخادم
      const serverTicketMap = new Map();
      allTickets.forEach(t => {
        const pid = t.metadata?.program_id;
        if (pid) serverTicketMap.set(pid, t);
      });

      // تصفية المحلية: نحتفظ فقط بالحجوزات التي ليس لها مقابل على الخادم (نفس program_id)
      const uniqueLocalTickets = localAsTickets.filter(local => {
        const pid = local.metadata?.program_id;
        return pid && !serverTicketMap.has(pid);
      });

      // دمج القوائم
      const mergedTickets = [...allTickets, ...uniqueLocalTickets];
      console.log(`🔄 إجمالي التذاكر بعد الدمج (بدون تكرار): ${mergedTickets.length}`);

      // جلب تفاصيل البرامج للصور
      const programIds = new Set(mergedTickets.map(t => t.metadata?.program_id).filter(Boolean));
      const programMap = {};
      for (const pid of programIds) {
        try {
          const res = await fetch(`${API_BASE}/api/programs/${pid}`);
          if (res.ok) {
            const data = await res.json();
            const prog = data.program || data.data || data;
            if (prog) {
              let images = [];
              if (prog.images && prog.images.length) {
                images = prog.images.map(img => buildImageUrl(img.url || img.image_url || img)).filter(Boolean);
              } else if (prog.image) {
                const url = buildImageUrl(prog.image);
                if (url) images = [url];
              }
              if (images.length) await saveProgramImages(pid, images);
              programMap[pid] = {
                ...prog,
                images: images.length ? images : [],
                cachedImages: getProgramImages(pid) || []
              };
            }
          }
        } catch (e) { console.warn(`Failed to fetch program ${pid}:`, e); }
      }

      // إضافة البرامج إلى التذاكر
      const enrichedTickets = mergedTickets.map(t => {
        const pid = t.metadata?.program_id;
        if (pid && programMap[pid]) {
          return { ...t, program: programMap[pid] };
        }
        return t;
      });

      // تصنيف حسب الدور
      let pendingGuide = [];
      let completedGuide = [];
      let ratingsGuide = [];
      let myPending = [];
      let myCompleted = [];

      if (isGuide) {
        const { userUuid, userNumericId } = await fetchUserIds();
        const guideIds = [String(user.id)];
        if (userUuid) guideIds.push(userUuid);
        if (userNumericId) guideIds.push(String(userNumericId));

        const isGuideTicket = (ticket) => {
          const metadata = ticket.metadata || {};
          const ticketGuideId = metadata.guide_id || ticket.guide_id;
          if (ticketGuideId && guideIds.some(id => String(ticketGuideId) === id)) return true;
          if (ticket.type === 'general' && String(ticket.user_id) !== String(user.id) && isBookingTicket(ticket)) {
            return true;
          }
          return false;
        };

        const guideRelatedTickets = enrichedTickets.filter(t => isGuideTicket(t));
        console.log(`👨‍🏫 تذاكر متعلقة بالمرشد: ${guideRelatedTickets.length}`);

        pendingGuide = guideRelatedTickets.filter(t =>
          isBookingTicket(t) &&
          (!t.status || ['pending', 'open'].includes(t.status.toLowerCase()))
        );
        completedGuide = guideRelatedTickets.filter(t =>
          isBookingTicket(t) &&
          ['accepted', 'completed'].includes(t.status?.toLowerCase())
        );
        ratingsGuide = completedGuide.filter(t => t.type === 'trip' || t.status === 'completed');

        const userAsTouristTickets = enrichedTickets.filter(t => String(t.user_id) === String(user.id));
        myPending = userAsTouristTickets.filter(t =>
          isBookingTicket(t) &&
          (!t.status || ['pending', 'open'].includes(t.status.toLowerCase()))
        );
        myCompleted = userAsTouristTickets.filter(t =>
          isBookingTicket(t) &&
          ['accepted', 'completed'].includes(t.status?.toLowerCase())
        );
      } else {
        const userTickets = enrichedTickets.filter(t => String(t.user_id) === String(user.id));
        myPending = userTickets.filter(t =>
          isBookingTicket(t) &&
          (!t.status || ['pending', 'open'].includes(t.status.toLowerCase()))
        );
        myCompleted = userTickets.filter(t =>
          isBookingTicket(t) &&
          ['accepted', 'completed'].includes(t.status?.toLowerCase())
        );
      }

      // ✅ إزالة المكررات من كل قائمة باستخدام program_id
      pendingGuide = deduplicateByProgramId(pendingGuide);
      completedGuide = deduplicateByProgramId(completedGuide);
      ratingsGuide = deduplicateByProgramId(ratingsGuide);
      myPending = deduplicateByProgramId(myPending);
      myCompleted = deduplicateByProgramId(myCompleted);

      // تعيين الحالات
      setGuidePendingBookings(pendingGuide);
      setGuideCompletedTrips(completedGuide);
      setGuideRatingsTrips(ratingsGuide);
      setPendingBookings(myPending);
      setCompletedTrips(myCompleted);

      console.log(`📊 إحصائيات بعد إزالة المكررات:`);
      console.log(`- مرشد: طلبات واردة=${pendingGuide.length}, منتهية=${completedGuide.length}, تقييم=${ratingsGuide.length}`);
      console.log(`- مستخدم عادي: طلبات=${myPending.length}, منتهية=${myCompleted.length}`);

      // تهيئة مؤشرات الصور
      const allBookings = [...myPending, ...myCompleted, ...pendingGuide, ...completedGuide, ...ratingsGuide];
      const initialIndices = {};
      allBookings.forEach(t => {
        if (t.id) initialIndices[t.id] = 0;
      });
      setImageIndices(prev => ({ ...prev, ...initialIndices }));

    } catch (err) {
      console.error(err);
      toast.error(lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllTickets();
  }, [user, lang, isGuide]);

  const handleRefresh = () => {
    fetchAllTickets();
    toast(lang === 'ar' ? 'جاري تحديث البيانات...' : 'Refreshing data...', { icon: '🔄' });
  };

  const handleAcceptBooking = async (booking) => {
    if (processingBookingId === booking.id) return;
    setProcessingBookingId(booking.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/support/tickets/${booking.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ status: 'accepted' })
      });
      if (!response.ok) throw new Error('فشل قبول الطلب');
      toast.success(lang === 'ar' ? 'تم قبول طلب الحجز' : 'Booking request accepted');
      await fetchAllTickets();
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'فشل قبول الطلب' : 'Failed to accept booking');
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleRejectBooking = async (booking) => {
    if (processingBookingId === booking.id) return;
    setProcessingBookingId(booking.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/support/tickets/${booking.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (!response.ok) throw new Error('فشل رفض الطلب');
      toast.success(lang === 'ar' ? 'تم رفض طلب الحجز' : 'Booking request rejected');
      await fetchAllTickets();
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'فشل رفض الطلب' : 'Failed to reject booking');
    } finally {
      setProcessingBookingId(null);
    }
  };

  // ✅ دالة إلغاء الحجز: حذف فوري من جميع القوائم وتحديث الخادم في الخلفية
  const handleCancelBooking = async (booking) => {
    if (cancellingId === booking.id) return;
    if (!window.confirm(lang === 'ar' ? 'في حال موافقتك سيتم الغاء هذا الحجز نهائياً' : 'If you agree, this booking will be permanently cancelled')) return;
    setCancellingId(booking.id);

    // 1. إضافة التذكرة إلى القائمة السوداء فوراً
    addCancelledTicket(user.id, booking.id);

    // 2. حذف من localStorage إذا كان محلياً
    const key = LOCAL_BOOKINGS_KEY(user.id);
    const stored = localStorage.getItem(key);
    if (stored) {
      let bookings = JSON.parse(stored);
      const index = bookings.findIndex(b => b.id === booking.id);
      if (index !== -1) {
        bookings.splice(index, 1);
        localStorage.setItem(key, JSON.stringify(bookings));
        console.log(`✅ تم حذف الحجز المحلي ${booking.id} من localStorage`);
      }
    }

    // 3. حذف من جميع القوائم المحلية فوراً (تحديث الواجهة)
    setPendingBookings(prev => prev.filter(b => b.id !== booking.id));
    setCompletedTrips(prev => prev.filter(b => b.id !== booking.id));
    setGuidePendingBookings(prev => prev.filter(b => b.id !== booking.id));
    setGuideCompletedTrips(prev => prev.filter(b => b.id !== booking.id));
    setGuideRatingsTrips(prev => prev.filter(b => b.id !== booking.id));

    toast.success(lang === 'ar' ? 'تم إلغاء الحجز بنجاح' : 'Booking cancelled successfully');

    // 4. محاولة إلغاء التذكرة على الخادم في الخلفية (لا ننتظر النتيجة، ولا نعيد تحميل القوائم)
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/support/tickets/${booking.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      // تجاهل النتيجة - تم الإلغاء محلياً بالفعل
    } catch (err) {
      console.warn('⚠️ خطأ في الاتصال بالخادم أثناء الإلغاء، ولكن تم الإلغاء محلياً');
    }

    setCancellingId(null);
  };

  const handleEditBooking = (booking) => {
    const participants = booking.metadata?.participants || 1;
    const notes = booking.metadata?.notes || '';
    setEditModal({ open: true, booking, participants, notes });
  };

  const handleSaveEdit = async () => {
    const { booking, participants, notes } = editModal;
    if (!booking) return;
    setSavingEdit(true);
    try {
      const key = LOCAL_BOOKINGS_KEY(user.id);
      const stored = localStorage.getItem(key);
      if (stored) {
        let bookings = JSON.parse(stored);
        const index = bookings.findIndex(b => b.id === booking.id);
        if (index !== -1) {
          bookings[index].participants = participants;
          bookings[index].notes = notes;
          bookings[index].updated_at = new Date().toISOString();
          localStorage.setItem(key, JSON.stringify(bookings));
          toast.success(lang === 'ar' ? 'تم تحديث الحجز بنجاح' : 'Booking updated successfully');
          setEditModal({ open: false, booking: null, participants: 1, notes: '' });
          await fetchAllTickets(); // نحدث القوائم لتحديث البيانات
          setSavingEdit(false);
          return;
        }
      }
      toast.error(lang === 'ar' ? 'لا يمكن تعديل هذا الحجز (من الخادم)' : 'Cannot edit this booking (from server)');
      setEditModal({ open: false, booking: null, participants: 1, notes: '' });
    } catch (err) {
      console.error('Error updating booking:', err);
      toast.error(lang === 'ar' ? 'خطأ في التحديث' : 'Update error');
    } finally {
      setSavingEdit(false);
    }
  };

  // ✅ التنقل بين الصور
  const nextImage = (e, bookingId, total) => {
    e.stopPropagation();
    e.preventDefault();
    setImageIndices(prev => ({
      ...prev,
      [bookingId]: (prev[bookingId] + 1) % total
    }));
  };

  const prevImage = (e, bookingId, total) => {
    e.stopPropagation();
    e.preventDefault();
    setImageIndices(prev => ({
      ...prev,
      [bookingId]: (prev[bookingId] - 1 + total) % total
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // عرض بطاقة الحجز
  const renderTripCard = (trip, type = 'tourist', showCancel = true) => {
    const metadata = trip.metadata || {};
    const isPending = (trip.status === 'pending' || trip.status === 'open');
    const isGuideView = type === 'guide';
    const isRatingView = type === 'rating';

    let statusText = '';
    let statusClass = '';
    if (isPending) {
      statusText = lang === 'ar' ? 'قيد الانتظار' : 'Pending';
      statusClass = 'bg-yellow-100 text-yellow-700';
    } else if (trip.status === 'accepted') {
      statusText = lang === 'ar' ? 'تم القبول' : 'Accepted';
      statusClass = 'bg-green-100 text-green-700';
    } else if (trip.status === 'completed') {
      statusText = lang === 'ar' ? 'منتهي' : 'Completed';
      statusClass = 'bg-blue-100 text-blue-700';
    } else {
      statusText = trip.status || (lang === 'ar' ? 'غير معروف' : 'Unknown');
      statusClass = 'bg-gray-100 text-gray-700';
    }

    const programName = metadata.program_name || trip.subject?.replace('طلب حجز برنامج:', '') || (lang === 'ar' ? 'برنامج سياحي' : 'Tour Program');
    const touristName = metadata.tourist_name || trip.user_name || (lang === 'ar' ? 'مسافر' : 'Tourist');
    const guideName = metadata.guide_name || trip.guide_name || (lang === 'ar' ? 'مرشد' : 'Guide');
    const price = metadata.program_price || '';
    const participants = metadata.participants || 1;
    const notes = metadata.notes || '';
    const updatedAt = metadata.updated_at || null;

    const program = trip.program || {};
    const images = program.images || [];
    const currentIndex = imageIndices[trip.id] || 0;
    const totalImages = images.length;
    const imageUrl = totalImages > 0 ? images[currentIndex] : null;
    const activity = getActivityType(program, lang);

    return (
      <div key={trip.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition">
        {/* حاوية الصورة */}
        <div className="relative w-full h-52 md:h-64 bg-gray-200 dark:bg-gray-700">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={programName}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              loading="lazy"
              onError={(e) => {
                const newImages = images.filter((_, i) => i !== currentIndex);
                if (newImages.length === 0) {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-700">
                      <span class="text-sm">${lang === 'ar' ? 'لا توجد صورة' : 'No image'}</span>
                    </div>
                  `;
                } else {
                  saveProgramImages(program.id, newImages);
                  setImageIndices(prev => ({ ...prev, [trip.id]: 0 }));
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-700">
              <span className="text-sm">{lang === 'ar' ? 'لا توجد صورة' : 'No image'}</span>
            </div>
          )}

          {/* أزرار التنقل بين الصور */}
          {totalImages > 1 && (
            <>
              <button
                onClick={(e) => prevImage(e, trip.id, totalImages)}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-10 text-sm touch-manipulation"
                style={{ touchAction: 'manipulation' }}
              >
                ❮
              </button>
              <button
                onClick={(e) => nextImage(e, trip.id, totalImages)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition z-10 text-sm touch-manipulation"
                style={{ touchAction: 'manipulation' }}
              >
                ❯
              </button>
              <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full z-10">
                {currentIndex+1}/{totalImages}
              </div>
            </>
          )}

          {/* أيقونة النشاط والحالة */}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full z-10 flex items-center gap-1">
            <span>{activity.icon}</span>
            <span className="hidden sm:inline">{activity[lang]}</span>
          </div>
          <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
            <h3 className="font-bold text-base truncate">{programName}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
              <span className="flex items-center gap-1"><User size={12} /> {touristName}</span>
              {price && <span className="font-semibold text-green-300">{price} ريال</span>}
              <span className="flex items-center gap-1"><Users size={12} /> {participants}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusClass} bg-black/50 text-white`}>{statusText}</span>
            </div>
          </div>
        </div>

        {/* منطقة المعلومات والأزرار */}
        <div className="p-3">
          <div className="flex flex-wrap justify-between items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(trip.created_at)}</span>
            {updatedAt && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Edit size={12} /> {lang === 'ar' ? 'عدل: ' : 'Updated: '}{formatDate(updatedAt)}
              </span>
            )}
            {notes && <span className="text-xs text-gray-500 dark:text-gray-400">📝 {notes}</span>}
          </div>

          {isGuideView && isPending && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => handleAcceptBooking(trip)} disabled={processingBookingId === trip.id} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-green-700 disabled:opacity-50">
                <CheckCircle size={14} /> {lang === 'ar' ? 'قبول' : 'Accept'}
              </button>
              <button onClick={() => handleRejectBooking(trip)} disabled={processingBookingId === trip.id} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-red-700 disabled:opacity-50">
                <XCircle size={14} /> {lang === 'ar' ? 'رفض' : 'Reject'}
              </button>
            </div>
          )}

          {isRatingView && (
            <div className="mt-2 flex gap-2">
              <button className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-yellow-600">
                <Star size={14} /> {lang === 'ar' ? 'تقييم المرشد' : 'Rate Guide'}
              </button>
              <button className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-blue-600">
                <MessageCircle size={14} /> {lang === 'ar' ? 'مراسلة' : 'Message'}
              </button>
            </div>
          )}

          {showCancel && isPending && !isGuideView && !isRatingView && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleEditBooking(trip)}
                className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-xs flex items-center gap-1 hover:bg-blue-200 transition"
              >
                <Edit size={14} /> {lang === 'ar' ? 'تعديل الحجز' : 'Edit booking'}
              </button>
              <button
                onClick={() => handleCancelBooking(trip)}
                disabled={cancellingId === trip.id}
                className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs flex items-center gap-1 hover:bg-red-200 disabled:opacity-50"
              >
                {cancellingId === trip.id ? <div className="animate-spin h-3 w-3 border-2 border-red-600 rounded-full border-t-transparent"></div> : <Ban size={14} />}
                {lang === 'ar' ? 'إلغاء الحجز' : 'Cancel booking'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // مودال تعديل الحجز
  const EditModal = () => {
    if (!editModal.open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
          <div className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">{lang === 'ar' ? 'تعديل الحجز' : 'Edit Booking'}</h3>
              <button onClick={() => setEditModal({ open: false, booking: null, participants: 1, notes: '' })} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <FaTimes className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {lang === 'ar' ? 'عدد المشاركين' : 'Number of participants'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={editModal.participants}
                  onChange={(e) => setEditModal({ ...editModal, participants: parseInt(e.target.value) || 1 })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {lang === 'ar' ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  value={editModal.notes}
                  onChange={(e) => setEditModal({ ...editModal, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  rows="3"
                  placeholder={lang === 'ar' ? 'أضف ملاحظات...' : 'Add notes...'}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditModal({ open: false, booking: null, participants: 1, notes: '' })} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {savingEdit ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div> : <FaSave size={16} />}
                {lang === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== واجهة المستخدم العادي =====
  if (!isGuide) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-4 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setPage('profile')} className="p-1 hover:bg-white/20 rounded-lg"><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-bold flex items-center gap-2"><Package size={24} /> {lang === 'ar' ? 'رحلاتي' : 'My Trips'}</h1>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition disabled:opacity-50">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="border-b border-gray-200 dark:border-gray-700 flex mt-2">
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 font-medium ${activeTab === 'pending' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
            {lang === 'ar' ? 'طلبات الحجز' : 'Booking Requests'} ({pendingBookings.length})
          </button>
          <button onClick={() => setActiveTab('completed')} className={`px-4 py-2 font-medium ${activeTab === 'completed' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
            {lang === 'ar' ? 'الرحلات المنتهية' : 'Completed Trips'} ({completedTrips.length})
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
          ) : activeTab === 'pending' && pendingBookings.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
              <CalendarCheck size={48} className="mx-auto text-gray-400" />
              <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد طلبات حجز' : 'No booking requests'}</p>
              <button onClick={() => setPage('explore')} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg">{lang === 'ar' ? 'استكشف البرامج' : 'Explore Programs'}</button>
            </div>
          ) : activeTab === 'pending' ? (
            <div className="space-y-4">
              {pendingBookings.map(b => renderTripCard(b, 'tourist', true))}
            </div>
          ) : completedTrips.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
              <CheckCircle size={48} className="mx-auto text-gray-400" />
              <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد رحلات منتهية' : 'No completed trips'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedTrips.map(t => renderTripCard(t, 'tourist', false))}
            </div>
          )}
        </div>
        <EditModal />
      </div>
    );
  }

  // ===== واجهة المرشد السياحي =====
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-4 text-white flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setPage('profile')} className="p-1 hover:bg-white/20 rounded-lg"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Award size={24} /> {lang === 'ar' ? 'لوحة الرحلات' : 'Trips Dashboard'}</h1>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition disabled:opacity-50">
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="border-b border-gray-200 dark:border-gray-700 flex mt-2 overflow-x-auto">
        <button onClick={() => setActiveTab('guidePending')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'guidePending' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          {lang === 'ar' ? 'طلبات حجز واردة' : 'Incoming Bookings'} ({guidePendingBookings.length})
        </button>
        <button onClick={() => setActiveTab('guideCompleted')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'guideCompleted' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          {lang === 'ar' ? 'رحلات منتهية (كمرشد)' : 'Completed Trips (as Guide)'} ({guideCompletedTrips.length})
        </button>
        <button onClick={() => setActiveTab('guideRatings')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'guideRatings' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          {lang === 'ar' ? 'رحلاتي للتقييم' : 'Trips for Rating'} ({guideRatingsTrips.length})
        </button>
        <button onClick={() => setActiveTab('myOwnBookings')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'myOwnBookings' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          {lang === 'ar' ? 'حجوزاتي (كمسافر)' : 'My Bookings (as Tourist)'} ({pendingBookings.length + completedTrips.length})
        </button>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
        ) : activeTab === 'guidePending' && guidePendingBookings.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
            <CalendarCheck size={48} className="mx-auto text-gray-400" />
            <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد طلبات حجز واردة' : 'No pending booking requests'}</p>
            <p className="text-sm text-gray-400 mt-2">
              {lang === 'ar'
                ? '💡 يمكنك إضافة حجز تجريبي لاختبار الواجهة. اضغط على الزر أدناه.'
                : '💡 You can add a demo booking to test the interface. Click the button below.'}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={() => setPage('explore')} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                {lang === 'ar' ? 'اذهب إلى الخريطة' : 'Go to Map'}
              </button>
              <button onClick={addDemoBooking} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                {lang === 'ar' ? '➕ إضافة حجز تجريبي' : '➕ Add Demo Booking'}
              </button>
            </div>
          </div>
        ) : activeTab === 'guidePending' ? (
          <div className="space-y-4">
            {guidePendingBookings.map(b => renderTripCard(b, 'guide', false))}
          </div>
        ) : activeTab === 'guideCompleted' && guideCompletedTrips.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
            <CheckCircle size={48} className="mx-auto text-gray-400" />
            <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد رحلات منتهية (كمرشد)' : 'No completed trips as guide'}</p>
          </div>
        ) : activeTab === 'guideCompleted' ? (
          <div className="space-y-4">
            {guideCompletedTrips.map(t => renderTripCard(t, 'guide', false))}
          </div>
        ) : activeTab === 'guideRatings' && guideRatingsTrips.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
            <Star size={48} className="mx-auto text-gray-400" />
            <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد رحلات قابلة للتقييم حالياً' : 'No trips available for rating'}</p>
          </div>
        ) : activeTab === 'guideRatings' ? (
          <div className="space-y-4">
            {guideRatingsTrips.map(t => renderTripCard(t, 'rating', false))}
          </div>
        ) : activeTab === 'myOwnBookings' ? (
          <>
            {pendingBookings.length > 0 && (
              <>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? 'طلبات حجز معلقة' : 'Pending Booking Requests'}</h3>
                <div className="space-y-4 mb-6">
                  {pendingBookings.map(b => renderTripCard(b, 'tourist', true))}
                </div>
              </>
            )}
            {completedTrips.length > 0 && (
              <>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? 'رحلات منتهية' : 'Completed Trips'}</h3>
                <div className="space-y-4">
                  {completedTrips.map(t => renderTripCard(t, 'tourist', false))}
                </div>
              </>
            )}
            {pendingBookings.length === 0 && completedTrips.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
                <CalendarCheck size={48} className="mx-auto text-gray-400" />
                <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد حجوزات قمت بها كمسافر' : 'No bookings made as a tourist'}</p>
                <button onClick={() => setPage('explore')} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg">{lang === 'ar' ? 'استكشف البرامج' : 'Explore Programs'}</button>
              </div>
            )}
          </>
        ) : null}
      </div>
      <EditModal />
    </div>
  );
}

export default MyTripsPage;

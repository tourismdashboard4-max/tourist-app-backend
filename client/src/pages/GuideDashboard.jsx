// client/src/pages/GuideDashboard.jsx
// ✅ النسخة النهائية – ألوان كلاسيكية، عرض البرامج، طلبات الحجز، حذف المحادثات نهائياً
// ✅ تم إصلاح مشكلة اختفاء الصور وحفظها بشكل دائم مع إعادة التحقق الدوري
// ✅ إضافة حد أقصى 11 صورة لكل برنامج
// ✅ إصلاح جلب الصور من API والتعامل مع حقول url المختلفة
// ✅ توحيد مفتاح حذف المحادثات مع بقية الصفحات (deleted_support_tickets)
// ✅ تحسين دالة deleteConversation لاستخراج المعرف بشكل صحيح
// ✅ تحسينات إضافية: تحديث is_primary، استخدام cache بشكل أفضل، تحرير blob URLs، التحقق من الحد الأقصى في التعديل

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, CheckCircle, XCircle, Edit2, Trash2,
  Users, DollarSign, Clock, MapPin, Eye, EyeOff,
  ArrowLeft, Shield, RefreshCw, Search,
  Image as LucideImage, Camera, X,
  Save, Upload, AlertTriangle, Crosshair, Package,
  MessageCircle, Inbox, MailOpen, Bell, Headphones, Star,
  CalendarCheck, Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import mapboxgl from 'mapbox-gl';
import io from 'socket.io-client';

mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWR5em0xciJ9.sl39WFOhm4m-kOOYtGqONw";

const API_BASE = 'https://tourist-app-api.onrender.com';
const SOCKET_URL = 'https://tourist-app-api.onrender.com';

const MAX_PROGRAM_IMAGES = 11;

// ✅ مفتاح موحد لحذف التذاكر (متوافق مع صفحة الإشعارات والدعم)
const DELETED_TICKETS_KEY = 'deleted_support_tickets';

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  return `${API_BASE}${url.startsWith('/') ? url : '/' + url}`;
};

const getImageUrl = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (typeof img === 'object') {
    return img.url || img.image_url || img.src || null;
  }
  return null;
};

// تنظيف التذاكر القديمة (إذا كان هناك تذاكر مخزنة تحت مفتاح قديم)
const cleanupOldTickets = () => {
  const oldKey = 'guide_permanently_deleted';
  const oldData = localStorage.getItem(oldKey);
  if (oldData) {
    try {
      const oldSet = new Set(JSON.parse(oldData));
      const current = localStorage.getItem(DELETED_TICKETS_KEY);
      let newSet = current ? new Set(JSON.parse(current)) : new Set();
      oldSet.forEach(id => newSet.add(id));
      localStorage.setItem(DELETED_TICKETS_KEY, JSON.stringify([...newSet]));
      localStorage.removeItem(oldKey);
      console.log('🧹 تم ترحيل التذاكر المحذوفة من المفتاح القديم إلى الجديد');
    } catch (e) { console.warn('فشل ترحيل البيانات القديمة', e); }
  }
};
cleanupOldTickets();

// ============================================================
// ✅ دوال إدارة الصور المؤقتة (cache) لمنع اختفاء الصور
// ============================================================
const IMAGE_CACHE_KEY = 'guide_programs_images_cache';

const saveImagesToCache = (programId, images) => {
  try {
    const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    cache[programId] = {
      images,
      timestamp: Date.now()
    };
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    console.log(`💾 Saved ${images.length} images to cache for program ${programId}`);
  } catch (e) {
    console.warn('Failed to save images to cache:', e);
  }
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
    return entry.images;
  } catch (e) {
    return null;
  }
};

const clearImagesCache = () => {
  localStorage.removeItem(IMAGE_CACHE_KEY);
};
// ============================================================

const GuideDashboard = ({ lang, guide, setPage, user, setUserPrograms, onProgramAdded }) => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  
  const mapContainerRef = useRef(null);
  const editMapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const editMapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const editMarkerRef = useRef(null);
  
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalRevenue: 0,
    activePrograms: 0,
    totalPrograms: 0
  });

  const [balance, setBalance] = useState(user?.balance || 0);
  const [activeTab, setActiveTab] = useState('programs');
  const [guideTickets, setGuideTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [processingBookingId, setProcessingBookingId] = useState(null);
  const [guideCompletedTrips, setGuideCompletedTrips] = useState([]);
  const [guideRatingsTrips, setGuideRatingsTrips] = useState([]);

  const deletingIdsRef = useRef(new Set());
  const failedTicketsRef = useRef(new Set());

  const defaultProgramState = {
    name: "",
    description: "",
    price: "",
    duration: "",
    maxParticipants: "",
    images: [],
    primaryImageIndex: 0,
    safetyGuidelines: "",
    location_lat: null,
    location_lng: null,
    location_name: ""
  };
  
  const [newProgram, setNewProgram] = useState(defaultProgramState);
  const originalImageIdsRef = useRef([]);

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true || user?.guide_status === 'approved';
  const isAdmin = user?.role === 'admin';
  const isSupport = user?.role === 'support';
  const showAdminButtons = isAdmin || isSupport;

  // دالة مساعدة لتحويل UUID إلى رقم (old_id)
  const convertToNumericId = useCallback(async (userId) => {
    if (!userId) return null;
    if (!isNaN(Number(userId))) return Number(userId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.old_id) return Number(data.user.old_id);
        if (data.user.id && !isNaN(Number(data.user.id))) return Number(data.user.id);
      }
    } catch(e) { 
      console.warn('Failed to convert user ID:', e);
    }
    return null;
  }, []);

  // جلب الرصيد
  const fetchBalance = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('token');
      const numericId = await convertToNumericId(user.id);
      if (!numericId) {
        setBalance(0);
        return;
      }
      const response = await fetch(`${API_BASE}/api/users/${numericId}/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance ?? data.newBalance ?? 0);
      } else {
        setBalance(0);
      }
    } catch (err) {
      console.error('❌ خطأ في جلب الرصيد:', err);
      setBalance(0);
    }
  }, [user?.id, convertToNumericId]);

  const updateStats = useCallback((programsList) => {
    const activeProgs = programsList.filter(p => p.status === 'active');
    const newStats = {
      totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
      totalRevenue: activeProgs.reduce((sum, p) => sum + ((p.participants || 0) * (p.price || 0)), 0),
      activePrograms: activeProgs.length,
      totalPrograms: programsList.length
    };
    setStats(newStats);
    fetchBalance();
  }, [fetchBalance]);

  // ✅ دوال الحذف الموحدة (تستخدم نفس مفتاح deleted_support_tickets)
  const getDeletedTickets = useCallback(() => {
    const stored = localStorage.getItem(DELETED_TICKETS_KEY);
    if (!stored) return new Set();
    try {
      const arr = JSON.parse(stored);
      return new Set(arr);
    } catch { return new Set(); }
  }, []);

  const addDeletedTicket = useCallback((ticketId) => {
    const current = getDeletedTickets();
    current.add(String(ticketId));
    localStorage.setItem(DELETED_TICKETS_KEY, JSON.stringify([...current]));
  }, [getDeletedTickets]);

  // جلب طلبات الحجز
  const fetchBookingRequests = useCallback(async () => {
    if (!user?.id || !isGuide) return;
    setLoadingBookings(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/support/tickets`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      const deletedSet = getDeletedTickets();
      let bookings = [];
      if (data.success && data.tickets) {
        const guideId = String(user.id);
        bookings = data.tickets.filter(ticket => {
          if (deletedSet.has(String(ticket.id))) return false;
          if (ticket.type !== 'booking') return false;
          const metadata = ticket.metadata || {};
          const isForThisGuide = 
            (metadata.guideId && String(metadata.guideId) === guideId) ||
            (ticket.guide_id && String(ticket.guide_id) === guideId) ||
            (metadata.program_guide_id && String(metadata.program_guide_id) === guideId);
          return isForThisGuide;
        });
        const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
          let touristName = booking.user_name || 'مسافر';
          let programName = booking.subject?.replace(/طلب حجز برنامج:\s*/, '') || 'برنامج غير معروف';
          let programPrice = 0;
          if (booking.metadata?.program_price) {
            programPrice = booking.metadata.program_price;
          } else {
            const priceMatch = booking.message?.match(/(\d+)\s*ريال/);
            if (priceMatch) programPrice = parseInt(priceMatch[1]);
          }
          return {
            id: booking.id,
            touristId: booking.user_id,
            touristName: touristName,
            programName: programName,
            programPrice: programPrice,
            status: booking.status || 'pending',
            message: booking.message,
            createdAt: booking.created_at,
            rawTicket: booking
          };
        }));
        setBookingRequests(enrichedBookings);
      }
      console.log(`✅ طلبات الحجز للمرشد: ${bookings.length}`);
    } catch (error) {
      console.error('Error fetching booking requests:', error);
    } finally {
      setLoadingBookings(false);
    }
  }, [user?.id, isGuide, getDeletedTickets]);

  // جلب تذاكر المحادثات
  const fetchGuideTickets = useCallback(async () => {
    if (!user?.id || !isGuide) return;
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoadingTickets(false); return; }

      const response = await fetch(`${API_BASE}/api/support/tickets`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      const deletedSet = getDeletedTickets();

      let tickets = [];
      if (data.success && data.tickets) {
        const guideId = String(user.id);
        tickets = data.tickets.filter(ticket => {
          if (deletedSet.has(String(ticket.id))) return false;
          const isValidType = ticket.type === 'guide_chat' || ticket.type === 'chat' || ticket.type === 'direct_chat';
          if (!isValidType) return false;
          const metadata = ticket.metadata || {};
          const isGuideInTicket = 
            (metadata.guideId && String(metadata.guideId) === guideId) ||
            (ticket.user_id && String(ticket.user_id) === guideId) ||
            (metadata.created_by_id && String(metadata.created_by_id) === guideId) ||
            (metadata.participants && metadata.participants.some(p => String(p) === guideId));
          return isGuideInTicket;
        });
        tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      setGuideTickets(tickets);
      console.log('✅ التذاكر المسترجعة للمرشد (محادثات):', tickets.length);
    } catch (error) { console.error('Error fetching guide tickets:', error); }
    finally { setLoadingTickets(false); }
  }, [user?.id, isGuide, getDeletedTickets]);

  // جلب الإشعارات
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/notifications?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const deletedSet = getDeletedTickets();
        const filteredNotifications = data.notifications.filter(n => {
          const ticketId = n.data?.ticketId || n.ticket_id;
          if (ticketId && deletedSet.has(String(ticketId))) return false;
          return true;
        });
        setNotifications(filteredNotifications);
        const CHAT_TYPES = new Set([
          'new_chat_ticket', 'guide_chat', 'new_chat_message',
          'GUIDE_CHAT', 'NEW_CHAT_TICKET', 'NEW_CHAT_MESSAGE',
          'new_message', 'NEW_MESSAGE'
        ]);
        const unreadRegular = filteredNotifications.filter(n => !n.is_read && !CHAT_TYPES.has(n.type)).length;
        const unreadChats = filteredNotifications.filter(n => !n.is_read && CHAT_TYPES.has(n.type)).length;
        setUnreadNotifCount(unreadRegular);
        setUnreadChatCount(unreadChats);
      }
    } catch (error) { console.error('Error fetching notifications:', error); }
  }, [user?.id, getDeletedTickets]);

  // بناء المحادثات الموحدة
const buildUnifiedChats = useCallback(async (tickets, notifs) => {
  const deletedSet = getDeletedTickets();
  const CHAT_TYPES = new Set([
    'new_chat_ticket', 'guide_chat', 'new_chat_message',
    'GUIDE_CHAT', 'NEW_CHAT_TICKET', 'NEW_CHAT_MESSAGE',
    'new_message', 'NEW_MESSAGE', 'support_message', 'SUPPORT_MESSAGE'
  ]);

  // ✅ تصفية الإشعارات - استبعاد المحذوفة
  const chatNotifs = notifs
    .filter(n => CHAT_TYPES.has(n.type))
    .map(n => {
      // استخراج ticketId بنفس طريقة deleteConversation
      let ticketId = null;
      // 1. من n.data
      if (n.data) {
        let parsedData = n.data;
        if (typeof parsedData === 'string') {
          try { parsedData = JSON.parse(parsedData); } catch (e) {}
        }
        ticketId = parsedData?.ticketId || parsedData?.ticket_id || null;
      }
      // 2. من n مباشرة
      if (!ticketId) {
        ticketId = n.ticket_id || n.ticketId || null;
      }
      // 3. من action_url
      if (!ticketId && n.action_url) {
        const m = String(n.action_url).match(/\d+/);
        if (m) ticketId = m[0];
      }
      if (!ticketId && n.data?.action_url) {
        const m = String(n.data.action_url).match(/\d+/);
        if (m) ticketId = m[0];
      }
      // إذا كان ticketId محذوفاً، تخطى هذا الإشعار
      if (ticketId && deletedSet.has(String(ticketId))) return null;

      let touristId = null;
      let touristName = n.data?.userName || n.data?.fromName || n.data?.created_by_name || n.data?.sender_name || (lang === 'ar' ? 'مسافر' : 'Traveler');

      if (n.data) {
        if (typeof n.data === 'string') {
          try {
            const parsed = JSON.parse(n.data);
            touristId = parsed.userId || parsed.senderId || parsed.touristId || parsed.from_user_id;
            touristName = parsed.userName || parsed.senderName || parsed.touristName || touristName;
          } catch (e) {}
        } else {
          touristId = n.data.userId || n.data.senderId || n.data.touristId || n.data.from_user_id;
          touristName = n.data.userName || n.data.senderName || n.data.touristName || touristName;
        }
      }

      return {
        _sourceType: 'notification',
        id: `notif_${n.id}`,
        ticketId: ticketId ? String(ticketId) : null,
        touristId: touristId ? String(touristId) : null,
        touristName: touristName,
        subject: n.message || n.title || (lang === 'ar' ? 'رسالة جديدة' : 'New message'),
        created_at: n.created_at,
        is_read: n.is_read,
        rawNotif: n,
      };
    }).filter(Boolean);

  // ✅ تصفية التذاكر - استبعاد المحذوفة
  const chatTicketsPromises = tickets
    .filter(t => !deletedSet.has(String(t.id)))
    .map(async (t) => {
      let touristId = t.user_id || t.metadata?.created_by_id || t.metadata?.userId || t.metadata?.tourist_id;
      let touristName = t.user_name || t.metadata?.created_by_name || t.metadata?.tourist_name || (lang === 'ar' ? 'مسافر' : 'Traveler');

      if ((!touristName || touristName === (lang === 'ar' ? 'مسافر' : 'Traveler')) && touristId) {
        try {
          const token = localStorage.getItem('token');
          const numericId = await convertToNumericId(touristId);
          if (numericId) {
            const userRes = await fetch(`${API_BASE}/api/users/${numericId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.success && userData.user) {
                touristName = userData.user.full_name || userData.user.name || touristName;
              }
            }
          }
        } catch (err) {
          console.warn('Failed to fetch user name:', err);
        }
      }

      return {
        _sourceType: 'ticket',
        id: `ticket_${t.id}`,
        ticketId: String(t.id),
        touristId: touristId ? String(touristId) : null,
        touristName: touristName,
        subject: t.subject || (lang === 'ar' ? 'رسالة جديدة' : 'New message'),
        created_at: t.created_at,
        is_read: false,
        rawTicket: t,
      };
    });

  const chatTickets = await Promise.all(chatTicketsPromises);

  // ✅ دمج القائمتين مع تجنب التكرارات
  const chatMap = new Map();
  [...chatTickets, ...chatNotifs].forEach(item => {
    if (!item || !item.touristId) return;
    const key = item.touristId;
    const existing = chatMap.get(key);
    if (!existing) {
      chatMap.set(key, item);
    } else {
      if (new Date(item.created_at) > new Date(existing.created_at)) {
        chatMap.set(key, item);
      }
      if (!item.is_read && existing.is_read) {
        existing.is_read = false;
        chatMap.set(key, existing);
      }
      if (item.ticketId && !existing.ticketId) {
        chatMap.set(key, item);
      }
    }
  });

  const merged = Array.from(chatMap.values());
  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  console.log('✅ المحادثات المدمجة (محادثة واحدة لكل مستخدم):', merged.length);
  console.log('🗑️ التذاكر المحذوفة:', [...deletedSet]);
  return merged;
}, [lang, getDeletedTickets, convertToNumericId]);

  const [unifiedChats, setUnifiedChats] = useState([]);
  const [totalUnreadChats, setTotalUnreadChats] = useState(0);
  
  useEffect(() => {
    const loadUnifiedChats = async () => {
      if (guideTickets.length > 0 || notifications.length > 0) {
        const merged = await buildUnifiedChats(guideTickets, notifications);
        setUnifiedChats(merged);
        const unreadCount = merged.filter(c => !c.is_read).length;
        setTotalUnreadChats(unreadCount);
      } else {
        setUnifiedChats([]);
        setTotalUnreadChats(0);
      }
    };
    loadUnifiedChats();
  }, [guideTickets, notifications, buildUnifiedChats]);

  // قبول طلب الحجز
  const handleAcceptBooking = async (booking) => {
    if (processingBookingId === booking.id) return;
    setProcessingBookingId(booking.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/support/tickets/${booking.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'accepted' })
      });
      if (!response.ok) throw new Error('فشل قبول الطلب');
      toast.success(lang === 'ar' ? 'تم قبول طلب الحجز' : 'Booking request accepted');
      setBookingRequests(prev => prev.filter(b => b.id !== booking.id));
      await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: booking.touristId,
          title: lang === 'ar' ? 'تم قبول طلب حجزك' : 'Booking request accepted',
          message: lang === 'ar' ? `تم قبول طلب حجز برنامج ${booking.programName}` : `Your booking for ${booking.programName} has been accepted`,
          type: 'booking_accepted'
        })
      });
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (!response.ok) throw new Error('فشل رفض الطلب');
      toast.success(lang === 'ar' ? 'تم رفض طلب الحجز' : 'Booking request rejected');
      setBookingRequests(prev => prev.filter(b => b.id !== booking.id));
      await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: booking.touristId,
          title: lang === 'ar' ? 'تم رفض طلب حجزك' : 'Booking request rejected',
          message: lang === 'ar' ? `تم رفض طلب حجز برنامج ${booking.programName}` : `Your booking for ${booking.programName} has been rejected`,
          type: 'booking_rejected'
        })
      });
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'فشل رفض الطلب' : 'Failed to reject booking');
    } finally {
      setProcessingBookingId(null);
    }
  };

  // فتح محادثة مباشرة
  const openDirectChat = useCallback(async (chatItem) => {
    const guideId = user?.id;
    if (!guideId) {
      toast.error(lang === 'ar' ? 'لم يتم تسجيل الدخول' : 'Not logged in');
      return;
    }
    let touristId = chatItem.touristId;
    let touristName = chatItem.touristName;
    let ticketId = chatItem.ticketId;
    if (!touristId && chatItem.rawNotif) {
      const rawNotif = chatItem.rawNotif;
      if (rawNotif.data) {
        let parsedData = rawNotif.data;
        if (typeof parsedData === 'string') {
          try { parsedData = JSON.parse(parsedData); } catch(e) {}
        }
        touristId = parsedData.userId || parsedData.senderId || parsedData.touristId;
        touristName = parsedData.userName || parsedData.senderName || touristName;
        if (!ticketId) ticketId = parsedData.ticketId;
      }
    }
    if (!touristId) {
      toast.error(lang === 'ar' ? 'تعذر تحديد المسافر' : 'Cannot identify traveler');
      return;
    }
    const numericTouristId = await convertToNumericId(touristId);
    if (!numericTouristId) {
      toast.error(lang === 'ar' ? 'معرف المسافر غير صالح' : 'Invalid traveler ID');
      return;
    }
    const params = {
      recipientId: numericTouristId,
      recipientName: touristName || (lang === 'ar' ? 'مسافر' : 'Traveler'),
      recipientType: 'tourist',
      timestamp: Date.now()
    };
    if (ticketId) params.ticketId = ticketId;
    localStorage.setItem('directChatParams', JSON.stringify(params));
    localStorage.setItem('previousPage', 'guideDashboard');
    toast.success(lang === 'ar' ? `جاري فتح المحادثة مع ${params.recipientName}` : `Opening chat with ${params.recipientName}`);
    setPage('directChat');
  }, [user?.id, lang, setPage, convertToNumericId]);

  // ✅ دالة محسّنة لحذف المحادثة (تدعم استخراج المعرف بطرق متعددة)
  const deleteConversation = useCallback(async (chat, event) => {
    if (event) event.stopPropagation();
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه المحادثة نهائياً؟' : 'Are you sure you want to permanently delete this conversation?')) return;

    const uniqueKey = chat.id || chat.ticketId || chat.uniqueId;
    if (deletingIdsRef.current.has(uniqueKey)) return;
    deletingIdsRef.current.add(uniqueKey);

    try {
      // ✅ محاولة استخراج ticketId بكل الطرق الممكنة
      let ticketId = null;

      // 1. من chat.ticketId
      if (chat.ticketId) ticketId = chat.ticketId;
      // 2. من chat.id (إذا لم يكن يبدأ بـ notif_ أو ticket_)
      else if (chat.id && !String(chat.id).startsWith('notif_') && !String(chat.id).startsWith('ticket_')) {
        ticketId = chat.id;
      }
      // 3. من chat.rawNotif
      else if (chat.rawNotif) {
        if (chat.rawNotif.data) {
          let parsedData = chat.rawNotif.data;
          if (typeof parsedData === 'string') {
            try { parsedData = JSON.parse(parsedData); } catch (e) {}
          }
          ticketId = parsedData?.ticketId || parsedData?.ticket_id || null;
        }
        if (!ticketId) ticketId = chat.rawNotif.ticket_id || chat.rawNotif.ticketId || null;
      }
      // 4. من chat.rawTicket
      else if (chat.rawTicket) {
        ticketId = chat.rawTicket.id || null;
      }

      // ✅ إذا لم نجد ticketId، نستخدم chat.id كمعرف فريد
      if (!ticketId && chat.id) {
        const idStr = String(chat.id);
        const numericMatch = idStr.match(/\d+/);
        if (numericMatch) {
          ticketId = parseInt(numericMatch[0], 10);
        } else {
          ticketId = chat.id;
        }
      }

      // ✅ إذا لم نجد أي معرف، نستخدم معرفاً فريداً مؤقتاً
      if (!ticketId) {
        ticketId = `temp_${Date.now()}`;
      }

      const finalId = String(ticketId);
      console.log('🗑️ حذف المحادثة بـ ID:', finalId, chat);

      // ✅ إضافة إلى localStorage
      addDeletedTicket(finalId);

      // ✅ تحديث القوائم المحلية فوراً
      setGuideTickets(prev => prev.filter(t => String(t.id) !== finalId));
      setUnifiedChats(prev => prev.filter(c => {
        const cId = c.ticketId || c.id || c.uniqueId;
        return String(cId) !== finalId;
      }));
      setNotifications(prev => prev.filter(n => {
        const nTicketId = n.data?.ticketId || n.ticket_id || n.id;
        return String(nTicketId) !== finalId;
      }));
      setBookingRequests(prev => prev.filter(b => String(b.id) !== finalId));

      // ✅ تقليل عداد الرسائل غير المقروءة
      if (!chat.is_read) {
        setTotalUnreadChats(prev => Math.max(0, prev - 1));
        setUnreadChatCount(prev => Math.max(0, prev - 1));
      }

      // ✅ محاولة حذف من الخادم (في الخلفية)
      const token = localStorage.getItem('token');
      if (token && !String(finalId).startsWith('temp_')) {
        try {
          // محاولة DELETE
          const delRes = await fetch(`${API_BASE}/api/support/tickets/${finalId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!delRes.ok) {
            // إذا فشل DELETE، حاول PATCH لإغلاق التذكرة
            await fetch(`${API_BASE}/api/support/tickets/${finalId}/status`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'closed' })
            });
          }
        } catch (e) {
          console.warn('فشل حذف التذكرة من الخادم، لكن تم إخفاؤها محلياً');
        }
      }

      toast.success(lang === 'ar' ? '✅ تم حذف المحادثة' : '✅ Conversation deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(lang === 'ar' ? '❌ حدث خطأ، لكن المحادثة ستختفي' : '❌ Error, but conversation will disappear');
    } finally {
      deletingIdsRef.current.delete(uniqueKey);
      // إعادة تحميل القوائم بعد فترة للتأكد
      setTimeout(() => {
        fetchGuideTickets();
        fetchNotifications();
      }, 1000);
    }
  }, [lang, addDeletedTicket, fetchGuideTickets, fetchNotifications]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadNotifCount(prev => Math.max(0, prev - 1));
    } catch (error) { console.error(error); }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/notifications/read-all`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
      toast.success(lang === 'ar' ? 'تم تحديث جميع الإشعارات' : 'All notifications marked as read');
    } catch (error) { console.error(error); }
  }, [lang]);

  const handleBellNotifClick = useCallback(async (notif) => {
    await markNotificationAsRead(notif.id);
    setShowNotifications(false);
    const CHAT_TYPES = new Set([
      'new_chat_ticket', 'guide_chat', 'new_chat_message',
      'GUIDE_CHAT', 'NEW_CHAT_TICKET', 'NEW_CHAT_MESSAGE',
      'new_message', 'NEW_MESSAGE'
    ]);
    if (CHAT_TYPES.has(notif.type)) {
      let ticketId = notif.data?.ticketId || notif.ticket_id || null;
      const deletedSet = getDeletedTickets();
      if (ticketId && deletedSet.has(String(ticketId))) { 
        toast(lang === 'ar' ? 'هذه المحادثة محذوفة' : 'Conversation deleted', { icon: '🗑️' }); 
        return; 
      }
      let touristId = null;
      let touristName = null;
      if (notif.data) {
        let parsedData = notif.data;
        if (typeof parsedData === 'string') {
          try { parsedData = JSON.parse(parsedData); } catch(e) {}
        }
        touristId = parsedData.userId || parsedData.senderId || parsedData.created_by_id;
        touristName = parsedData.userName || parsedData.senderName || parsedData.created_by_name;
        if (!ticketId && parsedData.ticketId) ticketId = parsedData.ticketId;
      }
      if (!touristId && notif.ticket_id) {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}`, { headers: { 'Authorization': `Bearer ${token}` } });
          const data = await res.json();
          if (data.success && data.ticket) {
            const t = data.ticket;
            const currentUserId = user?.id;
            const possible = [t.user_id, t.sender_id, t.receiver_id, t.metadata?.guideId, t.metadata?.created_by_id, t.metadata?.userId, t.metadata?.senderId];
            for (const id of possible) {
              if (id && String(id) !== String(currentUserId)) {
                touristId = String(id);
                touristName = t.user_name || t.sender_name || t.metadata?.created_by_name || t.metadata?.userName;
                break;
              }
            }
          }
        } catch(e) { console.warn(e); }
      }
      if (!touristId) {
        toast.error(lang === 'ar' ? 'لا يمكن فتح المحادثة' : 'Cannot open conversation');
        return;
      }
      const tempChatItem = {
        touristId: touristId,
        touristName: touristName || (lang === 'ar' ? 'مسافر' : 'Traveler'),
        ticketId: ticketId,
        _sourceType: 'notification',
        rawNotif: notif
      };
      await openDirectChat(tempChatItem);
    } else {
      if (notif.action_url) {
        const pageName = notif.action_url.replace(/^\//, '');
        if (pageName && typeof setPage === 'function') setPage(pageName);
        else setPage('support');
      } else {
        setPage('support');
      }
    }
  }, [lang, getDeletedTickets, user?.id, markNotificationAsRead, setPage, openDirectChat]);

  // Socket.IO
  useEffect(() => {
    if (!user?.id || !isGuide) return;
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;
    socket.on('connect', () => { setSocketConnected(true); socket.emit('user-connected', user.id); });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      const CHAT_TYPES = new Set(['new_chat_ticket', 'guide_chat', 'new_chat_message', 'GUIDE_CHAT', 'NEW_CHAT_TICKET', 'NEW_CHAT_MESSAGE', 'new_message', 'NEW_MESSAGE']);
      if (CHAT_TYPES.has(notification.type)) {
        setUnreadChatCount(prev => prev + 1);
        toast(`📨 ${notification.title}`, { duration: 5000, icon: '💬' });
        fetchGuideTickets();
      } else {
        if (!notification.is_read) setUnreadNotifCount(prev => prev + 1);
        toast(notification.title, { duration: 5000, icon: '🔔' });
      }
    });
    socket.on('guide_notification', (data) => {
      toast(`📨 ${lang === 'ar' ? 'رسالة جديدة من' : 'New message from'} ${data.fromName}`, { duration: 5000, icon: '💬' });
      setUnreadChatCount(prev => prev + 1);
      fetchGuideTickets();
    });
    return () => { if (socket) socket.disconnect(); };
  }, [user?.id, isGuide, fetchGuideTickets, lang]);

  // تحديث دوري
  useEffect(() => {
    if (isGuide) {
      fetchGuideTickets();
      fetchNotifications();
      fetchBookingRequests();
      const interval = setInterval(() => { 
        fetchGuideTickets(); 
        fetchNotifications();
        fetchBookingRequests();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isGuide, fetchGuideTickets, fetchNotifications, fetchBookingRequests]);

  useEffect(() => {
    if (activeTab === 'chats') {
      fetchGuideTickets();
      setUnreadChatCount(0);
    }
  }, [activeTab, fetchGuideTickets]);

  // ============================================================
  // ✅ دوال البرامج المحسّنة مع حفظ الصور في cache والحد الأقصى 11 صورة
  // ============================================================

  const formatSafetyGuidelines = useCallback((text) => {
    if (!text) return null;
    return text.split(/\r?\n/).map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || /^\d+\./.test(trimmed)) {
        const content = trimmed.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
        return <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300 mb-0.5"><span className="text-orange-500 mt-0.5">•</span><span>{content}</span></li>;
      }
      return <p key={idx} className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">{trimmed}</p>;
    }).filter(Boolean);
  }, []);

  // ✅ دالة محسنة للحصول على الصورة الرئيسية مع دعم cache واستخدام الأولى افتراضياً
  const getPrimaryImage = useCallback((program) => {
    if (!program) return null;
    
    console.log(`🔍 Getting primary image for program ${program.id}:`, program.name);
    
    // 1. من كائن البرنامج مباشرة
    if (program.images && Array.isArray(program.images) && program.images.length > 0) {
      console.log(`📸 Program ${program.id} has ${program.images.length} images from program object`);
      const primary = program.images.find(img => img.is_primary === true);
      const imgObj = primary || program.images[0];
      const url = getImageUrl(imgObj);
      if (url) {
        const fullUrl = buildImageUrl(url);
        if (fullUrl) {
          console.log(`✅ Found primary image: ${fullUrl}`);
          return fullUrl;
        }
      }
    }
    
    // 2. من cache
    const cached = getImagesFromCache(program.id);
    if (cached && cached.length > 0) {
      console.log(`📸 Program ${program.id} has ${cached.length} images from cache`);
      const primary = cached.find(img => img.is_primary === true);
      const imgObj = primary || cached[0];
      const url = getImageUrl(imgObj);
      if (url) {
        const fullUrl = buildImageUrl(url);
        if (fullUrl) {
          console.log(`✅ Found cached image: ${fullUrl}`);
          return fullUrl;
        }
      }
    }
    
    // 3. الصورة الأساسية من program.image
    if (program.image) {
      const url = buildImageUrl(program.image);
      if (url) {
        console.log(`✅ Using program.image: ${url}`);
        return url;
      }
    }
    
    // 4. من program.images كـ مصفوفة روابط (سلاسل نصية)
    if (program.images && Array.isArray(program.images) && program.images.length > 0) {
      const firstImage = program.images[0];
      const url = getImageUrl(firstImage);
      if (url) {
        const fullUrl = buildImageUrl(url);
        if (fullUrl) {
          console.log(`✅ Using string image URL: ${fullUrl}`);
          return fullUrl;
        }
      }
    }
    
    console.log(`❌ No image found for program ${program.id}`);
    return null;
  }, []);

  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
          } else {
            if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            const previewUrl = URL.createObjectURL(blob);
            resolve({ blob, preview: previewUrl });
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const updateMapWithPrograms = useCallback((programsList) => {
    if (!setUserPrograms) return;
    const activePrograms = programsList.filter(p => p.status === 'active');
    const mapPrograms = activePrograms.map(p => ({
      id: p.id,
      name_ar: p.name,
      name_en: p.name,
      guide_name: p.guide_name || user?.full_name,
      guide_id: p.guide_id,
      coordinates: [p.location_lng, p.location_lat],
      price: p.price,
      duration: p.duration,
      rating: p.rating || 4.5,
      location_name: p.location_name,
      description: p.description,
      max_participants: p.maxParticipants,
      participants: p.participants || 0,
      image: getPrimaryImage(p),
      imageCount: p.images?.length || 0
    })).filter(p => p.coordinates && p.coordinates[0] && p.coordinates[1]);
    setUserPrograms(mapPrograms);
  }, [setUserPrograms, user?.full_name, getPrimaryImage]);

  // ✅ دالة محسنة لتهيئة الصور من البيانات المسترجعة
  const formatProgramFromServer = useCallback((p) => {
    console.log(`📦 Formatting program ${p.id}:`, p.name);
    
    let images = [];
    
    // 1. من البيانات المسترجعة (images كـ json_agg من program_images)
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      console.log(`📸 Program ${p.id} has ${p.images.length} images from server`);
      images = p.images.map(img => {
        const url = getImageUrl(img);
        if (!url) return null;
        const fullUrl = buildImageUrl(url);
        if (!fullUrl) return null;
        return { 
          id: img.id, 
          url: fullUrl, 
          image_url: fullUrl,
          is_primary: img.is_primary === true 
        };
      }).filter(Boolean);
      
      // تأكد من وجود صورة رئيسية
      if (images.length > 0 && !images.some(img => img.is_primary)) {
        images[0].is_primary = true;
      }
      
      // حفظ في cache
      if (images.length > 0) {
        saveImagesToCache(p.id, images);
      }
    } 
    // 2. من cache
    else {
      const cached = getImagesFromCache(p.id);
      if (cached && cached.length > 0) {
        console.log(`📸 Program ${p.id} has ${cached.length} images from cache`);
        images = cached;
        // تأكد من وجود صورة رئيسية
        if (!images.some(img => img.is_primary)) {
          images[0].is_primary = true;
        }
      }
    }
    
    // 3. الصورة الأساسية من p.image
    if (images.length === 0 && p.image) {
      const url = buildImageUrl(p.image);
      if (url) {
        console.log(`📸 Using program.image for ${p.id}: ${url}`);
        images = [{ id: null, url, image_url: url, is_primary: true }];
        saveImagesToCache(p.id, images);
      }
    }
    
    // 4. من photos (تنسيق قديم)
    if (images.length === 0 && p.photos && Array.isArray(p.photos)) {
      console.log(`📸 Using photos for ${p.id}`);
      images = p.photos.map(photo => {
        const url = getImageUrl(photo);
        if (!url) return null;
        const fullUrl = buildImageUrl(url);
        return fullUrl ? { id: null, url: fullUrl, image_url: fullUrl, is_primary: photo.is_primary || false } : null;
      }).filter(Boolean);
      if (images.length > 0) {
        if (!images.some(img => img.is_primary)) {
          images[0].is_primary = true;
        }
        saveImagesToCache(p.id, images);
      }
    }
    
    // تعيين صورة رئيسية إذا لم توجد (ضمان أمان)
    if (images.length > 0 && !images.some(img => img.is_primary)) {
      images[0].is_primary = true;
    }
    
    const formatted = {
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: p.price || 0,
      duration: p.duration || "غير محدد",
      maxParticipants: p.max_participants || p.maxParticipants || 20,
      location_name: p.location_name || p.location,
      location_lat: p.location_lat,
      location_lng: p.location_lng,
      status: p.status || "active",
      participants: p.participants || 0,
      guide_id: p.guide_id,
      guide_name: p.guide_name,
      created_at: p.created_at,
      rating: p.rating || 4.5,
      images: images,
      image: images.length > 0 ? images[0].url : null,
      safetyGuidelines: p.safetyGuidelines || p.safety_guidelines || ""
    };
    
    console.log(`✅ Formatted program ${p.id} with ${images.length} images`);
    return formatted;
  }, []);

  const refetchSingleProgram = useCallback(async (programId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/programs/${programId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        const programData = data.program || data.data || data;
        if (programData) {
          // جلب الصور بشكل منفصل أيضاً
          let images = [];
          try {
            const imgRes = await fetch(`${API_BASE}/api/programs/${programId}/images`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const imgData = await imgRes.json();
            if (imgData.success && Array.isArray(imgData.images) && imgData.images.length > 0) {
              images = imgData.images.map(img => {
                const url = getImageUrl(img);
                if (!url) return null;
                const fullUrl = buildImageUrl(url);
                return fullUrl ? {
                  id: img.id,
                  url: fullUrl,
                  image_url: fullUrl,
                  is_primary: img.is_primary === true
                } : null;
              }).filter(Boolean);
              // تأكد من وجود صورة رئيسية
              if (images.length > 0 && !images.some(img => img.is_primary)) {
                images[0].is_primary = true;
              }
              // حفظ في cache
              if (images.length > 0) {
                saveImagesToCache(programId, images);
              }
            }
          } catch (e) { console.warn('Could not fetch images:', e); }
          
          const formatted = formatProgramFromServer({
            ...programData,
            images: images.length > 0 ? images : programData.images
          });
          
          setPrograms(prev => prev.map(p => p.id === programId ? formatted : p));
          updateMapWithPrograms([formatted, ...programs.filter(p => p.id !== programId)]);
          return formatted;
        }
      }
    } catch (err) { console.error(err); }
    return null;
  }, [formatProgramFromServer, updateMapWithPrograms, programs]);

  // ✅ دالة محسنة لجلب البرامج مع الصور باستخدام cache
  const fetchRealPrograms = useCallback(async () => {
    const guideId = user?.id;
    if (!guideId) { setLoading(false); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let programsArray = [];
      
      console.log(`📥 Fetching programs for guide: ${guideId}`);
      
      // جلب البرامج من المسار الرئيسي
      const response = await fetch(`${API_BASE}/api/guides/${guideId}/programs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok && data.success && Array.isArray(data.programs)) {
        programsArray = data.programs;
      } else if (Array.isArray(data)) {
        programsArray = data;
      } else if (data.data && Array.isArray(data.data)) {
        programsArray = data.data;
      } else {
        // Fallback
        const fallbackRes = await fetch(`${API_BASE}/api/programs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok && fallbackData.success && Array.isArray(fallbackData.programs)) {
          programsArray = fallbackData.programs.filter(p => String(p.guide_id) === String(guideId));
        }
      }
      
      console.log(`📦 Found ${programsArray.length} programs for guide ${guideId}`);
      
      // ✅ جلب الصور لكل برنامج بشكل منفصل
      const programsWithImages = await Promise.all(
        programsArray.map(async (program) => {
          let images = [];
          
          // ✅ محاولة جلب الصور من API
          try {
            console.log(`📸 Fetching images for program ${program.id}`);
            const detailRes = await fetch(`${API_BASE}/api/programs/${program.id}/images`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              console.log(`📸 Images response for ${program.id}:`, detailData);
              
              if (detailData.success && Array.isArray(detailData.images) && detailData.images.length > 0) {
                images = detailData.images.map(img => {
                  const url = getImageUrl(img);
                  if (!url) return null;
                  const fullUrl = buildImageUrl(url);
                  return fullUrl ? {
                    id: img.id,
                    url: fullUrl,
                    image_url: fullUrl,
                    is_primary: img.is_primary === true
                  } : null;
                }).filter(Boolean);
                // تأكد من وجود صورة رئيسية
                if (images.length > 0 && !images.some(img => img.is_primary)) {
                  images[0].is_primary = true;
                }
                // حفظ في cache
                if (images.length > 0) {
                  saveImagesToCache(program.id, images);
                  console.log(`💾 Saved ${images.length} images to cache for program ${program.id}`);
                }
              }
            }
          } catch (err) {
            console.warn(`Could not fetch images for program ${program.id}:`, err);
          }
          
          // ✅ إذا لم توجد صور من API، حاول من cache
          if (images.length === 0) {
            const cached = getImagesFromCache(program.id);
            if (cached && cached.length > 0) {
              images = cached;
              console.log(`📸 Using cached images for program ${program.id}: ${images.length}`);
              if (!images.some(img => img.is_primary)) {
                images[0].is_primary = true;
              }
            }
          }
          
          // ✅ إذا لم توجد صور، استخدم الصورة الأساسية
          if (images.length === 0 && program.image) {
            const url = buildImageUrl(program.image);
            if (url) {
              images = [{ id: null, url, image_url: url, is_primary: true }];
              saveImagesToCache(program.id, images);
              console.log(`📸 Using program.image for ${program.id}: ${url}`);
            }
          }
          
          console.log(`📸 Program ${program.id} has ${images.length} images total`);
          return { ...program, images };
        })
      );
      
      const formatted = programsWithImages.map(p => formatProgramFromServer(p));
      setPrograms(formatted);
      updateMapWithPrograms(formatted);
      updateStats(formatted);
      
      const totalImages = formatted.reduce((acc, p) => acc + (p.images?.length || 0), 0);
      console.log(`✅ Loaded ${formatted.length} programs with ${totalImages} images`);
      
      // ✅ تحديث cache بعد التحميل
      formatted.forEach(p => {
        if (p.images && p.images.length > 0) {
          if (!p.images.some(img => img.is_primary)) {
            p.images[0].is_primary = true;
          }
          saveImagesToCache(p.id, p.images);
        }
      });
      
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error(lang === 'ar' ? 'فشل الاتصال بالخادم' : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, [user?.id, lang, formatProgramFromServer, updateMapWithPrograms, updateStats]);

  // ✅ تحميل البرامج عند بدء التشغيل وكل 60 ثانية (تحديث دوري)
  useEffect(() => {
    fetchRealPrograms();
    const interval = setInterval(fetchRealPrograms, 60000);
    return () => clearInterval(interval);
  }, [fetchRealPrograms]);
  
  useEffect(() => { if (user?.id) fetchBalance(); }, [user?.id, fetchBalance]);

  // ✅ دالة إضافة الصور مع تطبيق الحد الأقصى
  const addMultipleImages = async (files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const currentCount = newProgram.images.length;
    const totalAfterAdd = currentCount + fileArray.length;
    
    if (totalAfterAdd > MAX_PROGRAM_IMAGES) {
      toast.error(
        lang === 'ar'
          ? `لا يمكن إضافة أكثر من ${MAX_PROGRAM_IMAGES} صورة. لديك ${currentCount} صورة، يمكنك إضافة ${MAX_PROGRAM_IMAGES - currentCount} فقط.`
          : `Cannot add more than ${MAX_PROGRAM_IMAGES} images. You have ${currentCount}, you can add ${MAX_PROGRAM_IMAGES - currentCount} more.`
      );
      return;
    }

    for (const file of fileArray) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`حجم الصورة ${file.name} أكبر من 5 ميجابايت`); continue; }
      if (!file.type.startsWith('image/')) { toast.error(`الملف ${file.name} ليس صورة`); continue; }
      setUploadingImage(true);
      try {
        const { blob, preview } = await compressImage(file, 800, 800, 0.7);
        setNewProgram(prev => {
          const isFirst = prev.images.length === 0;
          return {
            ...prev,
            images: [...prev.images, { file: blob, preview, isPrimary: isFirst, isExisting: false }],
            primaryImageIndex: isFirst ? 0 : prev.primaryImageIndex
          };
        });
        toast.success(`تمت إضافة ${file.name}`);
      } catch (err) { toast.error(`فشل ضغط الصورة ${file.name}`); }
      finally { setUploadingImage(false); }
    }
  };

  const removeImage = (index) => {
    setNewProgram(prev => {
      const img = prev.images[index];
      if (img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
      const newImages = prev.images.filter((_, i) => i !== index);
      let newPrimaryIndex = prev.primaryImageIndex;
      if (index === prev.primaryImageIndex) newPrimaryIndex = 0;
      else if (index < prev.primaryImageIndex) newPrimaryIndex--;
      if (newImages.length > 0) newImages.forEach((img, i) => { img.isPrimary = i === newPrimaryIndex; });
      return { ...prev, images: newImages, primaryImageIndex: newImages.length > 0 ? newPrimaryIndex : 0 };
    });
  };

  const setPrimaryImage = (index) => {
    setNewProgram(prev => ({ ...prev, primaryImageIndex: index }));
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=ar`);
      const data = await res.json();
      if (data.features?.length > 0) return data.features[0].place_name;
    } catch (e) { console.error(e); }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const initAddMap = useCallback((lat, lng) => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) { try { mapInstanceRef.current.remove(); } catch(e) {} mapInstanceRef.current = null; }
    const map = new mapboxgl.Map({ container: mapContainerRef.current, style: 'mapbox://styles/mapbox/outdoors-v12', center: [lng, lat], zoom: 13, interactive: true });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    const m = new mapboxgl.Marker({ draggable: true }).setLngLat([lng, lat]).addTo(map);
    m.on('dragend', async () => { const { lng, lat } = m.getLngLat(); const name = await reverseGeocode(lat, lng); setNewProgram(prev => ({ ...prev, location_lat: lat, location_lng: lng, location_name: name })); });
    map.on('click', async (e) => { const { lng, lat } = e.lngLat; m.setLngLat([lng, lat]); const name = await reverseGeocode(lat, lng); setNewProgram(prev => ({ ...prev, location_lat: lat, location_lng: lng, location_name: name })); });
    mapInstanceRef.current = map;
    markerRef.current = m;
  }, []);

  const initEditMap = useCallback((lat, lng) => {
    if (!editMapContainerRef.current) return;
    if (editMapInstanceRef.current) { try { editMapInstanceRef.current.remove(); } catch(e) {} editMapInstanceRef.current = null; }
    const map = new mapboxgl.Map({ container: editMapContainerRef.current, style: 'mapbox://styles/mapbox/outdoors-v12', center: [lng, lat], zoom: 13, interactive: true });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    const m = new mapboxgl.Marker({ draggable: true }).setLngLat([lng, lat]).addTo(map);
    m.on('dragend', async () => { const { lng, lat } = m.getLngLat(); const name = await reverseGeocode(lat, lng); setNewProgram(prev => ({ ...prev, location_lat: lat, location_lng: lng, location_name: name })); });
    map.on('click', async (e) => { const { lng, lat } = e.lngLat; m.setLngLat([lng, lat]); const name = await reverseGeocode(lat, lng); setNewProgram(prev => ({ ...prev, location_lat: lat, location_lng: lng, location_name: name })); });
    editMapInstanceRef.current = map;
    editMarkerRef.current = m;
  }, []);

  useEffect(() => {
    if (showAddProgram && activeStep === 3 && mapContainerRef.current && !mapInstanceRef.current) {
      const lat = newProgram.location_lat || 24.7136;
      const lng = newProgram.location_lng || 46.6753;
      setTimeout(() => initAddMap(lat, lng), 100);
    }
  }, [showAddProgram, activeStep, newProgram.location_lat, newProgram.location_lng, initAddMap]);

  useEffect(() => {
    if (showEditModal && editMapContainerRef.current && editingProgram && !editMapInstanceRef.current) {
      const lat = newProgram.location_lat || 24.7136;
      const lng = newProgram.location_lng || 46.6753;
      setTimeout(() => initEditMap(lat, lng), 100);
    }
  }, [showEditModal, editingProgram, newProgram.location_lat, newProgram.location_lng, initEditMap]);

  const canAddNewProgram = useCallback(() => {
    if (programs.length >= 11) {
      toast.error(lang === 'ar' 
        ? '⚠️ لا يمكنك إضافة أكثر من 11 برنامج. الحد الأقصى 11 برنامج.' 
        : '⚠️ You cannot add more than 11 programs. Maximum is 11 programs.');
      return false;
    }
    return true;
  }, [programs.length, lang]);

  const validateProgram = () => {
    if (!newProgram.name.trim()) { toast.error('الرجاء إدخال اسم البرنامج'); return false; }
    if (!newProgram.location_lat || !newProgram.location_lng) { toast.error('الرجاء تحديد موقع البرنامج على الخريطة'); return false; }
    if (!newProgram.price || parseFloat(newProgram.price) <= 0) { toast.error('الرجاء إدخال سعر صحيح'); return false; }
    if (!newProgram.duration.trim()) { toast.error('الرجاء إدخال مدة البرنامج'); return false; }
    if (!newProgram.maxParticipants || parseInt(newProgram.maxParticipants) <= 0) { toast.error('الرجاء إدخال عدد أقصى صحيح للمشاركين'); return false; }
    return true;
  };

  const handleAddProgram = async () => {
    if (!canAddNewProgram()) return;
    if (!validateProgram()) return;
    setLoading(true);
    try {
      const guideId = user?.id;
      const locationName = newProgram.location_name || await reverseGeocode(newProgram.location_lat, newProgram.location_lng);
      const token = localStorage.getItem('token');
      const createResponse = await fetch(`${API_BASE}/api/programs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guide_id: guideId,
          name: newProgram.name,
          description: newProgram.description,
          price: parseFloat(newProgram.price),
          duration: newProgram.duration,
          max_participants: parseInt(newProgram.maxParticipants),
          location: locationName,
          location_name: locationName,
          location_lat: newProgram.location_lat,
          location_lng: newProgram.location_lng,
          safety_guidelines: newProgram.safetyGuidelines,
          status: 'active'
        })
      });
      const createData = await createResponse.json();
      if (!createResponse.ok) throw new Error(createData.message || 'فشل إنشاء البرنامج');
      const programId = createData.program?.id || createData.id;
      const localImages = newProgram.images.filter(img => img.file !== null);
      if (localImages.length > 0) {
        toast.loading(`جاري رفع ${localImages.length} صورة...`, { id: 'upload-images' });
        for (let idx = 0; idx < localImages.length; idx++) {
          const img = localImages[idx];
          const formData = new FormData();
          const file = new File([img.file], `image_${Date.now()}_${idx}.jpg`, { type: 'image/jpeg' });
          formData.append('images', file);
          await fetch(`${API_BASE}/api/programs/${programId}/images`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        }
        toast.dismiss('upload-images');
        toast.success('تم رفع الصور بنجاح');
        // حفظ الصور في cache
        const savedImages = localImages.map((img, idx) => ({
          url: buildImageUrl(`/uploads/programs/program_${programId}_${Date.now()}_${idx}.jpg`),
          is_primary: idx === 0
        }));
        saveImagesToCache(programId, savedImages);
      }
      await refetchSingleProgram(programId);
      toast.success('✅ تم إضافة البرنامج بنجاح');
      if (onProgramAdded) onProgramAdded();
      newProgram.images.forEach(img => { if (img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview); });
      setNewProgram(defaultProgramState);
      setShowAddProgram(false);
      setActiveStep(1);
      if (mapInstanceRef.current) { try { mapInstanceRef.current.remove(); } catch(e) {} mapInstanceRef.current = null; }
    } catch (error) { toast.error(error.message || '❌ حدث خطأ أثناء إضافة البرنامج'); }
    finally { setLoading(false); }
  };

  const toggleProgramStatus = async (programId, currentStatus) => {
    setLoading(true);
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/programs/${programId}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('فشل التحديث');
      toast.success(newStatus === 'active' ? '✅ تم تفعيل البرنامج' : '⏸ تم إيقاف البرنامج');
      await fetchRealPrograms();
      if (onProgramAdded) onProgramAdded();
    } catch (error) { toast.error('❌ فشل تحديث حالة البرنامج'); }
    finally { setLoading(false); }
  };

  const handleDeleteProgram = async (programId) => {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا البرنامج؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/programs/${programId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('فشل الحذف');
      toast.success('✅ تم حذف البرنامج بنجاح');
      // حذف من cache
      const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
      delete cache[programId];
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
      await fetchRealPrograms();
      if (onProgramAdded) onProgramAdded();
    } catch (error) { toast.error('❌ حدث خطأ أثناء حذف البرنامج'); }
    finally { setLoading(false); }
  };

  const openEditModal = (program) => {
    setEditingProgram(program);
    // استخدام الصور من program أو من cache
    let imagesForEdit = [];
    if (program.images && program.images.length > 0) {
      imagesForEdit = program.images.map((img) => {
        const url = getImageUrl(img);
        if (!url) return null;
        const fullUrl = buildImageUrl(url);
        if (!fullUrl) return null;
        return { id: img.id, file: null, preview: fullUrl, isPrimary: img.is_primary === true, isExisting: true };
      }).filter(Boolean);
    } else {
      const cached = getImagesFromCache(program.id);
      if (cached && cached.length > 0) {
        imagesForEdit = cached.map((img) => {
          const url = getImageUrl(img);
          if (!url) return null;
          const fullUrl = buildImageUrl(url);
          return fullUrl ? {
            id: img.id || null,
            file: null,
            preview: fullUrl,
            isPrimary: img.is_primary === true,
            isExisting: !!img.id
          } : null;
        }).filter(Boolean);
      }
    }
    if (imagesForEdit.length === 0 && program.image) {
      const url = buildImageUrl(program.image);
      if (url) imagesForEdit.push({ id: null, file: null, preview: url, isPrimary: true, isExisting: true });
    }
    if (imagesForEdit.length > 0 && !imagesForEdit.some(img => img.isPrimary)) imagesForEdit[0].isPrimary = true;
    const primaryIndex = Math.max(0, imagesForEdit.findIndex(img => img.isPrimary));
    originalImageIdsRef.current = imagesForEdit.filter(img => img.id).map(img => img.id);
    setNewProgram({
      name: program.name || "",
      description: program.description || "",
      price: program.price || "",
      duration: program.duration || "",
      maxParticipants: program.maxParticipants || "",
      images: imagesForEdit,
      primaryImageIndex: primaryIndex,
      safetyGuidelines: program.safetyGuidelines || "",
      location_lat: program.location_lat,
      location_lng: program.location_lng,
      location_name: program.location_name || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateProgram = async () => {
    if (!editingProgram) return;
    if (!validateProgram()) return;
    setLoading(true);
    try {
      const locationName = newProgram.location_name || await reverseGeocode(newProgram.location_lat, newProgram.location_lng);
      const token = localStorage.getItem('token');
      const updateResponse = await fetch(`${API_BASE}/api/programs/${editingProgram.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProgram.name,
          description: newProgram.description,
          price: parseFloat(newProgram.price),
          duration: newProgram.duration,
          max_participants: parseInt(newProgram.maxParticipants),
          location: locationName,
          location_name: locationName,
          location_lat: newProgram.location_lat,
          location_lng: newProgram.location_lng,
          safety_guidelines: newProgram.safetyGuidelines
        })
      });
      if (!updateResponse.ok) throw new Error('فشل تحديث البيانات');
      const currentImageIds = newProgram.images.filter(img => img.id && img.isExisting).map(img => img.id);
      const imagesToDelete = originalImageIdsRef.current.filter(id => !currentImageIds.includes(id));
      for (const imageId of imagesToDelete) {
        await fetch(`${API_BASE}/api/programs/${editingProgram.id}/images/${imageId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      }
      const newImages = newProgram.images.filter(img => img.file !== null);
      if (newImages.length > 0) {
        toast.loading(`جاري رفع ${newImages.length} صورة جديدة...`, { id: 'upload-edit' });
        for (let idx = 0; idx < newImages.length; idx++) {
          const img = newImages[idx];
          const formData = new FormData();
          const file = new File([img.file], `image_${Date.now()}_${idx}.jpg`, { type: 'image/jpeg' });
          formData.append('images', file);
          if (newProgram.primaryImageIndex === newProgram.images.findIndex(i => i === img)) formData.append('is_primary', 'true');
          await fetch(`${API_BASE}/api/programs/${editingProgram.id}/images`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        }
        toast.dismiss('upload-edit');
        toast.success('تم رفع الصور الجديدة');
        // تحديث cache
        const updatedImages = newProgram.images.map(img => ({
          url: buildImageUrl(img.preview),
          is_primary: img.isPrimary || false
        }));
        saveImagesToCache(editingProgram.id, updatedImages);
      } else if (imagesToDelete.length > 0) {
        toast.success(`تم حذف ${imagesToDelete.length} صورة بنجاح`);
      }
      await refetchSingleProgram(editingProgram.id);
      toast.success('✅ تم تحديث البرنامج بنجاح');
      if (onProgramAdded) onProgramAdded();
      setShowEditModal(false);
      setEditingProgram(null);
      newProgram.images.forEach(img => { if (img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview); });
      setNewProgram(defaultProgramState);
      originalImageIdsRef.current = [];
      if (editMapInstanceRef.current) { try { editMapInstanceRef.current.remove(); } catch(e) {} editMapInstanceRef.current = null; }
    } catch (error) { toast.error(error.message || '❌ فشل تحديث البرنامج'); }
    finally { setLoading(false); }
  };

  // مكون عرض الصور مع عرض الحد الأقصى
  const ImageGallery = ({ accentColor = 'green' }) => {
    const isPrimBorder = accentColor === 'yellow' ? 'border-yellow-500 ring-2 ring-yellow-300' : 'border-green-500 ring-2 ring-green-300';
    const primBadgeBg = accentColor === 'yellow' ? 'bg-yellow-500' : 'bg-green-500';
    const addHover = accentColor === 'yellow' ? 'hover:border-yellow-500 hover:bg-yellow-50' : 'hover:border-green-500 hover:bg-green-50';
    const spinColor = accentColor === 'yellow' ? 'border-yellow-500' : 'border-green-500';
    const currentCount = newProgram.images.length;
    const remaining = MAX_PROGRAM_IMAGES - currentCount;
    const isFull = currentCount >= MAX_PROGRAM_IMAGES;

    return (
      <div>
        <div className="flex flex-wrap gap-3 mb-3">
          {newProgram.images.map((img, idx) => {
            const previewUrl = typeof img === 'string' ? img : (img.preview || img.url || img.image_url || null);
            return (
              <div key={`img-${idx}-${previewUrl?.slice(-10)}`} className={`relative w-24 h-24 rounded-xl overflow-hidden shadow-md cursor-pointer border-2 transition-all duration-200 ${img.isPrimary ? isPrimBorder : 'border-gray-200 hover:border-gray-400'}`} onClick={() => setPrimaryImage(idx)} title="انقر لتعيينها كصورة رئيسية">
                <img src={previewUrl} className="w-full h-full object-cover" alt={`صورة ${idx + 1}`} onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3E❌%3C/text%3E%3C/svg%3E"; }} loading="lazy" />
                <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-70 hover:opacity-100 transition shadow z-10" type="button"><X size={13} /></button>
                {img.isPrimary && <div className={`absolute bottom-0 inset-x-0 ${primBadgeBg} text-white text-center text-xs py-0.5 font-medium`}>⭐ رئيسية</div>}
                {img.isExisting && !img.isPrimary && <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-center text-xs py-0.5">محفوظة</div>}
              </div>
            );
          })}
          <label className={`w-24 h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 bg-gray-50 dark:bg-gray-700 ${isFull ? 'opacity-50 cursor-not-allowed' : addHover}`}>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addMultipleImages(e.target.files)} disabled={isFull} />
            {uploadingImage ? <div className={`animate-spin rounded-full h-6 w-6 border-2 border-t-transparent ${spinColor}`}></div> : <><Camera size={24} className="text-gray-400" /><span className="text-xs text-gray-500 mt-1">إضافة</span></>}
          </label>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">💡 انقر على صورة لتعيينها كالصورة الرئيسية</p>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {currentCount} / {MAX_PROGRAM_IMAGES} صورة
            {remaining > 0 && ` (يمكن إضافة ${remaining})`}
            {remaining === 0 && ' (اكتمل العدد)'}
          </span>
        </div>
      </div>
    );
  };

  const MapSection = ({ mapRef, accentColor = 'green', onGeolocate }) => {
    const pinColor = accentColor === 'yellow' ? 'text-yellow-600' : 'text-green-600';
    const btnColor = accentColor === 'yellow' ? 'text-yellow-600' : 'text-green-600';
    return (
      <div>
        <label className="block text-sm font-semibold mb-2 flex items-center gap-2"><MapPin className={`w-5 h-5 ${pinColor}`} />موقع البرنامج على الخريطة *</label>
        <div ref={mapRef} className="w-full h-64 rounded-xl overflow-hidden bg-gray-100" />
        <div className="flex justify-between items-center mt-2">
          <button type="button" onClick={onGeolocate} className={`text-sm ${btnColor} flex items-center gap-1 hover:underline`}><Crosshair size={14} /> استخدم موقعي الحالي</button>
          {newProgram.location_name && <span className="text-xs text-gray-500 truncate max-w-[200px]">{newProgram.location_name}</span>}
        </div>
        <p className="text-xs text-gray-500 mt-1">يمكنك سحب العلامة أو النقر على الخريطة لتحديد الموقع بدقة.</p>
      </div>
    );
  };

  const filteredPrograms = programs.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (!isGuide) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mt-2">هذه الصفحة مخصصة للمرشدين فقط</p>
          <button onClick={() => setPage('profile')} className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg">العودة</button>
        </div>
      </div>
    );
  }

  if (loading && programs.length === 0) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-20" dir="rtl">
      {/* الرأس - نفس الكود السابق */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setPage('home')} className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition"><ArrowLeft size={20} /> العودة</button>
        <div className="flex items-center gap-3">
          {showAdminButtons && (
            <>
              <button onClick={() => setPage('admin-support')} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition shadow-md"><Headphones size={16} /><span className="hidden sm:inline">الدعم</span></button>
              <button onClick={() => setPage('upgrade-requests')} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition shadow-md"><Star size={16} /><span className="hidden sm:inline">الترقية</span></button>
            </>
          )}
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-gray-600 hover:text-green-600 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <Bell size={22} />
              {unreadNotifCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>}
            </button>
            {showNotifications && (
              <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 border border-gray-200 dark:border-gray-700">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 dark:text-white">الإشعارات</h3>
                  {(unreadNotifCount > 0 || unreadChatCount > 0) && <button onClick={markAllAsRead} className="text-xs text-green-600">تحديد الكل كمقروء</button>}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <Bell size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد إشعارات</p>
                    </div>
                  ) : (
                    notifications.map(notif => {
                      const isChatNotif = ['new_chat_ticket','guide_chat','new_chat_message','new_message'].includes(notif.type);
                      return (
                        <div key={notif.id} className={`p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${!notif.is_read ? (isChatNotif ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-green-50 dark:bg-green-900/20') : ''}`} onClick={() => handleBellNotifClick(notif)}>
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-1 mb-0.5">
                                {isChatNotif && <MessageCircle size={12} className="text-purple-500 flex-shrink-0" />}
                                <p className="text-sm font-medium text-gray-800 dark:text-white">{notif.title}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{notif.message?.length > 80 ? notif.message.substring(0,80)+'...' : notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleTimeString()}</p>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              {!notif.is_read && <div className={`w-2 h-2 rounded-full ${isChatNotif ? 'bg-purple-500' : 'bg-green-500'}`}></div>}
                              {isChatNotif && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">محادثة</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={() => setShowNotifications(false)} className="w-full text-center text-xs text-gray-500 py-1">إغلاق</button>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setActiveTab('chats')} className="relative p-2 text-gray-600 hover:text-green-600 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <MessageCircle size={22} />
            {totalUnreadChats > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">{totalUnreadChats > 9 ? '9+' : totalUnreadChats}</span>}
          </button>
          <button onClick={() => setPage('safety')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"><Shield size={18} /> إرشادات السلامة</button>
        </div>
      </div>

      {/* الإحصائيات - نفس الكود السابق */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white mb-8 shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">لوحة تحكم المرشد</h1>
            <p className="opacity-90 mt-1">{user?.full_name || guide?.name}</p>
            <div className="flex items-center mt-2 gap-2"><CheckCircle className="w-5 h-5" /><span className="text-sm">حساب مرشد معتمد</span></div>
            {socketConnected && <div className="flex items-center mt-1 gap-1 text-xs"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div><span className="opacity-75">متصل للإشعارات الفورية</span></div>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="text-center bg-white/20 rounded-xl p-3"><div className="text-2xl font-bold">{stats.activePrograms}</div><div className="text-xs opacity-90">برنامج نشط</div></div>
            <div className="text-center bg-white/20 rounded-xl p-3"><div className="text-2xl font-bold">{stats.totalPrograms}</div><div className="text-xs opacity-90">إجمالي البرامج</div></div>
            <div className="text-center bg-white/20 rounded-xl p-3"><div className="text-2xl font-bold">{stats.totalParticipants}</div><div className="text-xs opacity-90">مشاركين</div></div>
            <div className="text-center bg-white/20 rounded-xl p-3"><div className="text-2xl font-bold">{stats.totalRevenue} ريال</div><div className="text-xs opacity-90">الإيرادات</div></div>
            <div className="text-center bg-white/20 rounded-xl p-3 relative group">
              <div className="text-2xl font-bold">{balance} ريال</div>
              <div className="text-xs opacity-90 flex items-center justify-center gap-1"><DollarSign size={12} /> الرصيد الحالي</div>
              <button onClick={fetchBalance} className="absolute top-1 left-1 p-1 rounded-full hover:bg-white/20 transition opacity-0 group-hover:opacity-100"><RefreshCw size={12} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* علامات التبويب - نفس الكود السابق */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button onClick={() => setActiveTab('programs')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'programs' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}><Package className="inline w-4 h-4 ml-1" /> البرامج</button>
        <button onClick={() => setActiveTab('bookings')} className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'bookings' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <CalendarCheck className="inline w-4 h-4 ml-1" /> طلبات الحجز
          {bookingRequests.length > 0 && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-orange-500 rounded-full">{bookingRequests.length}</span>}
        </button>
        <button onClick={() => setActiveTab('chats')} className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'chats' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <MessageCircle className="inline w-4 h-4 ml-1" /> المحادثات الواردة
          {totalUnreadChats > 0 && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">{totalUnreadChats}</span>}
        </button>
      </div>

      {/* قائمة البرامج */}
      {activeTab === 'programs' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full sm:w-80"><Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="بحث في البرامج..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-10 p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none" /></div>
            <div className="flex gap-3">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none">
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
              <button onClick={() => fetchRealPrograms()} className="p-3 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 transition"><RefreshCw size={20} /></button>
              {programs.length >= 11 ? (
                <button className="px-5 py-3 bg-gray-400 text-white rounded-xl flex items-center gap-2 cursor-not-allowed opacity-60" title={lang === 'ar' ? 'لقد وصلت إلى الحد الأقصى (11 برنامج)' : 'You have reached the maximum (11 programs)'}>
                  <Plus size={20} /> إضافة برنامج
                </button>
              ) : (
                <button onClick={() => { setActiveStep(1); setShowAddProgram(true); }} className="px-5 py-3 bg-green-600 text-white rounded-xl flex items-center gap-2 hover:bg-green-700 transition shadow-md">
                  <Plus size={20} /> إضافة برنامج
                </button>
              )}
            </div>
          </div>
          
          {/* تنبيهات الحد الأقصى - نفس الكود السابق */}
          {programs.length >= 10 && programs.length < 11 && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {lang === 'ar' ? `لديك ${programs.length} برنامج، يمكنك إضافة برنامج واحد فقط` : `You have ${programs.length} programs, you can add only one more`}
            </div>
          )}
          {programs.length >= 11 && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {lang === 'ar' ? 'لقد وصلت إلى الحد الأقصى (11 برنامج). احذف بعض البرامج لإضافة جديدة.' : 'You have reached the maximum (11 programs). Delete some programs to add new ones.'}
            </div>
          )}
          
          {filteredPrograms.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed"><Package className="w-20 h-20 mx-auto text-gray-400 mb-4" /><p className="text-gray-500 text-lg mb-3">لا توجد برامج</p><button onClick={() => setShowAddProgram(true)} className="px-6 py-2 bg-green-600 text-white rounded-xl">➕ أضف برنامجك الأول</button></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredPrograms.map(p => {
                const primaryImage = getPrimaryImage(p);
                const imagesCount = p.images?.length || 0;
                const hasSafety = p.safetyGuidelines && p.safetyGuidelines.trim().length > 0;
                return (
                  <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-200">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
                        {primaryImage ? <img src={primaryImage} className="w-full h-full object-cover" alt={p.name} onError={(e)=>{e.target.onerror=null; e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3E❌%3C/text%3E%3C/svg%3E";}} loading="lazy" /> : <div className="w-full h-full flex flex-col items-center justify-center text-green-500"><LucideImage className="w-8 h-8" /><span className="text-xs mt-1">لا توجد صورة</span></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1"><h3 className="font-bold text-xl truncate">{p.name}</h3><span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{p.status === 'active' ? '🟢 نشط' : '⏸ موقوف'}</span>{imagesCount > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"><LucideImage size={12} /> {imagesCount}</span>}{hasSafety && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"><AlertTriangle size={12} /> إرشادات</span>}</div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-2">{p.description || "لا يوجد وصف"}</p>
                        <div className="grid grid-cols-3 gap-2 text-sm mb-2"><div><div className="text-gray-500 text-xs">السعر</div><div className="font-semibold text-green-600">{p.price} ريال</div></div><div><div className="text-gray-500 text-xs">المدة</div><div>{p.duration || 'غير محدد'}</div></div><div><div className="text-gray-500 text-xs">المشاركين</div><div>{p.participants}/{p.maxParticipants}</div></div></div>
                        <div className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={12} className="text-green-600 flex-shrink-0" /><span className="truncate">{p.location_name || 'موقع غير محدد'}</span></div>
                        {hasSafety && (<div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-r-4 border-orange-500"><div className="flex items-center gap-2 mb-1"><AlertTriangle size={12} className="text-orange-600" /><span className="text-xs font-semibold text-orange-700">إرشادات السلامة</span></div><div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">{formatSafetyGuidelines(p.safetyGuidelines)}</div></div>)}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0"><button onClick={() => toggleProgramStatus(p.id, p.status)} className={`px-3 py-1.5 rounded-xl text-sm flex items-center gap-1 transition ${p.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{p.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />}{p.status === 'active' ? 'إيقاف' : 'تفعيل'}</button><button onClick={() => openEditModal(p)} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-xl text-sm hover:bg-yellow-200 transition flex items-center gap-1"><Edit2 size={14} /> تعديل</button><button onClick={() => handleDeleteProgram(p.id)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-xl text-sm hover:bg-red-200 transition flex items-center gap-1"><Trash2 size={14} /> حذف</button></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* طلبات الحجز - نفس الكود السابق */}
      {activeTab === 'bookings' && (
        <div>
          {loadingBookings && bookingRequests.length === 0 ? (
            <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
          ) : bookingRequests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
              <CalendarCheck className="w-20 h-20 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-3">لا توجد طلبات حجز جديدة</p>
              <p className="text-sm text-gray-400">عندما يطلب مسافر حجز برنامج من برامجك، ستظهر هنا</p>
              <button onClick={() => fetchBookingRequests()} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">تحديث</button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookingRequests.map(booking => {
                const isProcessing = processingBookingId === booking.id;
                return (
                  <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-orange-200 dark:border-orange-800">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-5 h-5 text-orange-600" />
                          <h3 className="font-bold text-gray-800 dark:text-white">طلب حجز: {booking.programName}</h3>
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">قيد الانتظار</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">السائح:</span> <strong>{booking.touristName}</strong></div>
                          <div><span className="text-gray-500">السعر:</span> <strong className="text-green-600">{booking.programPrice} ريال</strong></div>
                          <div><span className="text-gray-500">التاريخ:</span> {new Date(booking.createdAt).toLocaleDateString()}</div>
                          <div><span className="text-gray-500">الرسالة:</span> <span className="truncate">{booking.message?.substring(0, 60)}</span></div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-start">
                        <button
                          onClick={() => handleAcceptBooking(booking)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50"
                        >
                          {isProcessing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <CheckCircle size={16} />}
                          قبول
                        </button>
                        <button
                          onClick={() => handleRejectBooking(booking)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-1 disabled:opacity-50"
                        >
                          {isProcessing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <XCircle size={16} />}
                          رفض
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* المحادثات الواردة - نفس الكود السابق */}
      {activeTab === 'chats' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <MessageCircle size={20} />
              <span>{lang === 'ar' ? 'المحادثات الواردة' : 'Incoming Chats'}</span>
              {totalUnreadChats > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{totalUnreadChats}</span>
              )}
            </h2>
            <button 
              onClick={() => { fetchGuideTickets(); fetchNotifications(); }} 
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 transition"
              title={lang === 'ar' ? 'تحديث المحادثات' : 'Refresh chats'}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          {loadingTickets && unifiedChats.length === 0 ? (
            <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
          ) : unifiedChats.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
              <Inbox className="w-20 h-20 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-3">{lang === 'ar' ? 'لا توجد محادثات واردة من المسافرين' : 'No incoming conversations from travelers'}</p>
              <p className="text-sm text-gray-400">{lang === 'ar' ? 'عندما يبدأ مسافر محادثة معك، ستظهر هنا' : 'When a traveler starts a conversation with you, it will appear here'}</p>
              <button onClick={() => { fetchGuideTickets(); fetchNotifications(); }} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">{lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
            </div>
          ) : (
            <div className="space-y-4">
              {unifiedChats.map(chat => {
                const isUnread = !chat.is_read;
                const isDeleting = deletingIdsRef.current.has(chat.id || chat.ticketId);
                return (
                  <div 
                    key={chat.id} 
                    className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border cursor-pointer ${
                      isUnread ? 'border-green-300 dark:border-green-700 ring-1 ring-green-200' : 'border-gray-100 dark:border-gray-700'
                    }`}
                    onClick={() => openDirectChat(chat)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <h3 className="font-bold text-gray-800 dark:text-white">
                            {lang === 'ar' ? `محادثة مع ${chat.touristName}` : `Chat with ${chat.touristName}`}
                          </h3>
                          <span className="text-xs text-gray-500">{new Date(chat.created_at).toLocaleDateString()}</span>
                          {isUnread && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              {lang === 'ar' ? 'جديدة' : 'New'}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 truncate">{chat.subject}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Users size={14} /> {chat.touristName}</span>
                          <span className="flex items-center gap-1"><Clock size={14} /> {new Date(chat.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(chat, e)}
                        disabled={isDeleting}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
                      >
                        {isDeleting ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div> : <Trash2 size={16} />}
                        <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* نافذة إضافة برنامج - نفس الكود السابق مع عرض الحد الأقصى للصور */}
      {showAddProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-green-600 p-5 rounded-t-2xl sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">إضافة برنامج جديد</span>
                  <div className="flex items-center gap-1 mr-3">
                    {[1,2,3].map(step=>(
                      <React.Fragment key={step}>
                        <button onClick={()=>setActiveStep(step)} className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition ${activeStep===step?'text-white bg-green-600':activeStep>step?'bg-white/40 text-white':'bg-white/20 text-white/70'}`}>
                          {activeStep>step?'✓':step}
                        </button>
                        {step<3&&<div className="w-8 h-px bg-white/30"></div>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <button onClick={()=>{setShowAddProgram(false); setNewProgram(defaultProgramState); setActiveStep(1);}} className="text-white/80 hover:text-white"><XCircle size={28}/></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {activeStep===1&&(
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-green-700">المعلومات الأساسية</h3>
                  <div><label className="block text-sm font-semibold mb-1">اسم البرنامج *</label><input type="text" value={newProgram.name} onChange={e=>setNewProgram({...newProgram,name:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="مثال: جولة تاريخية في الدرعية"/></div>
                  <div><label className="block text-sm font-semibold mb-1">الوصف</label><textarea value={newProgram.description} onChange={e=>setNewProgram({...newProgram,description:e.target.value})} rows="3" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="وصف تفصيلي للبرنامج..."/></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-semibold mb-1">السعر (ريال) *</label><input type="number" value={newProgram.price} onChange={e=>setNewProgram({...newProgram,price:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="0"/></div>
                    <div><label className="block text-sm font-semibold mb-1">المدة *</label><input type="text" value={newProgram.duration} onChange={e=>setNewProgram({...newProgram,duration:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="مثال: 3 ساعات"/></div>
                  </div>
                  <div><label className="block text-sm font-semibold mb-1">العدد الأقصى للمشاركين *</label><input type="number" value={newProgram.maxParticipants} onChange={e=>setNewProgram({...newProgram,maxParticipants:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="20"/></div>
                  <div className="flex justify-end pt-2"><button onClick={()=>setActiveStep(2)} className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">التالي ←</button></div>
                </div>
              )}
              {activeStep===2&&(
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-green-700">صور البرنامج</h3>
                  <p className="text-sm text-gray-500">أضف صوراً جذابة للبرنامج. انقر على صورة لتعيينها كالصورة الرئيسية. الحد الأقصى {MAX_PROGRAM_IMAGES} صور.</p>
                  <ImageGallery accentColor="green"/>
                  <div className="flex justify-between pt-2">
                    <button onClick={()=>setActiveStep(1)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-300 transition">→ السابق</button>
                    <button onClick={()=>setActiveStep(3)} className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">التالي ←</button>
                  </div>
                </div>
              )}
              {activeStep===3&&(
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-green-700">الموقع وإرشادات السلامة</h3>
                  <MapSection mapRef={mapContainerRef} accentColor="green" onGeolocate={()=>{if(navigator.geolocation){navigator.geolocation.getCurrentPosition((pos)=>{const{latitude,longitude}=pos.coords;if(mapInstanceRef.current&&markerRef.current){markerRef.current.setLngLat([longitude,latitude]); mapInstanceRef.current.flyTo({center:[longitude,latitude],zoom:14});}else{initAddMap(latitude,longitude);}reverseGeocode(latitude,longitude).then(name=>{setNewProgram(prev=>({...prev,location_lat:latitude,location_lng:longitude,location_name:name}));});},()=>toast.error('تعذر الحصول على موقعك الحالي'));}else toast.error('المتصفح لا يدعم تحديد الموقع');}}/>
                  <div><label className="block text-sm font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600"/> إرشادات السلامة والتعليمات (اختياري)</label><textarea value={newProgram.safetyGuidelines} onChange={e=>setNewProgram({...newProgram,safetyGuidelines:e.target.value})} rows="5" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="مثال:\n• رخصة قيادة سارية المفعول مطلوبة.\n• الحد الأدنى للعمر: 18 سنة.\n• يرجى إحضار المعدات الشخصية."/></div>
                  <div className="flex justify-between pt-2">
                    <button onClick={()=>setActiveStep(2)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-300 transition">→ السابق</button>
                    <button onClick={handleAddProgram} disabled={loading||uploadingImage} className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2">
                      {loading||uploadingImage?<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> جاري الحفظ...</>:<><Save size={18}/> حفظ البرنامج</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل برنامج - نفس الكود السابق مع عرض الحد الأقصى للصور */}
      {showEditModal && editingProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-yellow-600 p-5 rounded-t-2xl sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-white text-xl font-bold">✏️ تعديل البرنامج</h3>
                <button onClick={()=>{setShowEditModal(false); setEditingProgram(null); newProgram.images.forEach(img=>{if(img.preview?.startsWith('blob:')) URL.revokeObjectURL(img.preview);}); setNewProgram(defaultProgramState); if(editMapInstanceRef.current){try{editMapInstanceRef.current.remove();}catch(e){}editMapInstanceRef.current=null;}}} className="text-white/80 hover:text-white"><XCircle size={28}/></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-semibold mb-2 text-yellow-700 flex items-center gap-2"><LucideImage size={16}/> صور البرنامج (الحد الأقصى {MAX_PROGRAM_IMAGES})</label><ImageGallery accentColor="yellow"/></div>
              <input type="text" placeholder="اسم البرنامج *" value={newProgram.name} onChange={e=>setNewProgram({...newProgram,name:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/>
              <textarea placeholder="الوصف" value={newProgram.description} onChange={e=>setNewProgram({...newProgram,description:e.target.value})} rows="3" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="السعر (ريال)" value={newProgram.price} onChange={e=>setNewProgram({...newProgram,price:e.target.value})} className="p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/>
                <input type="text" placeholder="المدة" value={newProgram.duration} onChange={e=>setNewProgram({...newProgram,duration:e.target.value})} className="p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/>
              </div>
              <input type="number" placeholder="العدد الأقصى للمشاركين" value={newProgram.maxParticipants} onChange={e=>setNewProgram({...newProgram,maxParticipants:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/>
              <MapSection mapRef={editMapContainerRef} accentColor="yellow" onGeolocate={()=>{if(navigator.geolocation){navigator.geolocation.getCurrentPosition((pos)=>{const{latitude,longitude}=pos.coords;if(editMapInstanceRef.current&&editMarkerRef.current){editMarkerRef.current.setLngLat([longitude,latitude]); editMapInstanceRef.current.flyTo({center:[longitude,latitude],zoom:14});}else{initEditMap(latitude,longitude);}reverseGeocode(latitude,longitude).then(name=>{setNewProgram(prev=>({...prev,location_lat:latitude,location_lng:longitude,location_name:name}));});},()=>toast.error('تعذر الحصول على موقعك الحالي'));}else toast.error('المتصفح لا يدعم تحديد الموقع');}}/>
              <div><label className="block text-sm font-semibold mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600"/> إرشادات السلامة (اختياري)</label><textarea value={newProgram.safetyGuidelines} onChange={e=>setNewProgram({...newProgram,safetyGuidelines:e.target.value})} rows="4" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="مثال:\n• رخصة قيادة سارية المفعول مطلوبة.\n• الحد الأدنى للعمر: 18 سنة."/></div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleUpdateProgram} disabled={loading||uploadingImage} className="flex-1 py-3 bg-yellow-600 text-white rounded-xl font-medium hover:bg-yellow-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading||uploadingImage?<><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> جاري الحفظ...</>:<><Save size={18}/> حفظ التغييرات</>}
                </button>
                <button onClick={()=>{setShowEditModal(false); setEditingProgram(null); newProgram.images.forEach(img=>{if(img.preview?.startsWith('blob:')) URL.revokeObjectURL(img.preview);}); setNewProgram(defaultProgramState); if(editMapInstanceRef.current){try{editMapInstanceRef.current.remove();}catch(e){}editMapInstanceRef.current=null;}}} className="px-6 py-3 border-2 rounded-xl font-medium hover:bg-gray-50 transition">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideDashboard;

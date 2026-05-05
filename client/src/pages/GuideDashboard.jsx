// client/src/pages/GuideDashboard.jsx
// ✅ النسخة النهائية - إصلاح فتح والرد على المحادثات للمرشد السياحي (مع دعم old_id)

// تم إضافة تحسينات على دالة openDirectChat لضمان الحصول على معرف المسافر بشكل صحيح،
// ودعم تحويل المعرف الرقمي (old_id) عند الاقتضاء.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, CheckCircle, XCircle, Edit2, Trash2,
  Users, DollarSign, Clock, MapPin, Eye, EyeOff,
  ArrowLeft, Shield, RefreshCw, Search,
  Image as LucideImage, Camera, X,
  Save, Upload, AlertTriangle, Crosshair, Package,
  MessageCircle, Inbox, MailOpen, Bell, Headphones, Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import mapboxgl from 'mapbox-gl';
import io from 'socket.io-client';

mapboxgl.accessToken = "pk.eyJ1IjoibW9vaG1kMTUiLCJhIjoiY21obWJwN3EwMHF1czJvc2lyaWR5em0xciJ9.sl39WFOhm4m-kOOYtGqONw";

const API_BASE = 'https://tourist-app-api.onrender.com';
const SOCKET_URL = 'https://tourist-app-api.onrender.com';

const buildImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? url : '/' + url}`;
};

const DELETED_TICKETS_KEY = 'guide_deleted_tickets';

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

  // --- محادثات وإشعارات ---
  const [activeTab, setActiveTab] = useState('programs');
  const [guideTickets, setGuideTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

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

  const getDeletedTickets = useCallback(() => {
    const stored = localStorage.getItem(DELETED_TICKETS_KEY);
    if (!stored) return new Set();
    try {
      const arr = JSON.parse(stored);
      return new Set(arr);
    } catch { return new Set(); }
  }, []);

  // ========== جلب تذاكر المرشد (مصحح) ==========
  const fetchGuideTickets = useCallback(async () => {
    if (!user?.id || !isGuide) return;
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setLoadingTickets(false); return; }

      const response = await fetch(`${API_BASE}/api/support/tickets?status=open`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      const deletedSet = getDeletedTickets();

      let tickets = [];
      if (data.success && data.tickets) {
        const guideId = String(user.id);
        tickets = data.tickets.filter(ticket => {
          if (ticket.type !== 'guide_chat') return false;
          if (deletedSet.has(String(ticket.id))) return false;
          
          // تحقق من أن التذكرة تخص هذا المرشد (بوصفه مرشداً)
          const metadata = ticket.metadata || {};
          if (metadata.guideId && String(metadata.guideId) === guideId) return true;
          // أيضاً قد تكون التذكرة منشأة بواسطة المرشد نفسه (كمرسل)
          if (ticket.user_id && String(ticket.user_id) === guideId) return true;
          if (metadata.created_by_id && String(metadata.created_by_id) === guideId) return true;
          return false;
        });
        tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        tickets = tickets.map(t => ({ ...t, id: String(t.id).replace(/\D/g, '') }));
        console.log(`✅ جلب ${tickets.length} تذكرة للمرشح`);
      } else {
        console.warn('⚠️ لم يتم جلب تذاكر من API:', data);
      }
      setGuideTickets(tickets);
    } catch (error) { console.error('Error fetching guide tickets:', error); }
    finally { setLoadingTickets(false); }
  }, [user?.id, isGuide, getDeletedTickets]);

  // جلب الإشعارات
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/notifications?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        const CHAT_TYPES = new Set([
          'new_chat_ticket', 'guide_chat', 'new_chat_message',
          'GUIDE_CHAT', 'NEW_CHAT_TICKET', 'NEW_CHAT_MESSAGE',
          'new_message', 'NEW_MESSAGE'
        ]);
        const unreadRegular = data.notifications.filter(n => !n.is_read && !CHAT_TYPES.has(n.type)).length;
        const unreadChats = data.notifications.filter(n => !n.is_read && CHAT_TYPES.has(n.type)).length;
        setUnreadNotifCount(unreadRegular);
        setUnreadChatCount(prev => Math.max(prev, unreadChats));
      }
    } catch (error) { console.error('Error fetching notifications:', error); }
  }, [user?.id]);

  const addDeletedTicket = useCallback((ticketId) => {
    const current = getDeletedTickets();
    current.add(String(ticketId));
    localStorage.setItem(DELETED_TICKETS_KEY, JSON.stringify([...current]));
    fetchGuideTickets();
    fetchNotifications();
  }, [getDeletedTickets, fetchGuideTickets, fetchNotifications]);

  // بناء القائمة الموحدة للمحادثات (من التذاكر والإشعارات)
  const buildUnifiedChats = useCallback((tickets, notifs) => {
    const deletedSet = getDeletedTickets();
    const CHAT_TYPES = new Set([
      'new_chat_ticket', 'guide_chat', 'new_chat_message',
      'GUIDE_CHAT', 'NEW_CHAT_TICKET', 'NEW_CHAT_MESSAGE',
      'new_message', 'NEW_MESSAGE', 'support_message', 'SUPPORT_MESSAGE'
    ]);

    // معالجة الإشعارات
    const chatNotifs = notifs
      .filter(n => CHAT_TYPES.has(n.type))
      .map(n => {
        let ticketId = n.data?.ticketId || n.ticket_id || null;
        if (!ticketId && n.action_url) {
          const m = String(n.action_url).match(/\d+/);
          if (m) ticketId = m[0];
        }
        if (!ticketId && n.data?.action_url) {
          const m = String(n.data.action_url).match(/\d+/);
          if (m) ticketId = m[0];
        }
        if (ticketId && deletedSet.has(String(ticketId))) return null;
        
        let touristId = n.data?.userId || n.data?.created_by_id || n.data?.senderId || n.data?.from_user_id || n.data?.touristId;
        let touristName = n.data?.userName || n.data?.fromName || n.data?.created_by_name || n.data?.sender_name || (lang === 'ar' ? 'مسافر' : 'Traveler');
        
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

    // معالجة التذاكر
    const chatTickets = tickets
      .filter(t => !deletedSet.has(String(t.id)))
      .map(t => {
        // استخراج معرف الطرف الآخر (المسافر)
        let touristId = t.user_id || t.metadata?.created_by_id || t.metadata?.userId || t.metadata?.tourist_id;
        let touristName = t.user_name || t.metadata?.created_by_name || t.metadata?.tourist_name || (lang === 'ar' ? 'مسافر' : 'Traveler');
        // إذا لم نجد حتى الآن، نحاول من الرسائل لاحقاً
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

    // دمج وإزالة التكرار
    const seen = new Set();
    const merged = [];
    [...chatTickets, ...chatNotifs].forEach(item => {
      if (!item) return;
      const key = item.ticketId ? `tid_${item.ticketId}` : item.id;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    });

    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return merged;
  }, [lang, getDeletedTickets]);

  // دوال مساعدة لجلب التذاكر والرسائل
  const _fetchTicket = useCallback(async (ticketId) => {
    if (!ticketId || failedTicketsRef.current.has(String(ticketId))) return null;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        failedTicketsRef.current.add(String(ticketId));
        return null;
      }
      const data = await res.json();
      if (!data.success) {
        failedTicketsRef.current.add(String(ticketId));
        return null;
      }
      return data.ticket;
    } catch { 
      failedTicketsRef.current.add(String(ticketId));
      return null;
    }
  }, []);

  const _fetchFirstMessageSender = useCallback(async (ticketId, guideId) => {
    if (!ticketId || failedTicketsRef.current.has(`msg_${ticketId}`)) return null;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        failedTicketsRef.current.add(`msg_${ticketId}`);
        return null;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        const senderMsg = data.messages.find(m => m.user_id && String(m.user_id) !== String(guideId));
        if (senderMsg) return { id: senderMsg.user_id, name: senderMsg.sender_name || (lang === 'ar' ? 'مسافر' : 'Traveler') };
      }
      failedTicketsRef.current.add(`msg_${ticketId}`);
      return null;
    } catch {
      failedTicketsRef.current.add(`msg_${ticketId}`);
      return null;
    }
  }, [lang]);

  const _extractTicketId = (item) => {
    if (!item) return null;
    if (item.ticketId) return String(item.ticketId);
    if (item.id && !String(item.id).startsWith('notif_') && !String(item.id).startsWith('ticket_')) return String(item.id);
    if (item.rawTicket?.id) return String(item.rawTicket.id);
    const n = item.rawNotif;
    if (n) {
      if (n.data?.ticketId) return String(n.data.ticketId);
      if (n.ticket_id) return String(n.ticket_id);
      if (n.action_url) { const m = String(n.action_url).match(/\d+/); if (m) return m[0]; }
      if (n.data?.action_url) { const m = String(n.data.action_url).match(/\d+/); if (m) return m[0]; }
    }
    return null;
  };

  // ========== فتح المحادثة (مصحح بالكامل) ==========
  const openDirectChat = useCallback(async (chatItem) => {
    const guideId = user?.id;
    if (!guideId) {
      toast.error(lang === 'ar' ? 'لم يتم تسجيل الدخول' : 'Not logged in');
      return;
    }

    let touristId = chatItem.touristId;
    let touristName = chatItem.touristName || (lang === 'ar' ? 'مسافر' : 'Traveler');
    let ticketId = _extractTicketId(chatItem);

    console.log('🔍 فتح محادثة مع:', { touristId, touristName, ticketId });

    // 1. استخراج من rawTicket (إذا كان العنصر من نوع ticket)
    if (!touristId && chatItem.rawTicket) {
      const raw = chatItem.rawTicket;
      const currentUserId = String(guideId);
      const possibleIds = [
        raw.user_id,
        raw.sender_id,
        raw.receiver_id,
        raw.metadata?.guideId,
        raw.metadata?.created_by_id,
        raw.metadata?.userId,
        raw.metadata?.senderId,
        raw.metadata?.receiverId,
        raw.metadata?.participantId,
        raw.participant_id
      ];
      for (const id of possibleIds) {
        if (id && String(id) !== currentUserId) {
          touristId = String(id);
          touristName = raw.user_name || raw.sender_name || raw.metadata?.created_by_name || raw.metadata?.userName || (lang === 'ar' ? 'مسافر' : 'Traveler');
          break;
        }
      }
    }

    // 2. استخراج من rawNotif (إذا كان العنصر من نوع notification)
    if (!touristId && chatItem.rawNotif) {
      const n = chatItem.rawNotif;
      const currentUserId = String(guideId);
      const candidateId = n.data?.userId || n.data?.created_by_id || n.data?.senderId || n.data?.from_user_id || n.data?.touristId;
      if (candidateId && String(candidateId) !== currentUserId) {
        touristId = String(candidateId);
        touristName = n.data?.userName || n.data?.fromName || n.data?.created_by_name || (lang === 'ar' ? 'مسافر' : 'Traveler');
      }
    }

    // 3. إذا كان لدينا ticketId ولكن لم نجد touristId، نجلب التذكرة كاملة
    if (!touristId && ticketId && !failedTicketsRef.current.has(String(ticketId))) {
      const fullTicket = await _fetchTicket(ticketId);
      if (fullTicket) {
        const currentUserId = String(guideId);
        const possibleIds = [
          fullTicket.user_id,
          fullTicket.sender_id,
          fullTicket.receiver_id,
          fullTicket.metadata?.guideId,
          fullTicket.metadata?.created_by_id,
          fullTicket.metadata?.userId,
          fullTicket.metadata?.senderId,
          fullTicket.metadata?.receiverId
        ];
        for (const id of possibleIds) {
          if (id && String(id) !== currentUserId) {
            touristId = String(id);
            touristName = fullTicket.user_name || fullTicket.sender_name || fullTicket.metadata?.created_by_name || fullTicket.metadata?.userName || (lang === 'ar' ? 'مسافر' : 'Traveler');
            break;
          }
        }
      }
    }

    // 4. المحاولة الأخيرة: جلب أول رسالة في التذكرة لتحديد المرسل
    if (!touristId && ticketId && !failedTicketsRef.current.has(`msg_${ticketId}`)) {
      const sender = await _fetchFirstMessageSender(ticketId, guideId);
      if (sender) {
        touristId = sender.id;
        touristName = sender.name;
      }
    }

    // 5. إذا فشل كل شيء، نعرض خطأ
    if (!touristId) {
      console.error('❌ لا يمكن تحديد معرف المسافر للمحادثة:', chatItem);
      toast.error(lang === 'ar' ? 'تعذر تحديد المسافر، يرجى تحديث الصفحة' : 'Cannot identify traveler, please refresh');
      return;
    }

    // حفظ معاملات المحادثة
    const params = {
      recipientId: touristId,
      recipientName: touristName,
      recipientType: 'tourist',
    };
    if (ticketId) params.ticketId = ticketId;
    localStorage.setItem('directChatParams', JSON.stringify(params));
    console.log('✅ فتح المحادثة باستخدام المعاملات:', params);
    setPage('directChat');
  }, [user?.id, lang, setPage, _fetchTicket, _fetchFirstMessageSender]);

  // حذف محادثة
  const deleteConversation = useCallback(async (chat) => {
    const uniqueKey = chat.id || chat.ticketId;
    if (deletingIdsRef.current.has(uniqueKey)) { return; }
    deletingIdsRef.current.add(uniqueKey);
    try {
      if (chat._sourceType === 'notification' && !chat.ticketId) {
        setNotifications(prev => prev.filter(n => n.id !== chat.rawNotif?.id));
        if (!chat.is_read) setUnreadChatCount(prev => Math.max(0, prev - 1));
        toast.success(lang === 'ar' ? 'تم حذف الإشعار' : 'Notification deleted');
        deletingIdsRef.current.delete(uniqueKey);
        return;
      }

      const ticketId = chat.ticketId || (chat.rawTicket?.id);
      if (!ticketId) {
        toast.error(lang === 'ar' ? 'لا يمكن حذف هذه المحادثة' : 'Cannot delete this conversation');
        deletingIdsRef.current.delete(uniqueKey);
        return;
      }

      const token = localStorage.getItem('token');
      let serverDeleted = false;
      try {
        const delRes = await fetch(`${API_BASE}/api/support/tickets/${ticketId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (delRes.ok) serverDeleted = true;
      } catch (e) { console.warn('DELETE failed', e); }
      if (!serverDeleted) {
        try {
          const patchRes = await fetch(`${API_BASE}/api/support/tickets/${ticketId}/status`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'closed' })
          });
          if (patchRes.ok) serverDeleted = true;
        } catch (e) { console.warn('PATCH failed', e); }
      }
      const currentDeleted = getDeletedTickets();
      if (serverDeleted) currentDeleted.delete(String(ticketId));
      else currentDeleted.add(String(ticketId));
      localStorage.setItem(DELETED_TICKETS_KEY, JSON.stringify([...currentDeleted]));
      setGuideTickets(prev => prev.filter(t => String(t.id) !== String(ticketId)));
      setNotifications(prev => prev.filter(n => { const notifTicketId = n.data?.ticketId || n.ticket_id; return String(notifTicketId) !== String(ticketId); }));
      if (!chat.is_read) setUnreadChatCount(prev => Math.max(0, prev - 1));
      await fetchGuideTickets();
      await fetchNotifications();
      toast.success(serverDeleted
        ? (lang === 'ar' ? '✅ تم حذف المحادثة نهائياً' : '✅ Conversation permanently deleted')
        : (lang === 'ar' ? '⚠️ تم إخفاء المحادثة محلياً' : '⚠️ Conversation hidden locally'));
    } catch (error) { toast.error(lang === 'ar' ? '❌ فشل حذف المحادثة' : '❌ Failed to delete'); }
    finally { deletingIdsRef.current.delete(uniqueKey); }
  }, [lang, getDeletedTickets, fetchGuideTickets, fetchNotifications]);

  // وظائف الإشعارات
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

  // معالج النقر على إشعار من القائمة المنسدلة
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
      if (!ticketId && notif.action_url) { const match = String(notif.action_url).match(/\d+/); if (match) ticketId = match[0]; }
      if (!ticketId && notif.data?.action_url) { const match = String(notif.data.action_url).match(/\d+/); if (match) ticketId = match[0]; }
      const deletedSet = getDeletedTickets();
      if (ticketId && deletedSet.has(String(ticketId))) { toast(lang === 'ar' ? 'هذه المحادثة محذوفة' : 'This conversation is deleted', { icon: '🗑️' }); return; }
      // جلب التذكرة لتحديد المسافر
      let otherPartyId = null;
      let otherPartyName = null;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success && data.ticket) {
          const fullTicket = data.ticket;
          const currentUserId = user?.id;
          const possibleIds = [
            fullTicket.user_id,
            fullTicket.sender_id,
            fullTicket.receiver_id,
            fullTicket.metadata?.guideId,
            fullTicket.metadata?.created_by_id,
            fullTicket.metadata?.userId,
            fullTicket.metadata?.senderId,
            fullTicket.metadata?.receiverId
          ];
          for (const id of possibleIds) {
            if (id && String(id) !== String(currentUserId)) {
              otherPartyId = String(id);
              otherPartyName = fullTicket.user_name || fullTicket.sender_name || fullTicket.metadata?.created_by_name || fullTicket.metadata?.userName || (lang === 'ar' ? 'مسافر' : 'Traveler');
              break;
            }
          }
        }
      } catch (err) { console.error('Error fetching ticket details:', err); }
      if (!otherPartyId) {
        otherPartyId = notif.data?.userId || notif.data?.created_by_id || notif.data?.senderId;
        otherPartyName = notif.data?.userName || notif.data?.fromName || notif.data?.created_by_name || (lang === 'ar' ? 'مسافر' : 'Traveler');
      }
      if (!otherPartyId) { toast.error(lang === 'ar' ? 'لا يمكن فتح المحادثة' : 'Cannot open conversation'); return; }
      const params = {
        recipientId: otherPartyId,
        recipientName: otherPartyName || (lang === 'ar' ? 'مستخدم' : 'User'),
        recipientType: 'tourist',
        ticketId: ticketId
      };
      localStorage.setItem('directChatParams', JSON.stringify(params));
      setPage('directChat');
    } else {
      if (notif.action_url) {
        const pageName = notif.action_url.replace(/^\//, '');
        if (pageName && typeof setPage === 'function') setPage(pageName);
      } else { setPage('support'); }
    }
  }, [lang, getDeletedTickets, user?.id]);

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

  // تحميل أولي وتحديث دوري
  useEffect(() => {
    if (isGuide) {
      fetchGuideTickets();
      fetchNotifications();
      const interval = setInterval(() => { fetchGuideTickets(); fetchNotifications(); }, 30000);
      return () => clearInterval(interval);
    }
  }, [isGuide, fetchGuideTickets, fetchNotifications]);

  useEffect(() => {
    if (activeTab === 'chats') {
      fetchGuideTickets();
      setUnreadChatCount(0);
    }
  }, [activeTab, fetchGuideTickets]);

  const unifiedChats = React.useMemo(() => buildUnifiedChats(guideTickets, notifications), [guideTickets, notifications, buildUnifiedChats]);
  const totalUnreadChats = unifiedChats.filter(c => !c.is_read).length;

  // ===================== دوال البرامج (لم تتغير) =====================
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

  const getPrimaryImage = (program) => {
    if (!program) return null;
    if (program.images && Array.isArray(program.images) && program.images.length > 0) {
      const primary = program.images.find(img => img.is_primary === true);
      const imgObj = primary || program.images[0];
      return buildImageUrl(imgObj.url);
    }
    if (program.image) return buildImageUrl(program.image);
    return null;
  };

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
  }, [setUserPrograms, user?.full_name]);

  const formatProgramFromServer = (p) => {
    let images = [];
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      images = p.images.map(img => {
        const url = img.url || img.image_url;
        const resolvedUrl = buildImageUrl(url);
        if (!resolvedUrl) return null;
        return { id: img.id, url: resolvedUrl, is_primary: img.is_primary === true };
      }).filter(Boolean);
    } else if (p.image) {
      images = [{ url: buildImageUrl(p.image), is_primary: true }];
    }
    if (images.length === 0 && p.photos && Array.isArray(p.photos)) {
      images = p.photos.map(photo => {
        const url = buildImageUrl(photo.url || photo);
        return url ? { url, is_primary: photo.is_primary || false } : null;
      }).filter(Boolean);
    }
    if (images.length > 0 && !images.some(img => img.is_primary)) { images[0].is_primary = true; }
    return {
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
      images,
      safetyGuidelines: p.safetyGuidelines || p.safety_guidelines || ""
    };
  };

  const refetchSingleProgram = async (programId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/programs/${programId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        const programData = data.program || data.data || data;
        if (programData) {
          const formatted = formatProgramFromServer(programData);
          setPrograms(prev => prev.map(p => p.id === programId ? formatted : p));
          updateMapWithPrograms([formatted, ...programs.filter(p => p.id !== programId)]);
          return formatted;
        }
      }
    } catch (err) { console.error(err); }
    return null;
  };

  const fetchRealPrograms = useCallback(async () => {
    const guideId = user?.id;
    if (!guideId) { setLoading(false); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let programsArray = [];
      const response = await fetch(`${API_BASE}/api/guides/${guideId}/programs`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.programs)) { programsArray = data.programs; }
      else if (Array.isArray(data)) { programsArray = data; }
      else if (data.data && Array.isArray(data.data)) { programsArray = data.data; }
      else {
        const fallbackRes = await fetch(`${API_BASE}/api/programs`, { headers: { 'Authorization': `Bearer ${token}` } });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok && fallbackData.success && Array.isArray(fallbackData.programs)) { programsArray = fallbackData.programs.filter(p => String(p.guide_id) === String(guideId)); }
        else if (Array.isArray(fallbackData)) { programsArray = fallbackData.filter(p => String(p.guide_id) === String(guideId)); }
        else if (fallbackData.data && Array.isArray(fallbackData.data)) { programsArray = fallbackData.data.filter(p => String(p.guide_id) === String(guideId)); }
      }
      const programsWithImages = await Promise.all(programsArray.map(async (program) => {
        try {
          const detailRes = await fetch(`${API_BASE}/api/programs/${program.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const programData = detailData.program || detailData.data || detailData;
            if (programData && programData.images) return { ...program, images: programData.images };
          }
        } catch (err) { console.warn(err); }
        return { ...program, images: [] };
      }));
      const formatted = programsWithImages.map(p => formatProgramFromServer(p));
      setPrograms(formatted);
      updateMapWithPrograms(formatted);
      const activeProgs = formatted.filter(p => p.status === 'active');
      setStats({
        totalParticipants: activeProgs.reduce((sum, p) => sum + (p.participants || 0), 0),
        totalRevenue: activeProgs.reduce((sum, p) => sum + ((p.participants || 0) * (p.price || 0)), 0),
        activePrograms: activeProgs.length,
        totalPrograms: formatted.length
      });
    } catch (error) { console.error(error); toast.error(lang === 'ar' ? 'فشل الاتصال بالخادم' : 'Connection failed'); }
    finally { setLoading(false); }
  }, [user?.id, lang, updateMapWithPrograms]);

  useEffect(() => { fetchRealPrograms(); }, [fetchRealPrograms]);

  const addMultipleImages = async (files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
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

  const validateProgram = () => {
    if (!newProgram.name.trim()) { toast.error('الرجاء إدخال اسم البرنامج'); return false; }
    if (!newProgram.location_lat || !newProgram.location_lng) { toast.error('الرجاء تحديد موقع البرنامج على الخريطة'); return false; }
    if (!newProgram.price || parseFloat(newProgram.price) <= 0) { toast.error('الرجاء إدخال سعر صحيح'); return false; }
    if (!newProgram.duration.trim()) { toast.error('الرجاء إدخال مدة البرنامج'); return false; }
    if (!newProgram.maxParticipants || parseInt(newProgram.maxParticipants) <= 0) { toast.error('الرجاء إدخال عدد أقصى صحيح للمشاركين'); return false; }
    return true;
  };

  const handleAddProgram = async () => {
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
      await fetchRealPrograms();
      if (onProgramAdded) onProgramAdded();
    } catch (error) { toast.error('❌ حدث خطأ أثناء حذف البرنامج'); }
    finally { setLoading(false); }
  };

  const openEditModal = (program) => {
    setEditingProgram(program);
    const imagesForEdit = (program.images || []).map((img) => {
      const url = buildImageUrl(img.url);
      if (!url) return null;
      return { id: img.id, file: null, preview: url, isPrimary: img.is_primary === true, isExisting: true };
    }).filter(Boolean);
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

  const ImageGallery = ({ accentColor = 'green' }) => {
    const isPrimBorder = accentColor === 'yellow' ? 'border-yellow-500 ring-2 ring-yellow-300' : 'border-green-500 ring-2 ring-green-300';
    const primBadgeBg = accentColor === 'yellow' ? 'bg-yellow-500' : 'bg-green-500';
    const addHover = accentColor === 'yellow' ? 'hover:border-yellow-500 hover:bg-yellow-50' : 'hover:border-green-500 hover:bg-green-50';
    const spinColor = accentColor === 'yellow' ? 'border-yellow-500' : 'border-green-500';
    return (
      <div>
        <div className="flex flex-wrap gap-3 mb-3">
          {newProgram.images.map((img, idx) => (
            <div key={`img-${idx}-${img.preview?.slice(-10)}`} className={`relative w-24 h-24 rounded-xl overflow-hidden shadow-md cursor-pointer border-2 transition-all duration-200 ${img.isPrimary ? isPrimBorder : 'border-gray-200 hover:border-gray-400'}`} onClick={() => setPrimaryImage(idx)} title="انقر لتعيينها كصورة رئيسية">
              <img src={img.preview} className="w-full h-full object-cover" alt={`صورة ${idx + 1}`} onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3E❌%3C/text%3E%3C/svg%3E"; }} loading="lazy" />
              <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-70 hover:opacity-100 transition shadow z-10" type="button"><X size={13} /></button>
              {img.isPrimary && <div className={`absolute bottom-0 inset-x-0 ${primBadgeBg} text-white text-center text-xs py-0.5 font-medium`}>⭐ رئيسية</div>}
              {img.isExisting && !img.isPrimary && <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-center text-xs py-0.5">محفوظة</div>}
            </div>
          ))}
          <label className={`w-24 h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 bg-gray-50 dark:bg-gray-700 ${addHover}`}>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addMultipleImages(e.target.files)} />
            {uploadingImage ? <div className={`animate-spin rounded-full h-6 w-6 border-2 border-t-transparent ${spinColor}`}></div> : <><Camera size={24} className="text-gray-400" /><span className="text-xs text-gray-500 mt-1">إضافة</span></>}
          </label>
        </div>
        {newProgram.images.length > 0 && <p className="text-xs text-gray-500 mt-1">💡 انقر على صورة لتعيينها كالصورة الرئيسية • {newProgram.images.length} صورة</p>}
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
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setPage('home')} className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition"><ArrowLeft size={20} /> العودة</button>
        <div className="flex items-center gap-3">
          {showAdminButtons && (
            <>
              <button onClick={() => setPage('admin-support')} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition shadow-md" title={lang === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}><Headphones size={16} /><span className="hidden sm:inline">{lang === 'ar' ? 'تذاكر الدعم' : 'Support'}</span></button>
              <button onClick={() => setPage('upgrade-requests')} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition shadow-md" title={lang === 'ar' ? 'طلبات الترقية' : 'Upgrade Requests'}><Star size={16} /><span className="hidden sm:inline">{lang === 'ar' ? 'طلبات الترقية' : 'Upgrade'}</span></button>
            </>
          )}
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-gray-600 hover:text-green-600 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><Bell size={22} />{unreadNotifCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>}</button>
            {showNotifications && (
              <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 border border-gray-200 dark:border-gray-700">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center"><h3 className="font-bold text-gray-800 dark:text-white">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>{(unreadNotifCount > 0 || unreadChatCount > 0) && <button onClick={markAllAsRead} className="text-xs text-green-600 hover:text-green-700">{lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}</button>}</div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (<div className="p-4 text-center text-gray-500"><Bell size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">{lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</p></div>) : (
                    notifications.map(notif => {
                      const isChatNotif = ['new_chat_ticket','guide_chat','new_chat_message','GUIDE_CHAT','NEW_CHAT_TICKET','NEW_CHAT_MESSAGE','new_message','NEW_MESSAGE'].includes(notif.type);
                      return (<div key={notif.id} className={`p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${!notif.is_read ? (isChatNotif ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-green-50 dark:bg-green-900/20') : ''}`} onClick={() => handleBellNotifClick(notif)}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1"><div className="flex items-center gap-1 mb-0.5">{isChatNotif && <MessageCircle size={12} className="text-purple-500 flex-shrink-0" />}<p className="text-sm font-medium text-gray-800 dark:text-white">{notif.title}</p></div><p className="text-xs text-gray-500 mt-0.5">{notif.message?.length > 80 ? notif.message.substring(0,80)+'...' : notif.message}</p><p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p></div>
                          <div className="flex flex-col items-center gap-1">{!notif.is_read && <div className={`w-2 h-2 rounded-full ${isChatNotif ? 'bg-purple-500' : 'bg-green-500'}`}></div>}{isChatNotif && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">{lang === 'ar' ? 'محادثة' : 'Chat'}</span>}</div>
                        </div>
                      </div>);
                    })
                  )}
                </div>
                <div className="p-2 border-t border-gray-200 dark:border-gray-700"><button onClick={() => setShowNotifications(false)} className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1">{lang === 'ar' ? 'إغلاق' : 'Close'}</button></div>
              </div>
            )}
          </div>
          <button onClick={() => setActiveTab('chats')} className="relative p-2 text-gray-600 hover:text-green-600 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><MessageCircle size={22} />{totalUnreadChats > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">{totalUnreadChats > 9 ? '9+' : totalUnreadChats}</span>}</button>
          <button onClick={() => setPage('safety')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"><Shield size={18} /> إرشادات السلامة</button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white mb-8 shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div><h1 className="text-2xl font-bold">لوحة تحكم المرشد</h1><p className="opacity-90 mt-1">{user?.full_name || guide?.name}</p><div className="flex items-center mt-2 gap-2"><CheckCircle className="w-5 h-5" /><span className="text-sm">حساب مرشد معتمد</span></div>{socketConnected && <div className="flex items-center mt-1 gap-1 text-xs"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div><span className="opacity-75">متصل للإشعارات الفورية</span></div>}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[{ value: stats.activePrograms, label: 'برنامج نشط' },{ value: stats.totalPrograms, label: 'إجمالي البرامج' },{ value: stats.totalParticipants, label: 'مشاركين' },{ value: `${stats.totalRevenue} ريال`, label: 'الإيرادات' }].map((s,i) => (<div key={i} className="text-center bg-white/20 rounded-xl p-3"><div className="text-2xl font-bold">{s.value}</div><div className="text-xs opacity-90">{s.label}</div></div>))}
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button onClick={() => setActiveTab('programs')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'programs' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}><Package className="inline w-4 h-4 ml-1" /> {lang === 'ar' ? 'البرامج' : 'Programs'}</button>
        <button onClick={() => setActiveTab('chats')} className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'chats' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}><MessageCircle className="inline w-4 h-4 ml-1" /> {lang === 'ar' ? 'المحادثات الواردة' : 'Incoming chats'}{totalUnreadChats > 0 && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">{totalUnreadChats}</span>}</button>
      </div>

      {activeTab === 'programs' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full sm:w-80"><Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="بحث في البرامج..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-10 p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none" /></div>
            <div className="flex gap-3"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none"><option value="all">الكل</option><option value="active">نشط</option><option value="inactive">غير نشط</option></select><button onClick={() => fetchRealPrograms()} className="p-3 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 transition"><RefreshCw size={20} /></button><button onClick={() => { setActiveStep(1); setShowAddProgram(true); }} className="px-5 py-3 bg-green-600 text-white rounded-xl flex items-center gap-2 hover:bg-green-700 transition shadow-md"><Plus size={20} /> إضافة برنامج</button></div>
          </div>
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

      {activeTab === 'chats' && (
        <div>
          {loadingTickets && unifiedChats.length === 0 ? (<div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>) : unifiedChats.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed"><Inbox className="w-20 h-20 mx-auto text-gray-400 mb-4" /><p className="text-gray-500 text-lg mb-3">{lang === 'ar' ? 'لا توجد محادثات واردة من المسافرين' : 'No incoming chats from travelers'}</p><p className="text-sm text-gray-400">{lang === 'ar' ? 'عندما يبدأ مسافر محادثة معك، ستظهر هنا' : 'When a traveler starts a chat with you, it will appear here'}</p></div>
          ) : (
            <div className="space-y-4">
              {unifiedChats.map(chat => {
                const isUnread = !chat.is_read;
                const fromNotif = chat._sourceType === 'notification';
                return (
                  <div key={chat.id} className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border ${isUnread ? 'border-green-300 dark:border-green-700 ring-1 ring-green-200' : 'border-gray-100 dark:border-gray-700'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap"><MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0" /><h3 className="font-bold text-gray-800 dark:text-white">{lang === 'ar' ? `محادثة مع ${chat.touristName}` : `Chat with ${chat.touristName}`}</h3><span className="text-xs text-gray-500">{new Date(chat.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>{isUnread && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">{lang === 'ar' ? 'جديدة' : 'New'}</span>}{fromNotif && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1"><Bell size={10} /> {lang === 'ar' ? 'إشعار' : 'Notif'}</span>}</div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 truncate">{chat.subject}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500"><span className="flex items-center gap-1"><Users size={14} /> {chat.touristName}</span><span className="flex items-center gap-1"><Clock size={14} /> {new Date(chat.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span></div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0"><button onClick={() => openDirectChat(chat)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-2"><MailOpen size={16} /> {lang === 'ar' ? 'فتح' : 'Open'}</button><button onClick={() => deleteConversation(chat)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition flex items-center gap-2"><Trash2 size={16} /> {lang === 'ar' ? 'حذف' : 'Delete'}</button></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAddProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-green-600 p-5 rounded-t-2xl sticky top-0 z-10"><div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="text-white font-medium">إضافة برنامج جديد</span><div className="flex items-center gap-1 mr-3">{[1,2,3].map(step=>(<React.Fragment key={step}><button onClick={()=>setActiveStep(step)} className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition ${activeStep===step?'text-white bg-green-600':activeStep>step?'bg-white/40 text-white':'bg-white/20 text-white/70'}`}>{activeStep>step?'✓':step}</button>{step<3&&<div className="w-8 h-px bg-white/30"></div>}</React.Fragment>))}</div></div><button onClick={()=>{setShowAddProgram(false); setNewProgram(defaultProgramState); setActiveStep(1);}} className="text-white/80 hover:text-white"><XCircle size={28}/></button></div></div>
            <div className="p-6 space-y-5">
              {activeStep===1&&(<div className="space-y-4"><h3 className="font-semibold text-lg text-green-700">المعلومات الأساسية</h3><div><label className="block text-sm font-semibold mb-1">اسم البرنامج *</label><input type="text" value={newProgram.name} onChange={e=>setNewProgram({...newProgram,name:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="مثال: جولة تاريخية في الدرعية"/></div><div><label className="block text-sm font-semibold mb-1">الوصف</label><textarea value={newProgram.description} onChange={e=>setNewProgram({...newProgram,description:e.target.value})} rows="3" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="وصف تفصيلي للبرنامج..."/></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-semibold mb-1">السعر (ريال) *</label><input type="number" value={newProgram.price} onChange={e=>setNewProgram({...newProgram,price:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="0"/></div><div><label className="block text-sm font-semibold mb-1">المدة *</label><input type="text" value={newProgram.duration} onChange={e=>setNewProgram({...newProgram,duration:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="مثال: 3 ساعات"/></div></div><div><label className="block text-sm font-semibold mb-1">العدد الأقصى للمشاركين *</label><input type="number" value={newProgram.maxParticipants} onChange={e=>setNewProgram({...newProgram,maxParticipants:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="20"/></div><div className="flex justify-end pt-2"><button onClick={()=>setActiveStep(2)} className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">التالي ←</button></div></div>)}
              {activeStep===2&&(<div className="space-y-4"><h3 className="font-semibold text-lg text-green-700">صور البرنامج</h3><p className="text-sm text-gray-500">أضف صوراً جذابة للبرنامج. انقر على صورة لتعيينها كالصورة الرئيسية.</p><ImageGallery accentColor="green"/><div className="flex justify-between pt-2"><button onClick={()=>setActiveStep(1)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-300 transition">→ السابق</button><button onClick={()=>setActiveStep(3)} className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">التالي ←</button></div></div>)}
              {activeStep===3&&(<div className="space-y-4"><h3 className="font-semibold text-lg text-green-700">الموقع وإرشادات السلامة</h3><MapSection mapRef={mapContainerRef} accentColor="green" onGeolocate={()=>{if(navigator.geolocation){navigator.geolocation.getCurrentPosition((pos)=>{const{latitude,longitude}=pos.coords;if(mapInstanceRef.current&&markerRef.current){markerRef.current.setLngLat([longitude,latitude]); mapInstanceRef.current.flyTo({center:[longitude,latitude],zoom:14});}else{initAddMap(latitude,longitude);}reverseGeocode(latitude,longitude).then(name=>{setNewProgram(prev=>({...prev,location_lat:latitude,location_lng:longitude,location_name:name}));});},()=>toast.error('تعذر الحصول على موقعك الحالي'));}else toast.error('المتصفح لا يدعم تحديد الموقع');}}/><div><label className="block text-sm font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600"/> إرشادات السلامة والتعليمات (اختياري)</label><textarea value={newProgram.safetyGuidelines} onChange={e=>setNewProgram({...newProgram,safetyGuidelines:e.target.value})} rows="5" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" placeholder="مثال:\n• رخصة قيادة سارية المفعول مطلوبة.\n• الحد الأدنى للعمر: 18 سنة.\n• يرجى إحضار المعدات الشخصية."/></div><div className="flex justify-between pt-2"><button onClick={()=>setActiveStep(2)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-300 transition">→ السابق</button><button onClick={handleAddProgram} disabled={loading||uploadingImage} className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2">{loading||uploadingImage?<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> جاري الحفظ...</>:<><Save size={18}/> حفظ البرنامج</>}</button></div></div>)}
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingProgram && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-yellow-600 p-5 rounded-t-2xl sticky top-0 z-10"><div className="flex justify-between items-center"><h3 className="text-white text-xl font-bold">✏️ تعديل البرنامج</h3><button onClick={()=>{setShowEditModal(false); setEditingProgram(null); newProgram.images.forEach(img=>{if(img.preview?.startsWith('blob:')) URL.revokeObjectURL(img.preview);}); setNewProgram(defaultProgramState); if(editMapInstanceRef.current){try{editMapInstanceRef.current.remove();}catch(e){}editMapInstanceRef.current=null;}}} className="text-white/80 hover:text-white"><XCircle size={28}/></button></div></div>
            <div className="p-6 space-y-4"><div><label className="block text-sm font-semibold mb-2 text-yellow-700 flex items-center gap-2"><LucideImage size={16}/> صور البرنامج {newProgram.images.length>0&&<span className="text-xs text-gray-500 font-normal">({newProgram.images.length} صورة • انقر لتعيين الرئيسية)</span>}</label><ImageGallery accentColor="yellow"/></div><input type="text" placeholder="اسم البرنامج *" value={newProgram.name} onChange={e=>setNewProgram({...newProgram,name:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/><textarea placeholder="الوصف" value={newProgram.description} onChange={e=>setNewProgram({...newProgram,description:e.target.value})} rows="3" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/><div className="grid grid-cols-2 gap-4"><input type="number" placeholder="السعر (ريال)" value={newProgram.price} onChange={e=>setNewProgram({...newProgram,price:e.target.value})} className="p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/><input type="text" placeholder="المدة" value={newProgram.duration} onChange={e=>setNewProgram({...newProgram,duration:e.target.value})} className="p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/></div><input type="number" placeholder="العدد الأقصى للمشاركين" value={newProgram.maxParticipants} onChange={e=>setNewProgram({...newProgram,maxParticipants:e.target.value})} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"/><MapSection mapRef={editMapContainerRef} accentColor="yellow" onGeolocate={()=>{if(navigator.geolocation){navigator.geolocation.getCurrentPosition((pos)=>{const{latitude,longitude}=pos.coords;if(editMapInstanceRef.current&&editMarkerRef.current){editMarkerRef.current.setLngLat([longitude,latitude]); editMapInstanceRef.current.flyTo({center:[longitude,latitude],zoom:14});}else{initEditMap(latitude,longitude);}reverseGeocode(latitude,longitude).then(name=>{setNewProgram(prev=>({...prev,location_lat:latitude,location_lng:longitude,location_name:name}));});},()=>toast.error('تعذر الحصول على موقعك الحالي'));}else toast.error('المتصفح لا يدعم تحديد الموقع');}}/><div><label className="block text-sm font-semibold mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600"/> إرشادات السلامة (اختياري)</label><textarea value={newProgram.safetyGuidelines} onChange={e=>setNewProgram({...newProgram,safetyGuidelines:e.target.value})} rows="4" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="مثال:\n• رخصة قيادة سارية المفعول مطلوبة.\n• الحد الأدنى للعمر: 18 سنة."/></div><div className="flex gap-3 pt-2"><button onClick={handleUpdateProgram} disabled={loading||uploadingImage} className="flex-1 py-3 bg-yellow-600 text-white rounded-xl font-medium hover:bg-yellow-700 transition disabled:opacity-50 flex items-center justify-center gap-2">{loading||uploadingImage?<><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> جاري الحفظ...</>:<><Save size={18}/> حفظ التغييرات</>}</button><button onClick={()=>{setShowEditModal(false); setEditingProgram(null); newProgram.images.forEach(img=>{if(img.preview?.startsWith('blob:')) URL.revokeObjectURL(img.preview);}); setNewProgram(defaultProgramState); if(editMapInstanceRef.current){try{editMapInstanceRef.current.remove();}catch(e){}editMapInstanceRef.current=null;}}} className="px-6 py-3 border-2 rounded-xl font-medium hover:bg-gray-50 transition">إلغاء</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideDashboard;

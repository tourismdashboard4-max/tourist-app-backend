// client/src/pages/NotificationsPage.jsx
// ✅ الإصدار النهائي - إصلاح جلب أسماء المستخدمين من المعرفات UUID
// ✅ إضافة: تحديث اسم المستخدم الآخر عند تغيير ملفه الشخصي
// ✅ إضافة: تحويل المعرفات من UUID إلى رقمي قبل جلب البيانات
// ✅ إضافة: استخدم خريطة GUIDES_MAP للمعرفات المعروفة

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaBell, FaSpinner, FaTrash, FaHeadset,
  FaChevronLeft, FaComments, FaSyncAlt, FaClock,
  FaRegSquare, FaCheckSquare
} from 'react-icons/fa';
import { RiAlarmWarningFill } from 'react-icons/ri';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import './NotificationsPage.css';

const API_BASE = 'https://tourist-app-api.onrender.com';
const SOCKET_URL = 'https://tourist-app-api.onrender.com';
const DELETED_TICKETS_KEY = 'guide_deleted_tickets';

// ✅ خريطة ثابتة للمعرفات المعروفة (UUID -> numeric ID)
const GUIDES_MAP = {
  '64be64ff-ae41-4eb0-a41f-27de577b6246': 6,
  'd93beb84-4e67-4f64-bfe9-d20cc25f8b44': 1,
};

// ✅ خريطة عكسية (numeric ID -> name)
const GUIDE_NAMES_MAP = {
  6: 'محمد نسيب ١',
  1: 'Regular User6',
  4: 'مرشد سياحي',
};

const NotificationsPage = ({ setPage, onNotificationClick }) => {
  const { language } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [directChats, setDirectChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedChats, setSelectedChats] = useState(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const socketRef = useRef(null);
  const pollingRef = useRef(null);
  const lastMessageIdsRef = useRef(new Map());
  const userDetailsCache = useRef(new Map());
  const numericIdCache = useRef(new Map());

  const getDeletedTickets = () => {
    const stored = localStorage.getItem(DELETED_TICKETS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  };

  const addDeletedTicket = (ticketId) => {
    const current = getDeletedTickets();
    current.add(String(ticketId));
    localStorage.setItem(DELETED_TICKETS_KEY, JSON.stringify([...current]));
    fetchDirectChats(false);
  };

  const addDeletedTickets = (ticketIds) => {
    const current = getDeletedTickets();
    ticketIds.forEach(id => current.add(String(id)));
    localStorage.setItem(DELETED_TICKETS_KEY, JSON.stringify([...current]));
    fetchDirectChats(false);
  };

  // ✅ تحويل UUID إلى معرف رقمي باستخدام الخريطة الثابتة أو API
  const convertToNumericId = useCallback(async (userId) => {
    if (!userId) return null;
    
    const stringId = String(userId);
    
    // 1. التحقق من الكاش
    if (numericIdCache.current.has(stringId)) {
      return numericIdCache.current.get(stringId);
    }
    
    // 2. إذا كان رقمياً بالفعل
    if (!isNaN(Number(stringId))) {
      const numId = Number(stringId);
      numericIdCache.current.set(stringId, numId);
      return numId;
    }
    
    // 3. التحقق من الخريطة الثابتة
    if (GUIDES_MAP[stringId]) {
      const numId = GUIDES_MAP[stringId];
      numericIdCache.current.set(stringId, numId);
      return numId;
    }
    
    // 4. محاولة جلب المستخدم باستخدام المعرف UUID
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/users/${stringId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // إذا كان المستخدم يحتوي على old_id (معرف رقمي)
          let numId = null;
          if (data.user.old_id && !isNaN(Number(data.user.old_id))) {
            numId = Number(data.user.old_id);
          } else if (data.user.id && !isNaN(Number(data.user.id))) {
            numId = Number(data.user.id);
          }
          if (numId) {
            numericIdCache.current.set(stringId, numId);
            // أيضاً نخزن تحت المعرف الرقمي
            numericIdCache.current.set(String(numId), numId);
            return numId;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to convert user ID:', error);
    }
    
    return null;
  }, []);

  // ✅ جلب تفاصيل المستخدم (الاسم) من الخادم باستخدام المعرف الرقمي
  const fetchUserDetails = useCallback(async (userId) => {
    if (!userId) return null;
    
    const cacheKey = String(userId);
    
    // 1. التحقق من الكاش
    if (userDetailsCache.current.has(cacheKey)) {
      return userDetailsCache.current.get(cacheKey);
    }
    
    // 2. التحقق من خريطة الأسماء الثابتة (للمعرفات الرقمية المعروفة)
    if (!isNaN(Number(cacheKey)) && GUIDE_NAMES_MAP[Number(cacheKey)]) {
      const name = GUIDE_NAMES_MAP[Number(cacheKey)];
      userDetailsCache.current.set(cacheKey, name);
      return name;
    }
    
    try {
      // 3. تحويل المعرف إلى رقمي
      const numericId = await convertToNumericId(userId);
      if (!numericId) {
        console.warn(`⚠️ Could not convert userId ${userId} to numeric`);
        return null;
      }
      
      // 4. جلب بيانات المستخدم باستخدام المعرف الرقمي
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/users/${numericId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const name = data.user.fullName || data.user.name || null;
          if (name) {
            // تخزين تحت جميع المفاتيح المحتملة
            userDetailsCache.current.set(cacheKey, name);
            userDetailsCache.current.set(String(numericId), name);
            if (data.user.uuid) {
              userDetailsCache.current.set(String(data.user.uuid), name);
            }
          }
          return name;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch user details:', error);
    }
    return null;
  }, [convertToNumericId]);

  // ✅ تحسين جلب آخر رسالة مع معالجة 403
  const fetchRealLastMessage = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}/messages?page=1&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 403) {
        console.warn(`⚠️ Access denied to ticket ${ticketId}`);
        return null;
      }
      
      if (!res.ok) return null;
      
      const data = await res.json();
      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        const last = data.messages[0];
        lastMessageIdsRef.current.set(ticketId, last.id);
        return { message: last.message, time: last.created_at, sender_name: last.sender_name, messageId: last.id };
      }
    } catch (err) {
      console.warn(`Failed to fetch last message for ticket ${ticketId}:`, err);
    }
    return null;
  };

  // ✅ تحسين جلب المحادثات مع تحديث اسم المستخدم الآخر
  const fetchDirectChats = useCallback(async (showLoading = true) => {
    if (!user?.id) return;
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');

      const response = await fetch(`${API_BASE}/api/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication failed');
        setError(language === 'ar' ? 'انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى' : 'Session expired');
        setDirectChats([]);
        return;
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'API error');

      const currentUserId = String(user.id);
      const deletedSet = getDeletedTickets();

      // ✅ تصفية التذاكر
      const userTickets = data.tickets.filter((ticket) => {
        if (deletedSet.has(String(ticket.id))) return false;
        if (ticket.type !== 'guide_chat') return false;

        const isUserCreator = ticket.user_id && String(ticket.user_id) === currentUserId;
        const isGuide = ticket.metadata?.guideId && String(ticket.metadata.guideId) === currentUserId;
        const isTourist = ticket.metadata?.touristId && String(ticket.metadata.touristId) === currentUserId;
        const isCreatedBy = ticket.metadata?.created_by_id && String(ticket.metadata.created_by_id) === currentUserId;
        const isInParticipants = ticket.metadata?.participants && Array.isArray(ticket.metadata.participants) &&
                                 ticket.metadata.participants.some(p => String(p) === currentUserId);

        return isUserCreator || isGuide || isTourist || isCreatedBy || isInParticipants;
      });

      const defaultMsg = language === 'ar' ? 'ابدأ المحادثة' : 'Start conversation';

      // ✅ معالجة كل محادثة مع جلب اسم المستخدم الآخر من الخادم دائماً (مع الكاش)
      const chatsWithRealMsg = await Promise.all(
        userTickets.map(async (chat) => {
          let otherPartyName = '';
          let otherPartyId = null;
          let otherPartyRole = '';

          // تحديد الطرف الآخر
          if (chat.user_id && String(chat.user_id) !== currentUserId) {
            otherPartyId = chat.user_id;
            otherPartyName = chat.user_name || (language === 'ar' ? 'مسافر' : 'Traveler');
            otherPartyRole = 'tourist';
          } else if (chat.metadata?.guideId && String(chat.metadata.guideId) !== currentUserId) {
            otherPartyId = chat.metadata.guideId;
            otherPartyName = chat.metadata.guideName || (language === 'ar' ? 'مرشد' : 'Guide');
            otherPartyRole = 'guide';
          } else if (chat.metadata?.touristId && String(chat.metadata.touristId) !== currentUserId) {
            otherPartyId = chat.metadata.touristId;
            otherPartyName = chat.metadata.touristName || (language === 'ar' ? 'سائح' : 'Tourist');
            otherPartyRole = 'tourist';
          } else {
            return null;
          }

          // ✅ جلب الاسم الحقيقي من الخادم (باستخدام الكاش)
          if (otherPartyId) {
            const realName = await fetchUserDetails(otherPartyId);
            if (realName) {
              otherPartyName = realName;
            }
          }

          // جلب آخر رسالة إذا كانت فارغة أو افتراضية
          let lastMessage = chat.last_message;
          let lastMessageTime = chat.updated_at || chat.created_at;

          if (!lastMessage || lastMessage === defaultMsg || lastMessage === '') {
            const realMsg = await fetchRealLastMessage(chat.id);
            if (realMsg && realMsg.message !== defaultMsg && realMsg.message !== '') {
              lastMessage = realMsg.message;
              lastMessageTime = realMsg.time;
            } else {
              return null;
            }
          }

          return {
            id: chat.id,
            type: chat.type,
            other_party_id: otherPartyId,
            other_party_name: otherPartyName,
            other_party_role: otherPartyRole,
            subject: chat.subject,
            last_message: lastMessage,
            last_message_time: lastMessageTime,
            last_message_id: chat.last_message_id,
            unread_count: chat.unread_count || 0,
            status: chat.status,
            created_at: chat.created_at,
          };
        })
      );

      const validChats = chatsWithRealMsg.filter(chat => chat !== null && chat.last_message);
      validChats.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));

      setDirectChats(validChats);
      setSelectedChats(new Set());
      console.log('✅ المحادثات المعروضة:', validChats.length);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError(error.message);
      if (!error.message.includes('token')) {
        toast.error(language === 'ar' ? 'فشل تحميل المحادثات' : 'Failed to load chats');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user?.id, language, fetchUserDetails]);

  // ✅ تحديث المحادثة (بما في ذلك اسم الطرف الآخر)
  const updateChatMessage = useCallback((ticketId, newMessage, newTimestamp, senderId = null, messageId = null, senderName = null) => {
    setDirectChats((prev) => {
      const existingIndex = prev.findIndex(c => c.id === ticketId);
      
      if (existingIndex !== -1) {
        const updated = [...prev];
        const chat = updated[existingIndex];
        const isNewMessage = chat.last_message !== newMessage;
        
        if (senderName && senderId && senderId !== user?.id) {
          if (String(senderId) === String(chat.other_party_id)) {
            chat.other_party_name = senderName;
            userDetailsCache.current.set(String(senderId), senderName);
          }
        }
        
        updated[existingIndex] = {
          ...chat,
          last_message: newMessage,
          last_message_time: newTimestamp,
          unread_count: isNewMessage ? (chat.unread_count || 0) + 1 : chat.unread_count,
        };
        updated.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
        return updated;
      } else {
        fetchDirectChats(false);
        return prev;
      }
    });
  }, [fetchDirectChats, user?.id]);

  // ✅ حذف محادثة واحدة
  const deleteDirectChat = async (chat, event) => {
    if (event) event.stopPropagation();
    if (!window.confirm(language === 'ar' ? 'حذف المحادثة نهائياً؟' : 'Delete permanently?')) return;
    setDeletingId(chat.id);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/support/tickets/${chat.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      
      addDeletedTicket(chat.id);
      setDirectChats((prev) => prev.filter((c) => c.id !== chat.id));
      toast.success(language === 'ar' ? 'تم الحذف' : 'Deleted');
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل الحذف' : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // ✅ حذف المحادثات المحددة
  const deleteSelectedChats = async () => {
    if (selectedChats.size === 0) return;
    if (!window.confirm(language === 'ar' ? `حذف ${selectedChats.size} محادثة نهائياً؟` : `Delete ${selectedChats.size} chats permanently?`)) return;
    setIsDeletingSelected(true);
    try {
      const token = localStorage.getItem('token');
      const idsArray = Array.from(selectedChats);
      for (const id of idsArray) {
        try {
          await fetch(`${API_BASE}/api/support/tickets/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        } catch (e) {}
      }
      addDeletedTickets(idsArray);
      setDirectChats((prev) => prev.filter((c) => !selectedChats.has(c.id)));
      toast.success(language === 'ar' ? `تم حذف ${idsArray.length} محادثة` : `${idsArray.length} chats deleted`);
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل حذف المحادثات المحددة' : 'Failed to delete selected chats');
    } finally {
      setIsDeletingSelected(false);
      setSelectedChats(new Set());
    }
  };

  // ✅ تبديل تحديد محادثة واحدة
  const toggleSelectChat = (chatId) => {
    setSelectedChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) newSet.delete(chatId);
      else newSet.add(chatId);
      return newSet;
    });
  };

  // ✅ تبديل تحديد الكل
  const toggleSelectAll = () => {
    if (selectedChats.size === directChats.length) {
      setSelectedChats(new Set());
    } else {
      setSelectedChats(new Set(directChats.map(c => c.id)));
    }
  };

  const openChat = (chat) => {
    setDirectChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unread_count: 0 } : c
    ));
    
    const params = {
      recipientId: chat.other_party_id,
      recipientName: chat.other_party_name,
      recipientType: chat.other_party_role,
      ticketId: chat.id,
    };
    localStorage.setItem('directChatParams', JSON.stringify(params));
    setPage('directChat');
  };

  const refreshAll = async () => {
    setRefreshing(true);
    lastMessageIdsRef.current.clear();
    userDetailsCache.current.clear();
    numericIdCache.current.clear();
    await fetchDirectChats(true);
    setRefreshing(false);
    toast.success(language === 'ar' ? 'تم التحديث' : 'Refreshed');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 60000);
    if (diff < 1) return language === 'ar' ? 'الآن' : 'now';
    if (diff < 60) return `${diff} ${language === 'ar' ? 'دقيقة' : 'min'}`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ${language === 'ar' ? 'ساعة' : 'hr'}`;
    return new Date(timestamp).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
  };

  const openSupportChat = () => {
    localStorage.removeItem('selectedSupportTicketId');
    setPage('support');
  };
  
  const openEmergency = () => setPage('emergency');

  // ✅ الاستماع لتحديث الملف الشخصي للمستخدم الآخر وتحديث الاسم في القائمة
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const { userId, updatedData } = e.detail;
      setDirectChats(prev => 
        prev.map(chat => {
          if (String(chat.other_party_id) === String(userId)) {
            const newName = updatedData.fullName || updatedData.name || chat.other_party_name;
            return { ...chat, other_party_name: newName };
          }
          return chat;
        })
      );
      if (updatedData.fullName || updatedData.name) {
        userDetailsCache.current.set(String(userId), updatedData.fullName || updatedData.name);
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  // ✅ تحسين اتصال Socket.IO
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('🔌 Setting up Socket.IO for Notifications...');
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('✅ Socket connected for Notifications');
      socket.emit('register', { 
        userId: user.id, 
        role: user?.role === 'guide' ? 'guide' : 'user' 
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket error:', error.message);
    });

    socket.on('new_message', (data) => {
      console.log('📩 New message via socket:', data);
      
      if (data.ticketId) {
        const senderName = data.senderName || (language === 'ar' ? 'مستخدم' : 'User');
        updateChatMessage(
          data.ticketId, 
          data.message, 
          data.createdAt || new Date().toISOString(), 
          data.senderId,
          data.messageId,
          senderName
        );
        
        const isOwnMessage = String(data.senderId) === String(user?.id);
        
        if (!isOwnMessage) {
          toast.success(`${senderName}: ${data.message?.substring(0, 40)}`, {
            duration: 4000,
            icon: '💬',
            onClick: () => {
              const params = {
                recipientId: data.senderId,
                recipientName: senderName,
                ticketId: data.ticketId
              };
              localStorage.setItem('directChatParams', JSON.stringify(params));
              setPage('directChat');
            }
          });
        }
        
        if (onNotificationClick) onNotificationClick();
      }
    });

    socket.on('ticket_created', () => {
      fetchDirectChats(false);
    });

    return () => {
      console.log('🔌 Cleaning up Socket');
      if (socket) {
        socket.off('connect');
        socket.off('connect_error');
        socket.off('new_message');
        socket.off('ticket_created');
        socket.disconnect();
      }
    };
  }, [user?.id, language, setPage, onNotificationClick, updateChatMessage, fetchDirectChats]);

  // جلب المحادثات الأولي
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      fetchDirectChats(true);
    }
  }, [user, authLoading, isAuthenticated, fetchDirectChats]);

  // Polling احتياطي
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(() => {
      fetchDirectChats(false);
    }, 10000);
    
    pollingRef.current = interval;
    return () => clearInterval(interval);
  }, [user?.id, fetchDirectChats]);

  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><FaSpinner className="animate-spin text-teal-400" size={32} /></div>;
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-full text-white">
        {language === 'ar' ? 'الرجاء تسجيل الدخول' : 'Please login'}
      </div>
    );
  }

  const isAllSelected = directChats.length > 0 && selectedChats.size === directChats.length;
  const isSomeSelected = selectedChats.size > 0;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 overflow-hidden">
      {/* الرأس */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setPage('profile')} className="p-2 hover:bg-white/20 rounded-xl">
                <FaChevronLeft size={20} className="text-white" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                  <FaBell className="w-5 h-5 text-white" />
                </div>
                {directChats.reduce((sum, c) => sum + (c.unread_count || 0), 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    {directChats.reduce((sum, c) => sum + (c.unread_count || 0), 0)}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-base font-bold text-white">{language === 'ar' ? 'المحادثات' : 'Chats'}</h1>
                <p className="text-xs text-white/80">{language === 'ar' ? 'رسائلك المباشرة' : 'Your messages'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={refreshAll} disabled={refreshing} className="p-2 hover:bg-white/20 rounded-xl">
                <FaSyncAlt className={`text-white ${refreshing ? 'animate-spin' : ''}`} size={16} />
              </button>
              <button onClick={openEmergency} className="px-3 py-1.5 bg-red-500/80 rounded-lg text-white text-sm flex items-center gap-1">
                <RiAlarmWarningFill size={14} />
                <span>{language === 'ar' ? 'طوارئ' : 'Emergency'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* دعم المساعدة */}
      <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">{language === 'ar' ? 'تحتاج مساعدة؟' : 'Need help?'}</p>
            <p className="text-white/50 text-xs">{language === 'ar' ? 'تواصل مع فريق الدعم' : 'Contact support'}</p>
          </div>
          <button onClick={openSupportChat} className="px-4 py-2 bg-teal-500 text-white rounded-xl font-semibold flex items-center gap-2">
            <FaHeadset size={16} />
            <span>{language === 'ar' ? 'الدعم الفني' : 'Support'}</span>
          </button>
        </div>
      </div>

      {/* شريط الأدوات: تحديد الكل وحذف المحدد */}
      {directChats.length > 0 && (
        <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={toggleSelectAll} className="flex items-center gap-1 text-white/80 hover:text-white">
              {isAllSelected ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
              <span className="text-sm">{language === 'ar' ? 'تحديد الكل' : 'Select All'}</span>
            </button>
            <span className="text-white/50 text-sm">
              {selectedChats.size > 0 ? `${selectedChats.size} ${language === 'ar' ? 'محدد' : 'selected'}` : ''}
            </span>
          </div>
          {isSomeSelected && (
            <button
              onClick={deleteSelectedChats}
              disabled={isDeletingSelected}
              className="px-3 py-1.5 bg-red-500/80 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-red-600 transition disabled:opacity-50"
            >
              {isDeletingSelected ? <FaSpinner className="animate-spin" size={14} /> : <FaTrash size={14} />}
              <span>{language === 'ar' ? 'حذف المحدد' : 'Delete Selected'}</span>
            </button>
          )}
        </div>
      )}

      {/* قائمة المحادثات */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-white text-sm">
            {error}
            <button onClick={refreshAll} className="ml-2 underline">إعادة المحاولة</button>
          </div>
        )}
        
        <div className="space-y-3">
          {loading && directChats.length === 0 ? (
            <div className="flex justify-center py-12">
              <FaSpinner className="animate-spin text-teal-400" size={32} />
            </div>
          ) : directChats.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/20">
              <FaComments className="w-16 h-16 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">{language === 'ar' ? 'لا توجد محادثات بعد' : 'No chats yet'}</p>
              <button onClick={refreshAll} className="mt-4 px-4 py-2 bg-white/20 rounded-lg text-white text-sm">
                <FaSyncAlt className="inline mr-2" /> {language === 'ar' ? 'تحديث' : 'Refresh'}
              </button>
            </div>
          ) : (
            directChats.map((chat) => {
              const unread = chat.unread_count > 0;
              const isDeleting = deletingId === chat.id;
              const isSelected = selectedChats.has(chat.id);
              
              return (
                <div 
                  key={chat.id} 
                  className={`bg-white/10 backdrop-blur-sm rounded-xl p-3 border cursor-pointer hover:bg-white/20 ${
                    unread ? 'border-teal-400/50 bg-white/15' : 'border-white/20'
                  } ${isSelected ? 'ring-2 ring-teal-400' : ''}`}
                  onClick={() => openChat(chat)}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectChat(chat.id)}
                        className="w-4 h-4 rounded border-white/30 bg-transparent text-teal-500 focus:ring-teal-400"
                      />
                    </div>

                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        chat.other_party_role === 'guide' 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      }`}>
                        <FaComments className="text-white" size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-white font-bold truncate ${unread ? 'text-teal-200' : ''}`}>
                            {chat.other_party_name}
                          </h3>
                          {unread && (
                            <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {language === 'ar' ? 'جديد' : 'New'}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${unread ? 'text-white/80' : 'text-white/60'}`}>
                          {chat.last_message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/40 text-xs flex items-center gap-1">
                            <FaClock size={10} /> {formatTime(chat.last_message_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteDirectChat(chat, e)}
                      disabled={isDeleting}
                      className="p-2 hover:bg-red-500/20 rounded-full text-white/50 hover:text-red-400"
                    >
                      {isDeleting ? <FaSpinner className="animate-spin" size={14} /> : <FaTrash size={14} />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;

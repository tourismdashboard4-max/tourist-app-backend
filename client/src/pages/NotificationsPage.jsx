// client/src/pages/NotificationsPage.jsx
// ✅ النسخة النهائية - تعرض فقط المحادثات (الرسائل) بدون الإشعارات النظامية

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaArrowLeft, FaBell, FaSpinner, FaTrash, FaUser, FaHeadset,
  FaChevronLeft, FaComments, FaSyncAlt, FaClock, FaExclamationTriangle
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

const NotificationsPage = ({ setPage, onNotificationClick }) => {
  const { language } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [directChats, setDirectChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const pollingRef = useRef(null);

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

  const fetchRealLastMessage = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}/messages?page=1&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        const last = data.messages[0];
        return { message: last.message, time: last.created_at, sender_name: last.sender_name };
      }
    } catch (err) {
      console.warn(`Failed to fetch last message for ticket ${ticketId}:`, err);
    }
    return null;
  };

  // جلب المحادثات المباشرة فقط (بدون إشعارات نظام)
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
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'API error');

      const currentUserId = String(user.id);
      const deletedSet = getDeletedTickets();

      // تصفية: فقط guide_chat والتي يشارك فيها المستخدم
      const userTickets = data.tickets.filter((ticket) => {
        if (deletedSet.has(String(ticket.id))) return false;
        if (ticket.type !== 'guide_chat') return false;

        const isUserCreator = ticket.user_id && String(ticket.user_id) === currentUserId;
        const isGuide = ticket.metadata?.guideId && String(ticket.metadata.guideId) === currentUserId;
        const isTourist = ticket.metadata?.touristId && String(ticket.metadata.touristId) === currentUserId;
        const isCreatedBy = ticket.metadata?.created_by_id && String(ticket.metadata.created_by_id) === currentUserId;
        const isInParticipants = ticket.metadata?.participants && Array.isArray(ticket.metadata.participants) &&
                                 ticket.metadata.participants.some(p => String(p) === currentUserId);
        const isAssignedTo = ticket.assigned_to && String(ticket.assigned_to) === currentUserId;

        return isUserCreator || isGuide || isTourist || isCreatedBy || isInParticipants || isAssignedTo;
      });

      const defaultMsg = language === 'ar' ? 'ابدأ المحادثة' : 'Start conversation';
      const chatsWithRealMsg = await Promise.all(
        userTickets.map(async (chat) => {
          let otherPartyName = '';
          let otherPartyId = null;

          if (chat.user_id && String(chat.user_id) !== currentUserId) {
            otherPartyId = chat.user_id;
            otherPartyName = chat.user_name || (language === 'ar' ? 'مسافر' : 'Traveler');
          } else if (chat.metadata?.guideId && String(chat.metadata.guideId) !== currentUserId) {
            otherPartyId = chat.metadata.guideId;
            otherPartyName = chat.metadata.guideName || (language === 'ar' ? 'مرشد' : 'Guide');
          } else if (chat.metadata?.touristId && String(chat.metadata.touristId) !== currentUserId) {
            otherPartyId = chat.metadata.touristId;
            otherPartyName = chat.metadata.touristName || (language === 'ar' ? 'سائح' : 'Tourist');
          } else {
            otherPartyId = 'unknown';
            otherPartyName = language === 'ar' ? 'محادثة' : 'Chat';
          }

          let lastMessage = chat.last_message;
          let lastMessageTime = chat.updated_at || chat.created_at;

          if (!lastMessage || lastMessage === defaultMsg) {
            const realMsg = await fetchRealLastMessage(chat.id);
            if (realMsg && realMsg.message !== defaultMsg) {
              lastMessage = realMsg.message;
              lastMessageTime = realMsg.time;
            } else {
              return null; // لا توجد رسائل حقيقية بعد
            }
          }

          return {
            id: chat.id,
            type: chat.type,
            other_party_id: otherPartyId,
            other_party_name: otherPartyName,
            subject: chat.subject,
            last_message: lastMessage,
            last_message_time: lastMessageTime,
            unread_count: chat.unread_count || 0,
            status: chat.status,
            created_at: chat.created_at,
          };
        })
      );

      const validChats = chatsWithRealMsg.filter(chat => chat !== null);
      // دمج المحادثات لنفس الطرف الآخر
      const chatMap = new Map();
      for (const chat of validChats) {
        const key = chat.other_party_id;
        if (key && key !== 'unknown') {
          const existing = chatMap.get(key);
          if (!existing || new Date(chat.last_message_time) > new Date(existing.last_message_time)) {
            chatMap.set(key, chat);
          }
        } else {
          chatMap.set(chat.id, chat);
        }
      }
      const mergedChats = Array.from(chatMap.values());
      mergedChats.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));

      setDirectChats(mergedChats);
      console.log('✅ المحادثات المعروضة (فقط guide_chat برسائل حقيقية):', mergedChats.length);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError(error.message);
      toast.error(language === 'ar' ? 'فشل تحميل المحادثات' : 'Failed to load chats');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user?.id, language]);

  const updateChatMessage = useCallback((ticketId, newMessage, newTimestamp, senderId = null) => {
    setDirectChats((prev) => {
      const existingIndex = prev.findIndex(c => c.id === ticketId);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          last_message: newMessage,
          last_message_time: newTimestamp,
          unread_count: (updated[existingIndex].unread_count || 0) + 1,
        };
        updated.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
        return updated;
      } else {
        console.log(`🆕 Ticket ${ticketId} not in list, fetching full list...`);
        fetchDirectChats(false);
        return prev;
      }
    });
  }, [fetchDirectChats]);

  const deleteDirectChat = async (chat, event) => {
    if (event) event.stopPropagation();
    if (!window.confirm(language === 'ar' ? 'حذف المحادثة نهائياً؟' : 'Delete permanently?')) return;
    setDeletingId(chat.id);
    try {
      const token = localStorage.getItem('token');
      let serverDeleted = false;
      try {
        const delRes = await fetch(`${API_BASE}/api/support/tickets/${chat.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (delRes.ok) serverDeleted = true;
      } catch (e) { console.warn(e); }
      if (!serverDeleted) {
        try {
          const patchRes = await fetch(`${API_BASE}/api/support/tickets/${chat.id}/status`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'closed' }),
          });
          if (patchRes.ok) serverDeleted = true;
        } catch (e) { console.warn(e); }
      }
      addDeletedTicket(chat.id);
      setDirectChats((prev) => prev.filter((c) => c.id !== chat.id));
      toast.success(serverDeleted ? (language === 'ar' ? 'تم الحذف' : 'Deleted') : (language === 'ar' ? 'تم الإخفاء محلياً' : 'Hidden locally'));
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل الحذف' : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const openChat = (chat) => {
    const params = {
      recipientId: chat.other_party_id,
      recipientName: chat.other_party_name,
      recipientType: 'tourist',
      ticketId: chat.id,
    };
    localStorage.setItem('directChatParams', JSON.stringify(params));
    setPage('directChat');
  };

  const refreshAll = async () => {
    setRefreshing(true);
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

  // --------------------- Socket events ---------------------
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      console.log('🔌 Socket connected for Chats');
      socket.emit('register', { userId: user.id, role: user?.role === 'guide' ? 'guide' : 'user' });
    });

    socket.on('ticket_created', (data) => {
      if (data.participants && data.participants.includes(user.id)) {
        fetchDirectChats(false);
      }
    });

    socket.on('new_chat_ticket', (data) => {
      fetchDirectChats(false);
    });

    socket.on('new_message', (data) => {
      console.log('💬 New message via socket:', data);
      if (data.ticketId) {
        updateChatMessage(data.ticketId, data.message, data.createdAt || new Date().toISOString(), data.senderId);
      }
    });

    socket.on('update_last_message', (data) => {
      console.log('📝 Update last message via socket:', data);
      if (data.ticketId) {
        updateChatMessage(data.ticketId, data.lastMessage, data.lastMessageTime);
      }
    });

    return () => socket.disconnect();
  }, [user?.id, fetchDirectChats, updateChatMessage]);

  // التحميل الأولي والتحديث الدوري
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      fetchDirectChats(true).finally(() => setLoading(false));
    }
  }, [user, authLoading, isAuthenticated]);

  useEffect(() => {
    if (user?.id) {
      const interval = setInterval(() => {
        fetchDirectChats(false);
      }, 5000);
      pollingRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchDirectChats]);

  if (authLoading) return <div className="flex justify-center items-center h-full"><FaSpinner className="animate-spin text-teal-400" /></div>;
  if (!isAuthenticated) return <div className="flex justify-center items-center h-full text-white">{language === 'ar' ? 'الرجاء تسجيل الدخول' : 'Please login'}</div>;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-teal-900 via-cyan-900 to-emerald-900 overflow-hidden">
      {/* Header */}
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
                <p className="text-xs text-white/80">{language === 'ar' ? 'رسائلك المباشرة' : 'Your direct messages'}</p>
              </div>
            </div>
            <button onClick={openEmergency} className="px-3 py-1.5 bg-red-500/80 rounded-lg text-white text-sm">
              <RiAlarmWarningFill size={14} /> <span>{language === 'ar' ? 'طوارئ' : 'Emergency'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Support button */}
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

      {/* قائمة المحادثات فقط */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3">
          {loading && directChats.length === 0 ? (
            <div className="flex justify-center py-12">
              <FaSpinner className="animate-spin text-teal-400" size={24} />
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
              const itemClass = `bg-white/10 backdrop-blur-sm rounded-xl p-3 border transition-all duration-200 cursor-pointer hover:bg-white/20 ${
                unread ? 'border-teal-400/50 bg-white/15' : 'border-white/20'
              }`;

              return (
                <div key={`chat-${chat.id}`} className={itemClass} onClick={() => openChat(chat)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <FaComments className="text-white" size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-white font-bold truncate ${unread ? 'text-teal-200' : ''}`}>
                            {chat.other_party_name}
                            <span className="text-xs text-purple-300 mr-2">(مرشد)</span>
                          </h3>
                          {unread && (
                            <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                              {language === 'ar' ? 'جديد' : 'New'}
                            </span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm truncate">{chat.last_message || (language === 'ar' ? 'بدون رسائل' : 'No messages')}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/40 text-xs flex items-center gap-1">
                            <FaClock size={10} /> {formatTime(chat.last_message_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-teal-300 text-sm font-medium">{language === 'ar' ? 'افتح' : 'Open'}</span>
                      <button
                        onClick={(e) => deleteDirectChat(chat, e)}
                        disabled={isDeleting}
                        className="p-2 hover:bg-red-500/20 rounded-full transition text-white/50 hover:text-red-400 disabled:opacity-50"
                      >
                        {isDeleting ? <FaSpinner className="animate-spin" size={14} /> : <FaTrash size={14} />}
                      </button>
                    </div>
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

// client/src/pages/DirectChatPage.jsx
// ✅ النسخة النهائية – عرض اسم وصورة الطرف الآخر في المحادثة (في الرأس وفي الرسائل)
// ✅ إضافة تحقق لمنع عرض اسم المستخدم نفسه
// ✅ تحسين جلب بيانات المستخدم الآخر
// ✅ عرض recipientName في رسائل الطرف الآخر بدلاً من sender_name

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Loader2, ArrowLeft, User, MessageCircle, RefreshCw, 
  Smile, Image, Paperclip, Mic, MicOff, Bell, CheckCircle2, 
  Trash2, CheckCheck, X, Eye, Play, Pause
} from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import EmojiPicker from '../components/Chat/EmojiPicker';

const API_BASE = 'https://tourist-app-api.onrender.com';
const SOCKET_URL = 'https://tourist-app-api.onrender.com';
const DELETED_TICKETS_KEY = 'guide_deleted_tickets';

const getToken = () => localStorage.getItem('token') || localStorage.getItem('touristAppToken') || '';

const authFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
};

const addDeletedTicket = (ticketId) => {
  const stored = localStorage.getItem(DELETED_TICKETS_KEY);
  let deletedSet = stored ? new Set(JSON.parse(stored)) : new Set();
  deletedSet.add(String(ticketId));
  localStorage.setItem(DELETED_TICKETS_KEY, JSON.stringify([...deletedSet]));
};

const isTicketDeleted = (ticketId) => {
  const stored = localStorage.getItem(DELETED_TICKETS_KEY);
  if (!stored) return false;
  const deletedSet = new Set(JSON.parse(stored));
  return deletedSet.has(String(ticketId));
};

const getNumericIdIfPossible = (userId) => {
  if (!userId) return null;
  if (!isNaN(Number(userId))) return Number(userId);
  return userId;
};

const getFullImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const DEFAULT_NAMES = ['المرشد', 'Guide', 'مسافر', 'Traveler', 'سائح', 'Tourist', 'مستخدم', 'User'];

const DirectChatPage = ({ setPage, lang = 'ar', user: propUser }) => {
  const [recipientName, setRecipientName] = useState(lang === 'ar' ? 'المرشد' : 'Guide');
  const [recipientId, setRecipientId] = useState(null);
  const [recipientNumericId, setRecipientNumericId] = useState(null);
  const [recipientAvatar, setRecipientAvatar] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [initError, setInitError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState(propUser);
  const [guideOnline, setGuideOnline] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isGuide, setIsGuide] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  // حالة التسجيل الصوتي (بالضغط المطول)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [isHolding, setIsHolding] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const holdTimerRef = useRef(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pollingRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const isInitializedRef = useRef(false);
  const isRTL = lang === 'ar';
  const hasUpdatedNameRef = useRef(false);
  const isFetchingAvatarRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (propUser) { setUser(propUser); return; }
    const raw = localStorage.getItem('touristAppUser') || localStorage.getItem('user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        if (parsed.role === 'guide' || parsed.type === 'guide') setIsGuide(true);
      } catch (e) { console.error(e); }
    }
  }, [propUser]);

  // ✅ جلب بيانات المستخدم الآخر (الاسم والصورة) مع تحسينات
  const fetchRecipientDetails = useCallback(async (userId) => {
    if (!userId) return;
    if (isFetchingAvatarRef.current) return;
    if (!user) return; // تأكد من وجود المستخدم الحالي
    
    // إذا كان المعرف هو نفس معرف المستخدم الحالي، لا نجلب
    const currentUserId = user.id ? String(user.id) : null;
    if (currentUserId && String(userId) === currentUserId) {
      console.warn('⚠️ Skipping self fetch: recipientId equals current user ID');
      return;
    }
    
    isFetchingAvatarRef.current = true;
    
    try {
      console.log('📤 Fetching recipient details for userId:', userId);
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/users/${userId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Recipient details response:', data);
        
        if (data.success && data.user) {
          const userData = data.user;
          
          // التحقق من أن المستخدم المسترجع ليس هو نفس المستخدم الحالي
          const fetchedUserId = userData.id ? String(userData.id) : null;
          if (currentUserId && fetchedUserId && fetchedUserId === currentUserId) {
            console.warn('⚠️ API returned current user data, ignoring');
            return;
          }
          
          // تحديث الاسم
          if (userData.fullName || userData.name) {
            const newName = userData.fullName || userData.name;
            if (DEFAULT_NAMES.includes(recipientName) || recipientName !== newName) {
              setRecipientName(newName);
              hasUpdatedNameRef.current = true;
              try {
                const params = JSON.parse(localStorage.getItem('directChatParams') || '{}');
                params.recipientName = newName;
                localStorage.setItem('directChatParams', JSON.stringify(params));
              } catch (e) {}
            }
          }
          
          // ✅ تحديث الصورة - البحث في عدة حقول محتملة
          let avatarUrl = null;
          if (userData.avatar_url) {
            avatarUrl = userData.avatar_url;
          } else if (userData.avatar) {
            avatarUrl = userData.avatar;
          } else if (userData.profile_picture) {
            avatarUrl = userData.profile_picture;
          } else if (userData.profilePicture) {
            avatarUrl = userData.profilePicture;
          }
          
          if (avatarUrl) {
            const fullUrl = avatarUrl.startsWith('http') 
              ? avatarUrl 
              : `${API_BASE}${avatarUrl}`;
            setRecipientAvatar(fullUrl);
            console.log('✅ Recipient avatar set to:', fullUrl);
          } else {
            console.log('ℹ️ No avatar URL found for user:', userId);
            setRecipientAvatar(null);
          }
        }
      } else {
        console.warn('⚠️ Failed to fetch recipient details, status:', response.status);
        setRecipientAvatar(null);
      }
    } catch (error) {
      console.error('❌ Failed to fetch recipient details:', error);
      setRecipientAvatar(null);
    } finally {
      isFetchingAvatarRef.current = false;
    }
  }, [user, recipientName]);

  // ✅ جلب اسم المستخدم من API (للاسم فقط مع الصورة) - يُستخدم كاحتياطي
  const fetchUserDetails = useCallback(async (userId) => {
    if (!userId) return null;
    if (!user) return null;
    const currentUserId = user.id ? String(user.id) : null;
    if (currentUserId && String(userId) === currentUserId) return null;
    
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.user) {
        const userData = data.user;
        const fetchedUserId = userData.id ? String(userData.id) : null;
        if (currentUserId && fetchedUserId && fetchedUserId === currentUserId) {
          console.warn('⚠️ fetchUserDetails got current user, ignoring');
          return null;
        }
        // تحديث الصورة أيضاً
        let avatarUrl = null;
        if (userData.avatar_url) avatarUrl = userData.avatar_url;
        else if (userData.avatar) avatarUrl = userData.avatar;
        else if (userData.profile_picture) avatarUrl = userData.profile_picture;
        else if (userData.profilePicture) avatarUrl = userData.profilePicture;
        
        if (avatarUrl) {
          const fullUrl = avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE}${avatarUrl}`;
          setRecipientAvatar(fullUrl);
          console.log('✅ Avatar set from fetchUserDetails:', fullUrl);
        }
        return userData.fullName || userData.name;
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch user details:', err);
      return null;
    }
  }, [user]);

  const updateRecipientNameIfNeeded = useCallback((newName) => {
    if (!newName) return;
    const currentName = recipientName;
    const isCurrentDefault = DEFAULT_NAMES.includes(currentName) || !currentName;
    if (isCurrentDefault || currentName !== newName) {
      setRecipientName(newName);
      console.log(`👤 Updated recipient name to: ${newName}`);
      hasUpdatedNameRef.current = true;
      try {
        const params = JSON.parse(localStorage.getItem('directChatParams') || '{}');
        params.recipientName = newName;
        localStorage.setItem('directChatParams', JSON.stringify(params));
      } catch (e) {}
    }
  }, [recipientName]);

  const markTicketAsRead = useCallback(async () => {
    if (!ticketId || isTicketDeleted(ticketId)) return;
    try {
      const token = getToken();
      await fetch(`${API_BASE}/api/support/tickets/${ticketId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    } catch (err) {}
  }, [ticketId]);

  const loadMessages = useCallback(async (tId) => {
    if (!tId || isTicketDeleted(tId)) return;
    setLoadingMessages(true);
    try {
      const data = await authFetch(`/api/support/tickets/${tId}/messages`);
      if (data.success && Array.isArray(data.messages)) {
        const loadedMessages = data.messages.map((m) => ({
          id: m.id,
          message: m.message,
          type: m.type || 'text',
          image_url: m.image_url || null,
          audio_url: m.audio_url || null,
          is_from_user: m.is_from_user,
          created_at: m.created_at,
          sender_name: m.sender_name,
          sender_id: m.sender_id,
          read: m.read || false,
          status: 'sent',
        }));
        setMessages(loadedMessages);
        const ids = new Set(loadedMessages.map(m => m.id));
        messageIdsRef.current = ids;

        const otherMessages = loadedMessages.filter(m => !m.is_from_user && m.sender_name);
        if (otherMessages.length > 0) {
          const name = otherMessages[0].sender_name;
          // التأكد من أن الاسم ليس هو اسم المستخدم الحالي
          const currentUserName = user?.fullName || user?.name;
          if (currentUserName && name !== currentUserName) {
            updateRecipientNameIfNeeded(name);
          }
        }
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error('loadMessages error:', e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [updateRecipientNameIfNeeded, user]);

  const notifyViaSocket = useCallback((message, messageId, type = 'text', fileUrl = null) => {
    if (socketRef.current?.connected && ticketId && !isTicketDeleted(ticketId)) {
      const notificationData = {
        ticketId: ticketId,
        message: message || '',
        type: type,
        imageUrl: type === 'image' ? fileUrl : null,
        audioUrl: type === 'audio' ? fileUrl : null,
        senderId: user?.id,
        senderName: user?.fullName || user?.name,
        senderRole: isGuide ? 'guide' : 'tourist',
        recipientId: recipientId,
        createdAt: new Date().toISOString(),
        messageId: messageId
      };
      socketRef.current.emit('new_message', notificationData);
      socketRef.current.emit('update_last_message', {
        ticketId: ticketId,
        lastMessage: type === 'image' ? '📷 صورة' : type === 'audio' ? '🎵 مقطع صوتي' : message,
        lastMessageTime: new Date().toISOString()
      });
      return true;
    }
    return false;
  }, [ticketId, user?.id, user?.fullName, user?.name, isGuide, recipientId]);

  const deleteCurrentConversation = async () => {
    if (!ticketId) return toast.error(lang === 'ar' ? 'لا توجد محادثة' : 'No conversation');
    if (deleting) return;
    if (!window.confirm(lang === 'ar' ? 'حذف المحادثة؟' : 'Delete conversation?')) return;
    setDeleting(true);
    try {
      const token = getToken();
      await fetch(`${API_BASE}/api/support/tickets/${ticketId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      addDeletedTicket(ticketId);
      socketRef.current?.emit('leave_ticket_room', { ticketId: String(ticketId) });
      localStorage.removeItem('directChatParams');
      window.dispatchEvent(new CustomEvent('refreshDirectChats'));
      toast.success(lang === 'ar' ? 'تم الحذف' : 'Deleted');
      setPage('notifications');
    } catch (error) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Delete failed');
    } finally { setDeleting(false); }
  };

  const findExistingTicket = useCallback(async (userId1, userId2) => {
    try {
      const token = getToken();
      const ticketsData = await authFetch(`/api/support/tickets?status=open`);
      if (ticketsData.success && Array.isArray(ticketsData.tickets)) {
        const existingTicket = ticketsData.tickets.find((t) => {
          if (t.type !== 'guide_chat') return false;
          if (isTicketDeleted(t.id)) return false;
          const participants = t.metadata?.participants || [];
          const hasUser1 = participants.some(p => String(p) === String(userId1));
          const hasUser2 = participants.some(p => String(p) === String(userId2));
          return hasUser1 && hasUser2;
        });
        return existingTicket || null;
      }
    } catch (err) {
      console.warn('Error finding existing ticket:', err);
    }
    return null;
  }, []);

  // ✅ التهيئة الرئيسية مع جلب بيانات المستخدم الآخر
  useEffect(() => {
    if (!user || isInitializedRef.current) return;

    const init = async () => {
      setLoading(true);
      try {
        const paramsStr = localStorage.getItem('directChatParams');
        if (!paramsStr) {
          setPage('notifications');
          return;
        }
        const params = JSON.parse(paramsStr);
        if (!params.recipientId) throw new Error('No recipientId');
        if (String(params.recipientId) === String(user.id)) {
          toast.error(lang === 'ar' ? 'لا يمكن فتح محادثة مع نفسك' : 'Cannot chat with yourself');
          setPage('notifications');
          return;
        }
        setRecipientId(params.recipientId);
        setRecipientNumericId(getNumericIdIfPossible(params.recipientId));
        
        // ✅ جلب بيانات المستخدم الآخر (الاسم والصورة)
        await fetchRecipientDetails(params.recipientId);
        
        // إذا كان هناك اسم في params، استخدمه كاحتياطي (مع التأكد من أنه ليس اسم المستخدم الحالي)
        if (params.recipientName && !DEFAULT_NAMES.includes(params.recipientName)) {
          const currentUserName = user?.fullName || user?.name;
          if (currentUserName && params.recipientName !== currentUserName) {
            setRecipientName(params.recipientName);
            hasUpdatedNameRef.current = true;
          } else if (!currentUserName) {
            setRecipientName(params.recipientName);
            hasUpdatedNameRef.current = true;
          }
        } else {
          setRecipientName(params.recipientName || (lang === 'ar' ? 'المرشد' : 'Guide'));
        }

        let ticketIdToUse = params.ticketId;
        if (ticketIdToUse && isTicketDeleted(ticketIdToUse)) {
          toast.error(lang === 'ar' ? 'المحادثة محذوفة' : 'Deleted conversation');
          setPage('notifications');
          return;
        }

        if (!ticketIdToUse) {
          const existingTicket = await findExistingTicket(user.id, params.recipientId);
          if (existingTicket) {
            ticketIdToUse = existingTicket.id;
            const metadata = existingTicket.metadata || {};
            let otherName = '';
            if (isGuide) otherName = metadata.touristName || params.recipientName;
            else otherName = metadata.guideName || params.recipientName;
            if (otherName && !DEFAULT_NAMES.includes(otherName)) {
              const currentUserName = user?.fullName || user?.name;
              if (currentUserName && otherName !== currentUserName) {
                updateRecipientNameIfNeeded(otherName);
              } else if (!currentUserName) {
                updateRecipientNameIfNeeded(otherName);
              }
            }
          } else {
            const subject = isGuide
              ? `${lang === 'ar' ? 'محادثة مع السائح' : 'Chat with tourist'}: ${recipientName}`
              : `${lang === 'ar' ? 'محادثة مع المرشد' : 'Chat with guide'}: ${recipientName}`;
            const createPayload = {
              user_id: user.id,
              subject: subject,
              type: 'guide_chat',
              priority: 'high',
              metadata: {
                guideId: isGuide ? user.id : params.recipientId,
                touristId: isGuide ? params.recipientId : user.id,
                guideName: isGuide ? user.fullName || user.name : recipientName,
                touristName: isGuide ? recipientName : user.fullName || user.name,
                created_by: user.id,
                created_by_name: user.fullName || user.name,
                participants: [user.id, params.recipientId],
                status: 'waiting_for_response'
              },
            };
            const createData = await authFetch('/api/support/tickets', {
              method: 'POST',
              body: JSON.stringify(createPayload),
            });
            if (createData.success && createData.ticket) {
              ticketIdToUse = createData.ticket.id;
            } else {
              throw new Error(createData.message || 'Failed to create ticket');
            }
          }
          params.ticketId = ticketIdToUse;
          localStorage.setItem('directChatParams', JSON.stringify(params));
        }

        setTicketId(ticketIdToUse);
        await loadMessages(ticketIdToUse);
        await markTicketAsRead();

        if (socketRef.current?.connected) {
          socketRef.current.emit('join_ticket_room', { ticketId: String(ticketIdToUse) });
        }

        isInitializedRef.current = true;
      } catch (err) {
        console.error('Init error:', err);
        setErrorMessage(err.message);
        setInitError(true);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user, lang, findExistingTicket, loadMessages, markTicketAsRead, setPage, isGuide, recipientName, updateRecipientNameIfNeeded, fetchRecipientDetails]);

  // ✅ جلب اسم المستخدم من API إذا كان افتراضياً (مع الصورة)
  useEffect(() => {
    if (!recipientId || hasUpdatedNameRef.current) return;
    const currentName = recipientName;
    if (DEFAULT_NAMES.includes(currentName) || !currentName) {
      fetchUserDetails(recipientId).then(name => {
        if (name) {
          const currentUserName = user?.fullName || user?.name;
          if (currentUserName && name !== currentUserName) {
            updateRecipientNameIfNeeded(name);
          } else if (!currentUserName) {
            updateRecipientNameIfNeeded(name);
          }
        }
      });
    }
  }, [recipientId, recipientName, fetchUserDetails, updateRecipientNameIfNeeded, user]);

  // ✅ الاستماع لتحديث الملف الشخصي للمستخدم الآخر (الصورة والاسم)
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const { userId, updatedData } = e.detail;
      if (userId === recipientId) {
        console.log('📢 [DirectChat] Profile updated for recipient:', userId, updatedData);
        if (updatedData.fullName || updatedData.name) {
          const currentUserName = user?.fullName || user?.name;
          const newName = updatedData.fullName || updatedData.name;
          if (currentUserName && newName !== currentUserName) {
            updateRecipientNameIfNeeded(newName);
          } else if (!currentUserName) {
            updateRecipientNameIfNeeded(newName);
          }
        }
        if (updatedData.avatar_url) {
          const avatarUrl = updatedData.avatar_url.startsWith('http') 
            ? updatedData.avatar_url 
            : `${API_BASE}${updatedData.avatar_url}`;
          setRecipientAvatar(avatarUrl);
          console.log('✅ Recipient avatar updated from event:', avatarUrl);
        } else if (updatedData.avatar_url === null) {
          setRecipientAvatar(null);
        }
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [recipientId, updateRecipientNameIfNeeded, user]);

  // WebSocket
  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      socket.emit('register', user.id);
      if (ticketId) {
        socket.emit('join_ticket_room', { ticketId: String(ticketId) });
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ WebSocket connection error:', err);
    });

    socket.on('disconnect', () => {
      console.warn('⚠️ WebSocket disconnected');
    });

    socket.on('new_message', (data) => {
      if (data.ticketId === ticketId) {
        if (data.senderId !== user?.id && data.senderName) {
          const currentUserName = user?.fullName || user?.name;
          if (currentUserName && data.senderName !== currentUserName) {
            updateRecipientNameIfNeeded(data.senderName);
          } else if (!currentUserName) {
            updateRecipientNameIfNeeded(data.senderName);
          }
        }
        const msgId = data.messageId || data.id || `${data.senderId}-${data.createdAt}`;
        if (!messageIdsRef.current.has(msgId)) {
          messageIdsRef.current.add(msgId);
          setMessages(prev => {
            const exists = prev.some(m => m.id === msgId);
            if (exists) return prev;
            const newMsg = {
              id: msgId,
              message: data.message || '',
              type: data.type || 'text',
              image_url: data.imageUrl || null,
              audio_url: data.audioUrl || null,
              is_from_user: data.senderId === user?.id,
              created_at: data.createdAt || new Date().toISOString(),
              sender_name: data.senderName,
              sender_id: data.senderId,
              read: false,
              status: 'sent',
            };
            return [...prev, newMsg];
          });
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, ticketId, updateRecipientNameIfNeeded]);

  // Polling احتياطي
  useEffect(() => {
    if (!ticketId || isTicketDeleted(ticketId)) return;

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          const existingIds = messageIdsRef.current;
          const newMsgs = data.messages.filter(m => !existingIds.has(m.id));
          if (newMsgs.length > 0) {
            console.log(`📥 Polling fetched ${newMsgs.length} new messages`);
            newMsgs.forEach(m => {
              if (m.sender_id !== user?.id && m.sender_name) {
                const currentUserName = user?.fullName || user?.name;
                if (currentUserName && m.sender_name !== currentUserName) {
                  updateRecipientNameIfNeeded(m.sender_name);
                } else if (!currentUserName) {
                  updateRecipientNameIfNeeded(m.sender_name);
                }
              }
            });
            setMessages(prev => {
              const updated = [...prev];
              newMsgs.forEach(m => {
                const msg = {
                  ...m,
                  type: m.type || 'text',
                  image_url: m.image_url || null,
                  audio_url: m.audio_url || null,
                  is_from_user: m.user_id === user?.id,
                  status: 'sent',
                };
                if (!updated.some(ex => ex.id === msg.id)) {
                  updated.push(msg);
                  messageIdsRef.current.add(msg.id);
                }
              });
              return updated;
            });
          }
        }
      } catch (err) {
        // silent fail
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [ticketId, user?.id, updateRecipientNameIfNeeded]);

  // دوال التسجيل الصوتي بالضغط المطول
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        if (audioBlob.size > 0) {
          sendAudioMessage(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      toast.success(lang === 'ar' ? '⏺ جاري التسجيل...' : '⏺ Recording...');
    } catch (err) {
      console.error('Failed to start recording:', err);
      if (err.name === 'NotFoundError' || err.name === 'NotAllowedError') {
        toast.error(lang === 'ar' ? 'لا يمكن الوصول إلى الميكروفون. تأكد من منح الإذن.' : 'Cannot access microphone. Please grant permission.');
      } else {
        toast.error(lang === 'ar' ? 'فشل بدء التسجيل' : 'Failed to start recording');
      }
    }
  }, [lang, isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      toast.success(lang === 'ar' ? '⏹ تم إرسال المقطع' : '⏹ Audio sent');
    }
  }, [isRecording, lang]);

  // رفع وإرسال المقطع الصوتي
  const sendAudioMessage = useCallback(async (blob) => {
    if (!ticketId || isTicketDeleted(ticketId)) {
      toast.error(lang === 'ar' ? 'لا توجد محادثة نشطة' : 'No active conversation');
      return;
    }
    setUploadingAudio(true);
    try {
      const audioFile = new File([blob], 'recording.webm', { type: 'audio/webm' });
      const token = getToken();
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('ticketId', ticketId);

      const uploadRes = await fetch(`${API_BASE}/api/upload/chat-audio`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) {
        if (uploadRes.status === 404) {
          throw new Error('Audio upload endpoint not found. Please contact support.');
        }
        throw new Error(`Upload failed (${uploadRes.status})`);
      }
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.audioUrl || uploadData.url;
      if (!fileUrl) throw new Error('No audio URL returned');

      const payload = {
        message: '🎵 مقطع صوتي',
        type: 'audio',
        audio_url: fileUrl,
      };
      const response = await authFetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const serverMessage = response.message;
      const serverId = serverMessage?.id || response.id || Date.now();

      const newMsg = {
        id: serverId,
        message: '🎵 مقطع صوتي',
        type: 'audio',
        audio_url: fileUrl,
        is_from_user: true,
        created_at: new Date().toISOString(),
        sender_name: user?.fullName || user?.name,
        sender_id: user?.id,
        read: false,
        status: 'sent',
      };
      setMessages(prev => [...prev, newMsg]);
      messageIdsRef.current.add(serverId);

      notifyViaSocket('🎵 مقطع صوتي', serverId, 'audio', fileUrl);

      window.dispatchEvent(new CustomEvent('refreshDirectChats', {
        detail: { ticketId, lastMessage: '🎵 مقطع صوتي', updatedAt: new Date().toISOString() }
      }));

      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err) {
      console.error('Audio send error:', err);
      toast.error(err.message || (lang === 'ar' ? 'فشل إرسال المقطع الصوتي' : 'Audio send failed'));
    } finally {
      setUploadingAudio(false);
    }
  }, [ticketId, lang, user, notifyViaSocket]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    if (isHolding) return;
    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      startRecording();
    }, 300);
  }, [isHolding, startRecording]);

  const handleMouseUp = useCallback((e) => {
    e.preventDefault();
    setIsHolding(false);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    if (isHolding) return;
    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      startRecording();
    }, 300);
  }, [isHolding, startRecording]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    setIsHolding(false);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const uploadImage = async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('image', file);
    formData.append('ticketId', ticketId);
    const uploadRes = await fetch(`${API_BASE}/api/upload/chat-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!uploadRes.ok) throw new Error('Upload failed');
    const uploadData = await uploadRes.json();
    const imageUrl = uploadData.imageUrl || uploadData.url;
    if (!imageUrl) throw new Error('No image URL returned');
    return imageUrl;
  };

  const sendMessage = async () => {
    if (sending || uploadingImage || uploadingAudio) return;
    if (!newMessage.trim() && !selectedImage) return;
    if (!ticketId || isTicketDeleted(ticketId)) return;

    let fileUrl = null;
    let type = 'text';
    let tempId = `temp_${Date.now()}`;
    let messageText = newMessage.trim();

    if (selectedImage) {
      setUploadingImage(true);
      try {
        fileUrl = await uploadImage(selectedImage);
        type = 'image';
        messageText = '📷 صورة';
        const msg = {
          id: tempId,
          message: messageText,
          type: 'image',
          image_url: imagePreview,
          is_from_user: true,
          created_at: new Date().toISOString(),
          sender_name: user?.fullName || user?.name,
          sender_id: user?.id,
          status: 'sending',
          read: false,
        };
        setMessages(prev => [...prev, msg]);
        setSelectedImage(null);
        setImagePreview(null);
        scrollToBottom();
      } catch (error) {
        console.error('Image upload error:', error);
        toast.error(lang === 'ar' ? 'فشل رفع الصورة' : 'Image upload failed');
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
    } else {
      const msg = {
        id: tempId,
        message: messageText,
        type: 'text',
        image_url: null,
        audio_url: null,
        is_from_user: true,
        created_at: new Date().toISOString(),
        sender_name: user?.fullName || user?.name,
        sender_id: user?.id,
        status: 'sending',
        read: false,
      };
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    }

    setSending(true);
    setNewMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const payload = {
        message: messageText,
        type: type,
        image_url: type === 'image' ? fileUrl : null,
        audio_url: null,
      };

      const response = await authFetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const serverMessage = response.message;
      const serverId = serverMessage?.id || response.id || Date.now();

      setMessages(prev => prev.map(m => {
        if (m.id === tempId) {
          messageIdsRef.current.add(serverId);
          return {
            ...m,
            id: serverId,
            status: 'sent',
            image_url: type === 'image' ? fileUrl : m.image_url,
          };
        }
        return m;
      }));

      const displayMsg = type === 'image' ? '📷 صورة' : messageText;
      notifyViaSocket(displayMsg, serverId, type, fileUrl);

      window.dispatchEvent(new CustomEvent('refreshDirectChats', {
        detail: { ticketId, lastMessage: displayMsg, updatedAt: new Date().toISOString() }
      }));

    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Send failed');
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(lang === 'ar' ? 'الرجاء اختيار صورة فقط' : 'Please select an image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === 'ar' ? 'حجم الصورة كبير جداً (حد أقصى 5MB)' : 'Image too large (max 5MB)');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const cancelImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const openImagePreview = (url) => {
    const fullUrl = getFullImageUrl(url);
    setPreviewImageUrl(fullUrl);
    setShowImagePreview(true);
  };

  const togglePlayAudio = (msgId, audioUrl) => {
    const fullUrl = getFullImageUrl(audioUrl);
    if (playingAudioId === msgId) {
      const audioEl = document.getElementById(`audio-${msgId}`);
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }
      setPlayingAudioId(null);
    } else {
      if (playingAudioId) {
        const prevAudio = document.getElementById(`audio-${playingAudioId}`);
        if (prevAudio) {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
      }
      setPlayingAudioId(msgId);
      const audioEl = document.getElementById(`audio-${msgId}`);
      if (audioEl) {
        audioEl.play().catch(err => console.warn('Play failed:', err));
        audioEl.onended = () => setPlayingAudioId(null);
      }
    }
  };

  const insertEmoji = useCallback((emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = newMessage;
    const newText = currentText.substring(0, start) + emoji + currentText.substring(end);
    setNewMessage(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    }, 0);
    setShowEmojiPicker(false);
  }, [newMessage]);

  const handleTextareaChange = (e) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const mins = Math.floor((Date.now() - date) / 60000);
    if (mins < 1) return lang === 'ar' ? 'الآن' : 'Now';
    if (mins < 60) return lang === 'ar' ? `${mins} د` : `${mins}m`;
    return date.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  if (!user) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-green-600" size={32} /></div>;

  if (initError) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      <div className="text-center p-6 bg-white rounded-2xl shadow-xl max-w-sm w-full">
        <MessageCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">{lang === 'ar' ? 'فشل فتح المحادثة' : 'Failed to open chat'}</h3>
        <p className="text-gray-600 mb-6 text-sm">{errorMessage}</p>
        <button onClick={() => setPage('notifications')} className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
          {lang === 'ar' ? 'العودة إلى الإشعارات' : 'Back to Notifications'}
        </button>
      </div>
    </div>
  );

  const isInputDisabled = loading || sending || loadingMessages || initError || uploadingImage || uploadingAudio;
  const showLoading = loading || (loadingMessages && messages.length === 0);
  const canSend = (newMessage.trim() || selectedImage) && !isInputDisabled;

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* شريط علوي ثابت مع صورة واسم المستخدم الآخر */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 shadow-lg flex items-center gap-3 flex-shrink-0">
        <button onClick={() => setPage('notifications')} className="p-2 hover:bg-white/20 rounded-full transition">
          <ArrowLeft size={22} />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {recipientAvatar ? (
            <img 
              src={recipientAvatar} 
              alt={recipientName} 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.warn('⚠️ Avatar image failed to load:', recipientAvatar);
                e.target.style.display = 'none';
                e.target.parentElement.textContent = recipientName?.charAt(0) || '?';
                e.target.parentElement.className = 'w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0 text-white text-lg font-bold';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
              {recipientName?.charAt(0) || '?'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold truncate text-lg">{recipientName || (lang === 'ar' ? 'المستخدم' : 'User')}</h2>
          <div className="flex items-center gap-2 text-xs">
            {guideOnline ? (
              <span className="text-green-200 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                {lang === 'ar' ? 'متصل الآن' : 'Online'}
              </span>
            ) : (
              <span className="text-white/70 flex items-center gap-1">
                <Bell size={10} />
                {lang === 'ar' ? 'انتظار الاتصال' : 'Waiting for connection'}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {ticketId && !isTicketDeleted(ticketId) && (
            <button onClick={deleteCurrentConversation} disabled={deleting} className="p-2 hover:bg-white/20 rounded-full transition disabled:opacity-50">
              {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
          )}
          <button onClick={() => ticketId && !isTicketDeleted(ticketId) && loadMessages(ticketId)} className="p-2 hover:bg-white/20 rounded-full transition">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* حاوية الرسائل */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {showLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <Loader2 className="animate-spin text-green-600" size={36} />
            <p className="text-sm">{lang === 'ar' ? 'جاري تحميل المحادثة...' : 'Loading...'}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <MessageCircle size={56} className="opacity-40" />
            <p className="font-medium">{lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
            <p className="text-sm text-center opacity-70 max-w-xs">
              {lang === 'ar' ? 'اكتب رسالتك أدناه لبدء المحادثة' : 'Write below to start'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const key = msg.id || `${msg.sender_id}-${msg.created_at}`;
            const isOwn = msg.is_from_user !== undefined ? msg.is_from_user : msg.user_id === user?.id;
            const alignClass = isOwn
              ? (isRTL ? 'justify-start' : 'justify-end')
              : (isRTL ? 'justify-end' : 'justify-start');

            const bgClass = isOwn
              ? 'bg-green-600 text-white rounded-br-sm'
              : (msg.sender_name === 'System'
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-bl-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-sm');

            const imageFullUrl = getFullImageUrl(msg.image_url);
            const audioFullUrl = getFullImageUrl(msg.audio_url);

            return (
              <div key={key} className={`flex ${alignClass} animate-fade-in`}>
                {/* ✅ عرض صورة الطرف الآخر في رسائله (وليس الأيقونة العامة) */}
                {!isOwn && msg.sender_name && msg.sender_name !== 'System' && (
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center ml-2 self-end flex-shrink-0 overflow-hidden">
                    {recipientAvatar ? (
                      <img 
                        src={recipientAvatar} 
                        alt={msg.sender_name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.textContent = msg.sender_name?.charAt(0) || '?';
                          e.target.parentElement.className = 'w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center self-end flex-shrink-0 text-green-700 text-sm font-bold';
                        }}
                      />
                    ) : (
                      <User size={16} className="text-green-700" />
                    )}
                  </div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${bgClass}`}>
                  {/* ✅ عرض اسم الطرف الآخر (recipientName) في رسائله بدلاً من sender_name */}
                  {!isOwn && recipientName && recipientName !== 'System' && (
                    <p className="text-xs font-semibold mb-1 text-green-600 dark:text-green-400">{recipientName}</p>
                  )}

                  {/* صورة */}
                  {msg.type === 'image' && imageFullUrl && (
                    <div className="relative">
                      <img
                        src={imageFullUrl}
                        alt="صورة"
                        className="max-w-full max-h-[300px] rounded-lg cursor-pointer hover:opacity-90 transition"
                        onClick={() => openImagePreview(msg.image_url)}
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="55" font-size="14" fill="%23999" text-anchor="middle"%3E❌%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">📷</div>
                    </div>
                  )}

                  {/* صوت */}
                  {msg.type === 'audio' && audioFullUrl && (
                    <div className="flex items-center gap-3 py-1">
                      <button
                        onClick={() => togglePlayAudio(msg.id, msg.audio_url)}
                        className="p-2 rounded-full bg-green-500/20 hover:bg-green-500/30 transition"
                      >
                        {playingAudioId === msg.id ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      <audio id={`audio-${msg.id}`} src={audioFullUrl} className="hidden" />
                      <div className="flex-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: playingAudioId === msg.id ? '60%' : '0%' }}></div>
                      </div>
                      <span className="text-xs opacity-70">🎵</span>
                    </div>
                  )}

                  {/* نص */}
                  {msg.type === 'text' && (
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                  )}
                  {msg.type === 'image' && msg.message && msg.message !== '📷 صورة' && (
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap mt-1">{msg.message}</p>
                  )}
                  {msg.type === 'audio' && msg.message && msg.message !== '🎵 مقطع صوتي' && (
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap mt-1">{msg.message}</p>
                  )}

                  <div className={`flex items-center gap-1 mt-1 justify-end text-xs ${isOwn ? 'text-green-100' : 'text-gray-400'}`}>
                    <span>{formatTime(msg.created_at)}</span>
                    {isOwn && msg.status === 'sending' && <Loader2 size={10} className="animate-spin" />}
                    {isOwn && msg.status === 'sent' && <CheckCircle2 size={10} className="text-green-300" />}
                    {isOwn && msg.read && <CheckCheck size={10} className="text-blue-300" />}
                    {!isOwn && msg.read === false && <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* منطقة الإدخال */}
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-4 pt-3 pb-8 flex-shrink-0 shadow-lg relative">
        {/* معاينة الصورة */}
        {imagePreview && (
          <div className="relative inline-block mb-2 mx-2">
            <img src={imagePreview} alt="معاينة" className="h-20 w-20 object-cover rounded-lg border-2 border-green-500" />
            <button onClick={cancelImageSelection} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition">
              <X size={14} />
            </button>
          </div>
        )}

        {/* معاينة الصوت (عند التسجيل) */}
        {isRecording && (
          <div className="relative inline-block mb-2 mx-2 bg-red-100 dark:bg-red-900/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {recordingDuration}s
            </span>
            <span className="text-xs text-red-500">{lang === 'ar' ? 'جاري التسجيل...' : 'Recording...'}</span>
          </div>
        )}

        {/* أزرار الإدخال */}
        <div className="flex items-center gap-4 mb-2 px-2 relative">
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors relative">
            <Smile size={24} />
          </button>
          {showEmojiPicker && (
            <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmojiPicker(false)} position="bottom-left" />
          )}

          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" disabled={uploadingImage}>
            <Image size={24} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" disabled={uploadingImage} />

          <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`p-1.5 rounded-full transition-colors ${
              isRecording 
                ? 'text-red-500 bg-red-100 dark:bg-red-900/30' 
                : 'text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
            disabled={uploadingAudio || isInputDisabled}
          >
            {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <button className="p-1.5 text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors">
            <Paperclip size={24} />
          </button>
        </div>

        {/* حقل النص وزر الإرسال */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            placeholder={isRecording ? (lang === 'ar' ? 'جاري التسجيل...' : 'Recording...') : (lang === 'ar' ? 'اكتب رسالتك...' : 'Write your message...')}
            rows={1}
            className="flex-1 px-4 py-3 border dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-base leading-relaxed min-h-[52px] max-h-[120px] overflow-y-auto"
            disabled={isInputDisabled || isRecording}
            style={{ height: '52px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!canSend || isRecording}
            className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition disabled:opacity-40 flex-shrink-0 shadow-md min-w-[52px] min-h-[52px] flex items-center justify-center"
          >
            {sending || uploadingImage || uploadingAudio ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
          </button>
        </div>

        <div className="flex justify-between items-center mt-2 px-2">
          <p className="text-[11px] text-gray-400">
            {lang === 'ar' ? '↵ للإرسال • Shift + ↵ لسطر جديد' : '↵ to send • Shift + ↵ for new line'}
          </p>
          <p className="text-[11px] text-green-500 flex items-center gap-1">
            <Bell size={10} />
            {guideOnline
              ? (lang === 'ar' ? 'الطرف الآخر متصل - إشعار فوري' : 'Other party online - instant delivery')
              : (lang === 'ar' ? 'سيصل إشعار عند اتصال الطرف الآخر' : 'Notification when other party connects')}
          </p>
        </div>
      </div>

      {/* عرض الصورة بتكبير */}
      {showImagePreview && previewImageUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowImagePreview(false)}>
          <div className="relative max-w-4xl max-h-full">
            <img src={previewImageUrl} alt="تكبير" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button onClick={() => setShowImagePreview(false)} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition">
              <X size={24} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); window.open(previewImageUrl, '_blank'); }} className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition">
              <Eye size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectChatPage;

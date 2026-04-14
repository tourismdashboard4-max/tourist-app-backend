// client/src/pages/DirectChatPage.jsx - النسخة النهائية (ترسل UUID مباشرة)
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ArrowLeft, User, MessageCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const DirectChatPage = ({ setPage, lang = 'ar' }) => {
  const [user, setUser] = useState(null);
  const [recipientName, setRecipientName] = useState('المرشد');
  const [recipientId, setRecipientId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [initError, setInitError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasInitialized = useRef(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => { scrollToBottom(); }, [messages]);
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('🔍 DirectChatPage: starting initialization');
    const savedUser = localStorage.getItem('touristAppUser');
    if (!savedUser) {
      toast.error('الرجاء تسجيل الدخول');
      setPage('profile');
      return;
    }
    try {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      console.log('✅ User loaded:', parsedUser.fullName);
    } catch(e) {
      console.error(e);
      setPage('profile');
      return;
    }

    const paramsStr = localStorage.getItem('directChatParams');
    console.log('📦 directChatParams:', paramsStr);
    if (!paramsStr) {
      toast.error('لا توجد معلومات للمحادثة');
      setPage('guides');
      return;
    }
    try {
      const params = JSON.parse(paramsStr);
      if (params.recipientId) {
        setRecipientId(params.recipientId);
        setRecipientName(params.recipientName || 'المرشد');
        console.log('✅ Chat params set:', { recipientId: params.recipientId, recipientName: params.recipientName });
      } else {
        throw new Error('No recipientId');
      }
    } catch(e) {
      console.error(e);
      toast.error('بيانات المحادثة غير صالحة');
      setPage('guides');
    }
  }, [setPage]);

  const getRecipientId = () => {
    // إذا كان recipientId رقماً أو UUID، نستخدمه كما هو
    if (!recipientId) return null;
    // إذا كان recipientId هو نفس UUID المستخدم الحالي، نستخدمه
    if (user && recipientId === user.id) return user.id;
    // إذا كان UUID معروفاً في guidesMap، نستخدم UUID نفسه (لأن الخادم قد يقبل UUID بعد تعديل api.js)
    return recipientId;
  };

  useEffect(() => {
    const initChat = async () => {
      if (!user || !recipientId) return;
      setLoading(true);
      setInitError(false);
      setErrorMessage('');
      try {
        const actualUserId = getRecipientId();
        if (!actualUserId) throw new Error('معرف المستخدم غير صالح');
        console.log('🔄 Using user ID:', actualUserId);

        console.log('🔄 Creating conversation...');
        const convResponse = await api.createConversation(actualUserId, 'direct');
        if (!convResponse.success || !convResponse.conversation) {
          throw new Error('لا يمكن إنشاء محادثة مع هذا المستخدم (قد لا يكون مرشداً)');
        }
        const convId = convResponse.conversation.id;
        setConversationId(convId);
        console.log('✅ Conversation created, ID:', convId);

        await loadMessages(convId);
        localStorage.removeItem('directChatParams');

        if (recipientName === 'المرشد') {
          try {
            const token = localStorage.getItem('token');
            const userRes = await fetch(`https://tourist-app-api.onrender.com/api/users/${actualUserId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const userData = await userRes.json();
            if (userData.success && userData.user) {
              setRecipientName(userData.user.fullName || userData.user.name);
            }
          } catch(e) { console.warn(e); }
        }
        toast.success('تم فتح المحادثة بنجاح');
      } catch (err) {
        console.error('Init chat error:', err);
        setErrorMessage(err.message || 'حدث خطأ في فتح المحادثة');
        toast.error(errorMessage);
        setInitError(true);
      } finally {
        setLoading(false);
      }
    };
    if (user && recipientId) initChat();
  }, [user, recipientId]);

  const loadMessages = async (convId) => {
    try {
      const response = await api.getConversationMessages(convId, 1, 100);
      if (response.success && response.messages) {
        const formatted = response.messages.map(msg => ({
          id: msg.id,
          message: msg.content || msg.message,
          is_from_user: msg.sender_id === user?.id,
          created_at: msg.created_at,
          sender_name: msg.sender_name
        }));
        setMessages(formatted);
        console.log('✅ Loaded', formatted.length, 'messages');
      }
    } catch (err) {
      console.error('Load messages error:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !conversationId) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    const tempMsg = {
      id: Date.now(),
      message: text,
      is_from_user: true,
      created_at: new Date().toISOString(),
      sender_name: user?.fullName || user?.name,
      status: 'sending'
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();
    try {
      const response = await api.sendTextMessage(conversationId, text);
      if (response.success) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'sent' } : m));
      } else throw new Error('Send failed');
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      toast.error('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const minutes = Math.floor((new Date() - date) / 60000);
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `${minutes} دقيقة`;
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;
  if (initError) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="text-center p-6 bg-white rounded-xl shadow-md">
        <MessageCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">فشل فتح المحادثة</h3>
        <p className="text-gray-600 mb-4">{errorMessage || 'حدث خطأ غير متوقع'}</p>
        <button onClick={() => setPage('guides')} className="px-6 py-2 bg-green-600 text-white rounded-lg">العودة إلى المرشدين</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="bg-green-600 text-white p-4 shadow-md flex items-center gap-3">
        <button onClick={() => setPage('guides')} className="p-1 hover:bg-green-700 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
          <User size={20} />
        </div>
        <div>
          <h2 className="font-bold">{recipientName}</h2>
          <p className="text-xs text-green-200">متصل الآن</p>
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-green-600" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد رسائل بعد</p>
            <p className="text-sm">اكتب رسالتك لبدء المحادثة</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.is_from_user ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.is_from_user ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow'}`}>
                {!msg.is_from_user && msg.sender_name && (
                  <div className="text-xs font-bold mb-1 opacity-80">{msg.sender_name}</div>
                )}
                <p className="break-words">{msg.message}</p>
                <div className={`text-xs mt-1 ${msg.is_from_user ? 'text-green-200' : 'text-gray-500'}`}>
                  {formatTime(msg.created_at)}
                  {msg.status === 'sending' && ' ⏳'}
                  {msg.status === 'sent' && ' ✓'}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="اكتب رسالتك..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectChatPage;

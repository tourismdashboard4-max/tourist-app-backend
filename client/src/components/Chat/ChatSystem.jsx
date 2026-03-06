// client/src/components/Chat/ChatSystem.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import MessageInput from './MessageInput';
import { FaUser, FaArrowRight, FaHeadset, FaCheck, FaCheckDouble } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ChatSystem = ({ conversationId, otherUser, onClose, type = 'direct' }) => {
  const { user } = useAuth();
  const { socket, isConnected, emit, on, off } = useSocket();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);

  // تحديد إذا كانت المحادثة مع الدعم
  const isSupportChat = type === 'support' || otherUser?.email === 'y7g5mggnbr@privaterelay.appleid.com';
  
  // اسم الدعم
  const supportName = 'الدعم الفني';

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      loadConversationDetails();
      joinConversation();
    }

    return () => {
      if (conversationId) {
        leaveConversation();
      }
    };
  }, [conversationId]);

  useEffect(() => {
    if (socket && conversationId) {
      on('new-message', handleNewMessage);
      on('typing', handleTyping);
      on('message-read', handleMessageRead);

      return () => {
        off('new-message');
        off('typing');
        off('message-read');
      };
    }
  }, [socket, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversationDetails = async () => {
    try {
      const response = await api.get(`/chats/${conversationId}`);
      if (response.data.success) {
        setConversation(response.data.data);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chats/${conversationId}/messages`);
      if (response.data.success) {
        setMessages(response.data.data.messages || []);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
      toast.error('فشل تحميل الرسائل. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const joinConversation = () => {
    if (socket && conversationId) {
      emit('join-conversation', { conversationId });
    }
  };

  const leaveConversation = () => {
    if (socket && conversationId) {
      emit('leave-conversation', { conversationId });
    }
  };

  const handleNewMessage = (message) => {
    if (message.conversationId === conversationId) {
      setMessages(prev => [...prev, message]);
      if (message.senderId !== user?.id) {
        markMessageAsRead(message.id);
      }
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await api.put(`/chats/message/${messageId}/read`);
      if (socket) {
        emit('message-read', { conversationId, messageId, userId: user?.id });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleTyping = ({ userId, isTyping }) => {
    if (userId !== user?.id) {
      setTypingUsers(prev => ({ ...prev, [userId]: isTyping }));
    }
  };

  const handleMessageRead = ({ messageId, userId }) => {
    if (userId !== user?.id) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
    }
  };

  const sendMessage = async (content) => {
    if (!content.trim() || sending) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      conversationId,
      senderId: user?.id,
      text: content,
      createdAt: new Date().toISOString(),
      status: 'sending',
      senderName: user?.fullName || user?.name
    };

    setMessages(prev => [...prev, tempMessage]);
    setSending(true);

    try {
      const response = await api.post('/chats/message/text', {
        chatId: conversationId,
        content
      });

      if (response.data.success) {
        const sentMessage = response.data.data;
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? { ...sentMessage, status: 'sent' } : msg
        ));

        if (socket) {
          emit('send-message', { conversationId, ...sentMessage });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? { ...msg, status: 'error' } : msg
      ));
      toast.error('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const handleTypingStart = () => {
    if (socket && conversationId) {
      emit('typing', { conversationId, isTyping: true });
    }
  };

  const handleTypingStop = () => {
    if (socket && conversationId) {
      emit('typing', { conversationId, isTyping: false });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatusIcon = (status) => {
    switch(status) {
      case 'sending': return <span style={{ opacity: 0.5 }}>🕒</span>;
      case 'sent': return <FaCheck style={{ fontSize: '10px' }} />;
      case 'delivered': return <FaCheckDouble style={{ fontSize: '10px', opacity: 0.7 }} />;
      case 'read': return <FaCheckDouble style={{ fontSize: '10px', color: '#4CAF50' }} />;
      case 'error': return <span style={{ color: '#f44336' }}>⚠️</span>;
      default: return null;
    }
  };

  const isTyping = Object.values(typingUsers).some(v => v === true);
  
  const getOtherUserName = () => {
    if (isSupportChat) return supportName;
    if (otherUser?.name) return otherUser.name;
    return 'المستخدم';
  };

  const getConnectionStatus = () => {
    return isConnected ? 'متصل' : 'غير متصل';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f0f0f0',
            borderTopColor: '#4CAF50',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }} />
          <p style={{ color: '#666' }}>جاري تحميل المحادثة...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#f5f5f5'
    }}>
      {/* رأس المحادثة */}
      <div style={{
        padding: '15px 20px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
      }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666',
              padding: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%'
            }}
          >
            <FaArrowRight />
          </button>
        )}
        
        <div style={{
          width: '45px',
          height: '45px',
          borderRadius: '50%',
          backgroundColor: isSupportChat ? '#2196F3' : '#4CAF50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          {isSupportChat ? <FaHeadset size={22} /> : (otherUser?.name?.charAt(0) || 'م')}
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            {getOtherUserName()}
          </h3>
          <p style={{
            margin: '5px 0 0',
            fontSize: '12px',
            color: isConnected ? '#4CAF50' : '#f44336',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4CAF50' : '#f44336',
              display: 'inline-block'
            }} />
            {getConnectionStatus()}
            {isTyping && (
              <span style={{
                color: '#666',
                marginLeft: '10px',
                fontStyle: 'italic'
              }}>
                • يكتب...
              </span>
            )}
          </p>
        </div>
      </div>

      {/* منطقة الرسائل - بدون أي نصوص وهمية */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#999',
            marginTop: '50px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>
              💬
            </div>
            <p style={{ fontSize: '16px', fontWeight: 'bold' }}>
              لا توجد رسائل بعد
            </p>
            <p style={{ fontSize: '14px', color: '#aaa' }}>
              ابدأ المحادثة الآن بإرسال أول رسالة
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;
            
            return (
              <div
                key={msg.id || index}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: '10px'
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '10px 15px',
                    borderRadius: isMe
                      ? '15px 15px 5px 15px'
                      : '15px 15px 15px 5px',
                    backgroundColor: isMe ? '#4CAF50' : 'white',
                    color: isMe ? 'white' : '#333',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                  }}
                >
                  {!isMe && (
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginBottom: '5px',
                      color: isSupportChat ? '#2196F3' : '#4CAF50'
                    }}>
                      {msg.senderName || getOtherUserName()}
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '14px', 
                    lineHeight: '1.5',
                    wordBreak: 'break-word'
                  }}>
                    {msg.text}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '5px',
                    fontSize: '11px',
                    color: isMe ? 'rgba(255,255,255,0.7)' : '#999'
                  }}>
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMe && (
                      <span style={{ 
                        marginRight: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        {getMessageStatusIcon(msg.status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* مؤشر الاتصال */}
      {!isConnected && (
        <div style={{
          padding: '8px',
          backgroundColor: '#ffebee',
          color: '#f44336',
          textAlign: 'center',
          fontSize: '12px',
          borderTop: '1px solid #ffcdd2'
        }}>
          غير متصل بالخادم. قد تتأخر الرسائل.
        </div>
      )}

      {/* إدخال الرسالة */}
      <MessageInput
        onSendMessage={sendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={sending}
        placeholder={isSupportChat 
          ? 'اكتب سؤالك هنا...'
          : 'اكتب رسالتك هنا...'
        }
      />

      {/* أنيميشن للسبينر */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ChatSystem;
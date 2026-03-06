// client/src/components/Chat/SupportChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import './SupportChat.css';

const SupportChat = ({ onClose }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // بدء محادثة الدعم
  useEffect(() => {
    startChat();
  }, []);

  // الانضمام لغرفة المحادثة عبر WebSocket
  useEffect(() => {
    if (chat && socket) {
      socket.emit('join-chat', chat._id);

      socket.on('new-message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      return () => {
        socket.emit('leave-chat', chat._id);
        socket.off('new-message');
      };
    }
  }, [chat, socket]);

  // التمرير لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startChat = async () => {
    setLoading(true);
    try {
      const response = await api.post('/chats/support');
      if (response.data.success) {
        setChat(response.data.chat);
        loadMessages(response.data.chat._id);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await api.get(`/chats/${chatId}/messages`);
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat) return;

    try {
      const response = await api.post(`/chats/${chat._id}/messages`, {
        content: newMessage
      });

      if (response.data.success) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return <div className="chat-loading">جاري تحميل المحادثة...</div>;
  }

  return (
    <div className="support-chat">
      <div className="chat-header">
        <h3>الدعم الفني</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender._id === user._id ? 'my-message' : 'other-message'}`}
          >
            <div className="message-sender">
              {msg.sender._id !== user._id && 'الدعم: '}
            </div>
            <div className="message-content">{msg.content}</div>
            <div className="message-time">
              {new Date(msg.createdAt).toLocaleTimeString('ar-SA')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="اكتب رسالتك هنا..."
          rows="1"
        />
        <button onClick={sendMessage} className="send-btn">
          إرسال
        </button>
      </div>
    </div>
  );
};

export default SupportChat;
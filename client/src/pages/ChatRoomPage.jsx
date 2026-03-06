import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  FaArrowRight, 
  FaPaperclip, 
  FaSmile, 
  FaMicrophone, 
  FaPhone, 
  FaVideo,
  FaEllipsisV,
  FaCheck,
  FaCheckDouble,
  FaUser,
  FaImage,
  FaFile,
  FaTimes
} from 'react-icons/fa';
import { IoSend } from 'react-icons/io5';
import api from '../services/api';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from '../components/Chat/EmojiPicker';
import FileUpload from '../components/Chat/FileUpload';

const ChatRoomPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [attachment, setAttachment] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadChatData();
    setupSocket();
    markMessagesAsRead();

    return () => {
      socketService.off('new-message');
      socketService.off('typing');
      socketService.off('user-online');
      socketService.off('message-read');
      socketService.leaveRoom(`chat-${userId}`);
    };
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatData = async () => {
    try {
      // Load participant info
      const userResponse = await api.get(`/users/${userId}`);
      if (userResponse.data.success) {
        setParticipant(userResponse.data.data);
        setOnline(userResponse.data.data.online || false);
      }

      // Load messages
      const messagesResponse = await api.get(`/chats/${userId}/messages`);
      if (messagesResponse.data.success) {
        setMessages(messagesResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('فشل تحميل المحادثة');
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    socketService.connect();
    socketService.joinRoom(`chat-${userId}`);

    // New message
    socketService.on('new-message', (message) => {
      if (message.senderId === userId || message.senderId === user.id) {
        setMessages(prev => [...prev, message]);
        if (message.senderId === userId) {
          markMessageAsRead(message.id);
        }
      }
    });

    // Typing indicator
    socketService.on('typing', ({ userId: typingUserId, isTyping }) => {
      if (typingUserId === userId) {
        setIsTyping(isTyping);
      }
    });

    // Online status
    socketService.on('user-online', ({ userId: onlineUserId, online }) => {
      if (onlineUserId === userId) {
        setOnline(online);
      }
    });

    // Message read
    socketService.on('message-read', ({ messageId }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      );
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markMessagesAsRead = async () => {
    try {
      await api.put(`/chats/${userId}/read`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await api.put(`/chats/message/${messageId}/read`);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || sending) return;

    setSending(true);
    const tempId = Date.now().toString();
    
    const message = {
      id: tempId,
      content: attachment ? attachment.url : newMessage,
      type: attachment ? attachment.type : 'text',
      senderId: user.id,
      receiverId: userId,
      timestamp: new Date().toISOString(),
      status: 'sending',
      attachment: attachment ? {
        name: attachment.name,
        size: attachment.size,
        type: attachment.type
      } : null
    };

    // Add temp message
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setAttachment(null);
    
    // Stop typing
    socketService.typing(`chat-${userId}`, false);

    try {
      // Send via socket
      socketService.sendMessage(`chat-${userId}`, message);
      
      // Save to database
      const response = await api.post('/chats/message', {
        receiverId: userId,
        content: message.content,
        type: message.type,
        attachment: message.attachment
      });

      // Update message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, id: response.data.id, status: 'sent' } : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'error' } : msg
        )
      );
      toast.error('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    // Send typing status
    socketService.typing(`chat-${userId}`, e.target.value.length > 0);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socketService.typing(`chat-${userId}`, false);
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileSelect = (file) => {
    setAttachment({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type.startsWith('image/') ? 'image' : 'file'
    });
    setShowFileUpload(false);
  };

  const handleRemoveAttachment = () => {
    if (attachment?.url) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachment(null);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return date.toLocaleDateString('ar-SA');
    }
  };

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();

  return (
    <div className="h-screen flex flex-col bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FaArrowRight className="text-gray-600" />
          </button>

          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
              {participant?.avatar ? (
                <img 
                  src={participant.avatar} 
                  alt={participant.name}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                participant?.name?.charAt(0)
              )}
            </div>
            {online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            )}
          </div>

          <div>
            <h2 className="font-bold text-gray-800">{participant?.name}</h2>
            <p className="text-xs text-gray-500">
              {online ? 'متصل الآن' : 'غير متصل'}
              {participant?.type === 'guide' && ' · مرشد سياحي'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
            <FaPhone className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
            <FaVideo className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
            <FaEllipsisV className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Divider */}
            <div className="flex justify-center mb-4">
              <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                {date}
              </span>
            </div>

            {/* Messages */}
            {dateMessages.map((message, index) => {
              const isMe = message.senderId === user.id;
              
              return (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex mb-4 ${isMe ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                    <div className={`flex items-end gap-2 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                      {/* Avatar */}
                      {!isMe && (
                        <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {participant?.name?.charAt(0)}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-3 ${
                          isMe 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-green-600 text-white'
                        }`}
                      >
                        {/* Attachment */}
                        {message.attachment && (
                          <div className="mb-2">
                            {message.type === 'image' ? (
                              <img 
                                src={message.content} 
                                alt="attachment"
                                className="max-w-full rounded-lg max-h-60 cursor-pointer"
                                onClick={() => window.open(message.content, '_blank')}
                              />
                            ) : (
                              <div className="bg-white/20 rounded-lg p-2 flex items-center gap-2">
                                <FaFile />
                                <span className="text-sm">{message.attachment.name}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message Content */}
                        {message.type === 'text' && (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        )}

                        {/* Time and Status */}
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          isMe ? 'text-gray-500' : 'text-green-100'
                        }`}>
                          <span>{formatTime(message.timestamp)}</span>
                          {isMe && (
                            <span>
                              {message.status === 'sending' && '🕒'}
                              {message.status === 'sent' && <FaCheck className="text-gray-400" />}
                              {message.status === 'read' && <FaCheckDouble className="text-green-500" />}
                              {message.status === 'error' && '⚠️'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                {participant?.name?.charAt(0)}
              </div>
              <div className="bg-gray-200 rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview */}
      <AnimatePresence>
        {attachment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white border-t border-gray-200 p-4"
          >
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              {attachment.type === 'image' ? (
                <img 
                  src={attachment.url} 
                  alt="preview"
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <FaFile className="text-2xl text-gray-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-800">{attachment.name}</p>
                <p className="text-xs text-gray-500">
                  {(attachment.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={handleRemoveAttachment}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <FaTimes className="text-gray-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center gap-2">
          {/* Attachments */}
          <button
            onClick={() => setShowFileUpload(true)}
            className="p-3 hover:bg-gray-100 rounded-xl transition"
          >
            <FaPaperclip className="text-gray-600" />
          </button>

          <button
            onClick={() => setShowEmojiPicker(true)}
            className="p-3 hover:bg-gray-100 rounded-xl transition"
          >
            <FaSmile className="text-gray-600" />
          </button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="اكتب رسالتك هنا..."
              className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !attachment) || sending}
            className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoSend />
          </button>
        </div>
      </div>

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUpload
          onSelect={handleFileSelect}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  );
};

export default ChatRoomPage;
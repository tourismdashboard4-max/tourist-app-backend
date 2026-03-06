import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { FaCheck, FaCheckDouble, FaPlay, FaPause } from 'react-icons/fa';

const MessageBubble = ({ message, isLast }) => {
  const { user } = useAuth();
  const isSentByMe = message.sender === user.id;
  const [isPlaying, setIsPlaying] = useState(false);

  // تنسيق الوقت
  const messageTime = format(new Date(message.createdAt), 'hh:mm a', { locale: ar });

  // أيقونة حالة الرسالة
  const getStatusIcon = () => {
    if (!isSentByMe) return null;
    
    switch (message.status) {
      case 'sent':
        return <FaCheck className="message-status" />;
      case 'delivered':
        return <FaCheckDouble className="message-status" />;
      case 'read':
        return <FaCheckDouble className="message-status" style={{ color: '#4caf50' }} />;
      default:
        return null;
    }
  };

  // عرض محتوى الرسالة حسب النوع
  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return <div className="message-text">{message.content}</div>;

      case 'image':
        return (
          <div>
            <img 
              src={message.content} 
              alt="صورة"
              className="message-image"
              onClick={() => window.open(message.content, '_blank')}
            />
          </div>
        );

      case 'file':
        return (
          <div className="file-message">
            <a href={message.content} target="_blank" rel="noopener noreferrer">
              📎 تحميل الملف
            </a>
          </div>
        );

      case 'voice':
        return (
          <div className="voice-message">
            <button 
              className="voice-play-btn"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <div className="voice-wave">
              <div className="voice-progress" style={{ width: '0%' }} />
            </div>
            <span className="voice-time">0:30</span>
          </div>
        );

      case 'location':
        return (
          <div className="location-message">
            📍 موقعي الحالي
            {/* يمكن إضافة خريطة مصغرة هنا */}
          </div>
        );

      case 'booking':
        return (
          <div className="booking-message">
            <strong>حجز جديد</strong>
            <p>{message.content}</p>
          </div>
        );

      default:
        return <div className="message-text">{message.content}</div>;
    }
  };

  return (
    <div className={`message-wrapper ${isSentByMe ? 'sent' : 'received'}`}>
      <div className="message-bubble">
        {renderMessageContent()}
        
        <div className="message-time">
          <span>{messageTime}</span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
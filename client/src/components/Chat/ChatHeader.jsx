import React from 'react';
import { FaBars, FaPhone, FaVideo, FaEllipsisV, FaStar } from 'react-icons/fa';

const ChatHeader = ({ room, onToggleSidebar, onOpenSettings }) => {
  if (!room) return null;

  return (
    <div className="chat-header">
      <div className="header-info">
        {/* زر القائمة للجوال */}
        <button 
          className="header-btn menu-btn"
          onClick={onToggleSidebar}
          style={{ display: window.innerWidth <= 768 ? 'block' : 'none' }}
        >
          <FaBars />
        </button>

        {/* صورة المشارك */}
        <img 
          src={room.participant.avatar || '/default-avatar.png'} 
          alt={room.participant.name}
          className="header-avatar"
        />

        {/* معلومات المشارك */}
        <div className="header-text">
          <h3>{room.participant.name}</h3>
          <p>
            {room.participant.online ? 'متصل الآن' : 'غير متصل'}
            {room.participant.rating && (
              <span style={{ marginRight: '10px' }}>
                <FaStar color="#ffd700" /> {room.participant.rating}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* أزرار الإجراءات */}
      <div className="header-actions">
        <button className="header-btn">
          <FaPhone />
        </button>
        <button className="header-btn">
          <FaVideo />
        </button>
        <button className="header-btn" onClick={onOpenSettings}>
          <FaEllipsisV />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
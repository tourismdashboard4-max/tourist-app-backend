import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const ChatList = ({ rooms, currentRoom, onSelectRoom, loading }) => {
  if (loading) {
    return (
      <div className="chat-list" style={{ textAlign: 'center', padding: '20px' }}>
        <div className="loading-spinner">جاري التحميل...</div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="chat-list" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
        <p>لا توجد محادثات حالياً</p>
      </div>
    );
  }

  return (
    <div className="chat-list">
      {rooms.map((room) => {
        const lastMessage = room.lastMessage;
        const isActive = currentRoom?._id === room._id;
        const unreadCount = room.unreadCount || 0;

        return (
          <div
            key={room._id}
            className={`chat-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectRoom(room)}
          >
            {/* صورة المشارك */}
            <div className="chat-avatar">
              <img 
                src={room.participant.avatar || '/default-avatar.png'} 
                alt={room.participant.name}
                className="avatar-img"
              />
              <span className={room.participant.online ? 'online-indicator' : 'offline-indicator'} />
            </div>

            {/* معلومات المحادثة */}
            <div className="chat-info">
              <div className="chat-name">
                <h4>{room.participant.name}</h4>
                {lastMessage && (
                  <span className="chat-time">
                    {formatDistanceToNow(new Date(lastMessage.createdAt), {
                      addSuffix: true,
                      locale: ar,
                    })}
                  </span>
                )}
              </div>

              <div className="chat-last-message">
                <p>
                  {lastMessage ? (
                    lastMessage.type === 'text' ? lastMessage.content :
                    lastMessage.type === 'image' ? '📸 صورة' :
                    lastMessage.type === 'file' ? '📎 ملف' :
                    lastMessage.type === 'voice' ? '🎤 رسالة صوتية' : 'رسالة جديدة'
                  ) : 'لا توجد رسائل'}
                </p>
                {unreadCount > 0 && (
                  <span className="unread-badge">{unreadCount}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;
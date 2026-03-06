import React, { useState } from 'react';
import { FaTimes, FaBell, FaMoon, FaLanguage, FaTrash } from 'react-icons/fa';

const ChatSettings = ({ room, onClose }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    muteChat: false,
    darkMode: false,
    language: 'ar',
    blockUser: false,
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLanguageChange = (e) => {
    setSettings(prev => ({
      ...prev,
      language: e.target.value
    }));
  };

  const handleBlockUser = () => {
    if (window.confirm('هل أنت متأكد من حظر هذا المستخدم؟')) {
      // تنفيذ حظر المستخدم
      console.log('User blocked');
    }
  };

  const handleClearChat = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع الرسائل؟')) {
      // تنفيذ مسح المحادثة
      console.log('Chat cleared');
    }
  };

  return (
    <div className="chat-settings-modal" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        {/* رأس الإعدادات */}
        <div className="settings-header">
          <h3>إعدادات المحادثة</h3>
          <button className="settings-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* معلومات المشارك */}
        {room && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            padding: '15px',
            background: '#f5f5f5',
            borderRadius: '10px',
            marginBottom: '20px',
          }}>
            <img 
              src={room.participant.avatar || '/default-avatar.png'}
              alt={room.participant.name}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
            <div>
              <h4 style={{ margin: 0, color: '#333' }}>{room.participant.name}</h4>
              <p style={{ margin: '5px 0 0', color: '#666', fontSize: '13px' }}>
                {room.participant.email}
              </p>
            </div>
          </div>
        )}

        {/* خيارات الإعدادات */}
        <div className="settings-options">
          <div className="settings-option">
            <label>
              <FaBell style={{ marginLeft: '10px' }} />
              الإشعارات
            </label>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={() => handleToggle('notifications')}
            />
          </div>

          <div className="settings-option">
            <label>
              <FaMoon style={{ marginLeft: '10px' }} />
              كتم المحادثة
            </label>
            <input
              type="checkbox"
              checked={settings.muteChat}
              onChange={() => handleToggle('muteChat')}
            />
          </div>

          <div className="settings-option">
            <label>
              <FaLanguage style={{ marginLeft: '10px' }} />
              اللغة
            </label>
            <select
              className="settings-select"
              value={settings.language}
              onChange={handleLanguageChange}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* أزرار الإجراءات الخطيرة */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #e0e0e0', paddingTop: '20px' }}>
          <button
            onClick={handleBlockUser}
            style={{
              width: '100%',
              padding: '12px',
              background: '#ffebee',
              color: '#f44336',
              border: 'none',
              borderRadius: '8px',
              marginBottom: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontWeight: 'bold',
            }}
          >
            <FaTimes /> حظر المستخدم
          </button>

          <button
            onClick={handleClearChat}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f5f5f5',
              color: '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <FaTrash /> مسح المحادثة
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSettings;
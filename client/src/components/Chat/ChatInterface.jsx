import React, { useState, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../hooks/useAuth';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import ChatHeader from './ChatHeader';
import ChatList from './ChatList';
import ChatSettings from './ChatSettings';
import './ChatStyles.css';

const ChatInterface = () => {
  const { user } = useAuth();
  const {
    rooms,
    currentRoom,
    messages,
    typingUsers,
    unreadCount,
    loading,
    loadRooms,
    setCurrentRoom,
    sendMessage,
  } = useChat();

  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRooms();
  }, []);

  // فلترة المحادثات حسب البحث
  const filteredRooms = rooms.filter(room => 
    room.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // التعامل مع إرسال رسالة
  const handleSendMessage = (content, type = 'text') => {
    if (currentRoom && content.trim()) {
      sendMessage(currentRoom._id, content, type);
    }
  };

  // التعامل مع اختيار محادثة
  const handleSelectRoom = (room) => {
    setCurrentRoom(room);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  // التعامل مع فتح الإعدادات
  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  return (
    <div className="chat-container">
      {/* الشريط الجانبي */}
      <ChatSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      >
        <div className="sidebar-header">
          <h2>المحادثات</h2>
          <p>مرحباً {user?.name}</p>
        </div>

        {/* بحث في المحادثات */}
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="بحث في المحادثات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* قائمة المحادثات */}
        <ChatList 
          rooms={filteredRooms}
          currentRoom={currentRoom}
          onSelectRoom={handleSelectRoom}
          loading={loading}
        />
      </ChatSidebar>

      {/* منطقة المحادثة الرئيسية */}
      <div className="chat-main">
        {currentRoom ? (
          <>
            {/* رأس المحادثة */}
            <ChatHeader 
              room={currentRoom}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onOpenSettings={handleOpenSettings}
            />

            {/* نافذة المحادثة */}
            <ChatWindow 
              messages={messages}
              currentRoom={currentRoom}
              typingUsers={typingUsers}
            />

            {/* إدخال الرسالة */}
            <MessageInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-icon">💬</div>
            <h3>مرحباً بك في المحادثات</h3>
            <p>اختر محادثة لبدء المراسلة</p>
          </div>
        )}
      </div>

      {/* إعدادات المحادثة */}
      {showSettings && (
        <ChatSettings 
          room={currentRoom}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
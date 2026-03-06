import React from 'react';
import { FaTimes } from 'react-icons/fa';

const ChatSidebar = ({ isOpen, onClose, children }) => {
  return (
    <>
      {/* Overlay للجوال */}
      {isOpen && window.innerWidth <= 768 && (
        <div 
          className="sidebar-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* الشريط الجانبي */}
      <div 
        className={`chat-sidebar ${isOpen ? 'open' : ''}`}
        style={{
          position: window.innerWidth <= 768 ? 'fixed' : 'relative',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          transform: isOpen ? 'translateX(0)' : 
                     window.innerWidth <= 768 ? 'translateX(100%)' : 'none',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* زر الإغلاق للجوال */}
        {window.innerWidth <= 768 && (
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#666',
              zIndex: 1001,
            }}
          >
            <FaTimes />
          </button>
        )}

        {children}
      </div>
    </>
  );
};

export default ChatSidebar;
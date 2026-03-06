import React from 'react';

const TypingIndicator = ({ user }) => {
  return (
    <div className="message-wrapper received">
      <div className="typing-indicator">
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className="typing-text">
          {user?.name || 'المستخدم'} يكتب...
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator;
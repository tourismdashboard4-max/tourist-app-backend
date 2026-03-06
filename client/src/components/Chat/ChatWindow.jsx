import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

const ChatWindow = ({ messages, currentRoom, typingUsers }) => {
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  // التمرير لآخر رسالة
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // تجميع الرسائل حسب التاريخ
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.createdAt).toLocaleDateString('ar-SA');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  // التحقق من وجود مؤشر كتابة للمحادثة الحالية
  const isTyping = currentRoom && typingUsers[currentRoom._id]?.isTyping;

  return (
    <div className="chat-window" ref={chatWindowRef}>
      {Object.entries(messageGroups).map(([date, dateMessages]) => (
        <div key={date}>
          {/* فاصل التاريخ */}
          <div className="message-date-divider">
            <span>{date}</span>
          </div>

          {/* رسائل هذا التاريخ */}
          {dateMessages.map((message, index) => (
            <MessageBubble 
              key={message._id || index}
              message={message}
              isLast={index === dateMessages.length - 1}
            />
          ))}
        </div>
      ))}

      {/* مؤشر الكتابة */}
      {isTyping && <TypingIndicator user={typingUsers[currentRoom._id]} />}

      {/* عنصر للتمرير التلقائي */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;
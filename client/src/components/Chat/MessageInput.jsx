// client/src/components/Chat/MessageInput.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FaSmile, FaPaperclip, FaMicrophone, FaTimes } from 'react-icons/fa';
import { IoSend } from 'react-icons/io5';
import EmojiPicker from './EmojiPicker';
import FileUpload from './FileUpload';
import { useTyping } from '../../hooks/useTyping';

const MessageInput = ({ onSendMessage, onTypingStart, onTypingStop, disabled, placeholder }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef(null);
  
  const { isTyping, startTyping, stopTyping } = useTyping();

  // التركيز على الإدخال
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // التعامل مع تغيير النص
  const handleChange = (e) => {
    setMessage(e.target.value);
    
    if (e.target.value.length > 0) {
      startTyping();
      if (onTypingStart) onTypingStart();
    } else {
      stopTyping();
      if (onTypingStop) onTypingStop();
    }
  };

  // التعامل مع إرسال الرسالة
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      stopTyping();
      if (onTypingStop) onTypingStop();
      inputRef.current?.focus();
    }
  };

  // التعامل مع الضغط على Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // التعامل مع اختيار إيموجي
  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // التعامل مع رفع ملف
  const handleFileSelect = (file) => {
    // معالجة الملف وإرساله
    console.log('File selected:', file);
    setShowFileUpload(false);
  };

  // التعامل مع التسجيل الصوتي
  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // بدء التسجيل
    } else {
      // إيقاف التسجيل وإرسال الرسالة الصوتية
    }
  };

  return (
    <div className="message-input-container" style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
      borderTop: '1px solid #e0e0e0',
      position: 'relative'
    }}>
      <div className="input-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px',
        gap: '8px'
      }}>
        {/* أزرار الإجراءات */}
        <div className="input-actions" style={{
          display: 'flex',
          gap: '5px'
        }}>
          <button 
            className={`action-btn ${showEmojiPicker ? 'active' : ''}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: showEmojiPicker ? '#e3f2fd' : '#f0f0f0',
              color: showEmojiPicker ? '#2196F3' : '#666',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaSmile size={18} />
          </button>
          
          <button 
            className={`action-btn ${showFileUpload ? 'active' : ''}`}
            onClick={() => setShowFileUpload(!showFileUpload)}
            disabled={disabled}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: showFileUpload ? '#e3f2fd' : '#f0f0f0',
              color: showFileUpload ? '#2196F3' : '#666',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaPaperclip size={18} />
          </button>
          
          <button 
            className={`action-btn ${isRecording ? 'active' : ''}`}
            onClick={handleVoiceRecord}
            disabled={disabled}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isRecording ? '#ffebee' : '#f0f0f0',
              color: isRecording ? '#f44336' : '#666',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FaMicrophone size={18} />
          </button>
        </div>

        {/* حقل إدخال النص */}
        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder={placeholder || 'اكتب رسالتك هنا...'}
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '10px 15px',
            border: '1px solid #e0e0e0',
            borderRadius: '20px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: disabled ? '#f5f5f5' : 'white'
          }}
        />

        {/* زر الإرسال */}
        <button 
          className="send-btn"
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: message.trim() && !disabled ? '#4CAF50' : '#e0e0e0',
            color: 'white',
            cursor: message.trim() && !disabled ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
          }}
        >
          <IoSend size={18} />
        </button>
      </div>

      {/* منتقي الإيموجي */}
      {showEmojiPicker && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '10px',
          zIndex: 1000
        }}>
          <EmojiPicker 
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* رفع الملفات */}
      {showFileUpload && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          left: '10px',
          right: '10px',
          zIndex: 1000
        }}>
          <FileUpload 
            onSelect={handleFileSelect}
            onClose={() => setShowFileUpload(false)}
          />
        </div>
      )}
    </div>
  );
};

export default MessageInput;
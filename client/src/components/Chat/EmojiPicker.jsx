import React from 'react';
import { FaTimes } from 'react-icons/fa';

// قائمة مختصرة من الإيموجي
const EMOJIS = [
  '😊', '😂', '❤️', '👍', '😢', '😡', '🎉', '🔥',
  '😍', '🥰', '😎', '🤔', '😴', '🥳', '😱', '🤯',
  '🙏', '👏', '🤝', '💪', '👋', '✌️', '🤞', '👌',
  '🐶', '🐱', '🦊', '🐼', '🐨', '🦁', '🐮', '🐸',
  '🍕', '🍔', '🌮', '🍣', '🍦', '🍩', '☕', '🍺',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🎳',
  '🚗', '✈️', '🚀', '🚲', '🚢', '🚂', '🏍️', '🚁',
  '💯', '✅', '❌', '⚠️', '🔴', '🟢', '🔵', '⚫',
];

const EmojiPicker = ({ onSelect, onClose }) => {
  return (
    <div className="emoji-picker-container">
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '15px',
        width: '300px',
        maxHeight: '400px',
        overflowY: 'auto',
      }}>
        {/* رأس المنتقي */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid #e0e0e0',
        }}>
          <h4 style={{ margin: 0, color: '#333' }}>اختر إيموجي</h4>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* شبكة الإيموجي */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
        }}>
          {EMOJIS.map((emoji, index) => (
            <button
              key={index}
              onClick={() => onSelect(emoji)}
              style={{
                background: '#f5f5f5',
                border: 'none',
                fontSize: '24px',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => e.target.style.background = '#e0e0e0'}
              onMouseLeave={(e) => e.target.style.background = '#f5f5f5'}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
import React, { useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

const ChatSearch = ({ onSearch, onClose }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="search-container" style={{
      padding: '15px',
      background: '#f5f5f5',
      borderBottom: '1px solid #e0e0e0',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'white',
        borderRadius: '25px',
        padding: '5px 15px',
        border: '1px solid #ddd',
      }}>
        <FaSearch style={{ color: '#999', marginLeft: '10px' }} />
        
        <input
          type="text"
          className="search-input"
          placeholder="بحث في المحادثات..."
          value={query}
          onChange={handleSearch}
          style={{
            flex: 1,
            border: 'none',
            padding: '10px 0',
            outline: 'none',
            fontSize: '14px',
          }}
          autoFocus
        />

        {query && (
          <button
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '5px',
            }}
          >
            <FaTimes />
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              padding: '5px',
              marginRight: '5px',
            }}
          >
            إلغاء
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatSearch;
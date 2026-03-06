// client/src/components/Notifications/NotificationFilters.jsx
import React, { useState } from 'react';
import './NotificationFilters.css';

const NotificationFilters = ({ filters, onFilterChange }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...localFilters, [name]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      type: 'all',
      isRead: 'all',
      startDate: '',
      endDate: ''
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="notification-filters">
      <div className="filters-header">
        <h3>تصفية الإشعارات</h3>
        <button onClick={handleReset} className="reset-filters-btn">
          إعادة تعيين
        </button>
      </div>

      <div className="filters-grid">
        <div className="filter-group">
          <label htmlFor="type">نوع الإشعار</label>
          <select
            id="type"
            name="type"
            value={localFilters.type}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="all">الكل</option>
            <option value="booking">الحجوزات</option>
            <option value="payment">المدفوعات</option>
            <option value="chat">المحادثات</option>
            <option value="wallet">المحفظة</option>
            <option value="guide">المرشدين</option>
            <option value="system">النظام</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="isRead">حالة القراءة</label>
          <select
            id="isRead"
            name="isRead"
            value={localFilters.isRead}
            onChange={handleChange}
            className="filter-select"
          >
            <option value="all">الكل</option>
            <option value="unread">غير مقروء</option>
            <option value="read">مقروء</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="startDate">من تاريخ</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={localFilters.startDate}
            onChange={handleChange}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="endDate">إلى تاريخ</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={localFilters.endDate}
            onChange={handleChange}
            className="filter-input"
            min={localFilters.startDate}
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationFilters;
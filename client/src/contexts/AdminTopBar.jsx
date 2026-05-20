// src/components/Common/AdminTopBar.jsx
import React from 'react';
import { Bell, User } from 'lucide-react';

function AdminTopBar({ setPage, lang, unreadCount }) {
  return (
    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 py-0.5 px-2 flex justify-center gap-1.5 shadow-md relative z-10">
      <button onClick={() => setPage('adminNotifications')} className="relative flex items-center justify-center w-7 h-7 bg-white/20 rounded-full hover:bg-white/30 transition">
        <Bell size={14} className="text-white" />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      <button onClick={() => setPage('adminSupport')} className="px-2 py-0.5 bg-white text-teal-700 rounded-full text-[11px] font-bold shadow-md hover:bg-gray-100 transition">
        📧 {lang === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}
      </button>

      {/* ✅ أيقونة المستخدم – صفحة كاملة */}
      <button onClick={() => setPage('profile')} className="flex items-center justify-center w-7 h-7 bg-white/20 rounded-full hover:bg-white/30 transition" title={lang === 'ar' ? 'الملف الشخصي' : 'Profile'}>
        <User size={14} className="text-white" />
      </button>
    </div>
  );
}

export default AdminTopBar;

// router/index.js - النسخة النهائية (تم إرسالها سابقاً)
// تحتوي على جميع المسارات بما في ذلك /support/:ticketId? المطلوب لفتح المحادثة من الإشعارات

import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// استيراد الصفحات
import HomePage from '../pages/HomePage';
import ExplorePage from '../pages/ExplorePage';
import NotificationsPage from '../pages/NotificationsPage';
import UpgradeToGuidePage from '../pages/UpgradeToGuidePage';
import UpgradeStatusPage from '../pages/UpgradeStatusPage';
import FavoritesPage from '../pages/FavoritesPage';
import EventsPage from '../pages/EventsPage';
import GuidesPage from '../pages/GuidesPage';
import GuideDashboardPage from '../pages/GuideDashboardPage';
import MessagesPage from '../pages/MessagesPage';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotFoundPage from '../pages/NotFoundPage';
import EmergencyPage from '../pages/EmergencyPage';
import DirectChatPage from '../pages/DirectChatPage';
import SupportChatPage from '../pages/SupportChatPage'; // ✅ إضافة صفحة الدعم والمحادثات

// مكون حماية المسارات
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.type)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// مكون للمسارات العامة (للمستخدمين غير المسجلين فقط)
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// مصفوفة المسارات
const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
    errorElement: <NotFoundPage />
  },
  {
    path: '/explore',
    element: (
      <ProtectedRoute allowedRoles={['user', 'guide', 'admin']}>
        <ExplorePage />
      </ProtectedRoute>
    )
  },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute allowedRoles={['user', 'guide', 'admin']}>
        <NotificationsPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/upgrade-to-guide',
    element: (
      <ProtectedRoute allowedRoles={['user']}>
        <UpgradeToGuidePage />
      </ProtectedRoute>
    )
  },
  {
    path: '/upgrade-status',
    element: (
      <ProtectedRoute allowedRoles={['user']}>
        <UpgradeStatusPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/favorites',
    element: (
      <ProtectedRoute allowedRoles={['user', 'guide', 'admin']}>
        <FavoritesPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/events',
    element: <EventsPage />
  },
  {
    path: '/guides',
    element: <GuidesPage />
  },
  {
    path: '/guide-dashboard',
    element: (
      <ProtectedRoute allowedRoles={['guide', 'admin']}>
        <GuideDashboardPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/messages',
    element: (
      <ProtectedRoute allowedRoles={['user', 'guide', 'admin']}>
        <MessagesPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute allowedRoles={['user', 'guide', 'admin']}>
        <ProfilePage />
      </ProtectedRoute>
    )
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute allowedRoles={['user', 'guide', 'admin']}>
        <SettingsPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    )
  },
  {
    path: '/register',
    element: (
      <PublicOnlyRoute>
        <RegisterPage />
      </PublicOnlyRoute>
    )
  },
  {
    path: '/emergency',
    element: (
      <ProtectedRoute allowedRoles={['user', 'guide', 'admin']}>
        <EmergencyPage />
      </ProtectedRoute>
    )
  },
  // ✅ مسار المحادثة المباشرة (للمرشد)
  {
    path: '/direct-chat/:guideId',
    element: (
      <ProtectedRoute allowedRoles={['user', 'guide', 'admin']}>
        <DirectChatPage />
      </ProtectedRoute>
    )
  },
  // ✅ مسار الدعم والمحادثات (للتذاكر) - هام جداً للإشعارات
  // ملاحظة: يجب أن يتطابق هذا المسار مع ما تستخدمه صفحة الإشعارات عند التنقل
  {
    path: '/support/:ticketId?',
    element: (
      <ProtectedRoute allowedRoles={['user', 'guide', 'admin']}>
        <SupportChatPage />
      </ProtectedRoute>
    )
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
]);

export default router;

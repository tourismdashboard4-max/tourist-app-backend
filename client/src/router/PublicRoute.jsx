import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from './routes.config';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // إذا كان المستخدم مسجلاً، يمنع من الوصول لصفحات تسجيل الدخول والتسجيل
  if (user) {
    // توجيه المستخدم للصفحة المناسبة حسب نوعه
    if (user.type === 'guide') {
      return <Navigate to={ROUTES.GUIDE_DASHBOARD} replace />;
    }
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return children;
};

export default PublicRoute;
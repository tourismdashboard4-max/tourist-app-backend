import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from './routes.config';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const GuideRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  if (user.type !== 'guide') {
    // إذا كان المستخدم سائحاً وليس مرشداً
    return <Navigate to={ROUTES.HOME} replace />;
  }

  // التحقق من حالة المرشد (موثق أم لا)
  if (user.status !== 'approved' && user.status !== 'active') {
    // يمكن إعادة التوجيه لصفحة انتظار الموافقة
    return <Navigate to={ROUTES.GUIDE_PENDING} replace />;
  }

  return children;
};

export default GuideRoute;
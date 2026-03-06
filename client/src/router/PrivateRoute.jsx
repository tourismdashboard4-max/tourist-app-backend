import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from './routes.config';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    // حفظ المسار الحالي لإعادة التوجيه بعد تسجيل الدخول
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  // التحقق من الدور إذا كان مطلوباً
  if (requiredRole && user.type !== requiredRole) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return children;
};

export default PrivateRoute;
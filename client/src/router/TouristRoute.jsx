import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from './routes.config';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const TouristRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  if (user.type !== 'tourist') {
    // إذا كان المستخدم مرشداً وليس سائحاً
    return <Navigate to={ROUTES.GUIDE_DASHBOARD} replace />;
  }

  return children;
};

export default TouristRoute;
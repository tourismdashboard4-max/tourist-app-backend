import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ROUTES } from './routes.config';
import PrivateRoute from './PrivateRoute';
import GuideRoute from './GuideRoute';
import TouristRoute from './TouristRoute';
import PublicRoute from './PublicRoute';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/Common/LoadingSpinner';

// ===================== استيراد الصفحات مع Lazy Loading =====================
const HomePage = lazy(() => import('../pages/HomePage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const WalletPage = lazy(() => import('../pages/WalletPage'));
const BookingPage = lazy(() => import('../pages/BookingPage'));
const ProgramsPage = lazy(() => import('../pages/ProgramsPage'));
const ExplorePage = lazy(() => import('../pages/ExplorePage'));
const FavoritesPage = lazy(() => import('../pages/FavoritesPage'));
const EventsPage = lazy(() => import('../pages/EventsPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const ChatRoomPage = lazy(() => import('../pages/ChatRoomPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const GuideDashboardPage = lazy(() => import('../pages/GuideDashboardPage'));
const GuideProgramsPage = lazy(() => import('../pages/GuideProgramsPage'));
const GuideEarningsPage = lazy(() => import('../pages/GuideEarningsPage'));
const GuideRequestsPage = lazy(() => import('../pages/GuideRequestsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const ContactPage = lazy(() => import('../pages/ContactPage'));
const FAQPage = lazy(() => import('../pages/FAQPage'));
const TermsPage = lazy(() => import('../pages/TermsPage'));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// استيراد صفحات المحادثة الهامة
const DirectChatPage = lazy(() => import('../pages/DirectChatPage'));
const SupportChatPage = lazy(() => import('../pages/SupportChatPage'));

// المكون الداخلي الذي يستخدم useNavigate
const AppRouterContent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // مراقبة حالة الخروج وإعادة التوجيه إلى الصفحة الرئيسية
  useEffect(() => {
    if (!loading && !user) {
      // إذا انتهى التحميل ولم يكن هناك مستخدم، انتقل إلى الصفحة الرئيسية
      navigate(ROUTES.HOME, { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* ===================== المسارات العامة ===================== */}
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route 
          path={ROUTES.LOGIN} 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route 
          path={ROUTES.REGISTER} 
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } 
        />
        <Route path={ROUTES.ABOUT} element={<AboutPage />} />
        <Route path={ROUTES.CONTACT} element={<ContactPage />} />
        <Route path={ROUTES.FAQ} element={<FAQPage />} />
        <Route path={ROUTES.TERMS} element={<TermsPage />} />
        <Route path={ROUTES.PRIVACY} element={<PrivacyPage />} />

        {/* ===================== مسارات المستخدم (سائح) ===================== */}
        <Route 
          path={ROUTES.PROFILE} 
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          } 
        />
        <Route 
          path={ROUTES.WALLET} 
          element={
            <TouristRoute>
              <WalletPage />
            </TouristRoute>
          } 
        />
        <Route 
          path={ROUTES.BOOKINGS} 
          element={
            <TouristRoute>
              <BookingPage />
            </TouristRoute>
          } 
        />
        <Route 
          path={ROUTES.BOOKING_DETAILS} 
          element={
            <TouristRoute>
              <BookingPage />
            </TouristRoute>
          } 
        />
        <Route 
          path={ROUTES.FAVORITES} 
          element={
            <TouristRoute>
              <FavoritesPage />
            </TouristRoute>
          } 
        />
        <Route 
          path={ROUTES.PROGRAMS} 
          element={
            <TouristRoute>
              <ProgramsPage />
            </TouristRoute>
          } 
        />
        <Route 
          path={ROUTES.PROGRAM_DETAILS} 
          element={
            <TouristRoute>
              <ProgramsPage />
            </TouristRoute>
          } 
        />
        <Route 
          path={ROUTES.EXPLORE} 
          element={
            <TouristRoute>
              <ExplorePage />
            </TouristRoute>
          } 
        />
        <Route 
          path={ROUTES.EVENTS} 
          element={
            <TouristRoute>
              <EventsPage />
            </TouristRoute>
          } 
        />

        {/* ===================== مسارات المرشد ===================== */}
        <Route 
          path={ROUTES.GUIDE_DASHBOARD} 
          element={
            <GuideRoute>
              <GuideDashboardPage />
            </GuideRoute>
          } 
        />
        <Route 
          path={ROUTES.GUIDE_PROGRAMS} 
          element={
            <GuideRoute>
              <GuideProgramsPage />
            </GuideRoute>
          } 
        />
        <Route 
          path={ROUTES.GUIDE_PROGRAM_ADD} 
          element={
            <GuideRoute>
              <GuideProgramsPage />
            </GuideRoute>
          } 
        />
        <Route 
          path={ROUTES.GUIDE_PROGRAM_EDIT} 
          element={
            <GuideRoute>
              <GuideProgramsPage />
            </GuideRoute>
          } 
        />
        <Route 
          path={ROUTES.GUIDE_EARNINGS} 
          element={
            <GuideRoute>
              <GuideEarningsPage />
            </GuideRoute>
          } 
        />
        <Route 
          path={ROUTES.GUIDE_REQUESTS} 
          element={
            <GuideRoute>
              <GuideRequestsPage />
            </GuideRoute>
          } 
        />
        <Route 
          path={ROUTES.GUIDE_BOOKINGS} 
          element={
            <GuideRoute>
              <BookingPage />
            </GuideRoute>
          } 
        />
        <Route 
          path={ROUTES.GUIDE_STATS} 
          element={
            <GuideRoute>
              <GuideDashboardPage />
            </GuideRoute>
          } 
        />
        <Route 
          path={ROUTES.GUIDE_SETTINGS} 
          element={
            <GuideRoute>
              <SettingsPage />
            </GuideRoute>
          } 
        />

        {/* ===================== مسارات مشتركة (لجميع المستخدمين المسجلين) ===================== */}
        <Route 
          path={ROUTES.CHAT} 
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path={ROUTES.CHAT_ROOM} 
          element={
            <PrivateRoute>
              <ChatRoomPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path={ROUTES.CHAT_SUPPORT} 
          element={
            <PrivateRoute>
              <ChatRoomPage />
            </PrivateRoute>
          } 
        />
        
        {/* مسار الإشعارات */}
        <Route 
          path={ROUTES.NOTIFICATIONS} 
          element={
            <PrivateRoute>
              <NotificationsPage />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path={ROUTES.NOTIFICATION_SETTINGS} 
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path={ROUTES.SETTINGS} 
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          } 
        />

        {/* ===================== مسارات المحادثات والدعم ===================== */}
        {/* مسار المحادثة المباشرة مع مرشد (يستقبل guideId في الرابط) */}
        <Route 
          path="/direct-chat/:guideId" 
          element={
            <PrivateRoute>
              <DirectChatPage />
            </PrivateRoute>
          } 
        />
        {/* مسار الدعم الفني والمحادثات عبر التذاكر (يدعم ticketId اختياري) */}
        <Route 
          path="/support/:ticketId?" 
          element={
            <PrivateRoute>
              <SupportChatPage />
            </PrivateRoute>
          } 
        />

        {/* ===================== مسار 404 ===================== */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

// المكون الرئيسي الذي يحيط بـ BrowserRouter
const AppRouter = () => {
  return (
    <BrowserRouter>
      <AppRouterContent />
    </BrowserRouter>
  );
};

export default AppRouter;

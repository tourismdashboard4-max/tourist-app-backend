// client/src/pages/MyTripsPage.jsx
// ✅ نسخة محسنة: عرض طلبات الحجز للمرشد، إضافة زر تحديث يدوي

import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, ArrowLeft, User, Clock, CheckCircle, XCircle, Trash2, 
  Package, Award, Users, Star, MessageCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'https://tourist-app-api.onrender.com';
const DELETED_BOOKINGS_KEY = 'user_deleted_bookings';
const LOCAL_BOOKINGS_KEY = (userId) => `local_bookings_${userId}`;

function MyTripsPage({ lang, user, setPage }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingBookings, setPendingBookings] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [guidePendingBookings, setGuidePendingBookings] = useState([]);
  const [guideCompletedTrips, setGuideCompletedTrips] = useState([]);
  const [guideRatingsTrips, setGuideRatingsTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [processingBookingId, setProcessingBookingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isGuide = user?.role === 'guide' || user?.type === 'guide' || user?.isGuide === true;

  const getDeletedBookings = () => {
    const stored = localStorage.getItem(DELETED_BOOKINGS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  };

  const addDeletedBooking = (ticketId) => {
    const current = getDeletedBookings();
    current.add(String(ticketId));
    localStorage.setItem(DELETED_BOOKINGS_KEY, JSON.stringify([...current]));
  };

  const loadLocalBookings = () => {
    if (!user?.id) return [];
    const key = LOCAL_BOOKINGS_KEY(user.id);
    const stored = localStorage.getItem(key);
    const bookings = stored ? JSON.parse(stored) : [];
    console.log(`📦 الحجوزات المحلية للمستخدم ${user.id}:`, bookings);
    return bookings;
  };

  const addDemoBooking = () => {
    if (!isGuide) return;
    const demoBooking = {
      id: Date.now(),
      user_id: 9999,
      user_name: "مسافر تجريبي",
      program_name: "رحلة تجريبية",
      program_price: 150,
      user_balance: 500,
      created_at: new Date().toISOString(),
      status: 'pending',
      guide_id: user.id,
      program_id: 999
    };
    const key = LOCAL_BOOKINGS_KEY(user.id);
    const existing = localStorage.getItem(key);
    let bookings = existing ? JSON.parse(existing) : [];
    if (bookings.filter(b => b.user_id === 9999).length < 5) {
      bookings.push(demoBooking);
      localStorage.setItem(key, JSON.stringify(bookings));
      toast.success(lang === 'ar' ? '✅ تم إضافة حجز تجريبي (للاختبار)' : '✅ Demo booking added (for testing)');
      fetchAllTickets();
    } else {
      toast.info(lang === 'ar' ? 'تم الوصول إلى الحد الأقصى من الحجوزات التجريبية' : 'Maximum demo bookings reached');
    }
  };

  const fetchUserIds = async () => {
    let userUuid = null;
    let userNumericId = null;
    if (user?.id) {
      const idStr = String(user.id);
      if (idStr.includes('-') || idStr.length === 36) {
        userUuid = idStr;
      } else if (!isNaN(Number(idStr))) {
        userNumericId = Number(idStr);
      }
    }
    if (user?.old_id && !userNumericId) userNumericId = Number(user.old_id);
    if (!userUuid && (userNumericId || user?.id)) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/users/${userNumericId || user.id}`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
        const data = await res.json();
        if (data.success && data.user) {
          if (data.user.id && typeof data.user.id === 'string' && data.user.id.includes('-')) userUuid = data.user.id;
          if (!userNumericId && data.user.old_id) userNumericId = Number(data.user.old_id);
        }
      } catch(e) { console.warn(e); }
    }
    return { userUuid, userNumericId };
  };

  const isBookingTicket = (ticket) => {
    const metadata = ticket.metadata || {};
    if (metadata.program_id != null) return true;
    if (metadata.is_booking === true) return true;
    if (ticket.type === 'booking') return true;
    const subject = (ticket.subject || '').toLowerCase();
    const message = (ticket.message || '').toLowerCase();
    if (subject.includes('طلب حجز برنامج') || subject.includes('booking request')) return true;
    if (message.includes('أود حجز البرنامج') || message.includes('i would like to book')) return true;
    if (ticket.type === 'general' && (subject.includes('حجز') || message.includes('حجز'))) return true;
    return false;
  };

  const fetchAllTickets = async () => {
    if (!user?.id) return;
    setLoading(true);
    setRefreshing(true);
    const deletedSet = getDeletedBookings();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/support/tickets`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const data = await response.json();
      let allTickets = [];
      if (response.ok && data.success && Array.isArray(data.tickets)) {
        allTickets = data.tickets.filter(t => !deletedSet.has(String(t.id)));
        console.log(`📡 عدد التذاكر من الخادم: ${allTickets.length}`);
        allTickets.forEach(t => console.log(`تذكرة: id=${t.id}, type=${t.type}, status=${t.status}, user_id=${t.user_id}, metadata=`, t.metadata));
      }
      
      const localBookings = loadLocalBookings();
      const localAsTickets = localBookings.map(lb => ({
        id: lb.id,
        user_id: lb.user_id,
        type: 'booking',
        status: lb.status || 'pending',
        subject: `طلب حجز برنامج: ${lb.program_name}`,
        message: '',
        created_at: lb.created_at,
        metadata: {
          program_id: lb.program_id,
          program_name: lb.program_name,
          program_price: lb.program_price,
          guide_id: lb.guide_id,
          tourist_name: lb.user_name,
          user_balance: lb.user_balance,
          is_booking: true
        }
      }));
      const mergedTickets = [...allTickets, ...localAsTickets];
      console.log(`🔄 إجمالي التذاكر بعد الدمج: ${mergedTickets.length}`);

      if (isGuide) {
        const { userUuid, userNumericId } = await fetchUserIds();
        const guideIds = [String(user.id)];
        if (userUuid) guideIds.push(userUuid);
        if (userNumericId) guideIds.push(String(userNumericId));
        
        const isGuideTicket = (ticket) => {
          const metadata = ticket.metadata || {};
          const ticketGuideId = metadata.guide_id || ticket.guide_id;
          if (ticketGuideId && guideIds.some(id => String(ticketGuideId) === id)) return true;
          if (ticket.type === 'general' && String(ticket.user_id) !== String(user.id) && isBookingTicket(ticket)) {
            return true;
          }
          return false;
        };

        const guideRelatedTickets = mergedTickets.filter(t => isGuideTicket(t));
        console.log(`👨‍🏫 تذاكر متعلقة بالمرشد: ${guideRelatedTickets.length}`);
        guideRelatedTickets.forEach(t => console.log('  - تذكرة:', t.id, t.type, t.status, 'guide_id:', t.metadata?.guide_id));
        
        const pendingGuide = guideRelatedTickets.filter(t => 
          isBookingTicket(t) && 
          (!t.status || ['pending', 'open'].includes(t.status.toLowerCase()))
        );
        const completedGuide = guideRelatedTickets.filter(t => 
          isBookingTicket(t) && 
          ['accepted', 'completed'].includes(t.status?.toLowerCase())
        );
        const ratingsTrips = completedGuide.filter(t => t.type === 'trip' || t.status === 'completed');
        
        setGuidePendingBookings(pendingGuide);
        setGuideCompletedTrips(completedGuide);
        setGuideRatingsTrips(ratingsTrips);
        console.log(`👨‍🏫 مرشد: طلبات واردة=${pendingGuide.length}, منتهية=${completedGuide.length}, تقييم=${ratingsTrips.length}`);

        const userAsTouristTickets = mergedTickets.filter(t => String(t.user_id) === String(user.id));
        const myPending = userAsTouristTickets.filter(t => 
          isBookingTicket(t) && 
          (!t.status || ['pending', 'open'].includes(t.status.toLowerCase()))
        );
        const myCompleted = userAsTouristTickets.filter(t => 
          isBookingTicket(t) && 
          ['accepted', 'completed'].includes(t.status?.toLowerCase())
        );
        setPendingBookings(myPending);
        setCompletedTrips(myCompleted);
      } else {
        const userTickets = mergedTickets.filter(t => String(t.user_id) === String(user.id));
        const pending = userTickets.filter(t => 
          isBookingTicket(t) && 
          (!t.status || ['pending', 'open'].includes(t.status.toLowerCase()))
        );
        const completed = userTickets.filter(t => 
          isBookingTicket(t) && 
          ['accepted', 'completed'].includes(t.status?.toLowerCase())
        );
        setPendingBookings(pending);
        setCompletedTrips(completed);
        console.log(`🧑 مستخدم عادي: طلبات=${pending.length}, منتهية=${completed.length}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllTickets();
  }, [user, lang, isGuide]);

  const handleRefresh = () => {
    fetchAllTickets();
    toast.info(lang === 'ar' ? 'جاري تحديث البيانات...' : 'Refreshing data...');
  };

  const handleAcceptBooking = async (booking) => {
    if (processingBookingId === booking.id) return;
    setProcessingBookingId(booking.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/support/tickets/${booking.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ status: 'accepted' })
      });
      if (!response.ok) throw new Error('فشل قبول الطلب');
      toast.success(lang === 'ar' ? 'تم قبول طلب الحجز' : 'Booking request accepted');
      await fetchAllTickets();
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'فشل قبول الطلب' : 'Failed to accept booking');
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleRejectBooking = async (booking) => {
    if (processingBookingId === booking.id) return;
    setProcessingBookingId(booking.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/support/tickets/${booking.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (!response.ok) throw new Error('فشل رفض الطلب');
      toast.success(lang === 'ar' ? 'تم رفض طلب الحجز' : 'Booking request rejected');
      await fetchAllTickets();
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'فشل رفض الطلب' : 'Failed to reject booking');
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الحجز نهائياً؟' : 'Are you sure you want to permanently delete this booking?')) return;
    setDeletingId(bookingId);
    try {
      setPendingBookings(prev => prev.filter(b => b.id !== bookingId));
      addDeletedBooking(bookingId);
      toast.success(lang === 'ar' ? 'تم حذف الحجز نهائياً' : 'Booking permanently deleted');
    } catch (err) {
      console.error(err);
      toast.error(lang === 'ar' ? 'خطأ في الحذف' : 'Delete error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const renderTripCard = (trip, type = 'tourist', showDelete = true) => {
    const metadata = trip.metadata || {};
    const isPending = (trip.status === 'pending' || trip.status === 'open');
    const isGuideView = type === 'guide';
    const isRatingView = type === 'rating';

    let statusText = '';
    let statusClass = '';
    if (isPending) {
      statusText = lang === 'ar' ? 'قيد الانتظار' : 'Pending';
      statusClass = 'bg-yellow-100 text-yellow-700';
    } else if (trip.status === 'accepted') {
      statusText = lang === 'ar' ? 'تم القبول' : 'Accepted';
      statusClass = 'bg-green-100 text-green-700';
    } else if (trip.status === 'completed') {
      statusText = lang === 'ar' ? 'منتهي' : 'Completed';
      statusClass = 'bg-blue-100 text-blue-700';
    } else {
      statusText = trip.status || (lang === 'ar' ? 'غير معروف' : 'Unknown');
      statusClass = 'bg-gray-100 text-gray-700';
    }

    const programName = metadata.program_name || trip.subject?.replace('طلب حجز برنامج:', '') || (lang === 'ar' ? 'برنامج سياحي' : 'Tour Program');
    const touristName = metadata.tourist_name || trip.user_name || (lang === 'ar' ? 'مسافر' : 'Tourist');
    const guideName = metadata.guide_name || trip.guide_name || (lang === 'ar' ? 'مرشد' : 'Guide');
    const price = metadata.program_price || '';

    return (
      <div key={trip.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isRatingView ? <Star size={18} className="text-yellow-500" /> : <Package size={18} className="text-green-600" />}
              <h3 className="font-bold text-gray-800 dark:text-white">{programName}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{statusText}</span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              {isGuideView || isRatingView ? (
                <div className="flex items-center gap-2"><Users size={14} /> {lang === 'ar' ? 'المسافر' : 'Tourist'}: {touristName}</div>
              ) : (
                <div className="flex items-center gap-2"><User size={14} /> {guideName}</div>
              )}
              <div className="flex items-center gap-2"><Clock size={14} /> {formatDate(trip.created_at)}</div>
              {price && <div className="font-semibold text-green-600">{price} ريال</div>}
            </div>
            {trip.message && <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">{trip.message.substring(0, 100)}...</div>}
            
            {isGuideView && isPending && (
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => handleAcceptBooking(trip)} disabled={processingBookingId === trip.id} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-green-700 disabled:opacity-50">
                  <CheckCircle size={14} /> {lang === 'ar' ? 'قبول' : 'Accept'}
                </button>
                <button onClick={() => handleRejectBooking(trip)} disabled={processingBookingId === trip.id} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-red-700 disabled:opacity-50">
                  <XCircle size={14} /> {lang === 'ar' ? 'رفض' : 'Reject'}
                </button>
              </div>
            )}

            {isRatingView && (
              <div className="mt-3 flex items-center gap-2">
                <button className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-yellow-600">
                  <Star size={14} /> {lang === 'ar' ? 'تقييم المرشد' : 'Rate Guide'}
                </button>
                <button className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs flex items-center gap-1 hover:bg-blue-600">
                  <MessageCircle size={14} /> {lang === 'ar' ? 'مراسلة' : 'Message'}
                </button>
              </div>
            )}

            {showDelete && isPending && !isGuideView && !isRatingView && (
              <div className="mt-3">
                <button onClick={() => handleDeleteBooking(trip.id)} disabled={deletingId === trip.id} className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs flex items-center gap-1 hover:bg-red-200 disabled:opacity-50">
                  {deletingId === trip.id ? <div className="animate-spin h-3 w-3 border-2 border-red-600 rounded-full border-t-transparent"></div> : <Trash2 size={14} />}
                  {lang === 'ar' ? 'حذف الحجز' : 'Delete booking'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // واجهة المستخدم العادي
  if (!isGuide) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-4 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setPage('profile')} className="p-1 hover:bg-white/20 rounded-lg"><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-bold flex items-center gap-2"><Package size={24} /> {lang === 'ar' ? 'رحلاتي' : 'My Trips'}</h1>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition disabled:opacity-50">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="border-b border-gray-200 dark:border-gray-700 flex mt-2">
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 font-medium ${activeTab === 'pending' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
            {lang === 'ar' ? 'طلبات الحجز' : 'Booking Requests'} ({pendingBookings.length})
          </button>
          <button onClick={() => setActiveTab('completed')} className={`px-4 py-2 font-medium ${activeTab === 'completed' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
            {lang === 'ar' ? 'الرحلات المنتهية' : 'Completed Trips'} ({completedTrips.length})
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
          ) : activeTab === 'pending' && pendingBookings.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
              <CalendarCheck size={48} className="mx-auto text-gray-400" />
              <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد طلبات حجز' : 'No booking requests'}</p>
              <button onClick={() => setPage('explore')} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg">{lang === 'ar' ? 'استكشف البرامج' : 'Explore Programs'}</button>
            </div>
          ) : activeTab === 'pending' ? (
            <div className="space-y-4">{pendingBookings.map(b => renderTripCard(b, 'tourist', true))}</div>
          ) : completedTrips.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
              <CheckCircle size={48} className="mx-auto text-gray-400" />
              <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد رحلات منتهية' : 'No completed trips'}</p>
            </div>
          ) : (
            <div className="space-y-4">{completedTrips.map(t => renderTripCard(t, 'tourist', false))}</div>
          )}
        </div>
      </div>
    );
  }

  // واجهة المرشد السياحي
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-gradient-to-b from-green-500 to-emerald-600 p-4 text-white flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setPage('profile')} className="p-1 hover:bg-white/20 rounded-lg"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold flex items-center gap-2"><Award size={24} /> {lang === 'ar' ? 'لوحة الرحلات' : 'Trips Dashboard'}</h1>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition disabled:opacity-50">
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="border-b border-gray-200 dark:border-gray-700 flex mt-2 overflow-x-auto">
        <button onClick={() => setActiveTab('guidePending')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'guidePending' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          {lang === 'ar' ? 'طلبات حجز واردة' : 'Incoming Bookings'} ({guidePendingBookings.length})
        </button>
        <button onClick={() => setActiveTab('guideCompleted')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'guideCompleted' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          {lang === 'ar' ? 'رحلات منتهية (كمرشد)' : 'Completed Trips (as Guide)'} ({guideCompletedTrips.length})
        </button>
        <button onClick={() => setActiveTab('guideRatings')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'guideRatings' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          {lang === 'ar' ? 'رحلاتي للتقييم' : 'Trips for Rating'} ({guideRatingsTrips.length})
        </button>
        <button onClick={() => setActiveTab('myOwnBookings')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'myOwnBookings' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          {lang === 'ar' ? 'حجوزاتي (كمسافر)' : 'My Bookings (as Tourist)'} ({pendingBookings.length + completedTrips.length})
        </button>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
        ) : activeTab === 'guidePending' && guidePendingBookings.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
            <CalendarCheck size={48} className="mx-auto text-gray-400" />
            <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد طلبات حجز واردة' : 'No pending booking requests'}</p>
            <p className="text-sm text-gray-400 mt-2">
              {lang === 'ar' 
                ? '💡 يمكنك إضافة حجز تجريبي لاختبار الواجهة. اضغط على الزر أدناه.'
                : '💡 You can add a demo booking to test the interface. Click the button below.'}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={() => setPage('explore')} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                {lang === 'ar' ? 'اذهب إلى الخريطة' : 'Go to Map'}
              </button>
              <button onClick={addDemoBooking} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                {lang === 'ar' ? '➕ إضافة حجز تجريبي' : '➕ Add Demo Booking'}
              </button>
            </div>
          </div>
        ) : activeTab === 'guidePending' ? (
          <div className="space-y-4">{guidePendingBookings.map(b => renderTripCard(b, 'guide', false))}</div>
        ) : activeTab === 'guideCompleted' && guideCompletedTrips.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
            <CheckCircle size={48} className="mx-auto text-gray-400" />
            <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد رحلات منتهية (كمرشد)' : 'No completed trips as guide'}</p>
          </div>
        ) : activeTab === 'guideCompleted' ? (
          <div className="space-y-4">{guideCompletedTrips.map(t => renderTripCard(t, 'guide', false))}</div>
        ) : activeTab === 'guideRatings' && guideRatingsTrips.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
            <Star size={48} className="mx-auto text-gray-400" />
            <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد رحلات قابلة للتقييم حالياً' : 'No trips available for rating'}</p>
          </div>
        ) : activeTab === 'guideRatings' ? (
          <div className="space-y-4">{guideRatingsTrips.map(t => renderTripCard(t, 'rating', false))}</div>
        ) : activeTab === 'myOwnBookings' ? (
          <>
            {pendingBookings.length > 0 && (
              <>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? 'طلبات حجز معلقة' : 'Pending Booking Requests'}</h3>
                <div className="space-y-4 mb-6">{pendingBookings.map(b => renderTripCard(b, 'tourist', true))}</div>
              </>
            )}
            {completedTrips.length > 0 && (
              <>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">{lang === 'ar' ? 'رحلات منتهية' : 'Completed Trips'}</h3>
                <div className="space-y-4">{completedTrips.map(t => renderTripCard(t, 'tourist', false))}</div>
              </>
            )}
            {pendingBookings.length === 0 && completedTrips.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed">
                <CalendarCheck size={48} className="mx-auto text-gray-400" />
                <p className="mt-4 text-gray-500">{lang === 'ar' ? 'لا توجد حجوزات قمت بها كمسافر' : 'No bookings made as a tourist'}</p>
                <button onClick={() => setPage('explore')} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg">{lang === 'ar' ? 'استكشف البرامج' : 'Explore Programs'}</button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default MyTripsPage;

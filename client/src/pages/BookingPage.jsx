// client/src/pages/BookingPage.jsx
// ✅ مدمج مع نظام المحفظة الرقمية
// ✅ إدارة الحجوزات مع خصم رصيد السائح وإضافة رصيد المرشد
// ✅ دعم رسوم الخدمة (2.5%) وتحويل الصافي
// ✅ إعادة الأموال عند الإلغاء

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FaCalendar, FaClock, FaMapMarkerAlt, FaUser, FaStar, FaEye,
  FaFilter, FaDownload, FaPrint, FaWallet, FaSpinner, FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const BookingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const { balance, getBalance, loadWallet, deposit, withdraw, hold, release } = useWallet();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [processingBookingId, setProcessingBookingId] = useState(null);

  const lang = language;
  const t = (key) => {
    const texts = {
      ar: {
        totalBookings: 'إجمالي الحجوزات',
        completed: 'المكتملة',
        pending: 'المعلقة',
        totalAmount: 'إجمالي المبالغ',
        walletBalance: 'رصيد المحفظة',
        sar: 'ريال',
        accept: 'قبول',
        reject: 'رفض',
        complete: 'إكتملت الرحلة',
        cancel: 'إلغاء الحجز',
        chat: 'تواصل',
        details: 'تفاصيل',
        print: 'طباعة',
        export: 'تصدير',
        allDates: 'كل التواريخ',
        lastWeek: 'آخر أسبوع',
        lastMonth: 'آخر شهر',
        status: 'الحالة',
        confirmed: 'مؤكد',
        cancelled: 'ملغي',
        inProgress: 'جاري',
        commission: 'عمولة المنصة (2.5%)',
        netAmount: 'المبلغ الصافي للمرشد',
        feeBreakdown: 'تفاصيل الرسوم'
      },
      en: {
        totalBookings: 'Total Bookings',
        completed: 'Completed',
        pending: 'Pending',
        totalAmount: 'Total Amount',
        walletBalance: 'Wallet Balance',
        sar: 'SAR',
        accept: 'Accept',
        reject: 'Reject',
        complete: 'Complete Trip',
        cancel: 'Cancel Booking',
        chat: 'Chat',
        details: 'Details',
        print: 'Print',
        export: 'Export',
        allDates: 'All Dates',
        lastWeek: 'Last Week',
        lastMonth: 'Last Month',
        status: 'Status',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        inProgress: 'In Progress',
        commission: 'Platform Fee (2.5%)',
        netAmount: 'Net Amount to Guide',
        feeBreakdown: 'Fee Breakdown'
      }
    };
    return texts[lang][key] || key;
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadWallet(); // تحميل رصيد المحفظة
      loadBookings();
    }
  }, [isAuthenticated, user]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const endpoint = user?.type === 'guide' 
        ? `/bookings/guide/${user.id}`
        : `/bookings/tourist/${user.id}`;
      
      const response = await api.get(endpoint);
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل الحجوزات' : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // قبول الحجز من قبل المرشد (خصم المبلغ من السائح وتجميده)
  const handleAcceptBooking = async (bookingId, bookingAmount) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من قبول الحجز؟ سيتم خصم المبلغ من رصيد السائح.' : 'Confirm acceptance? Amount will be deducted from tourist.')) return;
    
    setProcessingBookingId(bookingId);
    try {
      // استدعاء API لقبول الحجز (يفترض أن الباكند يقوم بالخصم والتجميد)
      const response = await api.put(`/bookings/${bookingId}/accept`);
      if (response.data.success) {
        toast.success(lang === 'ar' ? 'تم قبول الحجز بنجاح' : 'Booking accepted');
        await loadWallet(); // تحديث رصيد المحفظة
        loadBookings();
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل قبول الحجز' : 'Failed to accept booking'));
    } finally {
      setProcessingBookingId(null);
    }
  };

  // رفض الحجز من قبل المرشد (لا تغيير في الرصيد)
  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من رفض الحجز؟' : 'Confirm rejection?')) return;
    
    setProcessingBookingId(bookingId);
    try {
      const response = await api.put(`/bookings/${bookingId}/reject`);
      if (response.data.success) {
        toast.success(lang === 'ar' ? 'تم رفض الحجز' : 'Booking rejected');
        loadBookings();
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل رفض الحجز' : 'Failed to reject booking'));
    } finally {
      setProcessingBookingId(null);
    }
  };

  // إكمال الحجز من قبل المرشد (تحرير المبلغ المجمد وإيداع الصافي للمرشد)
  const handleCompleteBooking = async (bookingId, bookingAmount) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من إكمال الرحلة؟ سيتم إيداع المبلغ الصافي في محفظتك.' : 'Confirm completion? Net amount will be deposited to your wallet.')) return;
    
    setProcessingBookingId(bookingId);
    try {
      const response = await api.put(`/bookings/${bookingId}/complete`);
      if (response.data.success) {
        toast.success(lang === 'ar' ? 'تم إكمال الحجز بنجاح' : 'Booking completed');
        await loadWallet(); // تحديث رصيد المحفظة
        loadBookings();
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل إكمال الحجز' : 'Failed to complete booking'));
    } finally {
      setProcessingBookingId(null);
    }
  };

  // إلغاء الحجز من قبل السائح (استرداد المبلغ إلى رصيد السائح)
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من إلغاء الحجز؟ سيتم استرداد المبلغ إلى محفظتك.' : 'Confirm cancellation? Amount will be refunded to your wallet.')) return;
    
    setProcessingBookingId(bookingId);
    try {
      const response = await api.put(`/bookings/${bookingId}/cancel`);
      if (response.data.success) {
        toast.success(lang === 'ar' ? 'تم إلغاء الحجز واسترداد المبلغ' : 'Booking cancelled and refunded');
        await loadWallet();
        loadBookings();
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل إلغاء الحجز' : 'Failed to cancel booking'));
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleExportBookings = () => {
    const csvContent = [
      ['ID', 'Date', 'Time', 'Location', 'Amount', 'Status', 'Guide', 'Tourist'],
      ...bookings.map(b => [b.id, b.date, b.time, b.location, b.amount, b.status, b.guideName, b.touristName])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString()}.csv`;
    a.click();
  };

  const handlePrintBooking = (booking) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>تفاصيل الحجز</title>
          <style>
            body { font-family: 'Cairo', sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { border: 1px solid #ddd; padding: 20px; border-radius: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
          </style>
        </head>
        <body>
          <div class="header"><h1>تفاصيل الحجز</h1><p>رقم الحجز: ${booking.id}</p></div>
          <div class="details">
            <div class="row"><span class="label">التاريخ:</span><span class="value">${booking.date}</span></div>
            <div class="row"><span class="label">الوقت:</span><span class="value">${booking.time}</span></div>
            <div class="row"><span class="label">الموقع:</span><span class="value">${booking.location}</span></div>
            <div class="row"><span class="label">المبلغ:</span><span class="value">${booking.amount} ريال</span></div>
            <div class="row"><span class="label">الحالة:</span><span class="value">${booking.status}</span></div>
            <div class="row"><span class="label">المرشد:</span><span class="value">${booking.guideName}</span></div>
            <div class="row"><span class="label">السائح:</span><span class="value">${booking.touristName}</span></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-600', label: lang === 'ar' ? 'معلق' : 'Pending' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-600', label: lang === 'ar' ? 'مؤكد' : 'Confirmed' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-600', label: lang === 'ar' ? 'مكتمل' : 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: lang === 'ar' ? 'ملغي' : 'Cancelled' },
      in_progress: { bg: 'bg-purple-100', text: 'text-purple-600', label: lang === 'ar' ? 'جاري' : 'In Progress' }
    };
    return colors[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter !== 'all' && booking.status !== filter) return false;
    if (dateRange !== 'all') {
      const bookingDate = new Date(booking.date);
      const today = new Date();
      const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7);
      const monthAgo = new Date(); monthAgo.setMonth(today.getMonth() - 1);
      if (dateRange === 'week' && bookingDate < weekAgo) return false;
      if (dateRange === 'month' && bookingDate < monthAgo) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FaSpinner className="animate-spin text-green-600 text-4xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header with Wallet Balance */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-l from-green-600 to-emerald-600 rounded-2xl p-6 text-white mb-6 shadow-lg"
        >
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {user?.type === 'guide' ? (lang === 'ar' ? 'إدارة الحجوزات' : 'Booking Management') : (lang === 'ar' ? 'حجوزاتي' : 'My Bookings')}
              </h1>
              <p className="text-green-100 text-sm">
                {user?.type === 'guide' 
                  ? (lang === 'ar' ? 'عرض وإدارة جميع حجوزاتك مع السياح' : 'View and manage your bookings with tourists')
                  : (lang === 'ar' ? 'عرض وتتبع حجوزاتك مع المرشدين' : 'View and track your bookings with guides')}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center min-w-[140px]">
              <p className="text-xs opacity-90">{t('walletBalance')}</p>
              <p className="text-xl font-bold">{getBalance()} {t('sar')}</p>
            </div>
          </div>
        </motion.div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="flex gap-3 flex-wrap">
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-xl font-bold transition ${
                    filter === status 
                      ? (status === 'pending' ? 'bg-yellow-500 text-white' :
                         status === 'confirmed' ? 'bg-green-600 text-white' :
                         status === 'completed' ? 'bg-blue-600 text-white' :
                         status === 'cancelled' ? 'bg-red-600 text-white' :
                         'bg-green-600 text-white')
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? (lang === 'ar' ? 'الكل' : 'All') :
                   status === 'pending' ? t('pending') :
                   status === 'confirmed' ? t('confirmed') :
                   status === 'completed' ? t('completed') : t('cancelled')}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
              >
                <option value="all">{t('allDates')}</option>
                <option value="week">{t('lastWeek')}</option>
                <option value="month">{t('lastMonth')}</option>
              </select>
              <button
                onClick={handleExportBookings}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition flex items-center gap-2"
              >
                <FaDownload /> {t('export')}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">{t('totalBookings')}</p>
              <p className="text-2xl font-bold text-gray-800">{bookings.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">{t('completed')}</p>
              <p className="text-2xl font-bold text-green-600">
                {bookings.filter(b => b.status === 'completed').length}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">{t('pending')}</p>
              <p className="text-2xl font-bold text-yellow-600">
                {bookings.filter(b => b.status === 'pending').length}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">{t('totalAmount')}</p>
              <p className="text-2xl font-bold text-blue-600">
                {bookings.reduce((sum, b) => sum + (b.amount || 0), 0)} {t('sar')}
              </p>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <motion.div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <FaCalendar className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">{lang === 'ar' ? 'لا توجد حجوزات' : 'No bookings'}</h3>
            <p className="text-gray-500 mb-6">
              {user?.type === 'guide' 
                ? (lang === 'ar' ? 'لم تصلك أي حجوزات بعد' : 'No incoming bookings yet')
                : (lang === 'ar' ? 'لم تقم بحجز أي رحلة بعد' : 'You have not booked any trip yet')}
            </p>
            {user?.type !== 'guide' && (
              <Link to="/programs" className="inline-block px-6 py-3 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition">
                {lang === 'ar' ? 'تصفح المرشدين' : 'Browse Guides'}
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking, index) => {
              const status = getStatusColor(booking.status);
              const isProcessing = processingBookingId === booking.id;
              const netGuideAmount = booking.amount ? (booking.amount * 0.975).toFixed(2) : 0; // 2.5% fee
              
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition"
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                          {user?.type === 'guide' ? booking.touristName?.charAt(0) : booking.guideName?.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">
                            {user?.type === 'guide' ? booking.touristName : booking.guideName}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1 flex-wrap">
                            <span className="flex items-center gap-1"><FaCalendar /> {new Date(booking.date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                            <span className="flex items-center gap-1"><FaClock /> {booking.time}</span>
                            <span className="flex items-center gap-1"><FaMapMarkerAlt /> {booking.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><p className="text-xs text-gray-500">{lang === 'ar' ? 'البرنامج' : 'Program'}</p><p className="font-bold text-gray-700">{booking.programName || (lang === 'ar' ? 'برنامج سياحي' : 'Tour program')}</p></div>
                          <div><p className="text-xs text-gray-500">{lang === 'ar' ? 'المدة' : 'Duration'}</p><p className="font-bold text-gray-700">{booking.duration || 4} {lang === 'ar' ? 'ساعات' : 'hours'}</p></div>
                          <div><p className="text-xs text-gray-500">{lang === 'ar' ? 'المبلغ' : 'Amount'}</p><p className="font-bold text-green-600">{booking.amount} {t('sar')}</p></div>
                          <div><p className="text-xs text-gray-500">{lang === 'ar' ? 'صافي المرشد' : 'Guide Net'}</p><p className="font-bold text-blue-600">{netGuideAmount} {t('sar')}</p></div>
                        </div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="lg:w-64 flex flex-col gap-3">
                      <div className={`${status.bg} ${status.text} px-4 py-2 rounded-xl text-center font-bold`}>
                        {status.label}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedBooking(booking); setShowDetails(true); }} className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2">
                          <FaEye /> {t('details')}
                        </button>
                        <button onClick={() => handlePrintBooking(booking)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition">
                          <FaPrint />
                        </button>
                      </div>

                      {isProcessing && <div className="flex justify-center"><FaSpinner className="animate-spin text-green-600" /></div>}

                      {user?.type === 'guide' && booking.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleAcceptBooking(booking.id, booking.amount)} disabled={isProcessing} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-bold">✓ {t('accept')}</button>
                          <button onClick={() => handleRejectBooking(booking.id)} disabled={isProcessing} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold">✗ {t('reject')}</button>
                        </div>
                      )}
                      {user?.type === 'guide' && booking.status === 'confirmed' && (
                        <button onClick={() => handleCompleteBooking(booking.id, booking.amount)} disabled={isProcessing} className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold">✓ {t('complete')}</button>
                      )}
                      {user?.type !== 'guide' && booking.status === 'confirmed' && (
                        <button onClick={() => handleCancelBooking(booking.id)} disabled={isProcessing} className="w-full px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-bold">✗ {t('cancel')}</button>
                      )}
                      {booking.status === 'confirmed' && (
                        <Link to={`/chat/${user?.type === 'guide' ? booking.touristId : booking.guideId}`} className="w-full px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-bold text-center">💬 {t('chat')}</Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {showDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{lang === 'ar' ? 'تفاصيل الحجز' : 'Booking Details'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'رقم الحجز' : 'Booking ID'}</p><p className="font-bold text-gray-800">{selectedBooking.id}</p></div>
                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'تاريخ الحجز' : 'Booking Date'}</p><p className="font-bold text-gray-800">{new Date(selectedBooking.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</p></div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'المرشد' : 'Guide'}</p><p className="font-bold text-gray-800">{selectedBooking.guideName}</p></div>
              <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'السائح' : 'Tourist'}</p><p className="font-bold text-gray-800">{selectedBooking.touristName}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'التاريخ' : 'Date'}</p><p className="font-bold text-gray-800">{new Date(selectedBooking.date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</p></div>
                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'الوقت' : 'Time'}</p><p className="font-bold text-gray-800">{selectedBooking.time}</p></div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'الموقع' : 'Location'}</p><p className="font-bold text-gray-800">{selectedBooking.location}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'المبلغ' : 'Amount'}</p><p className="font-bold text-green-600 text-xl">{selectedBooking.amount} {t('sar')}</p></div>
                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</p><p className="font-bold text-gray-800">{selectedBooking.paymentMethod === 'wallet' ? (lang === 'ar' ? 'محفظة التطبيق' : 'App Wallet') : (lang === 'ar' ? 'نقداً' : 'Cash')}</p></div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">{t('status')}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                  selectedBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                  selectedBooking.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                  selectedBooking.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {selectedBooking.status === 'pending' ? t('pending') :
                   selectedBooking.status === 'confirmed' ? t('confirmed') :
                   selectedBooking.status === 'completed' ? t('completed') : t('cancelled')}
                </span>
              </div>
              {selectedBooking.notes && (
                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-sm text-gray-500 mb-1">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</p><p className="text-gray-700">{selectedBooking.notes}</p></div>
              )}
              {selectedBooking.feeBreakdown && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-3">{t('feeBreakdown')} (2.5%)</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>{lang === 'ar' ? 'رسوم تشغيل المنصة (0.50%)' : 'Platform fee (0.50%)'}</span><span>{selectedBooking.feeBreakdown.platform} {t('sar')}</span></div>
                    <div className="flex justify-between text-sm"><span>{lang === 'ar' ? 'رسوم الحجز (0.75%)' : 'Booking fee (0.75%)'}</span><span>{selectedBooking.feeBreakdown.booking} {t('sar')}</span></div>
                    <div className="flex justify-between text-sm"><span>{lang === 'ar' ? 'رسوم الخريطة (0.50%)' : 'Map fee (0.50%)'}</span><span>{selectedBooking.feeBreakdown.map} {t('sar')}</span></div>
                    <div className="flex justify-between text-sm"><span>{lang === 'ar' ? 'رسوم بوابة الدفع (0.50%)' : 'Payment gateway fee (0.50%)'}</span><span>{selectedBooking.feeBreakdown.payment} {t('sar')}</span></div>
                    <div className="flex justify-between text-sm"><span>{lang === 'ar' ? 'صندوق الحماية (0.25%)' : 'Dispute fund (0.25%)'}</span><span>{selectedBooking.feeBreakdown.dispute} {t('sar')}</span></div>
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold"><span>{t('commission')}</span><span className="text-green-600">{selectedBooking.commission} {t('sar')}</span></div>
                    <div className="flex justify-between font-bold"><span>{t('netAmount')}</span><span className="text-blue-600">{(selectedBooking.amount - selectedBooking.commission).toFixed(2)} {t('sar')}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDetails(false)} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition">{lang === 'ar' ? 'إغلاق' : 'Close'}</button>
              <button onClick={() => handlePrintBooking(selectedBooking)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"><FaPrint /></button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;

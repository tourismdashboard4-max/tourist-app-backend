import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  FaCalendar, 
  FaClock, 
  FaMapMarkerAlt, 
  FaUser, 
  FaStar, 
  FaEye,
  FaFilter,
  FaDownload,
  FaPrint
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const BookingPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const endpoint = user?.type === 'guide' 
        ? `/bookings/guide/${user.id}`
        : `/bookings/tourist/${user.id}`;
      
      const response = await api.get(endpoint);
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('فشل تحميل الحجوزات');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء الحجز؟')) return;

    try {
      const response = await api.put(`/bookings/${bookingId}/cancel`);
      if (response.data.success) {
        toast.success('تم إلغاء الحجز بنجاح');
        loadBookings();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إلغاء الحجز');
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    if (!window.confirm('هل أنت متأكد من إكمال الحجز؟')) return;

    try {
      const response = await api.put(`/bookings/${bookingId}/complete`);
      if (response.data.success) {
        toast.success('تم إكمال الحجز بنجاح');
        loadBookings();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إكمال الحجز');
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      const response = await api.put(`/bookings/${bookingId}/accept`);
      if (response.data.success) {
        toast.success('تم قبول الحجز');
        loadBookings();
      }
    } catch (error) {
      toast.error('فشل قبول الحجز');
    }
  };

  const handleRejectBooking = async (bookingId) => {
    try {
      const response = await api.put(`/bookings/${bookingId}/reject`);
      if (response.data.success) {
        toast.success('تم رفض الحجز');
        loadBookings();
      }
    } catch (error) {
      toast.error('فشل رفض الحجز');
    }
  };

  const handleExportBookings = () => {
    // تصدير الحجوزات كملف CSV
    const csvContent = [
      ['رقم الحجز', 'التاريخ', 'الوقت', 'الموقع', 'المبلغ', 'الحالة'],
      ...bookings.map(b => [b.id, b.date, b.time, b.location, b.amount, b.status])
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
          <div class="header">
            <h1>تفاصيل الحجز</h1>
            <p>رقم الحجز: ${booking.id}</p>
          </div>
          <div class="details">
            <div class="row"><span class="label">التاريخ:</span><span class="value">${booking.date}</span></div>
            <div class="row"><span class="label">الوقت:</span><span class="value">${booking.time}</span></div>
            <div class="row"><span class="label">الموقع:</span><span class="value">${booking.location}</span></div>
            <div class="row"><span class="label">المبلغ:</span><span class="value">${booking.amount} ريال</span></div>
            <div class="row"><span class="label">الحالة:</span><span class="value">${booking.status}</span></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-600', label: 'معلق' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-600', label: 'مؤكد' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'مكتمل' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: 'ملغي' },
      in_progress: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'جاري' }
    };
    return colors[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  };

  // فلترة الحجوزات
  const filteredBookings = bookings.filter(booking => {
    if (filter !== 'all' && booking.status !== filter) return false;
    
    if (dateRange !== 'all') {
      const bookingDate = new Date(booking.date);
      const today = new Date();
      const weekAgo = new Date(today.setDate(today.getDate() - 7));
      const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
      
      if (dateRange === 'week' && bookingDate < weekAgo) return false;
      if (dateRange === 'month' && bookingDate < monthAgo) return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-l from-green-600 to-emerald-600 rounded-2xl p-8 text-white mb-8 shadow-lg"
        >
          <h1 className="text-3xl font-bold mb-2">
            {user?.type === 'guide' ? 'إدارة الحجوزات' : 'حجوزاتي'}
          </h1>
          <p className="text-green-100">
            {user?.type === 'guide' 
              ? 'عرض وإدارة جميع حجوزاتك مع السياح'
              : 'عرض وتتبع حجوزاتك مع المرشدين'}
          </p>
        </motion.div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl font-bold transition ${
                  filter === 'all' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-xl font-bold transition ${
                  filter === 'pending' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                معلقة
              </button>
              <button
                onClick={() => setFilter('confirmed')}
                className={`px-4 py-2 rounded-xl font-bold transition ${
                  filter === 'confirmed' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                مؤكدة
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-xl font-bold transition ${
                  filter === 'completed' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                مكتملة
              </button>
              <button
                onClick={() => setFilter('cancelled')}
                className={`px-4 py-2 rounded-xl font-bold transition ${
                  filter === 'cancelled' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ملغية
              </button>
            </div>

            <div className="flex gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
              >
                <option value="all">كل التواريخ</option>
                <option value="week">آخر أسبوع</option>
                <option value="month">آخر شهر</option>
              </select>

              <button
                onClick={handleExportBookings}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition flex items-center gap-2"
              >
                <FaDownload /> تصدير
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">إجمالي الحجوزات</p>
              <p className="text-2xl font-bold text-gray-800">{bookings.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">المكتملة</p>
              <p className="text-2xl font-bold text-green-600">
                {bookings.filter(b => b.status === 'completed').length}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">المعلقة</p>
              <p className="text-2xl font-bold text-yellow-600">
                {bookings.filter(b => b.status === 'pending').length}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">إجمالي المبالغ</p>
              <p className="text-2xl font-bold text-blue-600">
                {bookings.reduce((sum, b) => sum + (b.amount || 0), 0)} ريال
              </p>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-12 text-center shadow-lg"
          >
            <FaCalendar className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد حجوزات</h3>
            <p className="text-gray-500 mb-6">
              {user?.type === 'guide' 
                ? 'لم تقم بأي حجوزات بعد'
                : 'لم تقم بحجز أي رحلة بعد'}
            </p>
            {user?.type !== 'guide' && (
              <Link
                to="/programs"
                className="inline-block px-6 py-3 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition"
              >
                تصفح المرشدين
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking, index) => {
              const status = getStatusColor(booking.status);
              
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
                          {user?.type === 'guide' 
                            ? booking.touristName?.charAt(0) 
                            : booking.guideName?.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">
                            {user?.type === 'guide' ? booking.touristName : booking.guideName}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <FaCalendar /> {new Date(booking.date).toLocaleDateString('ar-SA')}
                            </span>
                            <span className="flex items-center gap-1">
                              <FaClock /> {booking.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <FaMapMarkerAlt /> {booking.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Program Details */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">البرنامج</p>
                            <p className="font-bold text-gray-700">{booking.programName || 'برنامج سياحي'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">المدة</p>
                            <p className="font-bold text-gray-700">{booking.duration || 4} ساعات</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">المبلغ</p>
                            <p className="font-bold text-green-600">{booking.amount} ريال</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">طريقة الدفع</p>
                            <p className="font-bold text-gray-700">
                              {booking.paymentMethod === 'wallet' ? 'محفظة' : 'نقداً'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="lg:w-64 flex flex-col gap-3">
                      <div className={`${status.bg} ${status.text} px-4 py-2 rounded-xl text-center font-bold`}>
                        {status.label}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowDetails(true);
                          }}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2"
                        >
                          <FaEye /> تفاصيل
                        </button>
                        <button
                          onClick={() => handlePrintBooking(booking)}
                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition"
                        >
                          <FaPrint />
                        </button>
                      </div>

                      {/* Action Buttons based on status */}
                      {user?.type === 'guide' && booking.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptBooking(booking.id)}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-bold"
                          >
                            قبول
                          </button>
                          <button
                            onClick={() => handleRejectBooking(booking.id)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold"
                          >
                            رفض
                          </button>
                        </div>
                      )}

                      {user?.type === 'guide' && booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleCompleteBooking(booking.id)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold"
                        >
                          إكتملت الرحلة
                        </button>
                      )}

                      {user?.type !== 'guide' && booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="w-full px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-bold"
                        >
                          إلغاء الحجز
                        </button>
                      )}

                      {booking.status === 'confirmed' && (
                        <Link
                          to={`/chat/${user?.type === 'guide' ? booking.touristId : booking.guideId}`}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-bold text-center"
                        >
                          تواصل
                        </Link>
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
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">تفاصيل الحجز</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">رقم الحجز</p>
                  <p className="font-bold text-gray-800">{selectedBooking.id}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">تاريخ الحجز</p>
                  <p className="font-bold text-gray-800">
                    {new Date(selectedBooking.createdAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">المرشد</p>
                <p className="font-bold text-gray-800">{selectedBooking.guideName}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">السائح</p>
                <p className="font-bold text-gray-800">{selectedBooking.touristName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">التاريخ</p>
                  <p className="font-bold text-gray-800">
                    {new Date(selectedBooking.date).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">الوقت</p>
                  <p className="font-bold text-gray-800">{selectedBooking.time}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">الموقع</p>
                <p className="font-bold text-gray-800">{selectedBooking.location}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">المبلغ</p>
                  <p className="font-bold text-green-600 text-xl">{selectedBooking.amount} ريال</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">طريقة الدفع</p>
                  <p className="font-bold text-gray-800">
                    {selectedBooking.paymentMethod === 'wallet' ? 'محفظة التطبيق' : 'نقداً'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">الحالة</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                  selectedBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                  selectedBooking.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                  selectedBooking.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {selectedBooking.status === 'pending' ? 'معلق' :
                   selectedBooking.status === 'confirmed' ? 'مؤكد' :
                   selectedBooking.status === 'completed' ? 'مكتمل' : 'ملغي'}
                </span>
              </div>

              {selectedBooking.notes && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">ملاحظات</p>
                  <p className="text-gray-700">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Fee Breakdown */}
              {selectedBooking.feeBreakdown && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-3">تفاصيل الرسوم (2.5%)</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>رسوم تشغيل المنصة (0.50%)</span>
                      <span className="font-bold">{selectedBooking.feeBreakdown.platform} ريال</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>رسوم الحجز (0.75%)</span>
                      <span className="font-bold">{selectedBooking.feeBreakdown.booking} ريال</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>رسوم الخريطة (0.50%)</span>
                      <span className="font-bold">{selectedBooking.feeBreakdown.map} ريال</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>رسوم بوابة الدفع (0.50%)</span>
                      <span className="font-bold">{selectedBooking.feeBreakdown.payment} ريال</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>صندوق الحماية (0.25%)</span>
                      <span className="font-bold">{selectedBooking.feeBreakdown.dispute} ريال</span>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                      <span>إجمالي الرسوم</span>
                      <span className="text-green-600">{selectedBooking.commission} ريال</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
              >
                إغلاق
              </button>
              <button
                onClick={() => handlePrintBooking(selectedBooking)}
                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                <FaPrint />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;
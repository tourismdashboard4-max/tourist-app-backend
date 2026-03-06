import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  FaWallet, 
  FaCalendarCheck, 
  FaStar, 
  FaUsers, 
  FaMoneyBillWave,
  FaChartLine,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaUserCheck,
  FaUserClock,
  FaChartBar
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const GuideDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalBookings: 0,
    averageRating: 0,
    totalTourists: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    monthlyEarnings: 0,
    weeklyEarnings: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // إحصائيات عامة
      const statsResponse = await api.get(`/guides/${user.id}/stats`);
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // الحجوزات الأخيرة
      const bookingsResponse = await api.get(`/guides/${user.id}/bookings?limit=10`);
      if (bookingsResponse.data.success) {
        setRecentBookings(bookingsResponse.data.data);
      }

      // حالة التوفر
      const availabilityResponse = await api.get(`/guides/${user.id}/availability`);
      if (availabilityResponse.data.success) {
        setAvailability(availabilityResponse.data.data.available);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('فشل تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async (status) => {
    try {
      const response = await api.put(`/guides/${user.id}/availability`, { available: status });
      if (response.data.success) {
        setAvailability(status);
        toast.success(`تم تحديث الحالة إلى ${status ? 'متاح' : 'غير متاح'}`);
      }
    } catch (error) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      const response = await api.put(`/bookings/${bookingId}/accept`);
      if (response.data.success) {
        toast.success('تم قبول الحجز');
        loadDashboardData();
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
        loadDashboardData();
      }
    } catch (error) {
      toast.error('فشل رفض الحجز');
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    try {
      const response = await api.put(`/bookings/${bookingId}/complete`);
      if (response.data.success) {
        toast.success('تم إكمال الحجز');
        loadDashboardData();
      }
    } catch (error) {
      toast.error('فشل إكمال الحجز');
    }
  };

  // Chart Data
  const earningsChartData = {
    labels: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    datasets: [
      {
        label: 'الأرباح اليومية',
        data: [120, 250, 180, 300, 450, 200, 150],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.4
      }
    ]
  };

  const bookingsChartData = {
    labels: ['مكتملة', 'معلقة', 'ملغية'],
    datasets: [
      {
        data: [stats.completedBookings, stats.pendingBookings, stats.cancelledBookings],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(234, 179, 8)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        rtl: true,
        labels: {
          font: {
            family: 'Cairo'
          }
        }
      }
    }
  };

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">مرحباً {user?.name}</h1>
              <p className="text-green-100">لوحة تحكم المرشد السياحي</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleUpdateAvailability(true)}
                className={`px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  availability 
                    ? 'bg-green-500 text-white cursor-default' 
                    : 'bg-white text-green-600 hover:bg-green-50'
                }`}
                disabled={availability}
              >
                <FaUserCheck />
                <span>متاح</span>
              </button>
              <button
                onClick={() => handleUpdateAvailability(false)}
                className={`px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                  !availability 
                    ? 'bg-gray-500 text-white cursor-default' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                disabled={!availability}
              >
                <FaUserClock />
                <span>غير متاح</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FaMoneyBillWave className="text-green-600 text-xl" />
              </div>
              <span className="text-sm text-gray-500">إجمالي الأرباح</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.totalEarnings} ريال</p>
            <p className="text-sm text-green-600 mt-2">+{stats.monthlyEarnings} هذا الشهر</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaCalendarCheck className="text-blue-600 text-xl" />
              </div>
              <span className="text-sm text-gray-500">إجمالي الحجوزات</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.totalBookings}</p>
            <p className="text-sm text-blue-600 mt-2">{stats.completedBookings} مكتملة</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <FaStar className="text-yellow-600 text-xl" />
              </div>
              <span className="text-sm text-gray-500">التقييم</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.averageRating.toFixed(1)} / 5</p>
            <div className="flex gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} className={i < Math.round(stats.averageRating) ? 'text-yellow-400' : 'text-gray-300'} />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FaUsers className="text-purple-600 text-xl" />
              </div>
              <span className="text-sm text-gray-500">عدد السياح</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.totalTourists}</p>
            <p className="text-sm text-purple-600 mt-2">{stats.pendingBookings} حجز معلق</p>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">الأرباح</h3>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="week">آخر 7 أيام</option>
                <option value="month">آخر 30 يوم</option>
                <option value="year">آخر سنة</option>
              </select>
            </div>
            <Line data={earningsChartData} options={chartOptions} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-6">توزيع الحجوزات</h3>
            <div className="flex justify-center">
              <div className="w-64 h-64">
                <Doughnut data={bookingsChartData} options={chartOptions} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-6 shadow-lg"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">آخر الحجوزات</h3>
            <button className="text-green-600 hover:text-green-700 text-sm font-bold">
              عرض الكل
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <FaCalendarCheck className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">لا توجد حجوزات حالياً</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-4 mb-3 md:mb-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                      {booking.touristName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{booking.touristName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(booking.date).toLocaleDateString('ar-SA')} - {booking.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                      booking.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {booking.status === 'pending' ? 'معلق' :
                       booking.status === 'confirmed' ? 'مؤكد' :
                       booking.status === 'completed' ? 'مكتمل' : 'ملغي'}
                    </span>

                    <span className="font-bold text-gray-800 min-w-[80px]">
                      {booking.amount} ريال
                    </span>

                    {booking.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptBooking(booking.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition"
                        >
                          قبول
                        </button>
                        <button
                          onClick={() => handleRejectBooking(booking.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition"
                        >
                          رفض
                        </button>
                      </div>
                    )}

                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleCompleteBooking(booking.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
                      >
                        إكتملت
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GuideDashboardPage;
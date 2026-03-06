import api from './apiService';

class BookingService {
  async createBooking(bookingData) {
    try {
      const response = await api.createBooking(bookingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getUserBookings(userId, status = null) {
    try {
      const params = status ? { status } : {};
      const response = await api.getUserBookings(userId, params);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getGuideBookings(guideId, status = null) {
    try {
      const params = status ? { status } : {};
      const response = await api.getGuideBookings(guideId, params);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getBookingDetails(bookingId) {
    try {
      const response = await api.getBookingById(bookingId);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async acceptBooking(bookingId) {
    try {
      const response = await api.updateBookingStatus(bookingId, 'confirmed');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async rejectBooking(bookingId, reason = '') {
    try {
      const response = await api.updateBookingStatus(bookingId, 'rejected', { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async completeBooking(bookingId) {
    try {
      const response = await api.updateBookingStatus(bookingId, 'completed');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async cancelBooking(bookingId) {
    try {
      const response = await api.cancelBooking(bookingId);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async rateBooking(bookingId, rating, review = '') {
    try {
      const response = await api.post(`/bookings/${bookingId}/rate`, { rating, review });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  getStatusText(status, lang = 'ar') {
    const statusMap = {
      pending: { ar: 'معلق', en: 'Pending' },
      confirmed: { ar: 'مؤكد', en: 'Confirmed' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
      rejected: { ar: 'مرفوض', en: 'Rejected' }
    };
    return statusMap[status]?.[lang] || status;
  }

  getStatusColor(status) {
    const colorMap = {
      pending: 'yellow',
      confirmed: 'green',
      completed: 'blue',
      cancelled: 'red',
      rejected: 'red'
    };
    return colorMap[status] || 'gray';
  }
}

export default new BookingService();
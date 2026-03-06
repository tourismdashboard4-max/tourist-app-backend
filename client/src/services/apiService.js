import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor للطلبات
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor للردود
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // تجديد التوكن إذا انتهت صلاحيته
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const response = await this.api.post('/auth/refresh', { refreshToken });
            if (response.data.token) {
              localStorage.setItem('token', response.data.token);
              originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // توجيه لصفحة تسجيل الدخول
            localStorage.clear();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ===================== Auth APIs =====================
  async register(userData) {
    return this.api.post('/auth/register', userData);
  }

  async login(email, password) {
    return this.api.post('/auth/login', { email, password });
  }

  async logout() {
    return this.api.post('/auth/logout');
  }

  async getCurrentUser() {
    return this.api.get('/auth/me');
  }

  async updateProfile(data) {
    return this.api.put('/auth/profile', data);
  }

  async changePassword(data) {
    return this.api.put('/auth/change-password', data);
  }

  // ===================== Wallet APIs =====================
  async getWallet(userId) {
    return this.api.get(`/wallet/${userId}`);
  }

  async getTransactions(userId, params = {}) {
    return this.api.get(`/wallet/${userId}/transactions`, { params });
  }

  async deposit(data) {
    return this.api.post('/wallet/deposit', data);
  }

  async withdrawRequest(data) {
    return this.api.post('/wallet/withdraw-request', data);
  }

  // ===================== Booking APIs =====================
  async createBooking(data) {
    return this.api.post('/bookings', data);
  }

  async getUserBookings(userId, params = {}) {
    return this.api.get(`/bookings/user/${userId}`, { params });
  }

  async getGuideBookings(guideId, params = {}) {
    return this.api.get(`/bookings/guide/${guideId}`, { params });
  }

  async getBookingById(bookingId) {
    return this.api.get(`/bookings/${bookingId}`);
  }

  async updateBookingStatus(bookingId, status) {
    return this.api.put(`/bookings/${bookingId}/status`, { status });
  }

  async cancelBooking(bookingId) {
    return this.api.put(`/bookings/${bookingId}/cancel`);
  }

  // ===================== Guide APIs =====================
  async getGuides(params = {}) {
    return this.api.get('/guides', { params });
  }

  async getGuideById(guideId) {
    return this.api.get(`/guides/${guideId}`);
  }

  async getGuidePrograms(guideId) {
    return this.api.get(`/guides/${guideId}/programs`);
  }

  async createProgram(data) {
    return this.api.post('/guides/programs', data);
  }

  async updateProgram(programId, data) {
    return this.api.put(`/guides/programs/${programId}`, data);
  }

  async deleteProgram(programId) {
    return this.api.delete(`/guides/programs/${programId}`);
  }

  // ===================== Chat APIs =====================
  async getConversations() {
    return this.api.get('/chat/conversations');
  }

  async getMessages(conversationId, params = {}) {
    return this.api.get(`/chat/conversations/${conversationId}/messages`, { params });
  }

  async sendMessage(data) {
    return this.api.post('/chat/messages', data);
  }

  async deleteMessage(messageId) {
    return this.api.delete(`/chat/messages/${messageId}`);
  }

  async markMessageAsRead(messageId) {
    return this.api.put(`/chat/messages/${messageId}/read`);
  }

  async createConversation(participantId) {
    return this.api.post('/chat/conversations', { participantId });
  }

  // ===================== Notification APIs =====================
  async getNotifications(params = {}) {
    return this.api.get('/notifications', { params });
  }

  async markNotificationAsRead(notificationId) {
    return this.api.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.api.put('/notifications/read-all');
  }

  async deleteNotification(notificationId) {
    return this.api.delete(`/notifications/${notificationId}`);
  }

  async getNotificationPreferences() {
    return this.api.get('/notifications/preferences');
  }

  async updateNotificationPreferences(preferences) {
    return this.api.put('/notifications/preferences', preferences);
  }
}

export default new ApiService();
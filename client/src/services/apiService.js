// client/src/services/apiService.js
// ✅ يدعم username - إضافة عمود جديد في قاعدة البيانات
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        console.log(`📤 ${config.method.toUpperCase()} ${config.url}`);
        if (config.data && !(config.data instanceof FormData))
          console.log('📦 Payload:', config.data);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => {
        console.log(`📥 ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.status);
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest?._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const response = await this.api.post('/api/auth/refresh', { refreshToken });
            if (response.data.token) {
              localStorage.setItem('token', response.data.token);
              originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
              return this.api(originalRequest);
            }
          } catch {
            localStorage.clear();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ========== Auth ==========
  async register(userData) { return this.api.post('/api/auth/register', userData); }
  async login(email, password) { return this.api.post('/api/auth/login', { email, password }); }
  async logout() { return this.api.post('/api/auth/logout'); }
  async getCurrentUser() { return this.api.get('/api/auth/me'); }
  async updateProfile(data) { return this.api.put('/api/auth/profile', data); }
  async changePassword(data) { return this.api.put('/api/auth/change-password', data); }

  // ========== OTP ==========
  async sendOTP(email) { return this.api.post('/api/auth/send-otp', { email }); }
  async verifyOTP(email, code, fullName, password) {
    return this.api.post('/api/auth/verify-otp', { email, code, fullName, password });
  }
  async forgotPassword(email) { return this.api.post('/api/auth/forgot-password', { email }); }
  async resetPassword(email, code, newPassword) {
    return this.api.post('/api/auth/reset-password', { email, code, newPassword });
  }

  // ========== User Profile ==========
  async getUserProfile(userId) {
    return this.api.get(`/api/users/${userId}`);
  }

  async updateUserProfile(userId, userData) {
    // تحويل camelCase إلى snake_case للتوافق مع الخادم (fullName -> full_name)
    const transformed = {};
    if (userData.fullName !== undefined) transformed.full_name = userData.fullName;
    if (userData.username !== undefined) transformed.username = userData.username;
    if (userData.phone !== undefined) transformed.phone = userData.phone;
    if (userData.address !== undefined) transformed.address = userData.address;
    // إذا أرسل full_name مباشرة
    if (userData.full_name !== undefined) transformed.full_name = userData.full_name;
    // أي حقول أخرى لم نتعرف عليها
    Object.keys(userData).forEach(key => {
      if (!['fullName', 'username', 'phone', 'address', 'full_name'].includes(key))
        transformed[key] = userData[key];
    });

    console.log('📤 Updating profile with:', transformed);
    const response = await this.api.put(`/api/users/${userId}/profile`, transformed);
    return response;
  }

  // ========== Avatar ==========
  async uploadAvatar(userId, formData) {
    return this.api.post(`/api/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  async deleteAvatar(userId) {
    return this.api.delete(`/api/users/${userId}/avatar`);
  }

  // ========== Bank Accounts ==========
  async getBankAccounts(userId) {
    try {
      const response = await this.api.get(`/api/users/${userId}/bank-accounts`);
      return { success: true, accounts: response.data.accounts || response.data || [] };
    } catch (error) {
      console.error('❌ Get bank accounts error:', error);
      return { success: false, accounts: [], message: error.response?.data?.message };
    }
  }
  async addBankAccount(userId, accountData) {
    try {
      const response = await this.api.post(`/api/users/${userId}/bank-accounts`, accountData);
      return { success: true, account: response.data.account || response.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message };
    }
  }
  async deleteBankAccount(userId, accountId) {
    try {
      const response = await this.api.delete(`/api/users/${userId}/bank-accounts/${accountId}`);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message };
    }
  }

  // ========== Phone Verification ==========
  async sendPhoneVerification(userId, phoneNumber) {
    return this.api.post('/api/auth/verify-phone/send', { userId, phoneNumber });
  }
  async verifyPhoneCode(userId, phoneNumber, code) {
    return this.api.post('/api/auth/verify-phone/verify', { userId, phoneNumber, code });
  }
  async resendPhoneVerification(userId, phoneNumber) {
    return this.api.post('/api/auth/verify-phone/resend', { userId, phoneNumber });
  }
  async updateUserPhone(userId, phoneNumber) {
    return this.api.put(`/api/users/${userId}/phone`, { phone: phoneNumber, verified: true });
  }

  // ========== Guide & Upgrade ==========
  async registerGuide(guideData) { return this.api.post('/api/guides/register', guideData); }
  async loginGuide(email, password) { return this.api.post('/api/guides/login', { email, password }); }
  async upgradeToGuide(formData) {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/api/upgrade/upgrade-requests`, formData, {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: token ? `Bearer ${token}` : '' }
    });
    return { success: true, requestId: response.data.request?.id };
  }
  async getMyUpgradeStatus() { return this.api.get('/api/upgrade/upgrade-requests/my-status'); }
  async getAllUpgradeRequests() { return this.api.get('/api/upgrade/upgrade-requests'); }
  async approveUpgradeRequest(requestId, notes = '') {
    return this.api.post(`/api/upgrade/upgrade-requests/${requestId}/approve`, { notes });
  }
  async rejectUpgradeRequest(requestId, reason) {
    return this.api.post(`/api/upgrade/upgrade-requests/${requestId}/reject`, { reason });
  }

  // ========== Wallet & Transactions ==========
  async getWallet(userId) { return this.api.get(`/api/wallet/${userId}`); }
  async getTransactions(userId, params = {}) { return this.api.get(`/api/wallet/${userId}/transactions`, { params }); }
  async createWallet(data) { return this.api.post('/api/wallet/create', data); }
  async deposit(data) { return this.api.post('/api/wallet/deposit', data); }
  async withdrawRequest(data) { return this.api.post('/api/wallet/withdraw-request', data); }
  async depositWithCard(userId, amount, cardNumber, cardHolder) {
    const response = await this.api.post(`/api/wallet/${userId}/deposit/card`, { amount, cardNumber, cardHolder });
    return { success: true, newBalance: response.data.newBalance };
  }
  async depositWithAccount(userId, amount, account) {
    const response = await this.api.post(`/api/wallet/${userId}/deposit/account`, { amount, account });
    return { success: true, newBalance: response.data.newBalance };
  }
  async withdrawToCard(userId, amount, cardNumber, cardHolder) {
    const response = await this.api.post(`/api/wallet/${userId}/withdraw/card`, { amount, cardNumber, cardHolder });
    return { success: true, newBalance: response.data.newBalance };
  }
  async withdrawToAccount(userId, amount, account) {
    const response = await this.api.post(`/api/wallet/${userId}/withdraw/account`, { amount, account });
    return { success: true, newBalance: response.data.newBalance };
  }

  // ========== Notifications ==========
  async getNotifications(params = {}) { return this.api.get('/api/notifications', { params }); }
  async markNotificationAsRead(notificationId) { return this.api.put(`/api/notifications/${notificationId}/read`); }
  async markAllNotificationsAsRead() { return this.api.put('/api/notifications/read-all'); }

  // ========== Helpers ==========
  validateSaudiPhone(phone) {
    const clean = phone.replace(/\s/g, '');
    return /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/.test(clean);
  }
  normalizePhoneNumber(phone) {
    let clean = phone.replace(/\s/g, '');
    if (clean.startsWith('+966')) clean = '0' + clean.slice(4);
    if (clean.startsWith('00966')) clean = '0' + clean.slice(5);
    if (clean.startsWith('966')) clean = '0' + clean.slice(3);
    if (clean.startsWith('5')) clean = '0' + clean;
    return clean;
  }
  isAuthenticated() { return !!localStorage.getItem('token'); }
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  getToken() { return localStorage.getItem('token'); }
}

export default new ApiService();

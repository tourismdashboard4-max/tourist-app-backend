// client/src/services/api.js
const API_BASE_URL = 'https://tourist-app-api.onrender.com';

export const api = {
  // ============================================
  // 📧 OTP SERVICES - رموز التحقق
  // ============================================
  
  async sendOTP(email) {
    try {
      console.log('📤 Sending OTP request for:', email);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      console.log('📥 OTP response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال رمز التحقق');
      }

      return data;
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      throw error;
    }
  },

  async verifyOTP(email, code, purpose = 'register') {
    try {
      console.log('📤 Verifying OTP with data:', { email, code, purpose });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, purpose })
      });

      const data = await response.json();
      console.log('📥 Verify response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل التحقق');
      }

      return data;
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      throw error;
    }
  },

  async register(email, fullName, password) {
    try {
      console.log('📤 Registering new user:', { email, fullName });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, fullName, password })
      });

      const data = await response.json();
      console.log('📥 Register response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إنشاء الحساب');
      }

      // ✅ حفظ المستخدم في localStorage بعد التسجيل الناجح
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userType', data.user.role || 'user');
        console.log('✅ User registered and saved to localStorage');
      }

      return data;
    } catch (error) {
      console.error('❌ Register error:', error);
      throw error;
    }
  },

  async resendOTP(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إعادة الإرسال');
      }

      return data;
    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      throw error;
    }
  },

  // ============================================
  // 👤 USER SERVICES - المستخدمين العاديين
  // ============================================
  
  async login(email, password) {
    try {
      console.log('📤 Login attempt for:', email);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('📥 Login response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تسجيل الدخول');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userType', data.user.role || 'user');
        console.log('✅ User logged in and saved to localStorage');
      }

      return data;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  async forgotPassword(email) {
    try {
      console.log('📤 Forgot password request for:', email);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      console.log('📥 Forgot password response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال رابط الاستعادة');
      }

      return data;
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      throw error;
    }
  },

  async resetPassword(email, code, newPassword) {
    try {
      console.log('📤 Reset password request:', { email, code, newPassword });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email, 
          code, 
          newPassword,
          purpose: 'reset-password'
        })
      });

      const data = await response.json();
      console.log('📥 Reset password response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إعادة تعيين كلمة المرور');
      }

      return data;
    } catch (error) {
      console.error('❌ Reset password error:', error);
      throw error;
    }
  },

  async getUserProfile(userId) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل الملف الشخصي');
      }

      return data;
    } catch (error) {
      console.error('❌ Get profile error:', error);
      throw error;
    }
  },

  async updateUserProfile(userId, updates) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث الملف الشخصي');
      }

      return data;
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error;
    }
  },

  // ============================================
  // 📱 PHONE VERIFICATION SERVICES - التحقق من الجوال
  // ============================================

  async sendPhoneVerification(userId, phone) {
    try {
      const token = localStorage.getItem('token');
      console.log('📤 Sending phone verification:', { userId, phone });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/send-phone-otp`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال رمز التحقق');
      }

      return data;
    } catch (error) {
      console.error('❌ Send phone verification error:', error);
      throw error;
    }
  },

  async verifyPhoneCode(userId, phone, code) {
    try {
      const token = localStorage.getItem('token');
      console.log('📤 Verifying phone code:', { userId, phone, code });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-phone-otp`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل التحقق');
      }

      return data;
    } catch (error) {
      console.error('❌ Verify phone code error:', error);
      throw error;
    }
  },

  async updatePhone(userId, phone) {
    try {
      const token = localStorage.getItem('token');
      console.log('📤 Updating phone:', { userId, phone });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/update-phone`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث رقم الجوال');
      }

      return data;
    } catch (error) {
      console.error('❌ Update phone error:', error);
      throw error;
    }
  },

  // ============================================
  // 🧑‍🏫 GUIDE SERVICES - المرشدين السياحيين
  // ============================================
  
  async guideRegister(formData) {
    try {
      console.log('📤 Registering new guide:', formData);
      
      const response = await fetch(`${API_BASE_URL}/api/guides/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          civilId: formData.civilId,
          licenseNumber: formData.licenseNumber,
          email: formData.email,
          phone: formData.phone,
          experience: formData.experience || 0,
          specialties: formData.specialties || '',
          programLocation: formData.programLocation || null,
          programLocationName: formData.programLocationName || '',
          timestamp: new Date().toISOString(),
          status: 'pending'
        })
      });

      const data = await response.json();
      console.log('📥 Guide registration response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال طلب التسجيل');
      }

      return data;
    } catch (error) {
      console.error('❌ Guide registration error:', error);
      throw error;
    }
  },

  async guideLogin(licenseNumber, email, password) {
    try {
      console.log('📤 Guide login attempt:', email);
      
      const response = await fetch(`${API_BASE_URL}/api/guides/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseNumber,
          email,
          password
        })
      });

      const data = await response.json();
      console.log('📥 Guide login response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تسجيل الدخول');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userType', 'guide');
        console.log('✅ Guide logged in and saved to localStorage');
      }

      return data;
    } catch (error) {
      console.error('❌ Guide login error:', error);
      throw error;
    }
  },

  async getGuidePrograms(guideId, token) {
    try {
      // ✅ تحويل guideId إلى UUID إذا كان رقماً
      let validGuideId = guideId;
      if (typeof guideId === 'number' || (typeof guideId === 'string' && !guideId.includes('-'))) {
        console.warn(`⚠️ Invalid guide ID format: ${guideId}, attempting to fix...`);
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.id && user.id.includes('-')) {
            validGuideId = user.id;
            console.log(`✅ Using UUID from user object: ${validGuideId}`);
          }
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/api/guides/${validGuideId}/programs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل البرامج');
      }

      return data;
    } catch (error) {
      console.error('❌ Get programs error:', error);
      throw error;
    }
  },

  async addTourProgram(guideId, token, programData) {
    try {
      // ✅ تحويل guideId إلى UUID إذا كان رقماً
      let validGuideId = guideId;
      if (typeof guideId === 'number' || (typeof guideId === 'string' && !guideId.includes('-'))) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.id && user.id.includes('-')) {
            validGuideId = user.id;
            console.log(`✅ Using UUID from user object: ${validGuideId}`);
          }
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/api/programs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guide_id: validGuideId,
          ...programData
        })
      });

      const data = await response.json();
      console.log('📥 Add program response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إضافة البرنامج');
      }

      // ✅ تحديث البرامج في localStorage بعد الإضافة الناجحة
      if (data.success && data.program) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const existingPrograms = JSON.parse(localStorage.getItem(`guide_programs_${validGuideId}`) || '[]');
          existingPrograms.push(data.program);
          localStorage.setItem(`guide_programs_${validGuideId}`, JSON.stringify(existingPrograms));
          console.log('✅ Program saved to localStorage');
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Add program error:', error);
      throw error;
    }
  },

  async toggleProgramStatus(guideId, programId, token, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/programs/${programId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث حالة البرنامج');
      }

      return data;
    } catch (error) {
      console.error('❌ Toggle program error:', error);
      throw error;
    }
  },

  async getGuideProfile(guideId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/guides/${guideId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل بيانات المرشد');
      }

      return data;
    } catch (error) {
      console.error('❌ Get guide profile error:', error);
      throw error;
    }
  },

  async updateGuideProfile(guideId, token, updates) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/guides/${guideId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث البيانات');
      }

      return data;
    } catch (error) {
      console.error('❌ Update guide profile error:', error);
      throw error;
    }
  },

  async getUpgradeStatus(userId) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/guides/status/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل الحالة');
      }

      return data;
    } catch (error) {
      console.error('❌ Get upgrade status error:', error);
      throw error;
    }
  },

  async verifyToken(token) {
    try {
      if (!token) {
        return { valid: false };
      }

      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          return { valid: false };
        }

        const payload = JSON.parse(atob(parts[1]));
        
        const now = Date.now() / 1000;
        if (payload.exp && payload.exp < now) {
          return { valid: false, expired: true };
        }

        return { valid: true, user: payload };
      } catch (e) {
        console.error('❌ Invalid token format:', e);
        return { valid: false };
      }
    } catch (error) {
      console.error('❌ Token verification error:', error);
      return { valid: false };
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    console.log('👋 Logged out successfully');
  },

  // ============================================
  // 👤 USER PROFILE SERVICES - خدمات الملف الشخصي
  // ============================================

  async uploadAvatar(userId, formData) {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Uploading avatar for user:', userId);
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      const data = await response.json();
      console.log('📥 Upload avatar response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل رفع الصورة');
      }

      // ✅ تحديث صورة المستخدم في localStorage
      if (data.success && data.avatar) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.avatar = data.avatar;
          localStorage.setItem('user', JSON.stringify(user));
          console.log('✅ Avatar updated in localStorage');
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Upload avatar error:', error);
      throw error;
    }
  },

  async deleteAvatar(userId) {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Deleting avatar for user:', userId);
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('📥 Delete avatar response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل حذف الصورة');
      }

      // ✅ حذف صورة المستخدم من localStorage
      if (data.success) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.avatar = null;
          localStorage.setItem('user', JSON.stringify(user));
          console.log('✅ Avatar removed from localStorage');
        }
      }

      return data;
    } catch (error) {
      console.error('❌ Delete avatar error:', error);
      throw error;
    }
  },

  // ============================================
  // 🔧 GENERIC HTTP METHODS - دوال عامة
  // ============================================

  async get(url, params = {}) {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const fullUrl = `${API_BASE_URL}${url}${queryParams ? `?${queryParams}` : ''}`;
      
      console.log('📤 GET request to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `فشل الطلب (${response.status})`);
      }

      return { data };
    } catch (error) {
      console.error('❌ GET request error:', error);
      throw error;
    }
  },

  async post(url, data) {
    try {
      const token = localStorage.getItem('token');
      const fullUrl = `${API_BASE_URL}${url}`;
      
      console.log('📤 POST request to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || `فشل الطلب (${response.status})`);
      }

      return { data: responseData };
    } catch (error) {
      console.error('❌ POST request error:', error);
      throw error;
    }
  },

  async put(url, data) {
    try {
      const token = localStorage.getItem('token');
      const fullUrl = `${API_BASE_URL}${url}`;
      
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || `فشل الطلب (${response.status})`);
      }

      return { data: responseData };
    } catch (error) {
      console.error('❌ PUT request error:', error);
      throw error;
    }
  },

  async delete(url) {
    try {
      const token = localStorage.getItem('token');
      const fullUrl = `${API_BASE_URL}${url}`;
      
      const response = await fetch(fullUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || `فشل الطلب (${response.status})`);
      }

      return { data: responseData };
    } catch (error) {
      console.error('❌ DELETE request error:', error);
      throw error;
    }
  },

  // ============================================
  // 🔔 NOTIFICATION SERVICES - الإشعارات
  // ============================================

  async getUserNotifications(params = {}) {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      let baseUrl = `${API_BASE_URL}/api/notifications`;
      if (user?.role === 'admin' || user?.role === 'support') {
        baseUrl = `${API_BASE_URL}/api/notifications/admin-grouped`;
        console.log('🔍 [getUserNotifications] Admin detected, using grouped endpoint');
      }
      
      const queryParams = new URLSearchParams(params).toString();
      const url = `${baseUrl}${queryParams ? `?${queryParams}` : ''}`;
      
      console.log('🔍 [getUserNotifications] URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `فشل تحميل الإشعارات (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      throw error;
    }
  },

  async markNotificationAsRead(notificationId) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/${notificationId}/read`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث الإشعار');
      }

      return data;
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      throw error;
    }
  },

  async markAllNotificationsAsRead() {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/read-all`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث الإشعارات');
      }

      return data;
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      throw error;
    }
  },

  async deleteNotification(notificationId) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/${notificationId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل حذف الإشعار');
      }

      return data;
    } catch (error) {
      console.error('❌ Delete notification error:', error);
      throw error;
    }
  },

  // ============================================
  // 💬 CHAT SERVICES - خدمات المحادثات
  // ============================================

  async getUserConversations() {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('⚠️ No token found for getUserConversations');
        return { success: false, conversations: [] };
      }
      
      console.log('📤 Fetching user conversations...');
      
      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('📥 Conversations response:', data);
      
      if (!response.ok) {
        console.error('❌ Conversations error response:', data);
        return { success: false, conversations: [], error: data.message };
      }

      return {
        success: true,
        conversations: data.conversations || data.data?.conversations || []
      };
    } catch (error) {
      console.error('❌ Get conversations error:', error);
      return { success: false, conversations: [], error: error.message };
    }
  },

  async sendTextMessage(chatId, content) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/chats/message/text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chatId, content })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال الرسالة');
      }

      return data;
    } catch (error) {
      console.error('❌ Send message error:', error);
      throw error;
    }
  },

  // ============================================
  // 🎫 SUPPORT TICKETS - تذاكر الدعم الفني
  // ============================================

  async createSupportTicket(data) {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Creating support ticket with data:', data);
      
      const response = await fetch(`${API_BASE_URL}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();
      console.log('📥 Create ticket response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل إنشاء تذكرة الدعم');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Create support ticket error:', error);
      throw error;
    }
  },

  async getSupportTickets(params = {}) {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_BASE_URL}/api/support/tickets${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل تحميل التذاكر');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Get support tickets error:', error);
      throw error;
    }
  },

  async sendSupportMessage(ticketId, message) {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Sending support message to ticket:', ticketId);
      
      const response = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      const responseData = await response.json();
      console.log('📥 Send message response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل إرسال الرسالة');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Send message error:', error);
      throw error;
    }
  },

  async getSupportMessages(ticketId) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل تحميل الرسائل');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Get messages error:', error);
      throw error;
    }
  },

  // ============================================
  // 📝 UPGRADE REQUESTS - طلبات الترقية
  // ============================================

  async createUpgradeRequest(data) {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Creating upgrade request with data:', data);
      
      const response = await fetch(`${API_BASE_URL}/api/upgrade-requests`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();
      console.log('📥 Create upgrade request response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل إنشاء طلب الترقية');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Create upgrade request error:', error);
      throw error;
    }
  },

  async getUpgradeRequests(params = {}) {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_BASE_URL}/api/upgrade-requests${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل تحميل طلبات الترقية');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Get upgrade requests error:', error);
      throw error;
    }
  },

  async approveUpgradeRequest(requestId, adminNotes = '') {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/upgrade-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminNotes })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل الموافقة على الطلب');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Approve upgrade request error:', error);
      throw error;
    }
  },

  async rejectUpgradeRequest(requestId, reason) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/upgrade-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل رفض الطلب');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Reject upgrade request error:', error);
      throw error;
    }
  },

  async getUserUpgradeRequestStatus() {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/upgrade-requests/my-status`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل تحميل حالة الطلب');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Get upgrade request status error:', error);
      throw error;
    }
  },

  async upgradeToGuide(formData) {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Sending upgrade request to /api/upgrade/upgrade-requests');
      
      const response = await fetch(`${API_BASE_URL}/api/upgrade/upgrade-requests`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      const responseData = await response.json();
      console.log('📥 Upgrade response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل إرسال طلب الترقية');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Upgrade request error:', error);
      throw error;
    }
  }
};

export default api;

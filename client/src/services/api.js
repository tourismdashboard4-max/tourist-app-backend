// client/src/services/api.js
const API_BASE_URL = 'https://tourist-app-api.onrender.com';

export const api = {
  // ============================================
  // 📧 OTP SERVICES - رموز التحقق
  // ============================================
  
  // ✅ إرسال رمز التحقق للبريد الإلكتروني
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

  // ✅ التحقق من الرمز فقط
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

  // ✅ تسجيل مستخدم جديد بعد إدخال البيانات
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

      return data;
    } catch (error) {
      console.error('❌ Register error:', error);
      throw error;
    }
  },

  // ✅ إعادة إرسال الرمز
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
  
  // ✅ تسجيل دخول مستخدم عادي
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
        localStorage.setItem('userType', 'user');
      }

      return data;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  // ✅ استعادة كلمة المرور (إرسال رمز)
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

  // ✅ إعادة تعيين كلمة المرور (معدلة مع purpose)
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

  // ✅ الحصول على ملف المستخدم الشخصي
  async getUserProfile(userId) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/profile/${userId}`, {
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

  // ✅ تحديث الملف الشخصي
  async updateUserProfile(userId, updates) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/profile/${userId}`, {
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

  // ✅ رفع الصورة الشخصية (FormData)
  async uploadAvatar(userId, formData) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/profile/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل رفع الصورة');
      }

      return data;
    } catch (error) {
      console.error('❌ Upload avatar error:', error);
      throw error;
    }
  },

  // ============================================
  // 📱 PHONE VERIFICATION SERVICES - التحقق من الجوال
  // ============================================

  // ✅ إرسال رمز التحقق للجوال
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

  // ✅ التحقق من رمز الجوال
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

  // ✅ تحديث رقم الجوال
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
  
  // ✅ تسجيل مرشد جديد
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

  // ✅ تسجيل دخول المرشد
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
      }

      return data;
    } catch (error) {
      console.error('❌ Guide login error:', error);
      throw error;
    }
  },

  // ✅ الحصول على برامج المرشد
  async getGuidePrograms(guideId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/guides/${guideId}/programs`, {
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

  // ✅ إضافة برنامج سياحي جديد
  async addTourProgram(guideId, token, programData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/guides/${guideId}/programs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(programData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إضافة البرنامج');
      }

      return data;
    } catch (error) {
      console.error('❌ Add program error:', error);
      throw error;
    }
  },

  // ✅ تفعيل/إيقاف برنامج
  async toggleProgramStatus(guideId, programId, token, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/guides/${guideId}/programs/${programId}`, {
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

  // ✅ الحصول على معلومات المرشد
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

  // ✅ تحديث بيانات المرشد
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

  // ✅ الحصول على حالة طلب الترقية
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

  // ✅ التحقق من صحة التوكن
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

  // ✅ تسجيل الخروج
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    console.log('👋 Logged out successfully');
  },

  // ============================================
  // 🔔 NOTIFICATION SERVICES - الإشعارات (مع تحسين التشخيص)
  // ============================================

  // ✅ الحصول على إشعارات المستخدم
  async getUserNotifications(params = {}) {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_BASE_URL}/api/notifications${queryParams ? `?${queryParams}` : ''}`;
      
      console.log('🔍 [getUserNotifications] ==========');
      console.log('🔍 URL:', url);
      console.log('🔍 Token exists:', !!token);
      console.log('🔍 Token (first 20 chars):', token?.substring(0, 20) + '...');
      console.log('🔍 Params:', params);
      console.log('🔍 Query string:', queryParams);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);
      console.log('🔍 Response headers:', {
        'content-type': response.headers.get('content-type'),
      });
      
      const data = await response.json();
      console.log('🔍 Response data:', JSON.stringify(data, null, 2));
      console.log('🔍 =================================');
      
      if (!response.ok) {
        throw new Error(data.message || `فشل تحميل الإشعارات (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  },

  // ✅ الحصول على إحصائيات الإشعارات
  async getNotificationStats() {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/stats`;
      
      console.log('📊 [getNotificationStats] ==========');
      console.log('📊 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Response data:', data);
      console.log('📊 =================================');
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل الإحصائيات');
      }

      return data;
    } catch (error) {
      console.error('❌ Get stats error:', error);
      throw error;
    }
  },

  // ✅ تحديث إشعار كمقروء
  async markNotificationAsRead(notificationId) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/${notificationId}/read`;
      
      console.log('📝 [markNotificationAsRead] ==========');
      console.log('📝 URL:', url);
      console.log('📝 Notification ID:', notificationId);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      console.log('📝 Response status:', response.status);
      
      const data = await response.json();
      console.log('📝 Response data:', data);
      console.log('📝 =================================');
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث الإشعار');
      }

      return data;
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      throw error;
    }
  },

  // ✅ تحديث جميع الإشعارات كمقروءة
  async markAllNotificationsAsRead() {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/read-all`;
      
      console.log('📝 [markAllNotificationsAsRead] ==========');
      console.log('📝 URL:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      console.log('📝 Response status:', response.status);
      
      const data = await response.json();
      console.log('📝 Response data:', data);
      console.log('📝 =================================');
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث الإشعارات');
      }

      return data;
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      throw error;
    }
  },

  // ✅ حذف إشعار
  async deleteNotification(notificationId) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/${notificationId}`;
      
      console.log('🗑️ [deleteNotification] ==========');
      console.log('🗑️ URL:', url);
      console.log('🗑️ Notification ID:', notificationId);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      console.log('🗑️ Response status:', response.status);
      
      const data = await response.json();
      console.log('🗑️ Response data:', data);
      console.log('🗑️ =================================');
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل حذف الإشعار');
      }

      return data;
    } catch (error) {
      console.error('❌ Delete notification error:', error);
      throw error;
    }
  },

  // ✅ حذف إشعارات متعددة
  async deleteMultipleNotifications(notificationIds) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/delete-multiple`;
      
      console.log('🗑️ [deleteMultipleNotifications] ==========');
      console.log('🗑️ URL:', url);
      console.log('🗑️ Notification IDs:', notificationIds);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationIds })
      });

      console.log('🗑️ Response status:', response.status);
      
      const data = await response.json();
      console.log('🗑️ Response data:', data);
      console.log('🗑️ =================================');
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل حذف الإشعارات');
      }

      return data;
    } catch (error) {
      console.error('❌ Delete multiple error:', error);
      throw error;
    }
  },

  // ✅ الرد على إشعار
  async replyToNotification(notificationId, message) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/reply`;
      
      console.log('💬 [replyToNotification] ==========');
      console.log('💬 URL:', url);
      console.log('💬 Notification ID:', notificationId);
      console.log('💬 Message:', message);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationId, message })
      });

      console.log('💬 Response status:', response.status);
      
      const data = await response.json();
      console.log('💬 Response data:', data);
      console.log('💬 =================================');
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال الرد');
      }

      return data;
    } catch (error) {
      console.error('❌ Reply error:', error);
      throw error;
    }
  },

  // ============================================
  // 💬 CHAT SERVICES - خدمات المحادثات (محسنة)
  // ============================================

  // ✅ الحصول على جميع محادثات المستخدم - نسخة محسنة مع معالجة الأخطاء
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
        // بدلاً من رمي خطأ، نعيد مصفوفة فارغة
        return { success: false, conversations: [], error: data.message };
      }

      // التأكد من أن البيانات بالصيغة الصحيحة
      return {
        success: true,
        conversations: data.conversations || data.data?.conversations || []
      };
    } catch (error) {
      console.error('❌ Get conversations error:', error);
      // لا نريد إيقاف التطبيق بسبب فشل جلب المحادثات
      return { success: false, conversations: [], error: error.message };
    }
  },

  // ✅ بدء محادثة دعم جديدة - نسخة محسنة مع معالجة أفضل للأخطاء
  async startSupportChat(data) {
    // إذا كان data عبارة عن string (للتوافق مع الكود القديم)
    if (typeof data === 'string') {
      data = { subject: data, manual: false };
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('📤 Starting support chat with data:', data);
      
      const response = await fetch(`${API_BASE_URL}/api/chats/support`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();
      console.log('📥 Support chat response:', responseData);
      
      if (!response.ok) {
        // رسالة خطأ مخصصة
        let errorMessage = responseData.message || 'فشل بدء محادثة الدعم';
        
        // إذا كان الخطأ يتعلق بعمود status، نعرض رسالة مناسبة
        if (errorMessage.includes('status') || errorMessage.includes('column')) {
          errorMessage = 'خدمة الدعم الفني قيد التحديث، يرجى المحاولة لاحقاً';
        }
        
        throw new Error(errorMessage);
      }

      return responseData;
    } catch (error) {
      console.error('❌ Start support chat error:', error);
      throw error;
    }
  },

  // ✅ إنشاء محادثة جديدة
  async createConversation(participantId, type = 'direct', bookingId = null) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantId, type, bookingId })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إنشاء المحادثة');
      }

      return data;
    } catch (error) {
      console.error('❌ Create conversation error:', error);
      throw error;
    }
  },

  // ✅ الحصول على رسائل محادثة
  async getConversationMessages(conversationId, page = 1, limit = 50) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(
        `${API_BASE_URL}/api/chats/${conversationId}/messages?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل الرسائل');
      }

      return data;
    } catch (error) {
      console.error('❌ Get messages error:', error);
      throw error;
    }
  },

  // ✅ إرسال رسالة نصية
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

  // ✅ إرسال رسالة صورة - إضافة جديدة
  async sendImageMessage(formData, onProgress) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/chats/message/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال الصورة');
      }

      return data;
    } catch (error) {
      console.error('❌ Send image error:', error);
      throw error;
    }
  },

  // ✅ إرسال رسالة ملف - إضافة جديدة
  async sendFileMessage(formData) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/chats/message/file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال الملف');
      }

      return data;
    } catch (error) {
      console.error('❌ Send file error:', error);
      throw error;
    }
  },

  // ✅ تقييم المحادثة - إضافة جديدة
  async rateConversation(conversationId, rating) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/chats/${conversationId}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال التقييم');
      }

      return data;
    } catch (error) {
      console.error('❌ Rate conversation error:', error);
      throw error;
    }
  },

  // ✅ تحديث حالة القراءة
  async markMessageAsRead(messageId) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/chats/message/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحديث حالة القراءة');
      }

      return data;
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      throw error;
    }
  }
};

export default api;

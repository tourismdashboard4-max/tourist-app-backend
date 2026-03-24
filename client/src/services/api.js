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
        localStorage.setItem('userType', 'user');
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
      }

      return data;
    } catch (error) {
      console.error('❌ Guide login error:', error);
      throw error;
    }
  },

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
  // 🔔 NOTIFICATION SERVICES - الإشعارات
  // ============================================

  async getUserNotifications(params = {}) {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_BASE_URL}/api/notifications${queryParams ? `?${queryParams}` : ''}`;
      
      console.log('🔍 [getUserNotifications] ==========');
      console.log('🔍 URL:', url);
      console.log('🔍 Token exists:', !!token);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Response status:', response.status);
      
      const data = await response.json();
      console.log('🔍 Response data:', JSON.stringify(data, null, 2));
      console.log('🔍 =================================');
      
      if (!response.ok) {
        throw new Error(data.message || `فشل تحميل الإشعارات (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      throw error;
    }
  },

  async getNotificationStats() {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/stats`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل الإحصائيات');
      }

      return data;
    } catch (error) {
      console.error('❌ Get stats error:', error);
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

  async deleteMultipleNotifications(notificationIds) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/delete-multiple`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationIds })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل حذف الإشعارات');
      }

      return data;
    } catch (error) {
      console.error('❌ Delete multiple error:', error);
      throw error;
    }
  },

  async replyToNotification(notificationId, message) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/reply`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationId, message })
      });

      const data = await response.json();
      
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

  async startSupportChat(data) {
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
        let errorMessage = responseData.message || 'فشل بدء محادثة الدعم';
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
  },

  // ============================================
  // 🎫 SUPPORT TICKETS - تذاكر الدعم الفني (مع Fallback للتخزين المحلي)
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
      throw this.createLocalTicket(data);
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
      return this.getLocalTickets(params);
    }
  },

  async getSupportTicket(ticketId) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل تحميل التذكرة');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Get support ticket error:', error);
      return this.getLocalTicket(ticketId);
    }
  },

  async sendSupportMessage(ticketId, message, attachments = []) {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Sending support message to ticket:', ticketId);
      console.log('📤 Message:', message);
      
      const response = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, attachments })
      });

      const responseData = await response.json();
      console.log('📥 Send message response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل إرسال الرسالة');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Send message error:', error);
      return this.saveLocalMessage(ticketId, message);
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
      return this.getLocalMessages(ticketId);
    }
  },

  async updateTicketStatus(ticketId, status) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'فشل تحديث حالة التذكرة');
      }

      return responseData;
    } catch (error) {
      console.error('❌ Update ticket status error:', error);
      throw error;
    }
  },

  // ============================================
  // 💾 LOCAL STORAGE FUNCTIONS (Fallback)
  // ============================================

  createLocalTicket(data) {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    const newTicket = {
      id: Date.now(),
      user_id: user?.id || data.user_id,
      user_name: user?.fullName || user?.name || 'مستخدم',
      subject: data.subject || 'طلب دعم جديد',
      type: data.type || 'general',
      priority: data.priority || 'normal',
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fromLocal: true
    };
    
    const ticketsKey = 'support_tickets_local';
    const existingTickets = localStorage.getItem(ticketsKey);
    let allTickets = existingTickets ? JSON.parse(existingTickets) : [];
    allTickets.unshift(newTicket);
    localStorage.setItem(ticketsKey, JSON.stringify(allTickets));
    
    localStorage.setItem(`support_messages_${newTicket.id}`, JSON.stringify([]));
    
    return {
      success: true,
      ticket: newTicket,
      fromLocal: true
    };
  },

  getLocalTickets(params = {}) {
    const ticketsKey = 'support_tickets_local';
    const tickets = localStorage.getItem(ticketsKey);
    let allTickets = tickets ? JSON.parse(tickets) : [];
    
    if (params.user_id) {
      allTickets = allTickets.filter(t => t.user_id == params.user_id);
    }
    if (params.status) {
      allTickets = allTickets.filter(t => t.status === params.status);
    }
    
    return {
      success: true,
      tickets: allTickets,
      fromLocal: true
    };
  },

  getLocalTicket(ticketId) {
    const ticketsKey = 'support_tickets_local';
    const tickets = localStorage.getItem(ticketsKey);
    let allTickets = tickets ? JSON.parse(tickets) : [];
    const ticket = allTickets.find(t => t.id == ticketId);
    
    return {
      success: true,
      ticket: ticket || null,
      fromLocal: true
    };
  },

  getLocalMessages(ticketId) {
    const messagesKey = `support_messages_${ticketId}`;
    const messages = localStorage.getItem(messagesKey);
    const allMessages = messages ? JSON.parse(messages) : [];
    
    return {
      success: true,
      messages: allMessages,
      fromLocal: true
    };
  },

  saveLocalMessage(ticketId, message) {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    const newMessage = {
      id: Date.now(),
      ticket_id: ticketId,
      message: message,
      is_from_user: true,
      sender_name: user?.fullName || user?.name || 'أنت',
      created_at: new Date().toISOString(),
      status: 'sent',
      fromLocal: true
    };
    
    const messagesKey = `support_messages_${ticketId}`;
    const existingMessages = localStorage.getItem(messagesKey);
    let allMessages = existingMessages ? JSON.parse(existingMessages) : [];
    allMessages.push(newMessage);
    localStorage.setItem(messagesKey, JSON.stringify(allMessages));
    
    // تحديث التذكرة
    const ticketsKey = 'support_tickets_local';
    const existingTickets = localStorage.getItem(ticketsKey);
    if (existingTickets) {
      let allTickets = JSON.parse(existingTickets);
      const ticketIndex = allTickets.findIndex(t => t.id == ticketId);
      if (ticketIndex !== -1) {
        allTickets[ticketIndex].updated_at = new Date().toISOString();
        allTickets[ticketIndex].last_message = message;
        localStorage.setItem(ticketsKey, JSON.stringify(allTickets));
      }
    }
    
    return {
      success: true,
      message: newMessage,
      fromLocal: true
    };
  },

  // دالة مساعدة لإنشاء محادثة دعم جديدة مع Fallback
  async createSupportChat(userId, userName, message) {
    try {
      const ticketResponse = await this.createSupportTicket({
        user_id: userId,
        subject: 'طلب دعم جديد',
        type: 'general',
        priority: 'normal'
      });
      
      if (ticketResponse.success) {
        const ticketId = ticketResponse.ticket.id;
        await this.sendSupportMessage(ticketId, message);
        return ticketResponse;
      }
    } catch (error) {
      console.log('⚠️ Creating support chat locally');
      
      const newTicket = this.createLocalTicket({
        user_id: userId,
        subject: 'طلب دعم جديد',
        type: 'general',
        priority: 'normal'
      });
      
      if (newTicket.success) {
        this.saveLocalMessage(newTicket.ticket.id, message);
        
        // محاولة إرسال إشعار للمسؤول
        try {
          await this.sendNotification({
            userId: 3,
            title: '🆕 طلب دعم جديد',
            message: `${userName} يحتاج إلى مساعدة`,
            type: 'support',
            action_url: `/support/chats/${newTicket.ticket.id}`,
            data: {
              ticketId: newTicket.ticket.id,
              userId: userId,
              userName: userName,
              message: message
            }
          });
        } catch (notifError) {
          console.log('Could not send notification to admin');
        }
      }
      
      return newTicket;
    }
  },

  async sendNotification(data) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'فشل إرسال الإشعار');
      }

      return result;
    } catch (error) {
      console.error('❌ Send notification error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============================================
  // 📢 ADMIN NOTIFICATIONS - إشعارات المسؤولين
  // ============================================

  // الحصول على إشعارات المسؤول - بدون بيانات تجريبية
  async getAdminNotifications(params = {}) {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API_BASE_URL}/api/admin/notifications${queryParams ? `?${queryParams}` : ''}`;
      
      console.log('🔍 [getAdminNotifications] URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('📥 Admin notifications response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل إشعارات المسؤول');
      }

      return data;
    } catch (error) {
      console.error('❌ Get admin notifications error:', error);
      // بدون بيانات تجريبية - مصفوفة فارغة
      return {
        success: false,
        notifications: [],
        unreadCount: 0,
        error: error.message
      };
    }
  },

  // تحديث إشعار كمقروء
  async markAdminNotificationAsRead(notificationId) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/admin/notifications/${notificationId}/read`;
      
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
      console.error('❌ Mark admin notification as read error:', error);
      return { success: true };
    }
  },

  // حذف إشعار
  async deleteAdminNotification(notificationId) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/admin/notifications/${notificationId}`;
      
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
      console.error('❌ Delete admin notification error:', error);
      return { success: true };
    }
  },

  // أرشفة إشعار
  async archiveAdminNotification(notificationId) {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/admin/notifications/${notificationId}/archive`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل أرشفة الإشعار');
      }

      return data;
    } catch (error) {
      console.error('❌ Archive admin notification error:', error);
      return { success: true };
    }
  },

  // إرسال إشعار لمستخدم
  async sendUserNotification(userId, title, message, type = 'info') {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/notifications/send`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, title, message, type })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل إرسال الإشعار');
      }

      return data;
    } catch (error) {
      console.error('❌ Send user notification error:', error);
      return { success: false };
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
  }
};

export default api;

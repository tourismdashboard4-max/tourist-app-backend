// client/src/services/api.js - after fixing createConversation to accept UUID and include current user
// ✅ استخدام متغير البيئة لتعيين عنوان API (مع قيمة افتراضية للتطوير المحلي)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tourist-app-api.onrender.com';

// ✅ خريطة عالمية لتحويل UUID -> old_id (تُعبأ مرة واحدة)
let guidesIdMap = null;
let guidesMapPromise = null;

// دالة مساعدة لجلب قائمة المرشدين وبناء خريطة UUID -> old_id
const loadGuidesMap = async () => {
  if (guidesIdMap) return guidesIdMap;
  if (guidesMapPromise) return guidesMapPromise;
  guidesMapPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/guides`);
      const data = await response.json();
      let guidesList = [];
      if (data.success && Array.isArray(data.guides)) guidesList = data.guides;
      else if (Array.isArray(data)) guidesList = data;
      else if (data.data && Array.isArray(data.data)) guidesList = data.data;
      const map = {};
      guidesList.forEach(guide => {
        const uuid = guide.id || guide.uuid;
        const numericId = guide.old_id;
        if (uuid && numericId && !isNaN(Number(numericId))) {
          map[uuid] = Number(numericId);
        }
      });
      guidesIdMap = map;
      console.log('✅ Guides map loaded:', guidesIdMap);
      return guidesIdMap;
    } catch (err) {
      console.error('Failed to load guides map:', err);
      return {};
    } finally {
      guidesMapPromise = null;
    }
  })();
  return guidesMapPromise;
};

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

  async getUserProfile(userId) {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Fetching user profile for:', userId);
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('📥 Get user profile response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل الملف الشخصي');
      }

      return data;
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      throw error;
    }
  },

  async updateUserProfile(userId, updates) {
    try {
      const token = localStorage.getItem('token');
      
      console.log('📤 Updating profile for user:', userId, updates);
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      console.log('📥 Update profile response:', data);
      
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

      return data;
    } catch (error) {
      console.error('❌ Delete avatar error:', error);
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

  // ============================================
  // 🎯 PROGRAM SERVICES - خدمات البرامج السياحية (مع Local Storage محدود جداً)
  // ============================================

  // حفظ البرامج في localStorage (نادراً ما يُستخدم)
  saveProgramsToLocal(programs) {
    try {
      const dataStr = JSON.stringify(programs);
      if (dataStr.length > 800 * 1024) {
        console.warn('⚠️ Programs data too large, skipping localStorage save');
        return false;
      }
      localStorage.setItem('local_programs', dataStr);
      console.log('✅ Programs saved to localStorage:', programs.length);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('❌ localStorage quota exceeded, clearing old data...');
        try {
          localStorage.removeItem('local_programs');
          const limited = programs.slice(-30);
          localStorage.setItem('local_programs', JSON.stringify(limited));
          console.log('✅ Saved last 30 programs after cleanup');
        } catch (e) {
          console.error('Failed to save even after cleanup');
        }
      } else {
        console.error('❌ Error saving programs:', error);
      }
      return false;
    }
  },

  // جلب البرامج من localStorage (آخر ملجأ)
  getProgramsFromLocal() {
    try {
      const programs = localStorage.getItem('local_programs');
      if (programs) {
        const parsed = JSON.parse(programs);
        console.log('📦 Programs loaded from localStorage:', parsed.length);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error loading programs:', error);
    }
    return [];
  },

  // جلب برامج مرشد معين (بدون حفظ تلقائي في localStorage)
  async getGuidePrograms(guideId, token, skipLocalSave = true) {
    try {
      console.log('📤 Fetching programs for guide:', guideId);
      
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

      // لا نحفظ في localStorage إلا إذا طلب ذلك صراحة (نادراً)
      if (!skipLocalSave && data.programs && data.programs.length > 0 && data.programs.length < 50) {
        const allPrograms = this.getProgramsFromLocal();
        const otherPrograms = allPrograms.filter(p => p.guide_id !== guideId);
        this.saveProgramsToLocal([...otherPrograms, ...data.programs]);
      }

      return data;
    } catch (error) {
      console.error('❌ Get programs error:', error);
      // لا نستخدم localStorage كـ fallback لتجنب البيانات القديمة
      return { success: false, programs: [], error: error.message };
    }
  },

  // إضافة برنامج سياحي جديد (مع تخزين محلي محدود فقط في حالة فشل API)
  async addTourProgram(guideId, token, programData) {
    try {
      console.log('📤 Adding program for guide:', guideId, programData);
      
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

      // لا نحفظ في localStorage تلقائياً
      return data;
    } catch (error) {
      console.error('❌ Add program error:', error);
      // لا نستخدم localStorage fallback لأن البيانات قد تكون غير متزامنة
      return { success: false, error: error.message };
    }
  },

  // تحديث حالة البرنامج (تفعيل/تعطيل)
  async toggleProgramStatus(guideId, programId, token, status) {
    try {
      console.log('📤 Toggling program status:', { programId, status });
      
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
      return { success: false, error: error.message };
    }
  },

  // جلب جميع البرامج للعرض العام (للمستخدمين) - بدون تخزين محلي
  async getAllPrograms(skipLocalSave = true) {
    try {
      console.log('📤 Fetching all programs');
      
      const response = await fetch(`${API_BASE_URL}/api/programs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل تحميل البرامج');
      }

      // لا نحفظ في localStorage تلقائياً
      return data;
    } catch (error) {
      console.error('❌ Get all programs error:', error);
      return { success: false, programs: [], error: error.message };
    }
  },

  // حذف برنامج سياحي
  async deleteProgram(guideId, programId, token) {
    try {
      console.log('📤 Deleting program:', programId);
      
      const response = await fetch(`${API_BASE_URL}/api/guides/${guideId}/programs/${programId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'فشل حذف البرنامج');
      }

      return data;
    } catch (error) {
      console.error('❌ Delete program error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============================================
  // 🖼️ PROGRAM IMAGES SERVICES - صور البرامج المتعددة
  // ============================================

  // رفع صور متعددة لبرنامج
  async uploadProgramImages(programId, formData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/programs/${programId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'فشل رفع الصور');
      return data;
    } catch (error) {
      console.error('❌ Upload program images error:', error);
      throw error;
    }
  },

  // جلب صور برنامج
  async getProgramImages(programId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/programs/${programId}/images`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'فشل تحميل الصور');
      return data;
    } catch (error) {
      console.error('❌ Get program images error:', error);
      return { success: false, images: [] };
    }
  },

  // حذف صورة من البرنامج
  async deleteProgramImage(programId, imageId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/programs/${programId}/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'فشل حذف الصورة');
      return data;
    } catch (error) {
      console.error('❌ Delete program image error:', error);
      throw error;
    }
  },

  // تعيين صورة كصورة رئيسية
  async setPrimaryProgramImage(programId, imageId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/programs/${programId}/images/${imageId}/primary`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'فشل تعيين الصورة الرئيسية');
      return data;
    } catch (error) {
      console.error('❌ Set primary image error:', error);
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
      
      // Fallback: إشعارات محلية
      const localNotifications = localStorage.getItem('local_notifications');
      return {
        success: true,
        notifications: localNotifications ? JSON.parse(localNotifications) : [],
        fromLocal: true
      };
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
      return { unreadCount: 0, totalCount: 0 };
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
      return { success: true };
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
      return { success: true };
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
      return { success: true };
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
      return { success: true };
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
      return { success: true };
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
  // 💬 CHAT SERVICES - خدمات المحادثات (مع إصلاح مشكلة integer)
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

  // ✅ تم إصلاح createConversation: يقبل participantId كأي قيمة ويحول UUID إلى old_id تلقائياً، ويضيف userId الحالي
  async createConversation(participantId, type = 'direct', bookingId = null) {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      if (!participantId) {
        throw new Error('معرف المستخدم غير صالح');
      }
      
      // جلب المستخدم الحالي من localStorage
      const userStr = localStorage.getItem('touristAppUser') || localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      
      let finalParticipantId = participantId;
      
      // إذا كان المشارك ليس رقماً (أي UUID)، نحاول تحويله إلى old_id باستخدام خريطة المرشدين
      if (typeof participantId === 'string' && isNaN(Number(participantId))) {
        try {
          const guidesMap = await loadGuidesMap();
          const numericId = guidesMap[participantId];
          if (numericId) {
            finalParticipantId = numericId;
            console.log(`✅ Converted UUID ${participantId} to numeric ID ${numericId}`);
          } else {
            console.warn(`⚠️ Could not find numeric ID for UUID ${participantId}, will use as is (may fail)`);
          }
        } catch (err) {
          console.error('Error converting participant ID:', err);
        }
      } else {
        // إذا كان رقماً بالفعل، تأكد من أنه رقم
        finalParticipantId = Number(participantId);
        if (isNaN(finalParticipantId)) {
          throw new Error('معرف المستخدم غير صالح (ليس رقماً)');
        }
      }
      
      let validBookingId = null;
      if (bookingId !== null && bookingId !== undefined) {
        const numericBookingId = parseInt(bookingId, 10);
        if (!isNaN(numericBookingId)) {
          validBookingId = numericBookingId;
        } else {
          console.warn('⚠️ bookingId is not a valid integer, ignoring:', bookingId);
        }
      }

      // ✅ إضافة userId للمستخدم الحالي
      const payload = {
        participantId: finalParticipantId,
        type,
        userId: currentUser?.id,   // مفتاح الحل: إرسال معرف المستخدم الحالي
        ...(validBookingId !== null && { bookingId: validBookingId })
      };

      console.log('📤 Creating conversation with payload:', payload);
      
      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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
      return this.createLocalTicket(data);
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

  // ============================================
  // 📢 ADMIN NOTIFICATIONS - إشعارات المسؤولين
  // ============================================

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
      return {
        success: false,
        notifications: [],
        unreadCount: 0,
        error: error.message
      };
    }
  },

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

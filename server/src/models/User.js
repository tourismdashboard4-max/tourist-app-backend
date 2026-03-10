// ============================================
// User Model - المستخدم العادي (PostgreSQL Version)
// ============================================
import { pool } from '../../server.js';
import bcrypt from 'bcrypt';

const User = {
  // ============================================
  // 📋 إنشاء مستخدم جديد
  // ============================================
  async create(userData) {
    const {
      fullName,
      email,
      password,
      phone = null,
      provider = 'email',
      verified = false,
      settings = { language: 'ar', darkMode: false, notifications: true, emailNotifications: true }
    } = userData;

    console.log('📝 Creating user with data:', { fullName, email, phone });

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // إنشاء رقم مستخدم فريد
    const app_user_id = 'U' + Math.floor(100000 + Math.random() * 900000);

    // إنشاء رابط الصورة الرمزية
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=3b82f6&color=fff&size=200`;

    const query = `
      INSERT INTO app.users (
        full_name, email, password_hash, phone, provider, verified, 
        app_user_id, avatar, settings, login_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING 
        id, 
        full_name as "fullName", 
        email, 
        phone, 
        provider, 
        verified, 
        app_user_id as "appUserId",
        avatar, 
        settings, 
        login_count as "loginCount",
        created_at as "createdAt"
    `;

    const values = [
      fullName,
      email.toLowerCase().trim(),
      password_hash,
      phone,
      provider,
      verified,
      app_user_id,
      avatar,
      JSON.stringify(settings),
      0 // login_count
    ];

    console.log('🔍 Executing query on schema app.users');
    console.log('🔍 Query:', query);
    console.log('🔍 Values:', values);

    try {
      const result = await pool.query(query, values);
      const user = result.rows[0];
      
      console.log('✅ User created successfully in app.users:', user);
      
      // إنشاء محفظة للمستخدم تلقائياً
      await this.createWallet(user.id, app_user_id);
      
      return user;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  },

  // ============================================
  // 💰 إنشاء محفظة للمستخدم
  // ============================================
  async createWallet(userId, appUserId) {
    const walletNumber = 'WALLET-' + appUserId;
    
    const query = `
      INSERT INTO app.wallets (user_id, wallet_number, balance)
      VALUES ($1, $2, 0)
      RETURNING id, wallet_number, balance
    `;
    
    try {
      const result = await pool.query(query, [userId, walletNumber]);
      console.log('✅ Wallet created successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      throw error;
    }
  },

  // ============================================
  // 🔍 البحث عن مستخدم بالبريد الإلكتروني
  // ============================================
  async findByEmail(email) {
    const query = 'SELECT * FROM app.users WHERE email = $1';
    try {
      const result = await pool.query(query, [email.toLowerCase().trim()]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  },

  // ============================================
  // 🔍 البحث عن مستخدم بالبريد مع كلمة المرور
  // ============================================
  async findByEmailWithPassword(email) {
    const query = 'SELECT * FROM app.users WHERE email = $1';
    try {
      const result = await pool.query(query, [email.toLowerCase().trim()]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  },

  // ============================================
  // 🔍 البحث عن مستخدم برقم الجوال
  // ============================================
  async findByPhone(phone) {
    if (!phone) return null;
    
    const cleanPhone = phone.replace(/\s/g, '');
    const query = 'SELECT * FROM app.users WHERE phone = $1';
    
    try {
      const result = await pool.query(query, [cleanPhone]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding user by phone:', error);
      throw error;
    }
  },

  // ============================================
  // 🔍 البحث عن مستخدم بالمعرف
  // ============================================
  async findById(id) {
    const query = 'SELECT * FROM app.users WHERE id = $1';
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error finding user by id:', error);
      throw error;
    }
  },

  // ============================================
  // 🔍 البحث عن مستخدمين محققين
  // ============================================
  async findVerified() {
    const query = 'SELECT * FROM app.users WHERE verified = true ORDER BY created_at DESC';
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error finding verified users:', error);
      throw error;
    }
  },

  // ============================================
  // 🔐 التحقق من كلمة المرور
  // ============================================
  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  // ============================================
  // 📝 تحديث آخر تسجيل دخول
  // ============================================
  async updateLastLogin(id, ip = null) {
    const query = `
      UPDATE app.users 
      SET last_login = NOW(), login_count = login_count + 1, last_login_ip = $2
      WHERE id = $1
    `;
    try {
      await pool.query(query, [id, ip]);
    } catch (error) {
      console.error('❌ Error updating last login:', error);
      throw error;
    }
  },

  // ============================================
  // 📱 تحديث رمز التحقق للجوال
  // ============================================
  async updatePhoneVerification(id, code, expiresAt) {
    const phoneVerification = JSON.stringify({
      code,
      expiresAt,
      attempts: 0
    });
    
    const query = `
      UPDATE app.users 
      SET phone_verification = $2::jsonb
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [id, phoneVerification]);
    } catch (error) {
      console.error('❌ Error updating phone verification:', error);
      throw error;
    }
  },

  // ============================================
  // 📱 تحديث رقم الجوال بعد التحقق
  // ============================================
  async updatePhone(id, phone) {
    const cleanPhone = phone.replace(/\s/g, '');
    
    const query = `
      UPDATE app.users 
      SET phone = $2, phone_verified = true, phone_verified_at = NOW(), phone_verification = NULL
      WHERE id = $1
      RETURNING id, phone, phone_verified as "phoneVerified"
    `;
    
    try {
      const result = await pool.query(query, [id, cleanPhone]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating phone:', error);
      throw error;
    }
  },

  // ============================================
  // 🔄 تحديث كلمة المرور
  // ============================================
  async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    
    const query = 'UPDATE app.users SET password_hash = $2 WHERE id = $1';
    
    try {
      await pool.query(query, [id, password_hash]);
    } catch (error) {
      console.error('❌ Error updating password:', error);
      throw error;
    }
  },

  // ============================================
  // ❤️ إضافة إلى المفضلة
  // ============================================
  async addToFavorites(userId, programId) {
    const user = await this.findById(userId);
    let favorites = user.favorites || [];
    
    if (!favorites.includes(programId)) {
      favorites.push(programId);
      
      const query = 'UPDATE app.users SET favorites = $2::jsonb WHERE id = $1';
      await pool.query(query, [userId, JSON.stringify(favorites)]);
    }
    
    return favorites;
  },

  // ============================================
  // ❌ إزالة من المفضلة
  // ============================================
  async removeFromFavorites(userId, programId) {
    const user = await this.findById(userId);
    let favorites = user.favorites || [];
    
    favorites = favorites.filter(id => id.toString() !== programId.toString());
    
    const query = 'UPDATE app.users SET favorites = $2::jsonb WHERE id = $1';
    await pool.query(query, [userId, JSON.stringify(favorites)]);
    
    return favorites;
  },

  // ============================================
  // 📅 إضافة حجز
  // ============================================
  async addBooking(userId, bookingData) {
    const user = await this.findById(userId);
    let bookings = user.bookings || [];
    
    const newBooking = {
      ...bookingData,
      bookingDate: new Date(),
      status: bookingData.status || 'pending',
      paymentStatus: bookingData.paymentStatus || 'unpaid'
    };
    
    bookings.push(newBooking);
    
    const query = 'UPDATE app.users SET bookings = $2::jsonb WHERE id = $1';
    await pool.query(query, [userId, JSON.stringify(bookings)]);
    
    return bookings;
  },

  // ============================================
  // ⭐ إضافة تقييم
  // ============================================
  async addReview(userId, reviewData) {
    const user = await this.findById(userId);
    let reviews = user.reviews || [];
    
    const newReview = {
      ...reviewData,
      date: new Date()
    };
    
    reviews.push(newReview);
    
    const query = 'UPDATE app.users SET reviews = $2::jsonb WHERE id = $1';
    await pool.query(query, [userId, JSON.stringify(reviews)]);
    
    return reviews;
  },

  // ============================================
  // ⚙️ تحديث الإعدادات
  // ============================================
  async updateSettings(userId, settings) {
    const currentUser = await this.findById(userId);
    const updatedSettings = { ...currentUser.settings, ...settings };
    
    const query = 'UPDATE app.users SET settings = $2::jsonb WHERE id = $1';
    
    try {
      await pool.query(query, [userId, JSON.stringify(updatedSettings)]);
      return updatedSettings;
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      throw error;
    }
  },

  // ============================================
  // 📊 الحصول على محفظة المستخدم
  // ============================================
  async getWallet(userId) {
    const query = 'SELECT * FROM app.wallets WHERE user_id = $1';
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting wallet:', error);
      throw error;
    }
  },

  // ============================================
  // 📊 الحصول على إحصائيات المستخدم
  // ============================================
  async getStats(userId) {
    const user = await this.findById(userId);
    
    return {
      totalBookings: user.bookings?.length || 0,
      totalFavorites: user.favorites?.length || 0,
      totalReviews: user.reviews?.length || 0,
      averageRating: this.calculateAverageRating(user.reviews),
      lastLogin: user.last_login,
      loginCount: user.login_count || 0,
      memberSince: user.created_at
    };
  },

  // ============================================
  // 🧮 حساب متوسط التقييمات
  // ============================================
  calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  },

  // ============================================
  // 🔄 تحديث المستخدم
  // ============================================
  async update(id, fields) {
    const setClauses = [];
    const values = [];
    let index = 1;

    if (fields.fullName) {
      setClauses.push(`full_name = $${index}`);
      values.push(fields.fullName);
      index++;
    }
    
    if (fields.phone) {
      setClauses.push(`phone = $${index}`);
      values.push(fields.phone.replace(/\s/g, ''));
      index++;
    }
    
    if (fields.avatar) {
      setClauses.push(`avatar = $${index}`);
      values.push(fields.avatar);
      index++;
    }
    
    if (fields.settings) {
      setClauses.push(`settings = $${index}::jsonb`);
      values.push(JSON.stringify(fields.settings));
      index++;
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    const query = `UPDATE app.users SET ${setClauses.join(', ')} WHERE id = $${index} RETURNING *`;
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }
};

export default User;
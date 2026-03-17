// server/src/routes/authRoutes.js
import express from 'express';
import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { sendEmail } from '../utils/email.js';
import { createExpiryDate, isOTPValid, getTimeRemaining } from '../../server.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// ✅ 1. إرسال رمز التحقق للتسجيل
// ============================================
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('📧 Received OTP request for:', email);
    console.log('🕐 Server time:', new Date().toISOString());

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني مطلوب' 
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // التحقق من عدم وجود المستخدم
    const existingUser = await pool.query(
      'SELECT id FROM app.users WHERE email = $1',
      [cleanEmail]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني مسجل بالفعل' 
      });
    }

    // إلغاء الرموز السابقة
    await pool.query(
      `UPDATE app.otps 
       SET expires_at = NOW() 
       WHERE identifier = $1 AND purpose = $2 AND verified = false`,
      [cleanEmail, 'register']
    );

    // توليد رمز جديد
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Generated OTP:', code);

    // حفظ الرمز مع وقت انتهاء محسوب بدقة
    const expiresAt = createExpiryDate(10); // 10 دقائق
    console.log('⏰ OTP will expire at:', expiresAt.toISOString());

    await pool.query(
      `INSERT INTO app.otps (
        identifier, email, code, purpose, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [cleanEmail, cleanEmail, code, 'register', expiresAt]
    );

    // إرسال البريد الإلكتروني
    try {
      await sendEmail({
        to: cleanEmail,
        subject: '🔐 رمز التحقق - تطبيق السائح',
        html: `
          <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #10b981; font-size: 28px;">🌍 تطبيق السائح</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">مرحباً بك!</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">رمز التحقق الخاص بك هو:</p>
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 48px; font-weight: bold; color: #3b82f6; letter-spacing: 5px;">${code}</span>
              </div>
              <p style="color: #666; font-size: 14px;">هذا الرمز صالح لمدة <strong>10 دقائق</strong></p>
            </div>
          </div>
        `
      });
      console.log(`📧 Email sent successfully to ${cleanEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      console.log(`📧 [DEV MODE] Verification code for ${cleanEmail}: ${code}`);
    }

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق',
      expiresIn: 600,
      devCode: process.env.NODE_ENV === 'development' ? code : undefined
    });

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'فشل إرسال رمز التحقق' 
    });
  }
});

// ============================================
// ✅ 2. التحقق من الرمز
// ============================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code, purpose = 'register' } = req.body;
    console.log('📧 Verify OTP request:', { email, code, purpose });

    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني ورمز التحقق مطلوبان' 
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // البحث عن الرمز الصالح
    const otpResult = await pool.query(
      `SELECT * FROM app.otps 
       WHERE identifier = $1 AND code = $2 AND purpose = $3 
         AND verified = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, code, purpose]
    );
    
    const otpRecord = otpResult.rows[0];
    console.log('🔍 OTP Record found:', otpRecord ? '✅ YES' : '❌ NO');

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      });
    }

    // التحقق من وجود المستخدم
    const userResult = await pool.query(
      'SELECT id FROM app.users WHERE email = $1',
      [cleanEmail]
    );
    
    const user = userResult.rows[0];
    console.log('👤 User exists:', user ? '✅ YES' : '❌ NO (new user)');

    if (!user) {
      // مستخدم جديد - نغير حالة الرمز
      await pool.query(
        'UPDATE app.otps SET verified = true WHERE id = $1',
        [otpRecord.id]
      );
      
      return res.json({
        success: true,
        isNewUser: true,
        message: 'رمز التحقق صحيح، أكمل بياناتك'
      });
    }

    res.json({
      success: true,
      isNewUser: false,
      message: 'رمز التحقق صحيح'
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ في التحقق' 
    });
  }
});

// ============================================
// ✅ 3. إنشاء مستخدم جديد (معدل - تم إزالة user_type)
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { email, fullName, password, phone } = req.body;
    console.log('📝 Register new user:', { email, fullName, phone });

    if (!email || !fullName || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني والاسم وكلمة المرور مطلوبة'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // التحقق من عدم وجود المستخدم
    const existingUser = await pool.query(
      'SELECT id FROM app.users WHERE email = $1',
      [cleanEmail]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'المستخدم موجود بالفعل'
      });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء مستخدم جديد
    const userResult = await pool.query(
      `INSERT INTO app.users (
        full_name, email, password_hash, phone, verified, type, role, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, full_name, email, phone, created_at`,
      [fullName, cleanEmail, hashedPassword, phone || null, true, 'user', 'user']
    );

    const user = userResult.rows[0];
    console.log('✅ New user created:', user.email);

    // إنشاء توكن JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        fullName: user.full_name,
        type: 'user' 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // ✅ إنشاء محفظة للمستخدم - تم إزالة user_type
    const walletResult = await pool.query(
      `INSERT INTO app.wallets (
        wallet_number, user_id, balance, currency, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, wallet_number, balance`,
      [
        `WLT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        user.id,
        0,
        'SAR',
        'active'
      ]
    );

    const wallet = walletResult.rows[0];

    res.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        type: 'user',
        createdAt: user.created_at
      },
      wallet: wallet ? {
        id: wallet.id,
        walletNumber: wallet.wallet_number,
        balance: wallet.balance
      } : null,
      token
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنشاء الحساب'
    });
  }
});

// ============================================
// ✅ 4. تسجيل الدخول
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان' 
      });
    }

    // البحث عن المستخدم
    const userResult = await pool.query(
      `SELECT id, full_name, email, password_hash, avatar, phone, role,
              created_at, last_login, login_count
       FROM app.users 
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    
    const user = userResult.rows[0];
    console.log('👤 User found:', user ? '✅ YES' : '❌ NO');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
      });
    }

    // التحقق من كلمة المرور
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
      });
    }

    // تحديث آخر تسجيل دخول وعدد المرات
    await pool.query(
      `UPDATE app.users 
       SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1 
       WHERE id = $1`,
      [user.id]
    );

    // الحصول على محفظة المستخدم
    const walletResult = await pool.query(
      'SELECT id, wallet_number, balance, currency FROM app.wallets WHERE user_id = $1',
      [user.id]
    );
    
    const wallet = walletResult.rows[0];

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        fullName: user.full_name,
        type: 'user' 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        role: user.role,
        type: 'user',
        createdAt: user.created_at,
        lastLogin: user.last_login,
        loginCount: user.login_count
      },
      wallet: wallet ? {
        id: wallet.id,
        walletNumber: wallet.wallet_number,
        balance: wallet.balance,
        currency: wallet.currency
      } : null,
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ في تسجيل الدخول' 
    });
  }
});

// ============================================
// ✅ 5. طلب إعادة تعيين كلمة المرور
// ============================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔄 Forgot password request for:', email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني مطلوب' 
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // البحث عن المستخدم
    const userResult = await pool.query(
      'SELECT id FROM app.users WHERE email = $1',
      [cleanEmail]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'البريد الإلكتروني غير مسجل'
      });
    }

    // إلغاء الرموز السابقة
    await pool.query(
      `UPDATE app.otps 
       SET expires_at = NOW() 
       WHERE identifier = $1 AND purpose = $2 AND verified = false`,
      [cleanEmail, 'reset-password']
    );

    // توليد رمز جديد
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // إنشاء وقت انتهاء الصلاحية (10 دقائق)
    const expiresAt = createExpiryDate(10);

    await pool.query(
      `INSERT INTO app.otps (
        identifier, email, code, purpose, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [cleanEmail, cleanEmail, code, 'reset-password', expiresAt]
    );

    console.log(`🔄 Reset code for ${cleanEmail}: ${code}`);

    // إرسال البريد الإلكتروني
    try {
      await sendEmail({
        to: cleanEmail,
        subject: '🔄 رمز التحقق لتغيير كلمة المرور - تطبيق السائح',
        html: `<div>رمز التحقق الخاص بك هو: <strong>${code}</strong></div>`
      });
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
    }

    res.json({
      success: true,
      message: 'تم إرسال رمز إعادة تعيين كلمة المرور',
      expiresIn: 600
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'فشل إرسال رمز الاستعادة' 
    });
  }
});

// ============================================
// ✅ 6. إعادة تعيين كلمة المرور
// ============================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // البحث عن الرمز الصحيح
    const otpResult = await pool.query(
      `SELECT * FROM app.otps 
       WHERE identifier = $1 AND code = $2 AND purpose = $3 
         AND verified = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, code, 'reset-password']
    );

    const otpRecord = otpResult.rows[0];

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      });
    }

    // تحديث حالة الرمز
    await pool.query(
      'UPDATE app.otps SET verified = true WHERE id = $1',
      [otpRecord.id]
    );

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // تحديث كلمة المرور
    await pool.query(
      'UPDATE app.users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [hashedPassword, cleanEmail]
    );

    console.log('✅ Password reset successfully for:', email);

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ في تغيير كلمة المرور' 
    });
  }
});

// ============================================
// ✅ 7. الحصول على ملف المستخدم
// ============================================
router.get('/profile/:userId', protect, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, full_name, email, avatar, phone, created_at, last_login, login_count
       FROM app.users 
       WHERE id = $1`,
      [req.params.userId]
    );
    
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'المستخدم غير موجود' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        loginCount: user.login_count
      }
    });

  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ في تحميل الملف الشخصي' 
    });
  }
});

// ============================================
// ✅ إرسال رمز التحقق للجوال
// ============================================
router.post('/send-phone-otp', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone } = req.body;

    console.log('📤 Send phone OTP request:', { userId, phone });

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الجوال مطلوب'
      });
    }

    // التحقق من صيغة الرقم السعودي
    const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    
    if (!saudiPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الجوال غير صحيح. الرجاء إدخال رقم سعودي صحيح'
      });
    }

    // التحقق من عدم استخدام الرقم من قبل مستخدم آخر
    const existingUser = await pool.query(
      'SELECT id FROM app.users WHERE phone = $1',
      [cleanPhone]
    );
    
    if (existingUser.rows.length > 0 && existingUser.rows[0].id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'رقم الجوال مستخدم بالفعل'
      });
    }

    // إنشاء رمز تحقق عشوائي
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // إنشاء وقت انتهاء الصلاحية
    const expiresAt = createExpiryDate(10);
    
    // حفظ الرمز في قاعدة البيانات
    await pool.query(
      `INSERT INTO app.otps (
        identifier, phone, code, purpose, user_id, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [cleanPhone, cleanPhone, code, 'phone-verification', userId, expiresAt]
    );

    console.log(`📱 Phone OTP for user ${userId}: ${code}`);

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى جوالك',
      expiresIn: 600,
      devCode: process.env.NODE_ENV === 'development' ? code : undefined
    });

  } catch (error) {
    console.error('❌ Send phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل إرسال رمز التحقق'
    });
  }
});

// ============================================
// ✅ التحقق من رمز الجوال
// ============================================
router.post('/verify-phone-otp', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    console.log('📤 Verify phone OTP request:', { userId, code });

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق مطلوب'
      });
    }

    // البحث عن الرمز الصحيح
    const otpResult = await pool.query(
      `SELECT * FROM app.otps 
       WHERE user_id = $1 AND code = $2 AND purpose = $3 
         AND verified = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, code, 'phone-verification']
    );

    const otpRecord = otpResult.rows[0];

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      });
    }

    // تحديث رقم الجوال في ملف المستخدم
    const phone = otpRecord.identifier;
    
    await pool.query(
      `UPDATE app.users 
       SET phone = $1, phone_verified = true, updated_at = NOW()
       WHERE id = $2`,
      [phone, userId]
    );

    // إلغاء الرمز بعد الاستخدام
    await pool.query(
      'UPDATE app.otps SET verified = true WHERE id = $1',
      [otpRecord.id]
    );

    res.json({
      success: true,
      message: 'تم التحقق من رقم الجوال بنجاح'
    });

  } catch (error) {
    console.error('❌ Verify phone OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل التحقق'
    });
  }
});

// ============================================
// ✅ Test route
// ============================================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Auth routes are working with PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

export default router;

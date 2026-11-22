// server/src/routes/authRoutes.js
// ✅ النسخة النهائية المُصلحة – جاهزة للنشر
// التغييرات:
// 1. login: معالجة password_hash = NULL + ترقية تلقائية من نص عادي إلى bcrypt + تشخيص كامل
// 2. forgot-password: طباعة الرمز في Logs دائماً (حتى لو فشل البريد)
// 3. send-otp: طباعة الرمز في Logs دائماً
// 4. reset-password: يعمل حتى لو المستخدم بدون password سابق

import express from 'express';
import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { sendEmail } from '../utils/email.js';
import { createExpiryDate, isOTPValid, getTimeRemaining } from '../utils/timeUtils.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// ✅ 1. إرسال رمز التحقق
// ============================================
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose = 'register' } = req.body;
    console.log('📧 Received OTP request for:', email, 'purpose:', purpose);
    console.log('🕐 Server time:', new Date().toISOString());

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مطلوب'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // التحقق من وجود المستخدم
    const userResult = await pool.query(
      'SELECT id FROM app.users WHERE email = $1',
      [cleanEmail]
    );
    const userExists = userResult.rows.length > 0;

    // تحديد ما إذا كان يجب أن يكون البريد موجوداً أم لا حسب الـ purpose
    let requireExisting = false;
    let requireNotExisting = false;

    if (purpose === 'register') {
      requireNotExisting = true;
    } else if (purpose === 'reset-password' || purpose === 'verify_old_email') {
      requireExisting = true;
    } else if (purpose === 'profile_update' || purpose === 'verify_new_email') {
      // نسمح بالحالتين
    }

    if (requireExisting && !userExists) {
      return res.status(404).json({
        success: false,
        message: 'البريد الإلكتروني غير مسجل'
      });
    }
    if (requireNotExisting && userExists) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل بالفعل'
      });
    }

    // إلغاء الرموز السابقة لنفس البريد ونفس الغرض
    await pool.query(
      `UPDATE app.otps
       SET expires_at = NOW()
       WHERE identifier = $1 AND purpose = $2 AND verified = false`,
      [cleanEmail, purpose]
    );

    // توليد رمز جديد
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = createExpiryDate(10);

    await pool.query(
      `INSERT INTO app.otps (
        identifier, email, code, purpose, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [cleanEmail, cleanEmail, code, purpose, expiresAt]
    );

    // ✅ طباعة الرمز في Logs دائماً (للطوارئ)
    console.log('═══════════════════════════════════════════');
    console.log(`🔐 OTP CODE for ${cleanEmail}: ${code}`);
    console.log(`   Purpose: ${purpose}`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    console.log('═══════════════════════════════════════════');

    // إرسال البريد الإلكتروني
    let subject = '🔐 رمز التحقق - تطبيق السائح';
    let htmlContent = `
      <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; font-size: 28px;">🌍 تطبيق السائح</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">${purpose === 'verify_old_email' ? 'تأكيد البريد الحالي' : purpose === 'verify_new_email' ? 'تأكيد البريد الجديد' : purpose === 'profile_update' ? 'تحديث الملف الشخصي' : 'مرحباً بك!'}</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">رمز التحقق الخاص بك هو:</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 48px; font-weight: bold; color: #3b82f6; letter-spacing: 5px;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">هذا الرمز صالح لمدة <strong>10 دقائق</strong></p>
          ${purpose === 'verify_old_email' ? '<p style="color: #666; font-size: 14px;">يُستخدم هذا الرمز لتأكيد هويتك قبل تغيير البريد الإلكتروني.</p>' : ''}
          ${purpose === 'verify_new_email' ? '<p style="color: #666; font-size: 14px;">يُستخدم هذا الرمز لتأكيد ملكية البريد الإلكتروني الجديد.</p>' : ''}
        </div>
      </div>
    `;

    let emailSent = false;
    try {
      await sendEmail({
        to: cleanEmail,
        subject: subject,
        html: htmlContent
      });
      emailSent = true;
      console.log(`📧 Email sent successfully to ${cleanEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError.message);
      console.error('⚠️ EMAIL FAILED — Use the code from Logs above');
    }

    res.json({
      success: true,
      message: emailSent 
        ? 'تم إرسال رمز التحقق' 
        : 'تم إنشاء رمز التحقق. يرجى التواصل مع الدعم لاستلامه.',
      expiresIn: 600,
      emailSent
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
    const { email, code, purpose } = req.body;
    console.log('📧 Verify OTP request:', { email, code, purpose });

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني ورمز التحقق مطلوبان'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    let query = `SELECT * FROM app.otps
                 WHERE identifier = $1 AND code = $2
                   AND verified = false AND expires_at > NOW()`;
    const params = [cleanEmail, code];

    if (purpose) {
      query += ' AND purpose = $3';
      params.push(purpose);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const otpResult = await pool.query(query, params);
    const otpRecord = otpResult.rows[0];

    console.log('🔍 OTP Record found:', otpRecord ? '✅ YES' : '❌ NO');

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      });
    }

    // ✅ رمز إعادة تعيين كلمة المرور
    if (otpRecord.purpose === 'reset-password') {
      return res.json({
        success: true,
        isNewUser: false,
        purpose: 'reset-password',
        message: 'رمز التحقق صحيح'
      });
    }

    // ✅ رمز التسجيل
    if (otpRecord.purpose === 'register') {
      const userResult = await pool.query(
        'SELECT id FROM app.users WHERE email = $1',
        [cleanEmail]
      );
      const user = userResult.rows[0];

      if (!user) {
        await pool.query(
          'UPDATE app.otps SET verified = true WHERE id = $1',
          [otpRecord.id]
        );
        return res.json({
          success: true,
          isNewUser: true,
          purpose: 'register',
          message: 'رمز التحقق صحيح، أكمل بياناتك'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مسجل بالفعل'
        });
      }
    }

    // ✅ أي غرض آخر
    await pool.query(
      'UPDATE app.otps SET verified = true WHERE id = $1',
      [otpRecord.id]
    );

    res.json({
      success: true,
      isNewUser: false,
      purpose: otpRecord.purpose,
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
// ✅ 3. إنشاء مستخدم جديد
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

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed for new user');

    const userResult = await pool.query(
      `INSERT INTO app.users (
        full_name, email, password_hash, phone, verified, type, role, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, full_name, email, phone, created_at`,
      [fullName, cleanEmail, hashedPassword, phone || null, true, 'user', 'user']
    );

    const user = userResult.rows[0];
    console.log('✅ New user created:', user.email);

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

    // إنشاء محفظة للمستخدم
    let wallet = null;
    try {
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
      wallet = walletResult.rows[0];
    } catch (walletErr) {
      console.warn('⚠️ Wallet creation failed (non-critical):', walletErr.message);
    }

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
// ✅ 4. تسجيل الدخول (نسخة مُصلحة بالكامل)
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

    const cleanEmail = email.toLowerCase().trim();

    // البحث عن المستخدم
    const userResult = await pool.query(
      `SELECT id, full_name, email, password_hash, avatar, phone, role,
              created_at, last_login, login_count
       FROM app.users
       WHERE email = $1`,
      [cleanEmail]
    );

    const user = userResult.rows[0];
    console.log('👤 User found:', user ? '✅ YES' : '❌ NO');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // ✅ تشخيص كامل
    console.log('🔍 PASSWORD DIAGNOSTICS:');
    console.log('   - Input password length:', password?.length);
    console.log('   - DB password_hash:', user.password_hash 
      ? `"${user.password_hash.substring(0, 25)}..." (length: ${user.password_hash.length})`
      : '❌ NULL');
    console.log('   - Is bcrypt hash?:', user.password_hash?.startsWith('$2') ? '✅ YES' : '❌ NO');

    // ✅ حالة 1: لا توجد كلمة مرور (المستخدم سُجّل عبر OTP فقط)
    if (!user.password_hash) {
      console.log('⚠️ USER HAS NO PASSWORD — needs password reset');
      return res.status(401).json({
        success: false,
        message: 'هذا الحساب لا يملك كلمة مرور. استخدم "نسيت كلمة المرور" لتعيين كلمة مرور جديدة.',
        needsPasswordReset: true
      });
    }

    // ✅ حالة 2: كلمة المرور غير مشفرة (بيانات قديمة)
    if (!user.password_hash.startsWith('$2')) {
      console.log('⚠️ PASSWORD IS NOT BCRYPT-HASHED (plain text or old format)');
      
      if (password === user.password_hash) {
        // ترقية تلقائية إلى bcrypt
        const newHash = await bcrypt.hash(password, 10);
        await pool.query(
          'UPDATE app.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [newHash, user.id]
        );
        console.log('✅ Password auto-upgraded to bcrypt hash');
      } else {
        console.log('❌ Plain text password does not match');
        return res.status(401).json({
          success: false,
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        });
      }
    } else {
      // ✅ حالة 3: كلمة المرور مشفرة بـ bcrypt (المسار الطبيعي)
      const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
      console.log('   - bcrypt.compare result:', isPasswordMatch ? '✅ MATCH' : '❌ NO MATCH');

      if (!isPasswordMatch) {
        return res.status(401).json({
          success: false,
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        });
      }
    }

    // تحديث آخر تسجيل دخول
    await pool.query(
      `UPDATE app.users
       SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1
       WHERE id = $1`,
      [user.id]
    );

    // الحصول على محفظة المستخدم
    let wallet = null;
    try {
      const walletResult = await pool.query(
        'SELECT id, wallet_number, balance, currency FROM app.wallets WHERE user_id = $1',
        [user.id]
      );
      wallet = walletResult.rows[0] || null;
    } catch (walletErr) {
      console.warn('⚠️ Wallet fetch failed (non-critical):', walletErr.message);
    }

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

    console.log('✅ LOGIN SUCCESS for:', user.email);

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
    const expiresAt = createExpiryDate(10);

    await pool.query(
      `INSERT INTO app.otps (
        identifier, email, code, purpose, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [cleanEmail, cleanEmail, code, 'reset-password', expiresAt]
    );

    // ✅ طباعة الرمز دائماً في Logs
    console.log('═══════════════════════════════════════════');
    console.log(`🔄 RESET CODE for ${cleanEmail}: ${code}`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    console.log('═══════════════════════════════════════════');

    // محاولة إرسال البريد
    let emailSent = false;
    try {
      await sendEmail({
        to: cleanEmail,
        subject: '🔄 رمز التحقق لتغيير كلمة المرور - تطبيق السائح',
        html: `
          <div dir="rtl" style="font-family: 'Cairo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #10b981; font-size: 28px;">🌍 تطبيق السائح</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">إعادة تعيين كلمة المرور</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">رمز التحقق الخاص بك هو:</p>
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 48px; font-weight: bold; color: #3b82f6; letter-spacing: 5px;">${code}</span>
              </div>
              <p style="color: #666; font-size: 14px;">هذا الرمز صالح لمدة <strong>10 دقائق</strong></p>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة.</p>
            </div>
          </div>
        `
      });
      emailSent = true;
      console.log(`✅ Reset email sent successfully to ${cleanEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError.message);
      console.error('⚠️ EMAIL FAILED — Use the code from Logs above');
    }

    res.json({
      success: true,
      message: emailSent 
        ? 'تم إرسال رمز إعادة تعيين كلمة المرور' 
        : 'تم إنشاء رمز إعادة التعيين. يرجى التواصل مع الدعم لاستلامه.',
      expiresIn: 600,
      emailSent
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
    console.log('🔄 Reset password attempt for:', email);

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
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
      console.log('❌ OTP not found or expired');
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

    // تحديث كلمة المرور (يعمل حتى لو password_hash كان NULL)
    const updateResult = await pool.query(
      'UPDATE app.users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id',
      [hashedPassword, cleanEmail]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

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
// ✅ 7. الحصول على ملف المستخدم (محمي)
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
// ✅ 8. إرسال رمز التحقق للجوال (محمي)
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

    const saudiPhoneRegex = /^(05|5)[0-9]{8}$|^\+9665[0-9]{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');

    if (!saudiPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الجوال غير صحيح. الرجاء إدخال رقم سعودي صحيح'
      });
    }

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

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = createExpiryDate(10);

    await pool.query(
      `INSERT INTO app.otps (
        identifier, phone, code, purpose, user_id, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [cleanPhone, cleanPhone, code, 'phone-verification', userId, expiresAt]
    );

    console.log('═══════════════════════════════════════════');
    console.log(`📱 PHONE OTP for user ${userId}: ${code}`);
    console.log(`   Phone: ${cleanPhone}`);
    console.log('═══════════════════════════════════════════');

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى جوالك',
      expiresIn: 600
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
// ✅ 9. التحقق من رمز الجوال (محمي)
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

    const phone = otpRecord.identifier;

    await pool.query(
      `UPDATE app.users
       SET phone = $1, phone_verified = true, updated_at = NOW()
       WHERE id = $2`,
      [phone, userId]
    );

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
// ✅ 10. تغيير كلمة المرور (محمي)
// ============================================
router.post('/change-password', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية والجديدة مطلوبة'
      });
    }

    const userResult = await pool.query(
      'SELECT password_hash FROM app.users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    const user = userResult.rows[0];

    if (!user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد كلمة مرور حالية. استخدم "نسيت كلمة المرور"'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE app.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, userId]
    );

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تغيير كلمة المرور'
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

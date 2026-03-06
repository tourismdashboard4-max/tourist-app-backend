// server/src/routes/authRoutes.js
import express from 'express';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// ============================================
// Middleware للتحقق من التوكن
// ============================================
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'الرجاء تسجيل الدخول أولاً'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(401).json({
      success: false,
      message: 'انتهت صلاحية الجلسة، الرجاء تسجيل الدخول مرة أخرى'
    });
  }
};

// ============================================
// ✅ 1. إرسال رمز التحقق للتسجيل
// ============================================
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('📧 Received OTP request for:', email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني مطلوب' 
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // التحقق من عدم وجود المستخدم
    const existingUser = await User.findByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني مسجل بالفعل' 
      });
    }

    // إلغاء الرموز السابقة
    await OTP.expirePreviousOTPs(cleanEmail, 'register');

    // توليد رمز جديد
    const code = OTP.generateCode();
    console.log('🔐 Generated OTP:', code);

    // حفظ الرمز مع إضافة email
    await OTP.create({
      identifier: cleanEmail,
      email: cleanEmail,
      type: 'email',
      code,
      purpose: 'register',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

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
              <p style="color: #999; font-size: 12px; margin-top: 30px;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              © ${new Date().getFullYear()} تطبيق السائح - جميع الحقوق محفوظة
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
    const { email, code } = req.body;
    console.log('📧 Verify OTP request:', { email, code });

    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني ورمز التحقق مطلوبان' 
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // البحث عن الرمز الصالح
    const otpRecord = await OTP.findValidOTP(cleanEmail, code, 'register');
    
    console.log('🔍 OTP Record found:', otpRecord ? '✅ YES' : '❌ NO');

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      });
    }

    // التحقق من وجود المستخدم
    const user = await User.findByEmail(cleanEmail);
    console.log('👤 User exists:', user ? '✅ YES' : '❌ NO (new user)');

    if (!user) {
      // مستخدم جديد - نغير حالة الرمز
      await OTP.save({ ...otpRecord, verified: true });
      console.log('✅ OTP marked as verified for new user');
      
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

    // التحقق من عدم وجود المستخدم
    const existingUser = await User.findByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'المستخدم موجود بالفعل'
      });
    }

    // إنشاء مستخدم جديد
    const user = await User.create({
      fullName,
      email: cleanEmail,
      password,
      phone: phone || null,
      verified: true
    });

    console.log('✅ New user created:', user.email);

    // إنشاء توكن JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        fullName: user.fullName,
        type: 'user' 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // الحصول على محفظة المستخدم
    const wallet = await User.getWallet(user.id);

    res.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        type: 'user',
        createdAt: user.createdAt
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
    const user = await User.findByEmail(email.toLowerCase().trim());
    
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

    // تحديث آخر تسجيل دخول
    await User.updateLastLogin(user.id);

    // الحصول على محفظة المستخدم
    const wallet = await User.getWallet(user.id);

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
        lastLogin: user.last_login
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
    console.log('🔄 طلب نسيت كلمة المرور لـ:', email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني مطلوب' 
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // البحث عن المستخدم
    const user = await User.findByEmail(cleanEmail);
    
    console.log('👤 نتيجة البحث:', user ? '✅ مستخدم مسجل' : '❌ غير مسجل');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'البريد الإلكتروني غير مسجل'
      });
    }

    // إلغاء الرموز السابقة
    await OTP.expirePreviousOTPs(cleanEmail, 'reset-password');

    // توليد رمز جديد
    const code = OTP.generateCode();

    // حفظ الرمز الجديد مع إضافة email
    await OTP.create({
      identifier: cleanEmail,
      email: cleanEmail,
      type: 'email',
      code,
      purpose: 'reset-password',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    console.log(`🔄 رمز إعادة تعيين كلمة المرور لـ ${cleanEmail}: ${code}`);

    // إرسال البريد الإلكتروني
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
              <h2 style="color: #333; margin-bottom: 20px;">رمز التحقق لتغيير كلمة المرور</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">أنت طلبت تغيير كلمة المرور الخاصة بحسابك المسجل في تطبيق السائح. رمز التحقق هو:</p>
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 48px; font-weight: bold; color: #3b82f6; letter-spacing: 5px;">${code}</span>
              </div>
              <p style="color: #666; font-size: 14px;">هذا الرمز صالح لمدة <strong>10 دقائق</strong></p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">إذا لم تطلب تغيير كلمة المرور، يمكنك تجاهل هذه الرسالة.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              © ${new Date().getFullYear()} تطبيق السائح - جميع الحقوق محفوظة
            </div>
          </div>
        `
      });
      console.log(`📧 تم إرسال البريد الإلكتروني إلى ${cleanEmail}`);
    } catch (emailError) {
      console.error('❌ فشل إرسال البريد:', emailError);
      console.log(`📧 [DEV MODE] Reset code for ${cleanEmail}: ${code}`);
    }

    res.json({
      success: true,
      message: 'تم إرسال رمز إعادة تعيين كلمة المرور',
      devCode: process.env.NODE_ENV === 'development' ? code : undefined
    });

  } catch (error) {
    console.error('❌ خطأ في نسيت كلمة المرور:', error);
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
    const otpRecord = await OTP.findValidOTP(cleanEmail, code, 'reset-password');

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      });
    }

    // تحديث حالة الرمز
    await OTP.save({ ...otpRecord, verified: true });

    // تحديث كلمة المرور
    await User.updatePassword(cleanEmail, newPassword);

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
router.get('/profile/:userId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
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
// ✅ 8. تحديث الملف الشخصي
// ============================================
router.put('/profile/:userId', authenticate, async (req, res) => {
  try {
    const { fullName, avatar } = req.body;
    
    const updatedUser = await User.update(req.params.userId, {
      fullName,
      avatar
    });
    
    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'المستخدم غير موجود' 
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي',
      user: {
        id: updatedUser.id,
        fullName: updatedUser.full_name,
        email: updatedUser.email,
        avatar: updatedUser.avatar
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ في تحديث الملف الشخصي' 
    });
  }
});

// ============================================
// ✅ 9. إرسال رمز التحقق للجوال
// ============================================
router.post('/send-phone-otp', authenticate, async (req, res) => {
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
    const existingUser = await User.findByPhone(cleanPhone);
    
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'رقم الجوال مستخدم بالفعل'
      });
    }

    // إنشاء رمز تحقق عشوائي
    const code = OTP.generateCode();
    
    // حفظ الرمز في قاعدة البيانات مع إضافة phone
    await OTP.create({
      identifier: cleanPhone,
      phone: cleanPhone,
      type: 'phone',
      code,
      purpose: 'phone-verification',
      userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    console.log(`📱 Phone OTP for user ${userId}: ${code}`);

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى جوالك',
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
// ✅ 10. التحقق من رمز الجوال
// ============================================
router.post('/verify-phone-otp', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, code } = req.body;

    console.log('📤 Verify phone OTP request:', { userId, phone, code });

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: 'رقم الجوال ورمز التحقق مطلوبان'
      });
    }

    const cleanPhone = phone.replace(/\s/g, '');

    // البحث عن الرمز الصحيح
    const otpRecord = await OTP.findValidOTP(cleanPhone, code, 'phone-verification');

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
      });
    }

    // تحديث رقم الجوال في ملف المستخدم
    await User.updatePhone(userId, cleanPhone);

    // إلغاء الرمز بعد الاستخدام
    await OTP.expirePreviousOTPs(cleanPhone, 'phone-verification');

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
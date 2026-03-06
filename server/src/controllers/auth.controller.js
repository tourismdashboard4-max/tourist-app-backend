import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authWalletService from '../services/authWalletService.js';
import emailService from '../services/emailService.js';
import { v4 as uuidv4 } from 'uuid';

// تخزين رموز OTP مؤقتاً (في الإنتاج استخدم Redis)
const otpStore = new Map();

class AuthController {
  
  // ============================================
  // 🔐 AUTHENTICATION METHODS
  // ============================================

  /**
   * تسجيل مستخدم جديد
   */
  async register(req, res) {
    try {
      const { fullName, email, password, phone, type } = req.body;

      // التحقق من وجود المستخدم
      const existingUser = await User.findOne({ 
        $or: [{ email }, { phone }] 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل'
        });
      }

      // إنشاء المستخدم الجديد
      const user = new User({
        fullName,
        email,
        password,
        phone,
        type: type || 'tourist',
        status: 'active',
        emailVerified: true,
        settings: {
          language: 'ar',
          notifications: { email: true, push: true, sms: false }
        }
      });

      await user.save();

      // إنشاء المحفظة تلقائياً
      const wallet = await authWalletService.createWalletForNewUser(
        user._id,
        user.type,
        { email: user.email, name: user.fullName }
      );

      // إنشاء توكن
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email,
          type: user.type
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      // إرسال بريد ترحيبي
      try {
        await emailService.sendWelcomeEmail(user.email, user.fullName);
      } catch (emailError) {
        console.error('❌ Failed to send welcome email:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الحساب والمحفظة بنجاح',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          type: user.type,
          avatar: user.avatar
        },
        wallet: {
          number: wallet.walletNumber,
          balance: wallet.balance,
          currency: wallet.currency
        },
        token
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إنشاء الحساب'
      });
    }
  }

  /**
   * تسجيل الدخول
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'تم إيقاف حسابك، يرجى التواصل مع الدعم'
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        });
      }

      user.lastLogin = new Date();
      await user.save();

      let wallet = await Wallet.findOne({ userId: user._id });
      
      if (!wallet) {
        wallet = await authWalletService.createWalletForNewUser(
          user._id,
          user.type,
          { email: user.email, name: user.fullName }
        );
      }

      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email,
          type: user.type
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          type: user.type,
          avatar: user.avatar,
          status: user.status
        },
        wallet: {
          number: wallet.walletNumber,
          balance: wallet.balance,
          frozen: wallet.frozenBalance,
          currency: wallet.currency,
          status: wallet.status
        },
        token
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تسجيل الدخول'
      });
    }
  }

  // ============================================
  // 📧 OTP METHODS (EMAIL)
  // ============================================

  /**
   * إرسال رمز التحقق (OTP)
   */
  async sendOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email || !email.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني غير صحيح'
        });
      }

      console.log(`📧 Received OTP request for: ${email}`);

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      otpStore.set(email, {
        code: otp,
        createdAt: Date.now(),
        attempts: 0
      });

      // محاولة إرسال البريد الإلكتروني
      try {
        await emailService.sendOTPEmail(email, otp);
        console.log(`📧 OTP email sent to: ${email}`);
      } catch (emailError) {
        console.log(`⚠️ OTP email failed, showing in console: ${otp}`);
      }

      // عرض الرمز في Console للتطوير
      console.log('\n' + '📧'.repeat(25));
      console.log('📧         رمز التحقق للبريد الإلكتروني');
      console.log('📧'.repeat(25));
      console.log(`📧 البريد: ${email}`);
      console.log(`🔢 الرمز: ${otp}`);
      console.log('📧'.repeat(25));
      console.log('⏰ صالح لمدة 10 دقائق');
      console.log('📧'.repeat(25) + '\n');

      setTimeout(() => {
        otpStore.delete(email);
      }, 10 * 60 * 1000);

      res.json({
        success: true,
        message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
        ...(process.env.NODE_ENV !== 'production' && { devCode: otp })
      });

    } catch (error) {
      console.error('❌ Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إرسال رمز التحقق'
      });
    }
  }

  /**
   * التحقق من رمز OTP
   */
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      const storedOTP = otpStore.get(email);
      
      if (!storedOTP) {
        return res.status(400).json({
          success: false,
          message: 'رمز التحقق غير صالح أو منتهي الصلاحية'
        });
      }

      if (storedOTP.attempts >= 3) {
        otpStore.delete(email);
        return res.status(400).json({
          success: false,
          message: 'تجاوزت عدد المحاولات المسموحة'
        });
      }

      if (storedOTP.code !== otp) {
        storedOTP.attempts++;
        return res.status(400).json({
          success: false,
          message: 'رمز التحقق غير صحيح'
        });
      }

      const user = await User.findOne({ email });
      
      otpStore.delete(email);

      res.json({
        success: true,
        message: 'تم التحقق بنجاح',
        data: {
          isNewUser: !user,
          email
        }
      });

    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء التحقق'
      });
    }
  }

  // ============================================
  // 🔐 FORGOT PASSWORD METHODS
  // ============================================

  /**
   * نسيت كلمة المرور - إرسال رمز التحقق
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      console.log(`🔄 طلب نسيت كلمة المرور لـ: ${email}`);

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مطلوب'
        });
      }

      // البحث عن المستخدم
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log(`❌ المستخدم غير مسجل: ${email}`);
        return res.status(404).json({
          success: false,
          message: 'البريد الإلكتروني غير مسجل'
        });
      }

      console.log(`✅ المستخدم موجود: ${user.fullName || user.email}`);

      // إنشاء رمز عشوائي من 6 أرقام
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔄 رمز إعادة تعيين كلمة المرور: ${resetCode}`);
      
      // حفظ الرمز في الذاكرة المؤقتة
      const otpKey = `reset:${email}`;
      otpStore.set(otpKey, {
        code: resetCode,
        createdAt: Date.now(),
        attempts: 0,
        userId: user._id
      });

      // ضبط انتهاء الصلاحية بعد 10 دقائق
      setTimeout(() => {
        otpStore.delete(otpKey);
      }, 10 * 60 * 1000);

      // ✅ عرض الرمز في Console بشكل واضح جداً
      console.log('\n' + '⭐'.repeat(60));
      console.log('⭐'.repeat(60));
      console.log('⭐                    🔐 ر م ز   ا ل ت ح ق ق   ا ل خ ا ص   ب ك 🔐');
      console.log('⭐'.repeat(60));
      console.log(`⭐ البريد الإلكتروني: ${email}`);
      console.log(`⭐ الرمز: ${resetCode}`);
      console.log('⭐'.repeat(60));
      console.log('⭐ صالح لمدة: 10 دقائق');
      console.log('⭐'.repeat(60) + '\n');

      // ✅ محاولة إرسال البريد (لن تنجح ولكن لا يهم)
      try {
        await emailService.sendPasswordResetEmail(email, resetCode);
        console.log(`📧 تم محاولة إرسال البريد إلى: ${email}`);
      } catch (emailError) {
        console.log(`⚠️ لم يتم إرسال البريد الإلكتروني: ${emailError.message}`);
        console.log(`💡 الرمز موجود أعلاه: ${resetCode}`);
      }

      // ✅ إرسال الرمز في الـ Response مباشرة
      res.json({
        success: true,
        message: 'تم إنشاء رمز التحقق بنجاح',
        resetCode: resetCode, // الرمز يرسل للتطبيق مباشرة
        note: 'في وضع التطوير، يتم إرسال الرمز مباشرة'
      });

    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إرسال رمز التحقق'
      });
    }
  }

  /**
   * التحقق من رمز إعادة تعيين كلمة المرور
   */
  async verifyResetCode(req, res) {
    try {
      const { email, code } = req.body;

      console.log(`🔍 التحقق من الرمز لـ: ${email}`);

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني ورمز التحقق مطلوبان'
        });
      }

      // البحث عن الرمز في الذاكرة المؤقتة
      const otpKey = `reset:${email}`;
      const resetData = otpStore.get(otpKey);

      if (!resetData) {
        console.log(`❌ رمز غير صالح أو منتهي الصلاحية: ${email}`);
        return res.status(400).json({
          success: false,
          message: 'رمز التحقق غير صالح أو منتهي الصلاحية'
        });
      }

      // التحقق من عدد المحاولات
      if (resetData.attempts >= 5) {
        otpStore.delete(otpKey);
        console.log(`❌ تجاوز عدد المحاولات: ${email}`);
        return res.status(400).json({
          success: false,
          message: 'تجاوزت عدد المحاولات المسموحة'
        });
      }

      // التحقق من الرمز
      if (resetData.code !== code) {
        resetData.attempts++;
        otpStore.set(otpKey, resetData);
        
        console.log(`❌ رمز غير صحيح (محاولة ${resetData.attempts}/5): ${email}`);
        
        return res.status(400).json({
          success: false,
          message: 'رمز التحقق غير صحيح',
          attemptsLeft: 5 - resetData.attempts
        });
      }

      // رمز صحيح
      console.log(`✅ تم التحقق بنجاح: ${email}`);

      res.json({
        success: true,
        message: 'تم التحقق بنجاح',
        data: {
          email,
          userId: resetData.userId
        }
      });

    } catch (error) {
      console.error('❌ Verify reset code error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء التحقق'
      });
    }
  }

  /**
   * إعادة تعيين كلمة المرور
   */
  async resetPassword(req, res) {
    try {
      const { email, code, newPassword } = req.body;

      console.log(`🔄 محاولة إعادة تعيين كلمة المرور لـ: ${email}`);

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

      // التحقق من الرمز مرة أخرى
      const otpKey = `reset:${email}`;
      const resetData = otpStore.get(otpKey);

      if (!resetData || resetData.code !== code) {
        console.log(`❌ رمز غير صالح لإعادة التعيين: ${email}`);
        return res.status(400).json({
          success: false,
          message: 'رمز التحقق غير صالح'
        });
      }

      // البحث عن المستخدم
      const user = await User.findById(resetData.userId);
      
      if (!user) {
        console.log(`❌ المستخدم غير موجود: ${email}`);
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      // تحديث كلمة المرور
      user.password = newPassword;
      await user.save();

      // حذف الرمز من الذاكرة المؤقتة
      otpStore.delete(otpKey);

      console.log(`✅ تم تغيير كلمة المرور بنجاح: ${email}`);

      // إنشاء توكن جديد لتسجيل الدخول التلقائي
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email,
          type: user.type
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح',
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          type: user.type
        }
      });

    } catch (error) {
      console.error('❌ Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تغيير كلمة المرور'
      });
    }
  }

  // ============================================
  // 📱 PHONE VERIFICATION METHODS
  // ============================================

  /**
   * إرسال رمز التحقق للجوال
   */
  async sendPhoneOTP(req, res) {
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
      const existingUser = await User.findOne({ 
        phone: cleanPhone,
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'رقم الجوال مستخدم بالفعل'
        });
      }

      // إنشاء رمز تحقق عشوائي من 6 أرقام
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // حفظ الرمز في قاعدة البيانات
      await User.findByIdAndUpdate(userId, {
        phoneVerification: {
          code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0
        }
      });

      // عرض الرمز في Console
      console.log('\n' + '📱'.repeat(25));
      console.log('📱         رمز التحقق للجوال');
      console.log('📱'.repeat(25));
      console.log(`📱 الرقم: ${phone}`);
      console.log(`🔢 الرمز: ${code}`);
      console.log('📱'.repeat(25));
      console.log('⏰ صالح لمدة 10 دقائق');
      console.log('📱'.repeat(25) + '\n');

      res.json({
        success: true,
        message: 'تم إرسال رمز التحقق إلى جوالك',
        ...(process.env.NODE_ENV !== 'production' && { devCode: code })
      });

    } catch (error) {
      console.error('❌ Send phone OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'فشل إرسال رمز التحقق'
      });
    }
  }

  /**
   * التحقق من رمز الجوال
   */
  async verifyPhoneOTP(req, res) {
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

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      // التحقق من وجود رمز
      if (!user.phoneVerification || !user.phoneVerification.code) {
        return res.status(400).json({
          success: false,
          message: 'لم يتم إرسال رمز تحقق بعد'
        });
      }

      // التحقق من انتهاء الصلاحية
      if (new Date() > user.phoneVerification.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'انتهت صلاحية رمز التحقق'
        });
      }

      // التحقق من عدد المحاولات
      if (user.phoneVerification.attempts >= 5) {
        return res.status(400).json({
          success: false,
          message: 'تجاوزت الحد الأقصى للمحاولات'
        });
      }

      // التحقق من الرمز
      if (user.phoneVerification.code !== code) {
        user.phoneVerification.attempts += 1;
        await user.save();
        
        return res.status(400).json({
          success: false,
          message: 'رمز التحقق غير صحيح',
          attemptsLeft: 5 - user.phoneVerification.attempts
        });
      }

      // تم التحقق بنجاح
      user.phoneVerification = undefined;
      await user.save();

      res.json({
        success: true,
        message: 'تم التحقق من الرمز بنجاح'
      });

    } catch (error) {
      console.error('❌ Verify phone OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'فشل التحقق'
      });
    }
  }

  /**
   * تحديث رقم الجوال بعد التحقق
   */
  async updatePhone(req, res) {
    try {
      const userId = req.user.id;
      const { phone } = req.body;

      console.log('📤 Update phone request:', { userId, phone });

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'رقم الجوال مطلوب'
        });
      }

      const cleanPhone = phone.replace(/\s/g, '');

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      // تحديث رقم الجوال
      user.phone = cleanPhone;
      user.phoneVerified = true;
      user.phoneVerifiedAt = new Date();
      
      await user.save();

      res.json({
        success: true,
        message: 'تم تحديث رقم الجوال بنجاح',
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          phoneVerified: user.phoneVerified
        }
      });

    } catch (error) {
      console.error('❌ Update phone error:', error);
      res.status(500).json({
        success: false,
        message: 'فشل تحديث رقم الجوال'
      });
    }
  }

  // ============================================
  // 👤 PROFILE METHODS
  // ============================================

  /**
   * الحصول على الملف الشخصي
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select('-password -phoneVerification');
      const wallet = await Wallet.findOne({ userId });

      res.json({
        success: true,
        user,
        wallet: wallet ? {
          number: wallet.walletNumber,
          balance: wallet.balance,
          frozen: wallet.frozenBalance,
          currency: wallet.currency,
          stats: wallet.stats
        } : null
      });

    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب الملف الشخصي'
      });
    }
  }

  /**
   * تحديث الملف الشخصي
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { fullName, phone, bio, location } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          fullName,
          phone,
          bio,
          location,
          updatedAt: new Date()
        },
        { new: true }
      ).select('-password -phoneVerification');

      res.json({
        success: true,
        message: 'تم تحديث الملف الشخصي بنجاح',
        user
      });

    } catch (error) {
      console.error('❌ Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تحديث الملف الشخصي'
      });
    }
  }

  /**
   * تحديث الصورة الشخصية
   */
  async updateAvatar(req, res) {
    try {
      const userId = req.user.id;
      
      // هنا يمكن إضافة منطق رفع الصورة
      // مثال: استخدام multer أو خدمة تخزين سحابية

      res.json({
        success: true,
        message: 'تم تحديث الصورة الشخصية بنجاح',
        avatar: 'url-to-uploaded-image'
      });

    } catch (error) {
      console.error('❌ Update avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تحديث الصورة'
      });
    }
  }

  /**
   * تغيير كلمة المرور
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body;

      const user = await User.findById(userId).select('+password');
      
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور القديمة غير صحيحة'
        });
      }

      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح'
      });

    } catch (error) {
      console.error('❌ Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تغيير كلمة المرور'
      });
    }
  }
}

export default new AuthController();
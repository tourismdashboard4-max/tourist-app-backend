// ============================================
// Email Service using Gmail OAuth2 (Production Ready)
// ============================================
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const OAuth2 = google.auth.OAuth2;

// التحقق من وجود متغيرات البيئة
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
  'EMAIL_USER'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
  }
}

/**
 * إنشاء ناقل بريد باستخدام OAuth2
 */
const createTransporter = async () => {
  try {
    console.log('🔑 Creating Gmail OAuth2 transporter...');
    
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground' // Redirect URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const accessToken = await oauth2Client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to obtain access token');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    // مراقبة تجديد التوكن
    transporter.on('token', (token) => {
      console.log('🔄 OAuth2 token refreshed successfully');
      console.log('   - Expires at:', new Date(token.expires));
    });

    transporter.on('error', (err) => {
      console.error('❌ OAuth2 transporter error:', err);
    });

    console.log('✅ Gmail OAuth2 transporter created successfully');
    return transporter;
  } catch (error) {
    console.error('❌ Failed to create OAuth2 transporter:', error);
    throw error;
  }
};

let transporter = null;

/**
 * الحصول على ناقل البريد (مع التهيئة مرة واحدة)
 */
const getTransporter = async () => {
  if (!transporter) {
    transporter = await createTransporter();
  }
  return transporter;
};

/**
 * إرسال بريد إلكتروني باستخدام OAuth2
 */
const sendEmail = async (to, subject, html) => {
  try {
    if (!to || !to.includes('@')) {
      throw new Error('Invalid email address');
    }

    console.log(`📧 Preparing to send email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const mailOptions = {
      from: `"تطبيق السياحة" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const currentTransporter = await getTransporter();
    const info = await currentTransporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully via Gmail OAuth2: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    return { success: false, error: error.message };
  }
};

// ============================================
// أدوات مساعدة
// ============================================

/**
 * توليد رمز OTP عشوائي مكون من 6 أرقام
 */
const generateOTP = () => {
  return Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
};

/**
 * توليد رقم محفظة فريد للمستخدم
 */
const generateWalletNumber = (userId) => {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `WLT-${timestamp}-${userId}-${randomPart}`;
};

// ============================================
// قوالب البريد الإلكتروني
// ============================================

/**
 * إرسال رمز التحقق (OTP)
 */
const sendOTPEmail = async (to) => {
  try {
    const otpCode = generateOTP();
    const subject = '🔐 رمز التحقق الخاص بك - تطبيق السياحة';
    
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
          .container { background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 20px; }
          .header h1 { color: #2c3e50; margin: 0; font-size: 28px; }
          .otp-code { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 42px; letter-spacing: 8px; text-align: center; padding: 25px; border-radius: 12px; margin: 30px 0; font-weight: bold; box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3); }
          .warning { background-color: #fff3cd; border: 2px solid #ffeeba; color: #856404; padding: 20px; border-radius: 8px; font-size: 14px; margin: 25px 0; }
          .footer { margin-top: 30px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
          .footer p { margin: 5px 0; }
          .note { background-color: #e7f3ff; border: 2px solid #91c9ff; color: #004085; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 تطبيق السياحة</h1>
          </div>
          
          <p style="font-size: 18px;">مرحباً بك،</p>
          <p style="font-size: 16px;">لقد طلبت رمز تحقق للوصول إلى حسابك. استخدم الرمز التالي لإكمال العملية:</p>
          
          <div class="otp-code">${otpCode}</div>
          
          <div class="note">
            <p style="margin: 0; font-weight: bold;">⏰ هذا الرمز صالح لمدة 10 دقائق فقط</p>
          </div>
          
          <div class="warning">
            <p style="margin: 0;">⚠️ إذا لم تكن قد طلبت هذا الرمز، يرجى تجاهل هذه الرسالة وتأكد من أمان حسابك.</p>
          </div>
          
          <div class="footer">
            <p>© 2026 تطبيق السياحة. جميع الحقوق محفوظة.</p>
            <p>هذا بريد إلكتروني آلي، يرجى عدم الرد عليه.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail(to, subject, html);
    
    if (result.success) {
      console.log(`✅ OTP generated and sent to ${to}: ${otpCode}`);
      return { success: true, code: otpCode };
    } else {
      console.error(`❌ Failed to send OTP to ${to}: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error in sendOTPEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * إرسال بريد إعادة تعيين كلمة المرور
 */
const sendPasswordResetEmail = async (to) => {
  console.log(`📧 Sending password reset email to ${to}`);
  return sendOTPEmail(to);
};

/**
 * إرسال بريد ترحيبي مع رقم المحفظة
 */
const sendWelcomeEmailWithWallet = async (to, name, walletNumber) => {
  const subject = '🎉 مرحباً بك في تطبيق السياحة!';
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
        .container { background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 32px; }
        .wallet-card { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center; box-shadow: 0 4px 10px rgba(46, 204, 113, 0.3); }
        .wallet-number { font-size: 24px; letter-spacing: 2px; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 15px 0; font-weight: bold; }
        .features { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; }
        .features li { margin: 10px 0; }
        .footer { margin-top: 30px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🎉 مرحباً بك في تطبيق السياحة!</h1></div>
        <p style="font-size: 18px;">أهلاً <strong>${name}</strong>،</p>
        <p style="font-size: 16px;">نحن سعداء بانضمامك إلينا! تطبيق السياحة هو وجهتك المثالية لاكتشاف أجمل الوجهات السياحية.</p>
        
        <div class="wallet-card">
          <h3 style="margin-top: 0;">💰 محفظتك جاهزة</h3>
          <div class="wallet-number">${walletNumber}</div>
          <p style="margin-bottom: 0;">احتفظ بهذا الرقم، ستحتاجه لإدارة رصيدك وحجوزاتك</p>
        </div>
        
        <div class="features">
          <h3 style="margin-top: 0;">✨ ماذا يمكنك أن تفعل الآن؟</h3>
          <ul>
            <li>استكشف البرامج السياحية المتاحة</li>
            <li>احجز رحلتك القادمة مع مرشدين محترفين</li>
            <li>تابع حجوزاتك ومحفظتك بكل سهولة</li>
            <li>تواصل مع فريق الدعم الفني على مدار الساعة</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>© 2026 تطبيق السياحة. جميع الحقوق محفوظة.</p>
          <p>هذا بريد إلكتروني آلي، يرجى عدم الرد عليه.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

// ============================================
// تصدير الدوال
// ============================================

export {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmailWithWallet,
  generateOTP,
  generateWalletNumber,
  sendEmail,
};

// ============================================
// تصدير الدوال (نسخة مبسطة)
// ============================================

export default {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmailWithWallet,
  generateOTP,
  generateWalletNumber,
  sendEmail,
};
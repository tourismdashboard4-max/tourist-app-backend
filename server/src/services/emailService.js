// ============================================
// Email Service using Resend API (Production Ready)
// ============================================
import { Resend } from 'resend';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// التحقق من وجود مفتاح API
if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not defined in environment variables');
}

// تهيئة Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================
// أدوات مساعدة
// ============================================

/**
 * توليد رمز OTP عشوائي مكون من 6 أرقام
 * @returns {string} رمز مكون من 6 أرقام
 */
const generateOTP = () => {
  return Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
};

/**
 * توليد رقم محفظة فريد للمستخدم
 * @param {string} userId - معرف المستخدم
 * @returns {string} رقم محفظة فريد
 */
const generateWalletNumber = (userId) => {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `WLT-${timestamp}-${userId}-${randomPart}`;
};

/**
 * إرسال بريد إلكتروني باستخدام Resend API
 * @param {string} to - البريد الإلكتروني للمستلم
 * @param {string} subject - عنوان الرسالة
 * @param {string} html - محتوى HTML للبريد
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendEmail = async (to, subject, html) => {
  try {
    // التحقق من صحة البريد الإلكتروني
    if (!to || !to.includes('@')) {
      throw new Error('Invalid email address');
    }

    console.log(`📧 Preparing to send email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const { data, error } = await resend.emails.send({
      from: 'تطبيق السياحة <onboarding@resend.dev>', // يمكن تغييره لاحقاً بعد إضافة النطاق
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Email sent successfully via Resend: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// قوالب البريد الإلكتروني
// ============================================

/**
 * إرسال رمز التحقق (OTP)
 * @param {string} to - البريد الإلكتروني للمستلم
 * @returns {Promise<{success: boolean, code?: string, error?: string}>}
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
 * إرسال بريد ترحيبي مع رقم المحفظة
 * @param {string} to - البريد الإلكتروني للمستلم
 * @param {string} name - اسم المستخدم
 * @param {string} walletNumber - رقم المحفظة
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
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
        .features ul { list-style: none; padding: 0; }
        .features li { margin: 10px 0; padding-right: 25px; position: relative; }
        .features li:before { content: "✓"; color: #27ae60; font-weight: bold; position: absolute; right: 0; }
        .footer { margin-top: 30px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 مرحباً بك في تطبيق السياحة!</h1>
        </div>
        
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

/**
 * إرسال إشعارات عامة
 * @param {string} to - البريد الإلكتروني للمستلم
 * @param {string} subject - عنوان الرسالة
 * @param {string} message - نص الرسالة
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendNotificationEmail = async (to, subject, message) => {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background-color: #f9f9f9; border-radius: 10px; padding: 30px; }
        .header { text-align: center; margin-bottom: 30px; }
        .content { padding: 20px; background: white; border-radius: 8px; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>تطبيق السياحة</h1>
        </div>
        <div class="content">
          <p>${message}</p>
        </div>
        <div class="footer">
          <p>© 2026 تطبيق السياحة. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

// التحقق من صحة الاتصال عند بدء التشغيل (اختياري)
const verifyConnection = async () => {
  try {
    // إرسال بريد اختبار إلى نفسك للتأكد من أن المفتاح يعمل
    const testResult = await sendEmail(
      process.env.EMAIL_USER || 'test@example.com',
      '✅ اختبار اتصال Resend',
      '<p>تم الاتصال بنجاح بخدمة Resend</p>'
    );
    
    if (testResult.success) {
      console.log('✅ Resend API connection verified successfully');
    } else {
      console.warn('⚠️ Could not verify Resend connection');
    }
  } catch (error) {
    console.warn('⚠️ Resend verification skipped:', error.message);
  }
};

// تصدير الدوال
export {
  sendOTPEmail,
  sendWelcomeEmailWithWallet,
  sendNotificationEmail,
  verifyConnection,
  generateOTP,
  generateWalletNumber,
  sendEmail,
};

// تصدير افتراضي للتوافق مع الإصدارات السابقة
export default {
  sendOTPEmail,
  sendWelcomeEmailWithWallet,
  sendNotificationEmail,
  verifyConnection,
  generateOTP,
  generateWalletNumber,
  sendEmail,
};
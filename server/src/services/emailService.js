// server/src/services/emailService.js

/**
 * خدمة البريد الإلكتروني - النسخة النهائية
 * لا تحاول إرسال بريد أبداً، فقط تعرض الرموز في Console
 */
class EmailService {
  
  /**
   * إرسال بريد إعادة تعيين كلمة المرور
   */
  async sendPasswordResetEmail(to, code) {
    // ✅ عرض الرمز في Console بشكل واضح جداً
    console.log('\n' + '🔐'.repeat(50));
    console.log('🔐'.repeat(50));
    console.log('🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐');
    console.log('🔐         🔑 ر م ز   إ ع ا د ة   ت ع ي ي ن   ك ل م ة   ا ل م ر و ر   🔑');
    console.log('🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐');
    console.log('🔐'.repeat(50));
    console.log(`🔐  البريد الإلكتروني: ${to}`);
    console.log(`🔐  الرمز: ${code}`);
    console.log('🔐'.repeat(50));
    console.log(`🔐  ⏰ هذا الرمز صالح لمدة 10 دقائق`);
    console.log('🔐'.repeat(50));
    console.log('🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐');
    console.log('🔐'.repeat(50) + '\n');
    
    // ✅ دائماً أرجع نجاح - بدون أي محاولة إرسال بريد
    return { 
      success: true, 
      message: 'تم إنشاء رمز التحقق',
      code: code
    };
  }

  /**
   * إرسال بريد ترحيبي
   */
  async sendWelcomeEmail(to, name) {
    console.log(`\n📧 [تطوير] بريد ترحيبي إلى ${to} للمستخدم ${name}\n`);
    return { success: true };
  }

  /**
   * إرسال بريد OTP
   */
  async sendOTPEmail(to, code) {
    return this.sendPasswordResetEmail(to, code);
  }

  /**
   * إرسال بريد تأكيد الحجز
   */
  async sendBookingConfirmationEmail(to, booking) {
    console.log(`\n📧 [تطوير] تأكيد حجز إلى ${to}\n`);
    return { success: true };
  }
}

const emailService = new EmailService();
export default emailService;
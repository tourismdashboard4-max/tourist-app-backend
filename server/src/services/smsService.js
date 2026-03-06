import axios from 'axios';

class SMSService {
  
  /**
   * إرسال رسالة نصية
   * @param {string} phone - رقم الجوال
   * @param {string} message - نص الرسالة
   */
  async sendSMS(phone, message) {
    try {
      console.log(`📱 سترسل رسالة إلى: ${phone}`);
      console.log(`📱 المحتوى: ${message}`);
      
      // في وضع التطوير، فقط نسجل ولا نرسل فعلياً
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 [DEV MODE] SMS would be sent in production');
        return { success: true, messageId: 'test-sms-' + Date.now() };
      }

      // في الإنتاج، استخدم خدمة SMS حقيقية مثل Unifonic (خدمة سعودية)
      try {
        // محاولة إرسال عبر Unifonic
        const response = await axios.post('https://api.unifonic.com/rest/Messages/Send', {
          AppSid: process.env.UNIFONIC_APP_SID,
          SenderID: process.env.SENDER_NUMBER || 'TOURIST',
          Recipient: phone,
          Body: message
        });

        console.log(`📱 SMS sent via Unifonic: ${response.data.MessageID}`);
        return { success: true, messageId: response.data.MessageID, provider: 'unifonic' };
      } catch (unifonicError) {
        console.error('❌ Unifonic error, trying Twilio...', unifonicError.message);
        
        // تجربة Twilio كبديل
        try {
          // إذا كان لديك Twilio مثبت
          const twilioClient = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          
          const twilioResponse = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
          });
          
          console.log(`📱 SMS sent via Twilio: ${twilioResponse.sid}`);
          return { success: true, messageId: twilioResponse.sid, provider: 'twilio' };
        } catch (twilioError) {
          console.error('❌ Twilio error:', twilioError.message);
          throw new Error('فشل إرسال الرسالة النصية عبر جميع الخدمات');
        }
      }

    } catch (error) {
      console.error('Error sending SMS:', error);
      
      // في حالة الفشل، لا نعيد خطأ للمستخدم في وضع التطوير
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 [DEV MODE] SMS failed but continuing...');
        return { success: true, messageId: 'test-sms-' + Date.now() };
      }
      
      throw error;
    }
  }

  /**
   * إرسال رمز التحقق (OTP)
   * @param {string} phone - رقم الجوال
   * @param {string} code - رمز التحقق
   */
  async sendOTP(phone, code) {
    const message = `🔐 رمز التحقق الخاص بك في تطبيق السائح هو: ${code}`;
    return this.sendSMS(phone, message);
  }

  /**
   * إرسال إشعار SMS
   * @param {string} phone - رقم الجوال
   * @param {Object} notification - الإشعار
   */
  async sendNotificationSMS(phone, notification) {
    const message = `${notification.title}: ${notification.message}`;
    return this.sendSMS(phone, message);
  }

  /**
   * إرسال تأكيد الحجز
   * @param {string} phone - رقم الجوال
   * @param {Object} booking - بيانات الحجز
   */
  async sendBookingConfirmationSMS(phone, booking) {
    const message = `✅ تم تأكيد حجزك رقم ${booking.bookingId} في تطبيق السائح. المبلغ: ${booking.totalPrice} ريال`;
    return this.sendSMS(phone, message);
  }

  /**
   * إرسال إشعار بدء الرحلة
   * @param {string} phone - رقم الجوال
   * @param {Object} booking - بيانات الحجز
   */
  async sendTripStartSMS(phone, booking) {
    const message = `🚀 بدأت رحلتك مع المرشد ${booking.guideName}. نتمنى لك تجربة ممتعة!`;
    return this.sendSMS(phone, message);
  }

  /**
   * إرسال إشعار إلغاء الحجز
   * @param {string} phone - رقم الجوال
   * @param {Object} booking - بيانات الحجز
   */
  async sendCancellationSMS(phone, booking) {
    const message = `❌ تم إلغاء حجزك رقم ${booking.bookingId}. سنقوم بإعادة المبلغ إلى محفظتك.`;
    return this.sendSMS(phone, message);
  }

  /**
   * إرسال إشعار استرداد المبلغ
   * @param {string} phone - رقم الجوال
   * @param {number} amount - المبلغ المسترد
   */
  async sendRefundSMS(phone, amount) {
    const message = `💰 تم إضافة ${amount} ريال إلى محفظتك في تطبيق السائح.`;
    return this.sendSMS(phone, message);
  }

  /**
   * إرسال إشعار ترحيبي
   * @param {string} phone - رقم الجوال
   * @param {string} name - اسم المستخدم
   */
  async sendWelcomeSMS(phone, name) {
    const message = `👋 مرحباً ${name}! تم تفعيل حسابك في تطبيق السائح. نتمنى لك تجربة ممتعة!`;
    return this.sendSMS(phone, message);
  }
}

const smsService = new SMSService();
export default smsService;
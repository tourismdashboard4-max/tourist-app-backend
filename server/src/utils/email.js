import { Resend } from 'resend';

// استخدام مفتاح Resend من متغيرات البيئة في Render
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log(`📧 Preparing to send email to: ${to}`);
    console.log(`📧 Using Resend API (Key: ${process.env.RESEND_API_KEY ? '✅ موجود' : '❌ غير موجود'})`);

    // استخدام البريد الافتراضي من Resend للتجربة (يمكن تغييره لاحقاً)
    const fromEmail = 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: `Tourist App <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log(`✅ Email sent successfully! ID: ${data?.id}`);
    return data;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
};

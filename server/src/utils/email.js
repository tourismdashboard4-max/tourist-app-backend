import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log('📧 Preparing to send email to:', to);
    console.log('📧 Using email configuration:', {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS ? '***' : 'not set',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || '587'
    });

    // إنشاء ناقل البريد مع إعدادات SMTP الكاملة
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // ✅ تم التصحيح: EMAIL_PASS وليس EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false // مهم لبعض الخوادم
      }
    });

    const mailOptions = {
      from: `"تطبيق السائح" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    console.log('📧 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);

    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('❌ Full error:', error);
    throw error;
  }
};

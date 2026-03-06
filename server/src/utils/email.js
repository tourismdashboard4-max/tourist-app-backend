import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log('📧 Preparing to send email to:', to);
    console.log('📧 Using simple email configuration with App Password');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"السائح" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    console.log('📧 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);

    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
};
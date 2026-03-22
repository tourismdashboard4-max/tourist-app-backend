import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error('❌ BREVO_API_KEY is not set in environment variables');
    throw new Error('Email service not configured');
  }

  console.log(`📧 Preparing to send email to: ${to}`);
  console.log(`📧 Using Brevo API (Key: ${apiKey ? '✅ موجود' : '❌ غير موجود'})`);

  const emailData = {
    sender: { email: 'tourism.dashboard4@gmail.com', name: 'تطبيق السائح' },
    to: [{ email: to }],
    subject: subject,
    htmlContent: html,
  };

  try {
    const response = await axios.post(BREVO_API_URL, emailData, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Email sent successfully! Status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error('❌ Email sending failed:');
    if (error.response) {
      console.error('❌ Error response:', error.response.data);
    } else {
      console.error('❌ Error message:', error.message);
    }
    throw error;
  }
};

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 5000, // 5 seconds timeout
  socketTimeout: 10000, // 10 seconds socket timeout
  ipFamily: 4, // Force IPv4 to avoid ENETUNREACH errors on cloud hosting
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Email transporter verification failed:', error);
  } else {
    console.log('Email server is ready to send messages!');
  }
});

// Function to send welcome email to new subscribers
export const sendWelcomeEmail = async (email) => {
  try {
    const mailOptions = {
      from: `"Blog App" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to Our Newsletter! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Our Newsletter! 🎉</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p>Thank you for subscribing to our newsletter! We're excited to have you on board.</p>
                <p>You'll now receive:</p>
                <ul>
                  <li>✨ Latest blog posts and updates</li>
                  <li>📚 Exclusive content and tips</li>
                  <li>🎁 Special offers and announcements</li>
                </ul>
                <p style="margin-top: 30px;">
                  <a href="${process.env.FRONTEND_URL || 'https://unsaid-stories-and-more.vercel.app'}" class="button">Visit Our Blog</a>
                </p>
                <p style="margin-top: 30px;">Best regards,<br>The Blog App Team</p>
              </div>
              <div class="footer">
                <p>You received this email because you subscribed to our newsletter.</p>
                <p>&copy; ${new Date().getFullYear()} Blog App. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    // Set timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timeout - 15 seconds')), 15000);
    });

    // Race between sending email and timeout
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      timeoutPromise
    ]);
    
    console.log('[Email Service] Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email Service] Error sending welcome email:', error.message);
    return { success: false, error: error.message };
  }
};

// Function to send notification about new posts to subscribers
export const sendNewPostNotification = async (subscribers, postTitle, postUrl) => {
  try {
    if (!subscribers || subscribers.length === 0) {
      console.log('No subscribers to notify');
      return { success: false, error: 'No subscribers' };
    }

    const mailOptions = {
      from: `"Blog App" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: subscribers.join(', '),
      subject: `New Post Published: ${postTitle} 📝`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Post Alert! 📝</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p>We've just published a new post that we think you'll love!</p>
                <h2 style="color: #f5576c; margin-top: 25px;">${postTitle}</h2>
                <p>Click the button below to read it now:</p>
                <p style="margin-top: 30px;">
                  <a href="${postUrl}" class="button">Read Now →</a>
                </p>
                <p style="margin-top: 30px;">Happy reading!<br>The Blog App Team</p>
              </div>
              <div class="footer">
                <p>You received this email because you subscribed to our newsletter.</p>
                <p>&copy; ${new Date().getFullYear()} Blog App. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    // Set timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timeout - 15 seconds')), 15000);
    });

    // Race between sending email and timeout
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      timeoutPromise
    ]);
    
    console.log('[Email Service] New post notification sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email Service] Error sending new post notification:', error.message);
    return { success: false, error: error.message };
  }
};

export default { sendWelcomeEmail, sendNewPostNotification };

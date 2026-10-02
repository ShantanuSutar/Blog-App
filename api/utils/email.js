import nodemailer from 'nodemailer';
import { escapeHtml, sanitizePlainText } from './content.js';
import { config } from '../config.js';
import { signApplicationToken } from '../security/auth.js';

const createUnsubscribeUrl = (email) => {
  const token = signApplicationToken(
    { email, purpose: 'newsletter-unsubscribe' },
    { expiresIn: '365d' }
  );
  return `${config.apiPublicUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
};

let transporter;

const getTransporter = () => {
  if (!config.email.user || !config.email.password) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
      connectionTimeout: 5000,
      socketTimeout: 10000,
      ipFamily: 4,
      // Newsletter templates are generated in memory and never need to read
      // local files or fetch remote content through the mail transport.
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  return transporter;
};

const sendMail = async (mailOptions) => {
  const emailTransporter = getTransporter();
  if (!emailTransporter) {
    throw new Error('SMTP credentials are not configured');
  }
  return emailTransporter.sendMail(mailOptions);
};

// Function to send welcome email to new subscribers
export const sendWelcomeEmail = async (email) => {
  try {
    const unsubscribeUrl = createUnsubscribeUrl(email);
    const mailOptions = {
      from: `"Blog App" <${config.email.from}>`,
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
                  <a href="${config.frontendUrl}" class="button">Visit Our Blog</a>
                </p>
                <p style="margin-top: 30px;">Best regards,<br>The Blog App Team</p>
              </div>
              <div class="footer">
                <p>You received this email because you subscribed to our newsletter.</p>
                <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
                <p>&copy; ${new Date().getFullYear()} Blog App. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    const info = await sendMail(mailOptions);
    
    console.log('[Email Service] Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email Service] Welcome email delivery failed', {
      code: error?.code,
      command: error?.command,
      responseCode: error?.responseCode,
    });
    return { success: false, error: 'Email delivery failed' };
  }
};

// Function to send notification about new posts to subscribers
export const sendNewPostNotification = async (subscribers, postTitle, postUrl) => {
  try {
    if (!subscribers || subscribers.length === 0) {
      console.log('No subscribers to notify');
      return { success: false, error: 'No subscribers' };
    }

    const safePostTitle = escapeHtml(sanitizePlainText(postTitle));
    const sendToSubscriber = (email) => {
      const unsubscribeUrl = createUnsubscribeUrl(email);
      return sendMail({
        from: `"Blog App" <${config.email.from}>`,
        to: email,
        subject: `New Post Published: ${safePostTitle} 📝`,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
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
                <h2 style="color: #f5576c; margin-top: 25px;">${safePostTitle}</h2>
                <p>Click the button below to read it now:</p>
                <p style="margin-top: 30px;">
                  <a href="${postUrl}" class="button">Read Now →</a>
                </p>
                <p style="margin-top: 30px;">Happy reading!<br>The Blog App Team</p>
              </div>
              <div class="footer">
                <p>You received this email because you subscribed to our newsletter.</p>
                <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
                <p>&copy; ${new Date().getFullYear()} Blog App. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
        `,
      });
    };

    let sent = 0;
    const batchSize = 10;
    for (let index = 0; index < subscribers.length; index += batchSize) {
      const batch = subscribers.slice(index, index + batchSize);
      const results = await Promise.allSettled(batch.map(sendToSubscriber));
      sent += results.filter((result) => result.status === 'fulfilled').length;
    }

    console.log(`[Email Service] New post notification delivered to ${sent} subscriber(s)`);
    return { success: sent === subscribers.length, sent, failed: subscribers.length - sent };
  } catch (error) {
    console.error('[Email Service] Post notification delivery failed', {
      code: error?.code,
      command: error?.command,
      responseCode: error?.responseCode,
    });
    return { success: false, error: 'Email delivery failed' };
  }
};

export default { sendWelcomeEmail, sendNewPostNotification };

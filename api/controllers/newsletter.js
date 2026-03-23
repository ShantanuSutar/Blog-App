import { db } from "../db.js";
import { sendWelcomeEmail } from "../utils/email.js";

export const subscribe = async (req, res) => {
    const q = "INSERT INTO subscribers(email) VALUES ($1)";
    try {
        // Save subscription to database
        await db.query(q, [req.body.email]);

        console.log(`\n📧 New subscriber: ${req.body.email}`);
        
        // Send welcome email in background (non-blocking)
        // Don't wait for this to complete before responding
        sendWelcomeEmail(req.body.email)
            .then(emailResult => {
                if (emailResult.success) {
                    console.log('✅ Welcome email sent successfully to:', req.body.email);
                    console.log('Message ID:', emailResult.messageId);
                } else {
                    console.warn('❌ Failed to send welcome email:', emailResult.error);
                }
            })
            .catch(err => {
                console.error('❌ Email send error:', err.message);
            });
        
        console.log('Subscription saved, returning response immediately...');
        
        // Return success immediately without waiting for email
        return res.status(200).json("Subscribed successfully!");
    } catch (err) {
        console.error('❌ Error in subscribe:', err);
        if (err.code === '23505') return res.status(409).json("Email already subscribed.");
        return res.status(500).json(err);
    }
};

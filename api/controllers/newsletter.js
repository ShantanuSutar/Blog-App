import { db } from "../db.js";
import { sendWelcomeEmail } from "../utils/email.js";

export const subscribe = async (req, res) => {
    const q = "INSERT INTO subscribers(email) VALUES ($1)";
    try {
        await db.query(q, [req.body.email]);

        console.log(`\n📧 New subscriber: ${req.body.email}`);
        console.log('Sending welcome email...');
        
        // Send welcome email
        const emailResult = await sendWelcomeEmail(req.body.email);
        
        if (emailResult.success) {
            console.log('✅ Welcome email sent successfully!');
            console.log('Message ID:', emailResult.messageId);
        } else {
            console.warn('❌ Failed to send welcome email:', emailResult.error);
            console.log('Note: Subscription saved, but email failed to send');
        }

        return res.status(200).json("Subscribed successfully!");
    } catch (err) {
        console.error('❌ Error in subscribe:', err);
        if (err.code === '23505') return res.status(409).json("Email already subscribed.");
        return res.status(500).json(err);
    }
};

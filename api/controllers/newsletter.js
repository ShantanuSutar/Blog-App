import { db } from "../db.js";
import { sendWelcomeEmail } from "../utils/email.js";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../middleware/auth.js";

export const subscribe = async (req, res) => {
    const q = "INSERT INTO subscribers(email) VALUES ($1)";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json("A valid email address is required.");
    }

    try {
        // Save subscription to database
        await db.query(q, [email]);
        
        // Send welcome email in background (non-blocking)
        // Don't wait for this to complete before responding
        sendWelcomeEmail(email)
            .then(emailResult => {
                if (emailResult.success) {
                    console.log('Welcome email sent successfully');
                } else {
                    console.warn('Failed to send welcome email:', emailResult.error);
                }
            })
            .catch(err => {
                console.error('Email send error:', err.message);
            });
        
        // Return success immediately without waiting for email
        return res.status(200).json("Subscribed successfully!");
    } catch (err) {
        console.error('Error in subscribe:', err);
        if (err.code === '23505') return res.status(409).json("Email already subscribed.");
        return res.status(500).json(err);
    }
};

export const unsubscribe = async (req, res) => {
    try {
        const payload = jwt.verify(req.query.token, jwtSecret());

        if (payload.purpose !== "newsletter-unsubscribe" || typeof payload.email !== "string") {
            return res.status(400).send("Invalid unsubscribe link.");
        }

        await db.query("DELETE FROM subscribers WHERE LOWER(email) = LOWER($1)", [payload.email]);
        return res.status(200).send("You have been unsubscribed successfully.");
    } catch (err) {
        if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
            return res.status(400).send("This unsubscribe link is invalid or expired.");
        }

        console.error("Error unsubscribing:", err);
        return res.status(500).send("Unable to unsubscribe right now.");
    }
};

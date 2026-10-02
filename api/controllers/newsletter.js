import { db } from "../db.js";
import { sendWelcomeEmail } from "../utils/email.js";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../middleware/auth.js";
import { ApiError } from "../errors/ApiError.js";

export const subscribe = async (req, res) => {
    const q = "INSERT INTO subscribers(email) VALUES ($1)";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ApiError(400, "A valid email address is required.", "EMAIL_INVALID");
    }

    try {
        await db.query(q, [email]);
        
        sendWelcomeEmail(email)
            .then(emailResult => {
                if (!emailResult.success) {
                    console.warn('Failed to send welcome email:', emailResult.error);
                }
            })
            .catch(err => {
                console.error('Email send error:', err.message);
            });
        
        return res.status(201).json("Subscribed successfully!");
    } catch (err) {
        if (err.code === '23505') {
            throw new ApiError(409, "Email already subscribed.", "EMAIL_ALREADY_SUBSCRIBED", undefined, {
                cause: err,
            });
        }
        throw err;
    }
};

export const unsubscribe = async (req, res) => {
    let payload;
    try {
        payload = jwt.verify(req.query.token, jwtSecret());
    } catch (err) {
        if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
            return res.status(400).send("This unsubscribe link is invalid or expired.");
        }
        throw err;
    }

    if (payload.purpose !== "newsletter-unsubscribe" || typeof payload.email !== "string") {
        return res.status(400).send("Invalid unsubscribe link.");
    }

    await db.query("DELETE FROM subscribers WHERE LOWER(email) = LOWER($1)", [payload.email]);
    return res.status(200).send("You have been unsubscribed successfully.");
};

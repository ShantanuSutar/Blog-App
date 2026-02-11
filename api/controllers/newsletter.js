import { db } from "../db.js";

export const subscribe = async (req, res) => {
    const q = "INSERT INTO subscribers(email) VALUES ($1)";
    try {
        await db.query(q, [req.body.email]);

        // Here we would typically send a confirmation email
        // For now, we'll just simulate it
        console.log(`Sending confirmation email to ${req.body.email}...`);

        return res.status(200).json("Subscribed successfully!");
    } catch (err) {
        if (err.code === '23505') return res.status(409).json("Email already subscribed.");
        return res.status(500).json(err);
    }
};

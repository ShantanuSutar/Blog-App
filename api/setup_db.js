import { db } from "./db.js";

const setupDatabase = async () => {
    try {
        console.log("Creating bookmarks table...");
        await db.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id SERIAL PRIMARY KEY,
        uid INTEGER NOT NULL,
        pid INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(uid, pid),
        FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (pid) REFERENCES posts(id) ON DELETE CASCADE
      );
    `);
        console.log("Bookmarks table created.");

        console.log("Creating subscribers table...");
        await db.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log("Subscribers table created.");

        console.log("Adding views column to posts table...");
        await db.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
    `);
        console.log("Posts table updated with views column.");

        console.log("Database setup complete.");
        process.exit(0);
    } catch (err) {
        console.error("Error setting up database:", err);
        process.exit(1);
    }
};

setupDatabase();

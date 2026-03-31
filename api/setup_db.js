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

        console.log("Creating reactions table...");
        await db.query(`
      CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        post_id INTEGER,
        comment_id INTEGER,
        reaction_type VARCHAR(50) NOT NULL DEFAULT 'like',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id, comment_id, reaction_type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
      );
    `);
        console.log("Reactions table created.");

        console.log("Creating follows table...");
        await db.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
        CHECK (follower_id != following_id)
      );
    `);
        console.log("Follows table created.");

        console.log("Adding indexes for follows table...");
        await db.query(`
      CREATE INDEX IF NOT EXISTS idx_follower ON follows(follower_id);
      CREATE INDEX IF NOT EXISTS idx_following ON follows(following_id);
    `);
        console.log("Follows indexes created.");

        console.log("Adding profile columns to users table...");
        await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
        console.log("Users table updated with profile columns.");

        console.log("Database setup complete.");
        process.exit(0);
    } catch (err) {
        console.error("Error setting up database:", err);
        process.exit(1);
    }
};

setupDatabase();

import cron from "node-cron";
import { db } from "./db.js";
import { sendNewPostNotification } from "./utils/email.js";

const publishDuePosts = async () => {
  let client;
  let publishedPosts = [];

  try {
    client = await db.connect();
    await client.query("BEGIN");

    const result = await client.query(`
      UPDATE posts
      SET draft = false, scheduled_publish_date = NULL
      WHERE draft = true
        AND scheduled_publish_date IS NOT NULL
        AND scheduled_publish_date <= timezone('UTC', now())
      RETURNING id, title, uid
    `);

    publishedPosts = result.rows;

    for (const post of publishedPosts) {
      await client.query(
        "INSERT INTO activities (user_id, activity_type, post_id) VALUES ($1, 'post', $2)",
        [post.uid, post.id]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("Error publishing scheduled posts:", err);
    return;
  } finally {
    client?.release();
  }

  if (publishedPosts.length === 0) {
    return;
  }

  try {
    const subscribersResult = await db.query("SELECT email FROM subscribers");
    const subscriberEmails = subscribersResult.rows.map((row) => row.email);
    const frontendUrl = process.env.FRONTEND_URL || "https://unsaid-stories-and-more.vercel.app";

    for (const post of publishedPosts) {
      await sendNewPostNotification(
        subscriberEmails,
        post.title,
        `${frontendUrl}/post/${post.id}`
      );
    }
  } catch (err) {
    console.error("Error sending scheduled post notifications:", err);
  }
};

export const schedulePostPublisher = () => {
  console.log("Scheduled post publisher initialized");
  cron.schedule("* * * * *", publishDuePosts, { noOverlap: true });
};

export { publishDuePosts };

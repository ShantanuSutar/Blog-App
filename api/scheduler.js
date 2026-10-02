import cron from "node-cron";
import { db } from "./db.js";
import { recordActivity } from "./services/activity.js";
import { notifySubscribersOfPost } from "./services/notifications.js";
import { withTransaction } from "./utils/database.js";

const publishDuePosts = async () => {
  let publishedPosts;
  try {
    publishedPosts = await withTransaction(db, async (client) => {
      const result = await client.query(`
        UPDATE posts
        SET draft = false, scheduled_publish_date = NULL
        WHERE draft = true
          AND scheduled_publish_date IS NOT NULL
          AND scheduled_publish_date <= timezone('UTC', now())
        RETURNING id, title, uid
      `);

      for (const post of result.rows) {
        await recordActivity(client, {
          userId: post.uid,
          activityType: "post",
          postId: post.id,
        });
      }

      return result.rows;
    });
  } catch (err) {
    console.error("Error publishing scheduled posts:", err);
    return;
  }

  if (publishedPosts.length === 0) {
    return;
  }

  try {
    for (const post of publishedPosts) {
      await notifySubscribersOfPost(post.id, post.title);
    }
  } catch (err) {
    console.error("Error sending scheduled post notifications:", err);
  }
};

let publisherTask;

export const schedulePostPublisher = () => {
  if (publisherTask) {
    return publisherTask;
  }

  console.log("Scheduled post publisher initialized");
  publisherTask = cron.schedule("* * * * *", publishDuePosts, { noOverlap: true });
  return publisherTask;
};

export { publishDuePosts };

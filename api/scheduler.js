import cron from "node-cron";
import { db } from "./db.js";
import { getSubscriberEmails, notifySubscribersOfPost } from "./services/notifications.js";
import { withTransaction } from "./utils/database.js";

const publishDuePosts = async () => {
  let publishedPosts;
  try {
    publishedPosts = await withTransaction(db, async (client) => {
      const result = await client.query(`
        WITH published AS (
          UPDATE posts
          SET draft = false, scheduled_publish_date = NULL
          WHERE draft = true
            AND scheduled_publish_date IS NOT NULL
            AND scheduled_publish_date <= CURRENT_TIMESTAMP
          RETURNING id, title, uid
        ), recorded AS (
          INSERT INTO activities (user_id, activity_type, post_id)
          SELECT uid, 'post', id FROM published
          RETURNING post_id
        )
        SELECT published.id, published.title, published.uid
        FROM published
        JOIN recorded ON recorded.post_id = published.id
      `);

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
    const subscriberEmails = await getSubscriberEmails();
    for (const post of publishedPosts) {
      await notifySubscribersOfPost(post.id, post.title, subscriberEmails);
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

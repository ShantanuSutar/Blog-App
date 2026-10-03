import cron from "node-cron";
import { db } from "./db.js";
import { getSubscriberEmails, notifySubscribersOfPost } from "./services/notifications.js";
import { withTransaction } from "./utils/database.js";
import { logger } from "./utils/logger.js";

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
    logger.error("Scheduled post publication failed", { error: err });
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
    logger.error("Scheduled post notification delivery failed", { error: err });
  }
};

let publisherTask;
const activePublisherRuns = new Set();

const runScheduledPublisher = () => {
  const run = publishDuePosts().catch((error) => {
    logger.error("Unhandled scheduled post publisher failure", { error });
  });
  activePublisherRuns.add(run);
  run.finally(() => activePublisherRuns.delete(run));
  return run;
};

export const schedulePostPublisher = () => {
  if (publisherTask) {
    logger.debug("Scheduled post publisher is already initialized");
    return publisherTask;
  }

  publisherTask = cron.schedule(
    "* * * * *",
    runScheduledPublisher,
    { noOverlap: true },
  );
  logger.info("Scheduled post publisher initialized");
  return publisherTask;
};

export const stopPostPublisher = async () => {
  if (!publisherTask) return false;

  const task = publisherTask;
  publisherTask = undefined;
  await task.stop();
  if (typeof task.destroy === "function") await task.destroy();
  if (activePublisherRuns.size > 0) {
    await Promise.allSettled([...activePublisherRuns]);
  }
  logger.info("Scheduled post publisher stopped");
  return true;
};

export { publishDuePosts };

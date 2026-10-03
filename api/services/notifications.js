import { db } from "../db.js";
import { config } from "../config.js";
import { sendNewPostNotification } from "../utils/email.js";
import { logger } from "../utils/logger.js";

export const getSubscriberEmails = async () => {
  const subscribersResult = await db.query("SELECT email FROM subscribers");
  return subscribersResult.rows.map(({ email }) => email);
};

export const notifySubscribersOfPost = async (postId, title, subscribers) => {
  const subscriberEmails = subscribers || await getSubscriberEmails();

  if (subscriberEmails.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const result = await sendNewPostNotification(
    subscriberEmails,
    title,
    `${config.frontendUrl}/post/${postId}`,
  );

  if (!result.success) {
    logger.warn("Some post notifications could not be delivered", {
      postId,
      failed: result.failed,
    });
  }

  return result;
};

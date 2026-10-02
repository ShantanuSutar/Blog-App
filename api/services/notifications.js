import { db } from "../db.js";
import { config } from "../config.js";
import { sendNewPostNotification } from "../utils/email.js";

export const notifySubscribersOfPost = async (postId, title) => {
  const subscribersResult = await db.query("SELECT email FROM subscribers");
  const subscriberEmails = subscribersResult.rows.map(({ email }) => email);

  if (subscriberEmails.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const result = await sendNewPostNotification(
    subscriberEmails,
    title,
    `${config.frontendUrl}/post/${postId}`,
  );

  if (!result.success) {
    console.warn("Some post notifications could not be delivered", {
      postId,
      failed: result.failed,
    });
  }

  return result;
};

const allowedActivityTypes = new Set(["post", "comment", "reaction", "follow"]);

export const isActivityType = (value) => allowedActivityTypes.has(value);

export const recordActivity = async (
  queryable,
  { userId, activityType, postId = null, commentId = null, targetUserId = null },
) => {
  if (!isActivityType(activityType)) {
    throw new TypeError("Unsupported activity type");
  }

  const result = await queryable.query(
    `
      INSERT INTO activities (user_id, activity_type, post_id, comment_id, target_user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [userId, activityType, postId, commentId, targetUserId],
  );

  return result.rows[0];
};

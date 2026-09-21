export const normalizeSchedule = (value, now = Date.now()) => {
  if (!value) {
    return { date: null, isScheduled: false };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid scheduled publication date");
  }

  if (date.getTime() <= now) {
    return { date: null, isScheduled: false };
  }

  return { date: date.toISOString(), isScheduled: true };
};

export const isPublishedPost = (post, now = Date.now()) =>
  post.draft === false &&
  (!post.scheduled_publish_date || new Date(post.scheduled_publish_date).getTime() <= now);

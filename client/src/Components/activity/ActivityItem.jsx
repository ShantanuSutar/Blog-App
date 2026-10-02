import { Bell, FileText, Heart, MessageCircle, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import ProfileAvatar from "../ProfileAvatar";
import { resolveMediaUrl } from "../home/postPresentation";

const activityIcons = {
  post: FileText,
  comment: MessageCircle,
  reaction: Heart,
  follow: UserPlus,
};
const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const activityDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function UserLink({ username, fallback = "Someone" }) {
  if (!username) return <strong>{fallback}</strong>;
  return <Link className="activity-item__user" to={`/profile/${encodeURIComponent(username)}`}>@{username}</Link>;
}

function PostLink({ activity, fallback = "a story" }) {
  if (!activity.post_id) return <span>{activity.post_title || fallback}</span>;
  return <Link className="activity-item__post-link" to={`/post/${activity.post_id}`}>{activity.post_title || fallback}</Link>;
}

function ActivitySentence({ activity }) {
  const actor = <UserLink username={activity.username} />;

  if (activity.activity_type === "post") {
    return <>{actor} published <PostLink activity={activity} fallback="a new story" />.</>;
  }

  if (activity.activity_type === "comment") {
    return <>{actor} commented on <PostLink activity={activity} />.</>;
  }

  if (activity.activity_type === "follow") {
    return <>{actor} followed <UserLink username={activity.target_username} fallback="another writer" />.</>;
  }

  if (activity.activity_type === "reaction") {
    const target = activity.target_username
      ? <><UserLink username={activity.target_username} />’s {activity.comment_id ? "comment" : "story"}</>
      : activity.comment_id ? "a comment" : "a story";
    return <>{actor} reacted to {target}.</>;
  }

  return <>{actor} had new activity.</>;
}

function ActivityTime({ value }) {
  if (!value) return null;
  const normalized = typeof value === "string" && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? `${value}Z`
    : value;
  const timestamp = new Date(normalized);
  if (Number.isNaN(timestamp.getTime())) return null;

  const elapsedSeconds = Math.round((timestamp.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(elapsedSeconds);
  let relativeValue;
  let relativeUnit;
  if (absoluteSeconds < 60) {
    relativeValue = elapsedSeconds;
    relativeUnit = "second";
  } else if (absoluteSeconds < 3600) {
    relativeValue = Math.round(elapsedSeconds / 60);
    relativeUnit = "minute";
  } else if (absoluteSeconds < 86400) {
    relativeValue = Math.round(elapsedSeconds / 3600);
    relativeUnit = "hour";
  } else if (absoluteSeconds < 2_592_000) {
    relativeValue = Math.round(elapsedSeconds / 86400);
    relativeUnit = "day";
  } else if (absoluteSeconds < 31_536_000) {
    relativeValue = Math.round(elapsedSeconds / 2_592_000);
    relativeUnit = "month";
  } else {
    relativeValue = Math.round(elapsedSeconds / 31_536_000);
    relativeUnit = "year";
  }

  const relativeLabel = relativeTimeFormatter.format(relativeValue, relativeUnit);
  const fullLabel = activityDateFormatter.format(timestamp);
  return (
    <time dateTime={timestamp.toISOString()} title={fullLabel}>{relativeLabel}</time>
  );
}

export default function ActivityItem({ activity }) {
  const Icon = activityIcons[activity.activity_type] || Bell;
  const commentPreview = typeof activity.comment_text === "string" ? activity.comment_text.trim() : "";
  const postImage = resolveMediaUrl(activity.post_img, import.meta.env.VITE_BASE_URL);
  const hasRelatedPost = Boolean(activity.post_id && (activity.post_title || postImage));

  return (
    <li className="activity-item">
      <article>
        <div className="activity-item__avatar-wrap">
          <ProfileAvatar source={activity.avatar} username={activity.username || "User"} className="activity-item__avatar" />
          <span className="activity-item__type-icon" title={activity.activity_type || "Activity"}>
            <Icon size={16} aria-hidden="true" />
            <span className="sr-only">{activity.activity_type || "Activity"}</span>
          </span>
        </div>

        <div className="activity-item__body">
          <p className="activity-item__sentence"><ActivitySentence activity={activity} /></p>

          {commentPreview && (
            <blockquote className="activity-item__comment">
              {commentPreview.length > 180 ? `${commentPreview.slice(0, 180).trimEnd()}…` : commentPreview}
            </blockquote>
          )}

          {hasRelatedPost && (
            <Link className={`activity-item__related${postImage ? "" : " activity-item__related--text"}`} to={`/post/${activity.post_id}`} aria-label={`Open ${activity.post_title || "related story"}`}>
              {postImage && <img src={postImage} alt="" loading="lazy" decoding="async" />}
              <span>{activity.post_title || "View the related story"}</span>
            </Link>
          )}

          <div className="activity-item__meta"><ActivityTime value={activity.created_at} /></div>
        </div>
      </article>
    </li>
  );
}

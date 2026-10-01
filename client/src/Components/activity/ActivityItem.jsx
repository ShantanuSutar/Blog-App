import { Bell, FileText, Heart, MessageCircle, UserPlus } from "lucide-react";
import moment from "moment";
import { Link } from "react-router-dom";
import ProfileAvatar from "../ProfileAvatar";
import { resolveMediaUrl } from "../home/postPresentation";

const activityIcons = {
  post: FileText,
  comment: MessageCircle,
  reaction: Heart,
  follow: UserPlus,
};

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
  const timestamp = moment.utc(value);
  if (!timestamp.isValid()) return null;
  const localTimestamp = timestamp.local();
  return (
    <time dateTime={timestamp.toISOString()} title={localTimestamp.format("MMM D, YYYY [at] h:mm A")}>{localTimestamp.fromNow()}</time>
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

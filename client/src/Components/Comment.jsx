import { useId } from "react";
import { Link } from "react-router-dom";
import ProfileAvatar from "./ProfileAvatar.jsx";

const formatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const renderMentions = (text) => {
  if (!text) return null;
  const mentionPattern = /@([\w]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
    const mentionedUser = match[1];
    parts.push(
      <Link key={`${match.index}-${mentionedUser}`} to={`/profile/${encodeURIComponent(mentionedUser)}`} className="mention-link">
        @{mentionedUser}
      </Link>,
    );
    lastIndex = mentionPattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return parts;
};

export default function Comment({ c }) {
  const { comment, username, img: userImg, created_at: createdAt } = c;
  const author = username || "Unknown reader";
  const profileUrl = username ? `/profile/${encodeURIComponent(username)}` : null;
  const authorId = useId();
  const timestamp = formatTimestamp(createdAt);

  return (
    <article className="discussion-comment" aria-labelledby={authorId}>
      {profileUrl ? (
        <Link className="discussion-comment__avatar-link" to={profileUrl} aria-label={`View ${author}'s profile`}>
          <ProfileAvatar source={userImg} username={author} className="profile-avatar--comment" />
        </Link>
      ) : (
        <ProfileAvatar source={userImg} username={author} className="profile-avatar--comment" />
      )}
      <div className="discussion-comment__content">
        <header className="discussion-comment__header">
          {profileUrl ? <Link id={authorId} to={profileUrl}>{author}</Link> : <span id={authorId}>{author}</span>}
          {timestamp && <time dateTime={createdAt}>{timestamp}</time>}
        </header>
        <p>{renderMentions(comment)}</p>
      </div>
    </article>
  );
}

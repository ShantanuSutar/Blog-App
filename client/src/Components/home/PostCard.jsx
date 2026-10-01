import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Eye, ImageOff } from "lucide-react";
import BookmarkButton from "../BookmarkButton.jsx";
import ReactionButtons from "../ReactionButtons.jsx";
import { calculateReadingTime } from "../../utils/readingTime";
import { formatPostDate, formatViewCount, getPostExcerpt, getPostTags } from "./postPresentation";

const categories = { art: "Art", scitech: "Sci-Tech", sports: "Sports", cinema: "Cinema", food: "Food", travel: "Travel" };

function PostImage({ post, featured, priority }) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(post.img) && !failed;

  return (
    <Link className="story-card__image-link" to={`/post/${post.id}`} aria-label={`Read ${post.title}`}>
      {hasImage ? (
        <img
          src={post.img}
          alt={post.title || "Story cover"}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="story-card__image-fallback" aria-hidden="true">
          <ImageOff size={featured ? 30 : 24} strokeWidth={1.5} />
          <span>Unsaid</span>
        </span>
      )}
    </Link>
  );
}

function Author({ post, baseUrl }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  if (!post.username) return null;
  const avatarUrl = post.userAvatar
    ? /^https?:\/\//i.test(post.userAvatar)
      ? post.userAvatar
      : `${(baseUrl || "").replace(/\/$/, "")}/${post.userAvatar.replace(/^\/+/, "")}`
    : null;

  return (
    <Link className="story-card__author" to={`/profile/${encodeURIComponent(post.username)}`}>
      {avatarUrl && !avatarFailed ? (
        <img className="ui-avatar" src={avatarUrl} alt="" loading="lazy" onError={() => setAvatarFailed(true)} />
      ) : (
        <span className="ui-avatar" aria-hidden="true">{post.username.charAt(0).toUpperCase()}</span>
      )}
      <span>{post.username}</span>
    </Link>
  );
}

export default function PostCard({ post, featured = false, priority = false, theme, baseUrl }) {
  const tags = getPostTags(post.tags).slice(0, featured ? 2 : 3);
  const date = formatPostDate(post.date);
  const excerpt = getPostExcerpt(post.desc, featured ? 170 : 155);
  const views = formatViewCount(post.views);
  const readingTime = post.desc ? calculateReadingTime(post.desc) : "";

  return (
    <article className={`story-card ${featured ? "story-card--featured" : ""}`}>
      <PostImage key={post.img || "no-image"} post={post} featured={featured} priority={priority} />
      <div className="story-card__body">
        {(post.cat || tags.length > 0) && (
          <div className="story-card__taxonomy">
            {post.cat && <span className="story-card__category">{categories[post.cat] || post.cat}</span>}
            {tags.map((tag) => (
              <Link className="ui-tag story-card__tag" key={tag} to={`/tag/${encodeURIComponent(tag)}`}>#{tag}</Link>
            ))}
          </div>
        )}
        <h3 className="story-card__title">
          <Link to={`/post/${post.id}`}>{post.title}</Link>
        </h3>
        {excerpt && <p className="story-card__excerpt">{excerpt}</p>}
        <div className="story-card__meta ui-meta">
          <Author post={post} baseUrl={baseUrl} />
          {date && <><span className="story-card__dot" aria-hidden="true">·</span><time dateTime={new Date(post.date).toISOString()}>{date}</time></>}
          {readingTime && <><span className="story-card__dot" aria-hidden="true">·</span><span className="story-card__reading"><BookOpen size={14} aria-hidden="true" />{readingTime}</span></>}
        </div>
        <div className="story-card__footer">
          <div className="story-card__engagement">
            {!featured && <ReactionButtons postId={post.id} theme={theme} />}
            <BookmarkButton postId={post.id} theme={theme} />
            {views && <span className="story-card__views ui-meta" aria-label={`${post.views} views`}><Eye size={17} aria-hidden="true" />{views}</span>}
          </div>
          <Link className="story-card__read-link" to={`/post/${post.id}`}>Read story <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}

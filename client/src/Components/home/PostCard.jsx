import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Eye, ImageOff } from "lucide-react";
import BookmarkButton from "../BookmarkButton.jsx";
import ReactionButtons from "../ReactionButtons.jsx";
import { calculateReadingTime } from "../../utils/readingTime";
import { formatPostDate, formatViewCount, getPostExcerpt, getPostTags, resolveMediaUrl } from "./postPresentation";

const categories = { art: "Art", scitech: "Sci-Tech", sports: "Sports", cinema: "Cinema", food: "Food", travel: "Travel" };

function PostImage({ post, featured, priority, baseUrl }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveMediaUrl(post.img, baseUrl);
  const hasImage = Boolean(imageUrl) && !failed;

  return (
    <div className="story-card__image">
      {hasImage ? (
        <img
          src={imageUrl}
          alt={post.imgAlt || `Cover image for ${post.title?.trim() || "Untitled story"}`}
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
    </div>
  );
}

function Author({ post, baseUrl }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  if (!post.username) return null;
  const avatarUrl = resolveMediaUrl(post.userAvatar, baseUrl);

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

export default function PostCard({ post, variant = "standard", baseUrl, bookmarkInitialState = false, onBookmarkChange }) {
  const title = post.title?.trim() || "Untitled story";
  const featured = variant !== "standard";
  const primary = variant === "featured-primary";
  const tags = getPostTags(post.tags).slice(0, featured ? 2 : 3);
  const date = formatPostDate(post.date);
  const excerpt = getPostExcerpt(post.desc, primary ? 180 : featured ? 155 : 150);
  const views = formatViewCount(post.views);
  const readingTime = excerpt ? calculateReadingTime(post.desc) : "";
  const hasAuthor = Boolean(post.username);

  return (
    <article className={`story-card ${featured ? "story-card--featured" : ""} ${primary ? "story-card--featured-primary" : ""}`}>
      <PostImage key={post.img || "no-image"} post={post} featured={featured} priority={primary} baseUrl={baseUrl} />
      <div className="story-card__body">
        {post.cat && <span className="story-card__category">{categories[post.cat] || post.cat}</span>}
        <h3 className="story-card__title">
          <Link to={`/post/${post.id}`}>{title}</Link>
        </h3>
        {excerpt && <p className="story-card__excerpt">{excerpt}</p>}
        {(hasAuthor || date || readingTime) && (
          <div className="story-card__meta ui-meta">
            <Author post={post} baseUrl={baseUrl} />
            {date && <><span className="story-card__dot" aria-hidden="true">·</span><time dateTime={new Date(post.date).toISOString()}>{date}</time></>}
            {readingTime && <><span className="story-card__dot" aria-hidden="true">·</span><span className="story-card__reading"><BookOpen size={15} aria-hidden="true" />{readingTime}</span></>}
          </div>
        )}
        {tags.length > 0 && (
          <div className="story-card__tags" aria-label="Story tags">
            {tags.map((tag) => <Link className="ui-tag story-card__tag" key={tag} to={`/tag/${encodeURIComponent(tag)}`}>#{tag}</Link>)}
          </div>
        )}
        <div className="story-card__footer">
          <div className="story-card__engagement">
            {!featured && <ReactionButtons postId={post.id} postTitle={title} />}
            <BookmarkButton postId={post.id} postTitle={title} initialBookmarked={bookmarkInitialState} onChange={onBookmarkChange} />
            {views && <span className="story-card__views ui-meta" aria-label={`${post.views} views`}><Eye size={17} aria-hidden="true" />{views}</span>}
          </div>
          <span className="story-card__read-link" aria-hidden="true">Read story <ArrowUpRight size={16} /></span>
        </div>
      </div>
    </article>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import FollowButton from "../FollowButton.jsx";
import { resolveMediaUrl } from "../home/postPresentation";

export default function ArticleAuthor({ author, fallbackPost, baseUrl, currentUser }) {
  const [imageFailed, setImageFailed] = useState(false);
  const username = author?.username || fallbackPost?.username;
  if (!username) return null;
  const avatar = resolveMediaUrl(author?.avatar || fallbackPost?.userAvatar, baseUrl);
  const isCurrentUser = currentUser?.username === username;

  return (
    <aside className="article-author-card" aria-labelledby="article-author-heading">
      <Link className="article-author-card__avatar" to={`/profile/${encodeURIComponent(username)}`} aria-label={`View ${username}'s profile`}>
        {avatar && !imageFailed ? (
          <img src={avatar} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span aria-hidden="true">{username.charAt(0).toUpperCase()}</span>
        )}
      </Link>
      <div className="article-author-card__details">
        <span className="article-author-card__eyebrow">Written by</span>
        <h2 id="article-author-heading"><Link to={`/profile/${encodeURIComponent(username)}`}>{username}</Link></h2>
        {author?.bio && <p>{author.bio}</p>}
      </div>
      {author?.id && !isCurrentUser && <FollowButton userId={author.id} username={username} initialFollowing={author.isFollowing} />}
    </aside>
  );
}

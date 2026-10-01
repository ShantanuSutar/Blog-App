import { useThemeContext } from "../Context/theme";
import { Link } from 'react-router-dom';
import { resolveMediaUrl } from "./home/postPresentation";

const Comment = ({ c, baseUrl = "" }) => {
  const { comment, username, img: userImg, created_at: createdAt } = c;
  const { theme } = useThemeContext();
  const avatar = resolveMediaUrl(userImg, baseUrl);
  const profileUrl = `/profile/${encodeURIComponent(username || "")}`;
  
  // Parse mentions and create clickable links
  const parseMentions = (text) => {
    if (!text) return text;
    
    const mentionRegex = /@([\w]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add mention as link
      const mentionedUser = match[1];
      parts.push(
        <Link 
          key={match.index}
          to={`/profile/${mentionedUser}`}
          className="mention-link"
        >
          @{mentionedUser}
        </Link>
      );
      
      lastIndex = mentionRegex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };

  return (
    <article className="comment">
      <div className="user">
        <Link className="userImg" to={profileUrl} aria-label={`View ${username}'s profile`}>
          {avatar ? (
            <img src={avatar} alt="" loading="lazy" />
          ) : (
            <span aria-hidden="true">{username?.charAt(0).toUpperCase() || "?"}</span>
          )}
        </Link>

        <div className={theme === "dark" ? "userInfo dark" : "userInfo"}>
          <div className="comment__meta">
            <Link to={profileUrl}>{username}</Link>
            {createdAt && <time dateTime={createdAt}>{new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>}
          </div>
          <p>{parseMentions(comment)}</p>
        </div>
      </div>
    </article>
  );
};

export default Comment;

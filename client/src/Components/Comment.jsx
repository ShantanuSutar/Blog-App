import { useThemeContext } from "../Context/theme";
import { Link } from 'react-router-dom';

const Comment = ({ c }) => {
  const { comment, username, img: userImg } = c;
  const { theme, setTheme } = useThemeContext();
  
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
    <div className="comment">
      <div className="user">
        <div className="userImg">
          {userImg ? (
            <img src={userImg} alt="" />
          ) : (
            <img
              src="https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg"
              alt=""
            />
          )}
        </div>

        {/* user image or random image */}

        <div className={theme === "dark" ? "userInfo dark" : "userInfo"}>
          <span>{username}</span>
          <p>{parseMentions(comment)}</p>
        </div>
      </div>
    </div>
  );
};

export default Comment;

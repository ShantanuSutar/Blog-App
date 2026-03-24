import React, { useEffect, useState, useContext } from "react";
import { BiSolidEdit, BiBookmark, BiSolidBookmark, BiShareAlt, BiCopy } from "react-icons/bi";
import { FaTwitter, FaFacebook, FaLinkedin } from "react-icons/fa";
import { AiFillDelete } from "react-icons/ai";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Menu from "../Components/Menu.jsx";
import axios from "axios";
import api from "../api/axios";
import moment from "moment";

import { AuthContext } from "../AuthContext/authContext.jsx";
import Comment from "../Components/Comment.jsx";
import { useThemeContext } from "../Context/theme.jsx";
import { calculateReadingTime } from "../utils/readingTime";

const Single = () => {
  const { theme, setTheme } = useThemeContext();
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState({});
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const URL = import.meta.env.VITE_BASE_URL;

  const postId = location.pathname.split("/")[2];
  const { currentUser } = useContext(AuthContext);
  const [bookmarked, setBookmarked] = useState(false);

  // Reading time helper (using centralized utility with configurable WPM)
  // Default is 200 WPM, but you can customize per post category if needed

  const handleBookmark = async () => {
    if (!currentUser) return navigate('/login');
    try {
      if (bookmarked) {
        await api.delete(`/api/bookmarks/${postId}`);
        setBookmarked(false);
      } else {
        await api.post(`/api/bookmarks`, { postId });
        setBookmarked(true);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const [copySuccess, setCopySuccess] = useState(false);

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out this post: ${post.title}`;
    let shareUrl = "";

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      default:
        return;
    }
    window.open(shareUrl, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await axios.get(`${URL}/api/comments/${postId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${URL}/api/posts/${postId}`);
        setPost(res.data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
    fetchComments();

    const checkBookmark = async () => {
      if (!currentUser) return;
      try {
        const res = await api.get(`/api/bookmarks/check/${postId}`);
        setBookmarked(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    checkBookmark();
  }, [postId, currentUser, URL]);

  const handleDelete = async (e) => {
    e.preventDefault();
    function getCookie(cookieName) {
      const name = cookieName + "=";
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookieArray = decodedCookie.split(";");

      for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
          return cookie.substring(name.length, cookie.length);
        }
      }

      return null; // Return null if the cookie is not found
    }
    const tokenValue = getCookie("access_token");

    try {
      await axios.delete(
        `${URL}/api/posts/${postId}?data=${JSON.stringify(tokenValue)}`
      );
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  //Parsing String to HTML
  const MyComponent = ({ htmlContent }) => {
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  };

  const handleAddComment = async () => {
    if (!comment) return;

    try {
      setLoading(true);
      await axios.post(`${URL}/api/comments/${postId}`, {
        comment,
        postId,
        userId: currentUser.id,
      });
      fetchComments();
      setComment("");
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`single ${theme === "dark" ? "dark" : ""}`}>
      <div className="content">
        <img src={post?.img} alt="" />
        <div className="user">
          {post.userImg ? (
            <img src={post.userImg} alt="" />
          ) : (
            <img
              src="https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg"
              alt=""
            />
          )}

          {/* user image or random image */}

          <div className="info">
            <span className={theme === "dark" ? "dark" : ""}>
              {post.username}
            </span>
            <p className={theme === "dark" ? "dark" : ""}>
              Posted {moment(post.date).fromNow()} • {calculateReadingTime(post.desc)}
            </p>
          </div>
          <div className="user-actions">
            {currentUser && (
              <div className="icon" onClick={handleBookmark} title={bookmarked ? "Remove Bookmark" : "Bookmark"}>
                {bookmarked ? <BiSolidBookmark className={theme === "dark" ? "dark" : ""} /> : <BiBookmark className={theme === "dark" ? "dark" : ""} />}
              </div>
            )}
            <div className="icon share-icon">
              <BiShareAlt className={theme === "dark" ? "dark" : ""} />
              <div className="share-menu">
                <BiCopy onClick={handleCopyLink} className="share-btn copy-link" title="Copy link" />
                <FaTwitter onClick={() => handleShare('twitter')} className="share-btn twitter" />
                <FaFacebook onClick={() => handleShare('facebook')} className="share-btn facebook" />
                <FaLinkedin onClick={() => handleShare('linkedin')} className="share-btn linkedin" />
                {copySuccess && <span className="copy-success-toast">Link copied!</span>}
              </div>
            </div>
          </div>
          {currentUser?.username === post?.username && (
            <div className="edit">
              <Link to={`/write?edit=2`} state={post}>
                <BiSolidEdit className={theme === "dark" ? "dark" : ""} />
              </Link>
              <AiFillDelete
                className={theme === "dark" ? "dark" : ""}
                onClick={handleDelete}
              />
            </div>
          )}
        </div>
        <h1 className={theme === "dark" ? "text dark" : "text"}>
          {post.title}
        </h1>
        <p className={theme === "dark" ? "text dark" : "text"}>
          {/* {getText(post.desc)} */}
          <MyComponent htmlContent={post.desc} />
        </p>
        <div className="comments">
          <h2 className={theme === "dark" ? "dark" : ""}>Comments</h2>
          {currentUser ? (
            <div className="addComment">
              <input
                className={theme === "dark" ? "text dark" : "text"}
                type="text"
                placeholder="Type Here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className="btn-grad" onClick={handleAddComment}>
                {loading ? "Please wait ..." : "Comment"}
              </button>
            </div>
          ) : (
            <div
              className={theme === "dark" ? "addComment dark" : "addComment"}
            >
              Wanna write a comment...?
              <Link
                className={theme === "dark" ? "text dark" : "text"}
                to={"/login"}
              >
                Login
              </Link>
            </div>
          )}
          {comments.map((c) => {
            return <Comment key={c.id} c={c} />;
          })}
        </div>
      </div>
      <div className="sidebar-content">
        <Menu cat={post.cat} />
      </div>
    </div>
  );
};

export default Single;

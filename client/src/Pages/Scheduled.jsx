import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext";
import { useThemeContext } from "../Context/theme";

const Scheduled = () => {
  const [posts, setPosts] = useState([]);
  const { currentUser } = useContext(AuthContext);
  const { theme } = useThemeContext();

  useEffect(() => {
    const fetchScheduledPosts = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/api/posts/scheduled/user`,
          {
            headers: {
              Authorization: `Bearer ${currentUser?.token}`,
            },
          }
        );
        setPosts(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchScheduledPosts();
  }, [currentUser]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${import.meta.env.VITE_BASE_URL}/api/posts/${id}`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`
        }
      });
      setPosts(posts.filter((post) => post.id !== id));
    } catch (err) {
      console.log(err);
    }
  };

  const handlePublishNow = async (id) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_BASE_URL}/api/posts/${id}`,
        {
          tokenValue: currentUser?.token,
          draft: false, // Set draft to false
          scheduled_publish_date: null // Remove scheduled date to publish immediately
        },
        {
          headers: {
            Authorization: `Bearer ${currentUser?.token}`
          }
        }
      );
      // Remove from scheduled list after publishing
      setPosts(posts.filter((post) => post.id !== id));
    } catch (err) {
      console.log(err);
    }
  };

  const getText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent;
  };

  const getTimeRemaining = (scheduledDate) => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const difference = scheduled.getTime() - now.getTime();

    if (difference <= 0) {
      return {
        formatted: "Published!",
        colorClass: "published"
      };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    let formatted = "";
    if (days > 0) {
      formatted = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      formatted = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      formatted = `${minutes}m ${seconds}s`;
    } else {
      formatted = `${seconds}s`;
    }

    // Determine color based on time remaining
    let colorClass = "";
    if (days === 0 && hours === 0 && minutes <= 30) {
      colorClass = "urgent"; // Less than 30 minutes - red
    } else if (days === 0 && hours <= 2) {
      colorClass = "warning"; // Less than 2 hours - orange
    } else {
      colorClass = "normal"; // More than 2 hours - green
    }

    return {
      formatted,
      colorClass
    };
  };

  if (!currentUser) {
    return (
      <div className="home">
        <div className="no-posts">
          <p className={theme === "dark" ? "text dark" : "text"}>
            Please log in to view your scheduled posts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="posts">
        <h1 className={theme === "dark" ? "text dark" : "text"}>Your Scheduled Posts</h1>
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <div className="post" key={post.id}>
              <div className={theme === "dark" ? "img dark" : "img"}>
                {post.img && <img src={post.img} alt="" />}
              </div>
              <div className="content">
                <Link className="link" to={`/post/${post.id}`}>
                  <h1 className={theme === "dark" ? "text dark" : "text"}>
                    {post.title}
                  </h1>
                </Link>
                <p className={theme === "dark" ? "text dark" : "text"}>
                  {getText(post.desc)}
                </p>
                <div className="details">
                  <p className={theme === "dark" ? "text dark" : "text"}>
                    <strong>Scheduled for:</strong> {new Date(post.scheduled_publish_date).toLocaleString()}
                  </p>
                  <p className={`countdown ${getTimeRemaining(post.scheduled_publish_date).colorClass}`}>
                    <strong>Time remaining:</strong> {getTimeRemaining(post.scheduled_publish_date).formatted}
                  </p>
                </div>
                <div className="actions">
                  <Link className="link" to={`/write?edit=${post.id}`}>
                    <button className="btn-grad">Edit</button>
                  </Link>
                  <button 
                    className="btn-grad" 
                    onClick={() => handlePublishNow(post.id)}
                  >
                    Publish Now
                  </button>
                  <button 
                    className="btn-grad delete" 
                    onClick={() => handleDelete(post.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-posts">
            <p className={theme === "dark" ? "text dark" : "text"}>
              No scheduled posts. Posts scheduled for future publication will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scheduled;
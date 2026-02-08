import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext";
import { useThemeContext } from "../Context/theme";

const Drafts = () => {
  const [posts, setPosts] = useState([]);
  const { currentUser } = useContext(AuthContext);
  const { theme } = useThemeContext();

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/api/posts/drafts/user`,
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
    fetchDrafts();
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

  const handlePublish = async (id) => {
    try {
      await axios.put(
        `${import.meta.env.VITE_BASE_URL}/api/posts/${id}`,
        {
          tokenValue: currentUser?.token,
          draft: false, // Set draft to false to publish
        },
        {
          headers: {
            Authorization: `Bearer ${currentUser?.token}`
          }
        }
      );
      // Remove from drafts list after publishing
      setPosts(posts.filter((post) => post.id !== id));
    } catch (err) {
      console.log(err);
    }
  };

  const getText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent;
  };

  if (!currentUser) {
    return (
      <div className="home">
        <div className="no-posts">
          <p className={theme === "dark" ? "text dark" : "text"}>
            Please log in to view your drafts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="posts">
        <h1 className={theme === "dark" ? "text dark" : "text"}>Your Drafts</h1>
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
                <div className="actions">
                  <Link className="link" to={`/write?edit=${post.id}`}>
                    <button className="btn-grad">Edit</button>
                  </Link>
                  <button 
                    className="btn-grad" 
                    onClick={() => handlePublish(post.id)}
                  >
                    Publish
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
              No drafts yet. Saved drafts will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Drafts;
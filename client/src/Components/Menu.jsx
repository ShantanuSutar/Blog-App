import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { resolveMediaUrl } from "./home/postPresentation.js";

const baseUrl = import.meta.env.VITE_BASE_URL;

function shufflePosts(posts) {
  const shuffled = [...posts];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

const Menu = ({ cat }) => {
  const [posts, setPosts] = useState([]);
  const handleClick = () => setPosts((current) => shufflePosts(current));

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const res = await api.get("/api/posts", {
          params: { ...(cat ? { cat } : {}), limit: 10 },
          signal: controller.signal,
        });
        if (res.data.posts) {
          setPosts(res.data.posts);
        } else {
          setPosts(Array.isArray(res.data) ? res.data : []);
        }
      } catch (error) {
        if (error.code !== "ERR_CANCELED") setPosts([]);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [cat]);

  return (
    <div className="menu">
      <h2>Other posts you may like</h2>
      {Array.isArray(posts) && posts.length > 0 ? (
        posts.map((post) => {
          const title = post.title?.trim() || "Untitled story";
          return (
          <Link className="post" key={post.id} to={`/post/${post.id}`} onClick={handleClick}>
            <div className="img-container">
              {post?.img && <img src={resolveMediaUrl(post.img, baseUrl)} alt="" width="100" height="70" loading="lazy" decoding="async" />}
            </div>
            <div className="post-info">
              <h2>{title}</h2>
              <span className="read-more-link">Read More</span>
            </div>
          </Link>
          );
        })
      ) : (
        <p>No related posts.</p>
      )}
    </div>
  );
};

export default Menu;

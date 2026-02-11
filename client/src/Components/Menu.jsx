import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useThemeContext } from "../Context/theme";

const Menu = ({ cat }) => {
  const [posts, setPosts] = useState([]);
  const { theme, setTheme } = useThemeContext();

  const location = useLocation();
  const navigate = useNavigate();
  const URL = import.meta.env.VITE_BASE_URL;

  const [postId, setPostId] = useState(() => {
    const pathSegments = location.pathname.split("/");
    return pathSegments[2] || null;
  });
  function shuffle(array) {
    let currentIndex = array.length,
      randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex > 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    return array;
  }
  const handleClick = (e) => {
    setPosts((prev) => shuffle(prev));
  };
  useEffect(() => {
    console.log('Menu useEffect triggered with cat:', cat);
    const fetchData = async () => {
      try {
        const res = await axios.get(`${URL}/api/posts/?cat=${cat}`);
        if (res.data.posts) {
          setPosts(res.data.posts);
        } else {
          setPosts(Array.isArray(res.data) ? res.data : []);
        }
      } catch (error) {
        console.error('Menu error:', error);
      }
    };

    fetchData();
  }, [cat]);

  return (
    <div className="menu">
      <h1 className={theme === "dark" ? "dark" : ""}>
        Other posts you may like
      </h1>
      {Array.isArray(posts) && posts.length > 0 ? (
        posts.map((post) => (
          <Link className="post" key={post.id} to={`/post/${post.id}`} onClick={handleClick}>
            <div className="img-container">
              <img src={post?.img} alt="" />
            </div>
            <div className="post-info">
              <h2 className={theme === "dark" ? "dark" : ""}>{post.title}</h2>
              <span className="read-more-link">Read More</span>
            </div>
          </Link>
        ))
      ) : (
        <p>No related posts.</p>
      )}
    </div>
  );
};

export default Menu;

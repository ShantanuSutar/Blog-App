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

  const [postId, setPostId] = useState(location.pathname.split("/")[2]);
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
    const fetchData = async () => {
      try {
        const res = await axios.get(`${URL}/api/posts/?cat=${cat}`);
        setPosts(res.data);
        // console.log(res);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
  }, [cat]);

  return (
    <div className="menu">
      <h1 className={theme === "dark" ? "dark" : ""}>
        Other posts you may like
      </h1>
      {posts.map((post) => (
        <div className="post" key={post.id}>
          <img src={post?.img} alt="" />
          <h2 className={theme === "dark" ? "dark" : ""}>{post.title}</h2>
          <Link className="" to={`/post/${post.id}`}>
            <button className="btn-grad" onClick={handleClick}>
              Read More
            </button>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default Menu;

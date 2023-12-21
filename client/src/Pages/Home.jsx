import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useThemeContext } from "../Context/theme";

const Home = () => {
  const { theme, setTheme } = useThemeContext();
  const [posts, setPosts] = useState([]);
  const cat = useLocation().search;
  const URL = import.meta.env.VITE_BASE_URL;
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${URL}/api/posts/${cat}`);
        setPosts(res.data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchData();
  }, [cat]);

  const getText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent;
  };

  return (
    <div className={theme === "dark" ? "home dark" : "home"}>
      <div className="posts">
        {posts?.map((post) => (
          <div className="post" key={post.id}>
            <div className={theme === "dark" ? "img dark" : "img"}>
              <img src={post?.img} alt="" />
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
              <Link className="" to={`/post/${post.id}`}>
                <button className="btn-grad">Read More</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;

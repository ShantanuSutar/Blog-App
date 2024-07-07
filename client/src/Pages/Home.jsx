import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useThemeContext } from "../Context/theme";
import Tilt from "react-parallax-tilt";

const Home = () => {
  const { theme, setTheme } = useThemeContext();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const cat = useLocation().search;
  const URL = import.meta.env.VITE_BASE_URL;
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${URL}/api/posts/${cat}`);
        setPosts(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cat]);

  const getText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent;
  };

  if (loading) {
    return (
      <div className={`${theme === "dark" ? "text dark" : "text"} loading`}>
        Loading...
      </div>
    );
  }

  return (
    <div className={theme === "dark" ? "home dark" : "home"}>
      <div className="posts">
        {posts?.map((post) => (
          <div className="post" key={post.id}>
            <div className={theme === "dark" ? "img dark" : "img"}>
              <Tilt>
                <img src={post?.img} alt="" />
              </Tilt>
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

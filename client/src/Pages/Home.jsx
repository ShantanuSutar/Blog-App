import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const Home = () => {
  const [posts, setPosts] = useState([]);

  const cat = useLocation().search;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`/api/posts${cat}`);
        setPosts(res.data);
      } catch (error) {}
    };
    fetchData();
  }, [cat]);

  // const posts = [
  //   {
  //     id: 1,
  //     title: "Post Title 1",
  //     desc: "This is the description for Post 1. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  //     img: "https://example.com/image1.jpg",
  //   },
  //   {
  //     id: 2,
  //     title: "Post Title 2",
  //     desc: "A brief description for Post 2. Nulla facilisi. Sed vel neque.",
  //     img: "https://example.com/image2.jpg",
  //   },
  //   {
  //     id: 3,
  //     title: "Post Title 3",
  //     desc: "Description for Post 3. In hac habitasse platea dictumst.",
  //     img: "https://example.com/image3.jpg",
  //   },
  //   {
  //     id: 4,
  //     title: "Post Title 4",
  //     desc: "The description for Post 4. Quisque eget urna ut quam dignissim efficitur.",
  //     img: "https://example.com/image4.jpg",
  //   },
  // ];
  return (
    <div className="home">
      <div className="posts">
        {posts.map((post) => (
          <div className="post" key={post.id}>
            <div className="img">
              <img src={post.img} alt="" />
            </div>
            <div className="content">
              <Link className="link" to={`/post/${post.id}`}>
                <h1>{post.title}</h1>
              </Link>
              <p>{post.desc}</p>
              <button>Read More</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;

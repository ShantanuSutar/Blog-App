import axios from "axios";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const Menu = ({ cat }) => {
  console.log(cat);
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

  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`/api/posts/?cat=${cat}`);
        setPosts(res.data);
        console.log(res);
      } catch (error) {}
    };
    fetchData();
  }, [cat]);

  return (
    <div className="menu">
      <h1>Other posts you may like</h1>
      {posts.map((post) => (
        <div className="post" key={post.id}>
          <img src={post.img} alt="" />
          <h2>{post.title}</h2>
          <button>Read More</button>
        </div>
      ))}
    </div>
  );
};

export default Menu;

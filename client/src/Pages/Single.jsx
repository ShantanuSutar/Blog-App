import React, { useEffect, useState } from "react";
import { BiSolidEdit } from "react-icons/bi";
import { AiFillDelete } from "react-icons/ai";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Menu from "../components/Menu";
import axios from "axios";
import moment from "moment";
import { useContext } from "react";
import { AuthContext } from "../../../api/context/authContext";
import Comment from "../components/Comment.jsx";

const Single = () => {
  // const comments = [
  //   {
  //     id: 1,
  //     comment: "This is a comment",
  //     username: "John Doe",
  //     userImg:
  //       "https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg",
  //   },
  //   {
  //     id: 2,
  //     comment:
  //       "lorem ipsum dolor sit amet consectetur adipisicing elit. lorem ipsum dolor sit amet consectetur adipisicing elit.lorem ipsum dolor sit amet consectetur adipisicing elit.lorem ipsum dolor sit amet consectetur adipisicing elit.",
  //     username: "Kate Smith",
  //     userImg:
  //       "https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg",
  //   },
  //   {
  //     id: 3,
  //     comment: "This is a comment",
  //     username: "Alex Johnson",
  //     userImg:
  //       "https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg",
  //   },
  //   {
  //     id: 4,
  //     comment:
  //       "lorem ipsum dolor sit amet consectetur adipisicing elit. lorem ipsum dolor sit amet consectetur adipisicing elit.lorem ipsum dolor sit amet consectetur adipisicing elit.lorem ipsum dolor sit amet consectetur adipisicing elit.  ",
  //     username: "billy bob",
  //     userImg:
  //       "https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg",
  //   },
  // ];

  const [post, setPost] = useState({});
  const [comments, setComments] = useState([]);

  const location = useLocation();
  const navigate = useNavigate();

  const postId = location.pathname.split("/")[2];

  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`/api/posts/${postId}`);
        setPost(res.data);
      } catch (err) {
        console.log(err);
      }
    };

    const fetchComments = async () => {
      try {
        const res = await axios.get(`/api/comments/${postId}`);
        setComments(res.data);

        console.log(res.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchData();
    fetchComments();
  }, [postId]);

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/posts/${postId}`);
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  const getText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent;
  };

  return (
    <div className="single">
      <div className="content">
        <img src={`../upload/${post.img}`} alt="" />
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
            <span>{post.username}</span>
            <p>Posted {moment(post.date).fromNow()}</p>
          </div>
          {currentUser?.username === post?.username && (
            <div className="edit">
              <Link to={`/write?edit=2`} state={post}>
                <BiSolidEdit />
              </Link>
              <AiFillDelete onClick={handleDelete} />
            </div>
          )}
        </div>
        <h1>{post.title}</h1>
        <p>{getText(post.desc)}</p>
        <div className="comments">
          {comments.map((c) => {
            return <Comment key={c.id} c={c} />;
          })}
        </div>
      </div>
      <Menu cat={post.cat} />
    </div>
  );
};

export default Single;

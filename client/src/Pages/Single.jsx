import React, { useEffect, useState } from "react";
import { BiSolidEdit } from "react-icons/bi";
import { AiFillDelete } from "react-icons/ai";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Menu from "../Components/Menu.jsx";
import axios from "axios";
import moment from "moment";
import { useContext } from "react";
import { AuthContext } from "../../../api/context/authContext";
import Comment from "../Components/Comment.jsx";
import { useThemeContext } from "../Context/theme.jsx";

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
  const { theme, setTheme } = useThemeContext();

  const [post, setPost] = useState({});
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
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

  const handleAddComment = async () => {
    try {
      await axios
        .post(`/api/comments/${postId}`, {
          comment,
          postId,
          userId: currentUser.id,
        })
        .then(window.location.reload(false));
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
            <span className={theme === "dark" ? "dark" : ""}>
              {post.username}
            </span>
            <p className={theme === "dark" ? "dark" : ""}>
              Posted {moment(post.date).fromNow()}
            </p>
          </div>
          {currentUser?.username === post?.username && (
            <div className="edit">
              <Link to={`/write?edit=2`} state={post}>
                <BiSolidEdit className={theme === "dark" ? "dark" : ""} />
              </Link>
              <AiFillDelete
                className={theme === "dark" ? "dark" : ""}
                onClick={handleDelete}
              />
            </div>
          )}
        </div>
        <h1 className={theme === "dark" ? "text dark" : "text"}>
          {post.title}
        </h1>
        <p className={theme === "dark" ? "text dark" : "text"}>
          {getText(post.desc)}
        </p>
        <div className="comments">
          <h2 className={theme === "dark" ? "dark" : ""}>Comments</h2>
          {currentUser ? (
            <div className="addComment">
              <input
                className={theme === "dark" ? "text dark" : "text"}
                type="text"
                placeholder="Type Here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className="btn-grad" onClick={handleAddComment}>
                Comment
              </button>
            </div>
          ) : (
            <div
              className={theme === "dark" ? "addComment dark" : "addComment"}
            >
              Wanna write a comment...?
              <Link
                className={theme === "dark" ? "text dark" : "text"}
                to={"/login"}
              >
                Login
              </Link>
            </div>
          )}
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

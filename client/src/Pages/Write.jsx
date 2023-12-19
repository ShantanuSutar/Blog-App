import { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { useThemeContext } from "../Context/theme";

const cloudname = import.meta.env.VITE_CLOUD_NAME;
const cloudUploadPreset = import.meta.env.VITE_CLOUD_UPLOAD_PRESET;

const Write = () => {
  const { theme, setTheme } = useThemeContext();
  const state = useLocation().state;
  const [value, setValue] = useState(state?.desc || "");
  const [title, setTitle] = useState(state?.title || "");
  const [file, setFile] = useState(null);
  const [cat, setCat] = useState(state?.cat || "");

  const navigate = useNavigate();
  const URL = import.meta.env.VITE_BASE_URL;

  const upload = async () => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", cloudUploadPreset);
      formData.append("cloud_name", cloudname);
      const res = fetch(
        `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`,
        {
          method: "post",
          body: formData,
        }
      )
        .then((res) => res.json())
        .then((data) => {
          return data.url;
        });

      return res;
    } catch (err) {
      console.log(err);
    }
  };

  const handleClick = async (e) => {
    e.preventDefault();
    const imgUrl = await upload();

    try {
      state
        ? await axios.put(`/api/posts/${state.id}`, {
            title,
            desc: value,
            cat,
            img: file ? imgUrl : "",
          })
        : await axios.post(`/api/posts/`, {
            title,
            desc: value,
            cat,
            img: file ? imgUrl : "",
            date: moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
          });
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="add">
      <div className="content">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div
          className={
            theme === "dark" ? "editorContainer dark" : "editorContainer"
          }
        >
          <ReactQuill
            className="editor"
            theme="snow"
            value={value}
            onChange={setValue}
          />
        </div>
      </div>
      <div className="menu">
        <div className="item">
          <h1 className={theme === "dark" ? " dark" : ""}>Publish</h1>
          <span className={theme === "dark" ? " dark" : ""}>
            <b>Status: </b> Draft
          </span>
          <span className={theme === "dark" ? " dark" : ""}>
            <b>Visibility: </b> Public
          </span>
          <input
            style={{ display: "none" }}
            type="file"
            id="file"
            name=""
            onChange={(e) => setFile(e.target.files[0])}
          />
          <label
            className={theme === "dark" ? "file text dark" : "file text"}
            htmlFor="file"
          >
            Upload Image
          </label>
          <div className="buttons">
            <button className="btn-grad">Save as a draft</button>
            <button onClick={handleClick} className="btn-grad">
              Publish
            </button>
          </div>
        </div>
        <div className="item">
          <h1 className={theme === "dark" ? " dark" : ""}>Category</h1>
          <div className={theme === "dark" ? "cat text dark" : "cat text"}>
            <input
              type="radio"
              checked={cat === "art"}
              name="cat"
              value="art"
              id="art"
              onChange={(e) => setCat(e.target.value)}
            />
            <label htmlFor="art">Art</label>
          </div>
          <div className={theme === "dark" ? "cat text dark" : "cat text"}>
            <input
              type="radio"
              checked={cat === "scitech"}
              name="cat"
              value="scitech"
              id="scitech"
              onChange={(e) => setCat(e.target.value)}
            />
            <label htmlFor="scitech">Sci-Tech</label>
          </div>
          <div className={theme === "dark" ? "cat text dark" : "cat text"}>
            <input
              type="radio"
              checked={cat === "sports"}
              name="cat"
              value="sports"
              id="sports"
              onChange={(e) => setCat(e.target.value)}
            />
            <label htmlFor="sports">Sports</label>
          </div>
          <div className={theme === "dark" ? "cat text dark" : "cat text"}>
            <input
              type="radio"
              checked={cat === "cinema"}
              name="cat"
              value="cinema"
              id="cinema"
              onChange={(e) => setCat(e.target.value)}
            />
            <label htmlFor="cinema">Cinema</label>
          </div>
          <div className={theme === "dark" ? "cat text dark" : "cat text"}>
            <input
              type="radio"
              checked={cat === "food"}
              name="cat"
              value="food"
              id="food"
              onChange={(e) => setCat(e.target.value)}
            />
            <label htmlFor="food">Food</label>
          </div>
          <div className={theme === "dark" ? "cat text dark" : "cat text"}>
            <input
              type="radio"
              checked={cat === "travel"}
              name="cat"
              value="travel"
              id="travel"
              onChange={(e) => setCat(e.target.value)}
            />
            <label htmlFor="travel">Travel</label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Write;

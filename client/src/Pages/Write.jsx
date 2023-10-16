import { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
const Write = () => {
  const [value, setValue] = useState("");
  const [cat, setCat] = useState("art");
  return (
    <div className="add">
      <div className="content">
        <input type="text" placeholder="Title" />
        <div className="editorContainer">
          <ReactQuill className="editor" theme="snow" />
        </div>
      </div>
      <div className="menu">
        <div className="item">
          <h1>Publish</h1>
          <span>
            <b>Status: </b> Draft
          </span>
          <span>
            <b>Visibility: </b> Public
          </span>
          <input style={{ display: "none" }} type="file" id="file" name="" />
          <label className="file" htmlFor="file">
            Upload Image
          </label>
          <div className="buttons">
            <button>Save as a draft</button>
            <button>Publish</button>
          </div>
        </div>
        <div className="item">
          <h1>Category</h1>
          <div className="cat">
            <input
              type="radio"
              checked={cat === "art"}
              name="cat"
              value="art"
              id="art"
            />
            <label htmlFor="art">Art</label>
          </div>
          <div className="cat">
            <input
              type="radio"
              checked={cat === "scitech"}
              name="cat"
              value="scitech"
              id="scitech"
            />
            <label htmlFor="scitech">Sci-Tech</label>
          </div>
          <div className="cat">
            <input
              type="radio"
              checked={cat === "sports"}
              name="cat"
              value="sports"
              id="sports"
            />
            <label htmlFor="sports">Sports</label>
          </div>
          <div className="cat">
            <input
              type="radio"
              checked={cat === "cinema"}
              name="cat"
              value="cinema"
              id="cinema"
            />
            <label htmlFor="cinema">Cinema</label>
          </div>
          <div className="cat">
            <input
              type="radio"
              checked={cat === "food"}
              name="cat"
              value="food"
              id="food"
            />
            <label htmlFor="food">Food</label>
          </div>
          <div className="cat">
            <input
              type="radio"
              checked={cat === "travel"}
              name="cat"
              value="travel"
              id="travel"
            />
            <label htmlFor="travel">Travel</label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Write;

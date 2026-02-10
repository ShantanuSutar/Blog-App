import { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import axios from "axios";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import moment from "moment";
import { useThemeContext } from "../Context/theme";

const cloudname = import.meta.env.VITE_CLOUD_NAME;
const cloudUploadPreset = import.meta.env.VITE_CLOUD_UPLOAD_PRESET;

const Write = () => {
  const state = useLocation().state;
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { theme, setTheme } = useThemeContext();
  const [value, setValue] = useState(state?.desc || "");
  const [title, setTitle] = useState(state?.title || "");
  const [file, setFile] = useState(null);
  const [cat, setCat] = useState(state?.cat || "");
  const [scheduledDate, setScheduledDate] = useState(state?.scheduled_publish_date || "");
  const [tags, setTags] = useState(state?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [featured, setFeatured] = useState(state?.featured || false);
  const navigate = useNavigate();
  const URL = import.meta.env.VITE_BASE_URL;

  // Fetch post data when editing
  useEffect(() => {
    if (editId) {
      const fetchPost = async () => {
        try {
          // Get token from cookie
          const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
          };
          
          const token = getCookie('access_token');
          
          const res = await axios.get(`${URL}/api/posts/${editId}/edit`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          const post = res.data;
          setTitle(post.title);
          setValue(post.desc);
          setCat(post.cat || "");
          setScheduledDate(post.scheduled_publish_date || "");
          setTags(Array.isArray(post.tags) ? post.tags : JSON.parse(post.tags || "[]"));
          setFeatured(post.featured || false);
        } catch (err) {
          console.log(err);
        }
      };
      fetchPost();
    }
  }, [editId, URL]);

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

  const handleClick = async (e, isDraft = false) => {
    e.preventDefault();
    const imgUrl = file ? await upload() : "";

    function getCookie(cookieName) {
      const name = cookieName + "=";
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookieArray = decodedCookie.split(";");

      for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
          return cookie.substring(name.length, cookie.length);
        }
      }

      return null; // Return null if the cookie is not found
    }
    const tokenValue = getCookie("access_token");

    try {
      (state || editId)
        ? await axios.put(`${URL}/api/posts/${state?.id || editId}`, {
            title,
            desc: value,
            cat,
            img: file ? imgUrl : "",
            draft: isDraft,
            scheduled_publish_date: scheduledDate || null,
            tags: tags,
            featured: featured,
          }, {
            headers: {
              Authorization: `Bearer ${tokenValue}`
            }
          })
        : await axios.post(`${URL}/api/posts/`, {
            tokenValue,
            title,
            desc: value,
            cat,
            img: file ? imgUrl : "",
            date: moment(Date.now()).format("YYYY-MM-DD HH:mm:ss"),
            draft: isDraft,
            scheduled_publish_date: scheduledDate || null,
            tags: tags,
            featured: featured,
          });
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    handleClick(e, true);
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getTimeRemaining = (scheduledDate) => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const difference = scheduled.getTime() - now.getTime();

    if (difference <= 0) {
      return {
        formatted: "Published!",
        colorClass: "published"
      };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    let formatted = "";
    if (days > 0) {
      formatted = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      formatted = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      formatted = `${minutes}m ${seconds}s`;
    } else {
      formatted = `${seconds}s`;
    }

    // Determine color based on time remaining
    let colorClass = "";
    if (days === 0 && hours === 0 && minutes <= 30) {
      colorClass = "urgent"; // Less than 30 minutes - red
    } else if (days === 0 && hours <= 2) {
      colorClass = "warning"; // Less than 2 hours - orange
    } else {
      colorClass = "normal"; // More than 2 hours - green
    }

    return {
      formatted,
      colorClass
    };
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
          <div className="item">
            <label className={theme === "dark" ? " dark" : ""}>
              <b>Schedule Post: </b>
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className={theme === "dark" ? " dark" : ""}
            />
            {scheduledDate && (
              <div className="countdown-display">
                <p className={`countdown ${getTimeRemaining(scheduledDate).colorClass}`}>
                  <strong>Time remaining:</strong> {getTimeRemaining(scheduledDate).formatted}
                </p>
              </div>
            )}
          </div>
          <div className="item">
            <label className={theme === "dark" ? " dark" : ""}>
              <b>Featured Post: </b>
            </label>
            <div>
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                id="featured"
              />
              <label htmlFor="featured" className={theme === "dark" ? " dark" : ""}>
                Mark as featured
              </label>
            </div>
          </div>
          <div className="item">
            <label className={theme === "dark" ? " dark" : ""}>
              <b>Tags: </b>
            </label>
            <div className="tags-container">
              {tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveTag(tag)}
                    className="remove-tag-btn"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddTag} className="tag-input-form">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                className={theme === "dark" ? " dark" : ""}
              />
              <button type="submit" className="btn-grad">Add</button>
            </form>
          </div>
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
            <button className="btn-grad" onClick={handleSaveDraft}>
              Save as a draft
            </button>
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

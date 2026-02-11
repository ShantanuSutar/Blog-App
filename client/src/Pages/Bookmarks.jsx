import axios from "axios";
import api from "../api/axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useThemeContext } from "../Context/theme";

const Bookmarks = () => {
    const [posts, setPosts] = useState([]);
    const { theme } = useThemeContext();
    const URL = import.meta.env.VITE_BASE_URL;

    useEffect(() => {
        const fetchBookmarks = async () => {
            try {
                const res = await api.get(`/api/bookmarks`);
                setPosts(res.data);
            } catch (err) {
                console.log(err);
            }
        };
        fetchBookmarks();
    }, [URL]);

    const removeBookmark = async (id) => {
        try {
            await api.delete(`/api/bookmarks/${id}`);
            setPosts(posts.filter((post) => post.id !== id));
        } catch (err) {
            console.log(err);
        }
    };

    const getText = (html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        return doc.body.textContent;
    };

    return (
        <div className={theme === "dark" ? "home dark" : "home"}>
            <div className="main-content">
                <div className="posts">
                    <h1 className={theme === "dark" ? "text dark" : "text"} style={{ marginBottom: '30px' }}>Your Bookmarks</h1>
                    {posts.length > 0 ? (
                        posts.map((post) => (
                            <div className="post" key={post.id}>
                                <div className={theme === "dark" ? "img dark" : "img"}>
                                    <img src={post.img} alt="" />
                                </div>
                                <div className="content">
                                    <Link className="link" to={`/post/${post.id}`}>
                                        <h1 className={theme === "dark" ? "text dark" : "text"}>{post.title}</h1>
                                    </Link>
                                    <p className={theme === "dark" ? "dark" : ""}>{getText(post.desc)}</p>
                                    <div className="post-actions">
                                        <button className="btn-grad delete" onClick={() => removeBookmark(post.id)}>Remove</button>
                                        <Link className="link" to={`/post/${post.id}`}>
                                            <button className="btn-grad">Read More</button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-posts">
                            <p className={theme === "dark" ? "text dark" : "text"}>No bookmarks found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Bookmarks;

import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Compass, LogIn } from "lucide-react";
import { AuthContext } from "../AuthContext/authContext";
import api from "../api/axios";
import { useThemeContext } from "../Context/theme";
import CollectionPage from "../Components/library/CollectionPage";
import PostCard from "../Components/home/PostCard";

const baseUrl = import.meta.env.VITE_BASE_URL;

export default function Bookmarks() {
  const { currentUser } = useContext(AuthContext);
  const { theme } = useThemeContext();
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState(currentUser ? "loading" : "empty");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setPosts([]);
      setStatus("empty");
      return undefined;
    }

    const controller = new AbortController();
    setStatus("loading");
    api.get("/api/bookmarks", { signal: controller.signal })
      .then((response) => {
        setPosts(Array.isArray(response.data) ? response.data : []);
        setStatus("success");
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setStatus("error");
      });
    return () => controller.abort();
  }, [currentUser, requestVersion]);

  const pageStatus = status === "success" && posts.length === 0 ? "empty" : status;

  return (
    <CollectionPage
      title="Bookmarks"
      description="Stories you saved for another quiet moment."
      count={posts.length}
      countLabel={posts.length === 1 ? "saved story" : "saved stories"}
      status={pageStatus}
      errorMessage="Your saved stories couldn’t be loaded. Check your connection and try again."
      emptyTitle={currentUser ? "No bookmarks yet" : "Sign in to see your bookmarks"}
      emptyDescription={currentUser ? "Save stories as you browse and they’ll appear here." : "Your saved stories are tied to your Unsaid account."}
      emptyIcon={currentUser ? Bookmark : LogIn}
      emptyAction={currentUser
        ? <Link className="ui-button--primary" to="/"><Compass size={17} aria-hidden="true" /> Explore stories</Link>
        : <Link className="ui-button--primary" to="/login" state={{ from: "/bookmarks" }}><LogIn size={17} aria-hidden="true" /> Log in</Link>}
      onRetry={() => setRequestVersion((version) => version + 1)}
    >
      <div className="collection-post-list">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            theme={theme}
            baseUrl={baseUrl}
            bookmarkInitialState
            onBookmarkChange={(bookmarked) => {
              if (!bookmarked) setPosts((current) => current.filter((item) => item.id !== post.id));
            }}
          />
        ))}
      </div>
    </CollectionPage>
  );
}

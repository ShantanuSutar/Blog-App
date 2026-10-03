import { useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Compass, LogIn } from "lucide-react";
import { AuthContext } from "../AuthContext/authContext";
import api from "../api/axios";
import CollectionPage, { CollectionLoadMore } from "../Components/library/CollectionPage";
import PostCard from "../Components/home/PostCard";
import { useToast } from "../Context/ToastContext.jsx";
import { decrementPaginationTotal, mergeUniqueById, readPaginatedList } from "../utils/pagination";

const baseUrl = import.meta.env.VITE_BASE_URL;

export default function Bookmarks() {
  const { currentUser } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState(currentUser ? "loading" : "empty");
  const [requestVersion, setRequestVersion] = useState(0);
  const [pagination, setPagination] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const toast = useToast();

  const loadBookmarks = useCallback(async (page, { append = false, signal } = {}) => {
    if (append) setLoadingMore(true);
    else setStatus("loading");
    try {
      const response = await api.get("/api/bookmarks", {
        params: { page, limit: 20 },
        signal,
      });
      const { items, pagination: nextPagination } = readPaginatedList(response.data, "bookmarks");
      setPosts((current) => append ? mergeUniqueById(current, items) : items);
      setPagination(nextPagination);
      setStatus("success");
    } catch (error) {
      if (error.code === "ERR_CANCELED") return;
      if (append) toast.error("More bookmarks couldn’t be loaded. Try again.");
      else setStatus("error");
    } finally {
      if (!signal?.aborted) setLoadingMore(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!currentUser) {
      setPosts([]);
      setPagination(null);
      setStatus("empty");
      return undefined;
    }

    const controller = new AbortController();
    setPosts([]);
    setPagination(null);
    loadBookmarks(1, { signal: controller.signal });
    return () => controller.abort();
  }, [currentUser, loadBookmarks, requestVersion]);

  const pageStatus = status === "success" && posts.length === 0 ? "empty" : status;

  return (
    <CollectionPage
      title="Bookmarks"
      description="Stories you saved for another quiet moment."
      count={pagination?.total ?? posts.length}
      countLabel={(pagination?.total ?? posts.length) === 1 ? "saved story" : "saved stories"}
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
            baseUrl={baseUrl}
            bookmarkInitialState
            onBookmarkChange={(bookmarked) => {
              if (!bookmarked) {
                setPosts((current) => current.filter((item) => item.id !== post.id));
                setPagination(decrementPaginationTotal);
              }
            }}
          />
        ))}
        {pagination?.hasNext && (
          <CollectionLoadMore
            loading={loadingMore}
            label="Load more bookmarks"
            onClick={() => loadBookmarks(pagination.page + 1, { append: true })}
          />
        )}
      </div>
    </CollectionPage>
  );
}

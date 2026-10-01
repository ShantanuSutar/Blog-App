import { useContext, useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../AuthContext/authContext.jsx";

const formatCount = (count) => {
  const numericCount = Number(count) || 0;
  if (numericCount >= 1000000) return `${(numericCount / 1000000).toFixed(1)}M`;
  if (numericCount >= 1000) return `${(numericCount / 1000).toFixed(1)}K`;
  return numericCount.toString();
};

export default function BookmarkButton({ postId, postTitle }) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const targetLabel = postTitle || "this story";

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setFeedback("");
      if (!currentUser) setIsBookmarked(false);
      try {
        const requests = [api.post("/api/bookmarks/counts", { postIds: [postId] }, { signal: controller.signal })];
        if (currentUser) requests.push(api.get(`/api/bookmarks/check/${postId}`, { signal: controller.signal }));
        const [countResponse, statusResponse] = await Promise.all(requests);
        if (!active) return;
        setBookmarkCount(Number(countResponse.data?.[postId]) || 0);
        setIsBookmarked(currentUser ? Boolean(statusResponse?.data) : false);
      } catch (error) {
        if (error.code !== "ERR_CANCELED" && active) setBookmarkCount(0);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [currentUser, postId]);

  const handleBookmark = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUser) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    if (isLoading || isProcessing) return;

    const previousBookmarked = isBookmarked;
    const previousCount = bookmarkCount;
    const nextBookmarked = !previousBookmarked;
    setIsProcessing(true);
    setFeedback("");
    setIsBookmarked(nextBookmarked);
    setBookmarkCount((count) => Math.max(0, count + (nextBookmarked ? 1 : -1)));

    try {
      if (nextBookmarked) await api.post("/api/bookmarks", { postId });
      else await api.delete(`/api/bookmarks/${postId}`);
    } catch (error) {
      setIsBookmarked(previousBookmarked);
      setBookmarkCount(previousCount);
      if (error.response?.status === 401) {
        navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      } else {
        setFeedback("Bookmark could not be updated. Try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const Icon = isBookmarked ? BookmarkCheck : Bookmark;
  return (
    <div className="bookmark-control">
      <button
        type="button"
        className={`bookmark-control__button${isBookmarked ? " is-active" : ""}`}
        onClick={handleBookmark}
        title={currentUser ? (isBookmarked ? "Remove bookmark" : "Save story") : "Log in to save this story"}
        aria-label={currentUser
          ? `${isBookmarked ? "Remove bookmark from" : "Save"} ${targetLabel}`
          : `Log in to save ${targetLabel}`}
        aria-pressed={isBookmarked}
        aria-busy={isLoading || isProcessing}
        disabled={isLoading || isProcessing}
      >
        {isProcessing
          ? <LoaderCircle className="interaction-spinner" size={20} aria-hidden="true" />
          : <Icon size={20} fill={isBookmarked ? "currentColor" : "none"} aria-hidden="true" />}
      </button>
      {bookmarkCount > 0 && <span className="bookmark-control__count" aria-label={`${bookmarkCount} bookmarks`}>{formatCount(bookmarkCount)}</span>}
      {feedback && <span className="interaction-feedback" role="alert">{feedback}</span>}
    </div>
  );
}

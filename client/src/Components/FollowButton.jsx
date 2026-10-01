import { useContext, useEffect, useState } from "react";
import { Check, LoaderCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext.jsx";
import api from "../api/axios.js";

export default function FollowButton({ userId, username, initialFollowing = false, onChange }) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    setIsFollowing(initialFollowing);
    setError("");
  }, [initialFollowing, userId]);

  useEffect(() => {
    if (!userId || !currentUser) return undefined;
    const controller = new AbortController();
    api.get(`/api/follows/info/${userId}`, { signal: controller.signal })
      .then((response) => setIsFollowing(Boolean(response.data.following)))
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") setError("Follow status is unavailable.");
      });
    return () => controller.abort();
  }, [currentUser, userId]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (loading) return;

    setLoading(true);
    setError("");
    try {
      const response = await api.post(`/api/follows/${userId}`);
      const nextFollowing = response.data.action === "follow";
      setIsFollowing(nextFollowing);
      onChange?.(nextFollowing);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate("/login");
      } else {
        setError(requestError.response?.status === 403
          ? "This account cannot be followed."
          : `Couldn’t ${isFollowing ? "unfollow" : "follow"} ${username || "this writer"}. Try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="follow-control">
      <button
        className={isFollowing ? "ui-button--secondary follow-button is-following" : "ui-button--primary follow-button"}
        type="button"
        onClick={handleToggleFollow}
        disabled={loading}
        aria-busy={loading}
        aria-pressed={isFollowing}
      >
        {loading ? <LoaderCircle className="profile-spinner" size={18} aria-hidden="true" /> : isFollowing ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        {loading ? "Updating…" : isFollowing ? "Following" : "Follow"}
      </button>
      {error && <span className="follow-control__error" role="status">{error}</span>}
    </div>
  );
}

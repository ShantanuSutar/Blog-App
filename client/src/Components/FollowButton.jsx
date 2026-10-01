import { useContext, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext.jsx";
import api from "../api/axios.js";
import { useToast } from "../Context/ToastContext.jsx";
import LoadingButton from "./ui/LoadingButton.jsx";

export default function FollowButton({ userId, username, initialFollowing = false, onChange }) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

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
      toast.success(nextFollowing ? `You’re now following ${username || "this writer"}.` : `You unfollowed ${username || "this writer"}.`);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate("/login");
      } else {
        const message = requestError.response?.status === 403
          ? "This account cannot be followed."
          : `Couldn’t ${isFollowing ? "unfollow" : "follow"} ${username || "this writer"}. Try again.`;
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="follow-control">
      <LoadingButton
        className={isFollowing ? "ui-button--secondary follow-button is-following" : "ui-button--primary follow-button"}
        onClick={handleToggleFollow}
        loading={loading}
        loadingLabel="Updating…"
        icon={isFollowing ? Check : Plus}
        aria-pressed={isFollowing}
      >
        {isFollowing ? "Following" : "Follow"}
      </LoadingButton>
      {error && <span className="sr-only" role="status">{error}</span>}
    </div>
  );
}

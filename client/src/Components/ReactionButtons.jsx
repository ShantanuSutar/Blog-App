import { useContext, useEffect, useId, useRef, useState } from "react";
import { Heart, LoaderCircle, PartyPopper, ThumbsUp } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../AuthContext/authContext.jsx";
import { useToast } from "../Context/ToastContext.jsx";

const REACTION_TYPES = [
  { type: "like", icon: ThumbsUp, label: "Like" },
  { type: "love", icon: Heart, label: "Love" },
  { type: "celebrate", icon: PartyPopper, label: "Celebrate" },
];

const formatCount = (count) => {
  const numericCount = Number(count) || 0;
  if (numericCount >= 1000000) return `${(numericCount / 1000000).toFixed(1)}M`;
  if (numericCount >= 1000) return `${(numericCount / 1000).toFixed(1)}K`;
  return numericCount.toString();
};

const countFor = (reactions, type) => Number(reactions[type]?.count) || 0;

const updateReactionCounts = (reactions, previousType, nextType) => {
  const next = { ...reactions };
  const adjust = (type, delta) => {
    if (!type) return;
    const current = next[type] || { count: 0, users: [] };
    next[type] = { ...current, count: Math.max(0, (Number(current.count) || 0) + delta) };
  };

  if (previousType === nextType) adjust(previousType, -1);
  else {
    adjust(previousType, -1);
    adjust(nextType, 1);
  }
  return next;
};

export default function ReactionButtons({ postId, commentId, postTitle }) {
  const [userReaction, setUserReaction] = useState(null);
  const [reactions, setReactions] = useState({});
  const [loadStatus, setLoadStatus] = useState("loading");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const controlRef = useRef(null);
  const triggerRef = useRef(null);
  const pickerRef = useRef(null);
  const pickerId = useId();
  const targetLabel = postTitle || (commentId ? "this comment" : "this story");
  const loading = loadStatus === "loading";

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setLoadStatus("loading");
      try {
        const reactionsEndpoint = postId
          ? `/api/reactions/post/${postId}`
          : `/api/reactions/comment/${commentId}`;
        const requests = [api.get(reactionsEndpoint, { signal: controller.signal })];
        if (currentUser) {
          const userEndpoint = postId
            ? `/api/reactions/check/post/${postId}`
            : `/api/reactions/check/comment/${commentId}`;
          requests.push(api.get(userEndpoint, { signal: controller.signal }));
        }
        const [reactionsResponse, userResponse] = await Promise.all(requests);
        if (!active) return;
        setReactions(reactionsResponse.data?.grouped || {});
        setUserReaction(currentUser ? userResponse?.data?.reaction || null : null);
        setLoadStatus("success");
      } catch (error) {
        if (!active || error.code === "ERR_CANCELED") return;
        setLoadStatus("error");
      }
    };

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [commentId, currentUser, postId]);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const selectedOption = pickerRef.current?.querySelector('[role="menuitemradio"][aria-checked="true"]');
      (selectedOption || pickerRef.current?.querySelector('[role="menuitemradio"]'))?.focus();
    });
    const closeOutside = (event) => {
      if (!controlRef.current?.contains(event.target)) setPickerOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") {
        setPickerOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [pickerOpen]);

  const handlePickerKeyDown = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const options = [...pickerRef.current.querySelectorAll('[role="menuitemradio"]:not(:disabled)')];
    if (!options.length) return;
    event.preventDefault();
    const currentIndex = Math.max(0, options.indexOf(document.activeElement));
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? options.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1) % options.length
          : (currentIndex - 1 + options.length) % options.length;
    options[nextIndex].focus();
  };

  const handleTrigger = () => {
    if (loading) return;
    if (!currentUser) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setPickerOpen((open) => !open);
  };

  const handleReaction = async (type) => {
    if (!currentUser || isProcessing) return;
    const previousReaction = userReaction;
    const previousCounts = reactions;
    const nextReaction = previousReaction === type ? null : type;

    setIsProcessing(true);
    setUserReaction(nextReaction);
    setReactions(updateReactionCounts(previousCounts, previousReaction, type));

    try {
      const response = await api.post("/api/reactions", { postId, commentId, reactionType: type });
      setUserReaction(response.data?.action === "removed" ? null : type);
      setPickerOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    } catch (error) {
      setUserReaction(previousReaction);
      setReactions(previousCounts);
      if (error.response?.status === 401) {
        navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      } else {
        toast.error("Reaction could not be saved. Try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const selected = REACTION_TYPES.find((reaction) => reaction.type === userReaction);
  const TriggerIcon = selected?.icon || ThumbsUp;
  const totalCount = REACTION_TYPES.reduce((sum, reaction) => sum + countFor(reactions, reaction.type), 0);

  return (
    <div
      className="reaction-control"
      ref={controlRef}
      data-reaction={userReaction || undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`reaction-control__trigger${userReaction ? " is-active" : ""}`}
        onClick={handleTrigger}
        aria-label={currentUser
          ? `${selected ? `${selected.label} selected. ` : ""}Choose a reaction for ${targetLabel}`
          : `Log in to react to ${targetLabel}`}
        aria-expanded={pickerOpen}
        aria-controls={pickerOpen ? pickerId : undefined}
        aria-haspopup="menu"
        aria-busy={isProcessing || loading}
        title={currentUser ? "Choose a reaction" : "Log in to react"}
        disabled={isProcessing || loading}
      >
        {isProcessing ? (
          <LoaderCircle className="interaction-spinner" size={20} aria-hidden="true" />
        ) : (
          <TriggerIcon size={20} fill={userReaction === "love" ? "currentColor" : "none"} aria-hidden="true" />
        )}
      </button>

      {totalCount > 0 && <span className="reaction-control__count" aria-label={`${totalCount} reactions`}>{formatCount(totalCount)}</span>}

      {pickerOpen && currentUser && (
        <div ref={pickerRef} className="reaction-control__picker" id={pickerId} role="menu" aria-label={`React to ${targetLabel}`} onKeyDown={handlePickerKeyDown}>
          {REACTION_TYPES.map(({ type, icon: Icon, label }, index) => {
            const active = userReaction === type;
            const count = countFor(reactions, type);
            return (
              <button
                key={type}
                type="button"
                className={`reaction-control__option${active ? " is-active" : ""}`}
                data-reaction={type}
                role="menuitemradio"
                aria-checked={active}
                tabIndex={active || (!userReaction && index === 0) ? 0 : -1}
                aria-label={`${label}, ${count} ${count === 1 ? "reaction" : "reactions"}`}
                onClick={() => handleReaction(type)}
                disabled={isProcessing}
              >
                <Icon size={20} fill={active && type === "love" ? "currentColor" : "none"} aria-hidden="true" />
                <span>{label}</span>
                <span className="reaction-control__option-count" aria-hidden="true">{formatCount(count)}</span>
              </button>
            );
          })}
        </div>
      )}

      {loadStatus === "error" && <span className="sr-only" role="status">Reaction counts are temporarily unavailable.</span>}
    </div>
  );
}

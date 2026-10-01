import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, RotateCcw, Users, X } from "lucide-react";
import { AuthContext } from "../AuthContext/authContext.jsx";
import api from "../api/axios.js";
import FollowButton from "./FollowButton.jsx";
import ProfileAvatar from "./ProfileAvatar.jsx";

export default function FollowersModal({ userId, isOpen, onClose, type }) {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("idle");
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const { currentUser } = useContext(AuthContext);
  const title = type === "followers" ? "Followers" : "Following";

  const fetchUsers = useCallback((signal) => {
    setStatus("loading");
    return api.get(`/api/follows/${userId}/${type}`, { signal })
      .then((response) => {
        setUsers(response.data[type] || []);
        setStatus("success");
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setStatus("error");
      });
  }, [type, userId]);

  useEffect(() => {
    if (!isOpen || !userId) return undefined;
    const controller = new AbortController();
    previousFocusRef.current = document.activeElement;
    setUsers([]);
    fetchUsers(controller.signal);

    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      controller.abort();
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [fetchUsers, isOpen, userId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="followers-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="followers-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`followers-dialog-${type}`} tabIndex={-1}>
        <header className="followers-dialog__header">
          <div><span className="profile-kicker">Community</span><h2 id={`followers-dialog-${type}`}>{title}</h2></div>
          <button className="ui-button--icon" type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()} dialog`}><X size={20} aria-hidden="true" /></button>
        </header>

        <div className="followers-dialog__content" aria-live="polite" aria-busy={status === "loading"}>
          {status === "loading" && <div className="profile-state profile-state--compact"><LoaderCircle className="profile-spinner" size={26} aria-hidden="true" /><p>Loading {title.toLowerCase()}…</p></div>}
          {status === "error" && <div className="profile-state profile-state--compact" role="alert"><p>We couldn’t load this list.</p><button className="ui-button--secondary" type="button" onClick={() => fetchUsers()}><RotateCcw size={16} aria-hidden="true" /> Retry</button></div>}
          {status === "success" && users.length === 0 && <div className="profile-state profile-state--compact"><Users size={28} strokeWidth={1.5} aria-hidden="true" /><p>No {title.toLowerCase()} yet.</p></div>}
          {status === "success" && users.length > 0 && (
            <ul className="followers-list">
              {users.map((listedUser) => (
                <li className="followers-list__item" key={listedUser.id}>
                  <Link className="followers-list__identity" to={`/profile/${encodeURIComponent(listedUser.username)}`} onClick={onClose}>
                    <ProfileAvatar source={listedUser.avatar} username={listedUser.username} className="profile-avatar--small" />
                    <span><strong>@{listedUser.username}</strong>{listedUser.bio && <small>{listedUser.bio}</small>}</span>
                  </Link>
                  {currentUser?.id !== listedUser.id && <FollowButton userId={listedUser.id} username={listedUser.username} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

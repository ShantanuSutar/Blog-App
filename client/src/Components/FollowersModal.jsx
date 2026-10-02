import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Users, X } from "lucide-react";
import { AuthContext } from "../AuthContext/authContext.jsx";
import api from "../api/axios.js";
import FollowButton from "./FollowButton.jsx";
import ProfileAvatar from "./ProfileAvatar.jsx";
import InlineLoader from "./ui/InlineLoader.jsx";
import StatePanel from "./ui/StatePanel.jsx";
import useModalAccessibility from "../hooks/useModalAccessibility.js";

export default function FollowersModal({ userId, isOpen, onClose, type }) {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("idle");
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
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
    setUsers([]);
    fetchUsers(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchUsers, isOpen, userId]);
  useModalAccessibility({ open: isOpen, containerRef: dialogRef, initialFocusRef: closeButtonRef, onClose });

  if (!isOpen) return null;

  return (
    <div className="followers-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="followers-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`followers-dialog-${type}`} tabIndex={-1}>
        <header className="followers-dialog__header">
          <div><span className="profile-kicker">Community</span><h2 id={`followers-dialog-${type}`}>{title}</h2></div>
          <button ref={closeButtonRef} className="ui-button--icon" type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()} dialog`}><X size={20} aria-hidden="true" /></button>
        </header>

        <div className="followers-dialog__content" aria-live="polite" aria-busy={status === "loading"}>
          {status === "loading" && <StatePanel className="profile-state" compact action={<InlineLoader label={`Loading ${title.toLowerCase()}…`} />} />}
          {status === "error" && <StatePanel className="profile-state" compact tone="error" role="alert" title="We couldn’t load this list" headingLevel={3} action={<button className="ui-button--secondary" type="button" onClick={() => fetchUsers()}><RotateCcw size={16} aria-hidden="true" /> Retry</button>} />}
          {status === "success" && users.length === 0 && <StatePanel className="profile-state" compact icon={Users} title={`No ${title.toLowerCase()} yet`} headingLevel={3} />}
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

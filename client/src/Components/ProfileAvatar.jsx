import { useEffect, useState } from "react";
import { resolveMediaUrl } from "./home/postPresentation.js";

export default function ProfileAvatar({ source, username = "User", className = "", loading = "lazy" }) {
  const [failed, setFailed] = useState(false);
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const imageUrl = resolveMediaUrl(source, baseUrl);
  const initial = username.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => setFailed(false), [source]);

  return (
    <span className={`profile-avatar ${className}`.trim()}>
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={`${username}'s avatar`}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="profile-avatar__fallback" role="img" aria-label={`${username}'s avatar`}>{initial}</span>
      )}
    </span>
  );
}

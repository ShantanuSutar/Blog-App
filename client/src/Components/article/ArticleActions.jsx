import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Pencil, Share2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import ReactionButtons from "../ReactionButtons.jsx";
import BookmarkButton from "../BookmarkButton.jsx";

export default function ArticleActions({ post, postId, theme, isOwner, onDelete, deleting }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!shareOpen) return;
    const closeOutside = (event) => {
      if (!shareRef.current?.contains(event.target)) setShareOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") {
        setShareOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [shareOpen]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    setCopied(true);
  };

  const shareTo = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Read “${post.title}” on Unsaid`);
    const destinations = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    window.open(destinations[platform], "_blank", "noopener,noreferrer");
    setShareOpen(false);
  };

  return (
    <div className="article-actions" aria-label="Article actions">
      <ReactionButtons postId={postId} theme={theme} postTitle={post.title} />
      <BookmarkButton postId={postId} theme={theme} postTitle={post.title} />
      <div className="article-share" ref={shareRef}>
        <button
          ref={triggerRef}
          type="button"
          className="ui-button--icon article-action-button"
          aria-label={`Share ${post.title}`}
          title="Share article"
          aria-expanded={shareOpen}
          aria-controls={menuId}
          onClick={() => setShareOpen((open) => !open)}
        >
          <Share2 size={20} aria-hidden="true" />
        </button>
        {shareOpen && (
          <div className="article-share__menu" id={menuId} role="menu">
            <button type="button" className="article-share__item" role="menuitem" onClick={copyLink}>
              {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
              {copied ? "Link copied" : "Copy link"}
            </button>
            {[
              ["twitter", "Twitter"],
              ["facebook", "Facebook"],
              ["linkedin", "LinkedIn"],
            ].map(([value, label]) => (
              <button key={value} type="button" className="article-share__item" role="menuitem" onClick={() => shareTo(value)}>
                <ExternalLink size={17} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {isOwner && (
        <div className="article-owner-actions" aria-label="Author controls">
          <Link className="ui-button--icon article-action-button" to={`/write?edit=${post.id}`} state={post} aria-label={`Edit ${post.title}`} title="Edit article">
            <Pencil size={19} aria-hidden="true" />
          </Link>
          <button className="ui-button--icon article-action-button article-action-button--danger" type="button" aria-label={`Delete ${post.title}`} title="Delete article" onClick={onDelete} disabled={deleting} aria-busy={deleting}>
            <Trash2 size={19} aria-hidden="true" />
          </button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{copied ? "Article link copied" : ""}</span>
    </div>
  );
}

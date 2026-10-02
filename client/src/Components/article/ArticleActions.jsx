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
  const menuRef = useRef(null);
  const menuId = useId();
  const postTitle = post.title?.trim() || "Untitled story";

  useEffect(() => {
    if (!shareOpen) return;
    const frame = window.requestAnimationFrame(() => menuRef.current?.querySelector('[role="menuitem"]')?.focus());
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
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [shareOpen]);

  const handleMenuKeyDown = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = Math.max(0, items.indexOf(document.activeElement));
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex].focus();
  };

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
    const text = encodeURIComponent(`Read “${postTitle}” on Unsaid`);
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
      <ReactionButtons postId={postId} theme={theme} postTitle={postTitle} />
      <BookmarkButton postId={postId} theme={theme} postTitle={postTitle} />
      <div className="article-share" ref={shareRef}>
        <button
          ref={triggerRef}
          type="button"
          className="ui-button--icon article-action-button"
          aria-label={`Share ${postTitle}`}
          title="Share article"
          aria-expanded={shareOpen}
          aria-controls={shareOpen ? menuId : undefined}
          aria-haspopup="menu"
          onClick={() => setShareOpen((open) => !open)}
        >
          <Share2 size={20} aria-hidden="true" />
        </button>
        {shareOpen && (
          <div ref={menuRef} className="article-share__menu" id={menuId} role="menu" aria-label={`Share ${postTitle}`} onKeyDown={handleMenuKeyDown}>
            <button type="button" className="article-share__item" role="menuitem" tabIndex={0} onClick={copyLink}>
              {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
              {copied ? "Link copied" : "Copy link"}
            </button>
            {[
              ["twitter", "Twitter"],
              ["facebook", "Facebook"],
              ["linkedin", "LinkedIn"],
            ].map(([value, label]) => (
              <button key={value} type="button" className="article-share__item" role="menuitem" tabIndex={-1} onClick={() => shareTo(value)}>
                <ExternalLink size={17} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {isOwner && (
        <div className="article-owner-actions" aria-label="Author controls">
          <Link className="ui-button--icon article-action-button" to={`/write?edit=${post.id}`} state={post} aria-label={`Edit ${postTitle}`} title="Edit article">
            <Pencil size={19} aria-hidden="true" />
          </Link>
          <button className="ui-button--icon article-action-button article-action-button--danger" type="button" aria-label={`Delete ${postTitle}`} title="Delete article" onClick={onDelete} disabled={deleting} aria-busy={deleting}>
            <Trash2 size={19} aria-hidden="true" />
          </button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{copied ? "Article link copied" : ""}</span>
    </div>
  );
}

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";

export default function ConfirmDialog({ open, title, description, confirmLabel = "Delete", loading = false, onConfirm, onClose }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const loadingRef = useRef(loading);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    loadingRef.current = loading;
    onCloseRef.current = onClose;
  }, [loading, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loadingRef.current) onCloseRef.current();
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll('button:not(:disabled), a[href]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="confirm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <section ref={dialogRef} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <button className="ui-button--icon confirm-dialog__close" type="button" onClick={onClose} disabled={loading} aria-label="Close confirmation"><X size={19} aria-hidden="true" /></button>
        <span className="confirm-dialog__icon"><AlertTriangle size={22} aria-hidden="true" /></span>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="confirm-dialog__actions">
          <button ref={cancelRef} className="ui-button--secondary" type="button" onClick={onClose} disabled={loading}>Keep post</button>
          <button className="ui-button--danger" type="button" onClick={onConfirm} disabled={loading} aria-busy={loading}>
            {loading && <LoaderCircle className="interaction-spinner" size={17} aria-hidden="true" />}
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

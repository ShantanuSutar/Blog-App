import { useId, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import LoadingButton from "./ui/LoadingButton.jsx";
import useModalAccessibility from "../hooks/useModalAccessibility.js";

export default function ConfirmDialog({ open, title, description, confirmLabel = "Delete", cancelLabel = "Cancel", loadingLabel = "Deleting…", loading = false, onConfirm, onClose }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  useModalAccessibility({ open, containerRef: dialogRef, initialFocusRef: cancelRef, onClose, locked: loading });

  if (!open) return null;

  return (
    <div className="confirm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <section ref={dialogRef} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}>
        <button className="ui-button--icon confirm-dialog__close" type="button" onClick={onClose} disabled={loading} aria-label="Close confirmation"><X size={19} aria-hidden="true" /></button>
        <span className="confirm-dialog__icon"><AlertTriangle size={22} aria-hidden="true" /></span>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="confirm-dialog__actions">
          <button ref={cancelRef} className="ui-button--secondary" type="button" onClick={onClose} disabled={loading}>{cancelLabel}</button>
          <LoadingButton className="ui-button--danger" onClick={onConfirm} loading={loading} loadingLabel={loadingLabel}>{confirmLabel}</LoadingButton>
        </div>
      </section>
    </div>
  );
}

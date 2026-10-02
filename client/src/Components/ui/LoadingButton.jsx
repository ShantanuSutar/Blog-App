import { LoaderCircle } from "lucide-react";

export default function LoadingButton({
  loading = false,
  loadingLabel = "Working…",
  icon: Icon,
  children,
  className = "ui-button--primary",
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      {...props}
      className={`ui-loading-button ${className}`}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      <span className="ui-loading-button__content" aria-live="polite" aria-atomic="true">
        <span className={`ui-loading-button__state${loading ? " is-hidden" : ""}`} aria-hidden={loading}>
          {Icon ? <Icon size={18} aria-hidden="true" /> : null}
          <span>{children}</span>
        </span>
        <span className={`ui-loading-button__state ui-loading-button__loading${loading ? "" : " is-hidden"}`} aria-hidden={!loading}>
          <LoaderCircle className="ui-loading-button__spinner" size={18} aria-hidden="true" />
          <span>{loadingLabel}</span>
        </span>
      </span>
    </button>
  );
}

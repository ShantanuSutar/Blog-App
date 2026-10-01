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
      <span className="ui-loading-button__content">
        {loading ? <LoaderCircle className="ui-loading-button__spinner" size={18} aria-hidden="true" /> : Icon ? <Icon size={18} aria-hidden="true" /> : null}
        <span>{loading ? loadingLabel : children}</span>
      </span>
    </button>
  );
}

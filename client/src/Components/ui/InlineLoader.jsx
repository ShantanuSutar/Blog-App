import { LoaderCircle } from "lucide-react";

export default function InlineLoader({ label = "Loading", size = 18, className = "" }) {
  return (
    <span className={`ui-inline-loader${className ? ` ${className}` : ""}`} role="status">
      <LoaderCircle size={size} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

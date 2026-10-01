export default function Skeleton({ className = "", circle = false }) {
  return <span className={`ui-skeleton${circle ? " ui-skeleton--circle" : ""}${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}

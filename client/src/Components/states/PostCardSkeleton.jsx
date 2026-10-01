import Skeleton from "../ui/Skeleton.jsx";

export default function PostCardSkeleton({ featured = false, count = 3, label = "Loading stories" }) {
  return (
    <div className={featured ? "home-featured-grid" : "home-feed-list"} role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className={`story-skeleton ${featured ? "story-skeleton--featured" : ""}`} key={index} aria-hidden="true">
          <Skeleton className="story-skeleton__image" />
          <div className="story-skeleton__body">
            <Skeleton className="story-skeleton__line story-skeleton__line--short" />
            <Skeleton className="story-skeleton__line story-skeleton__line--title" />
            <Skeleton className="story-skeleton__line" />
            <Skeleton className="story-skeleton__line story-skeleton__line--medium" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

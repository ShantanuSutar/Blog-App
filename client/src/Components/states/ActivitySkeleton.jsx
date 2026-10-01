import Skeleton from "../ui/Skeleton.jsx";

export default function ActivitySkeleton({ count = 5 }) {
  return (
    <div className="activity-skeleton-list" role="status" aria-label="Loading activity" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="activity-skeleton" aria-hidden="true" key={index}>
          <Skeleton className="activity-skeleton__avatar" circle />
          <span className="activity-skeleton__body">
            <Skeleton className="activity-skeleton__line activity-skeleton__line--title" />
            <Skeleton className="activity-skeleton__line" />
            <Skeleton className="activity-skeleton__line activity-skeleton__line--short" />
          </span>
        </div>
      ))}
      <span className="sr-only">Loading activity…</span>
    </div>
  );
}

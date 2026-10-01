import Skeleton from "../ui/Skeleton.jsx";

export default function CommentSkeleton({ count = 2 }) {
  return (
    <div className="comment-skeleton-list" role="status" aria-label="Loading comments" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="comment-skeleton" key={index} aria-hidden="true">
          <Skeleton className="comment-skeleton__avatar" circle />
          <span className="comment-skeleton__lines"><Skeleton /><Skeleton /></span>
        </div>
      ))}
      <span className="sr-only">Loading comments…</span>
    </div>
  );
}

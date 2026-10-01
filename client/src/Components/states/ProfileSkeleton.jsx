import Skeleton from "../ui/Skeleton.jsx";

export default function ProfileSkeleton() {
  return (
    <div className="profile-page" role="status" aria-label="Loading profile" aria-busy="true">
      <div className="profile-skeleton" aria-hidden="true">
        <Skeleton className="profile-skeleton__avatar" circle />
        <div><Skeleton /><Skeleton /><Skeleton /></div>
      </div>
      <div className="profile-skeleton profile-skeleton--post" aria-hidden="true"><Skeleton /><Skeleton /><Skeleton /></div>
      <span className="sr-only">Loading profile…</span>
    </div>
  );
}

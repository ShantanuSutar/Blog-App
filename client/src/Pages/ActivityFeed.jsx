import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CircleCheck, LogIn, RotateCcw, Users } from "lucide-react";
import { AuthContext } from "../AuthContext/authContext.jsx";
import api from "../api/axios.js";
import ActivityItem from "../Components/activity/ActivityItem.jsx";
import ActivitySkeleton from "../Components/states/ActivitySkeleton.jsx";
import LoadingButton from "../Components/ui/LoadingButton.jsx";
import StatePanel from "../Components/ui/StatePanel.jsx";

const filters = [
  { label: "All", value: "all" },
  { label: "Posts", value: "posts" },
  { label: "Comments", value: "comments" },
  { label: "Reactions", value: "reactions" },
  { label: "Follows", value: "follows" },
];

export default function ActivityFeed() {
  const { currentUser } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState(currentUser ? "loading" : "idle");
  const [loadMoreStatus, setLoadMoreStatus] = useState("idle");
  const [requestVersion, setRequestVersion] = useState(0);
  const loadLockRef = useRef(false);

  useEffect(() => {
    if (!currentUser) {
      setActivities([]);
      setStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    if (page === 1) setStatus("loading");
    else setLoadMoreStatus("loading");

    const query = new URLSearchParams({ page: String(page), limit: "20", filter });
    api.get(`/api/activity/feed?${query.toString()}`, { signal: controller.signal })
      .then((response) => {
        const nextActivities = Array.isArray(response.data?.activities) ? response.data.activities : [];
        setActivities((current) => {
          if (page === 1) return nextActivities;
          const seen = new Set(current.map((activity) => activity.id));
          return [...current, ...nextActivities.filter((activity) => !seen.has(activity.id))];
        });
        const reportedPages = Number(response.data?.totalPages);
        setTotalPages(Number.isFinite(reportedPages) && reportedPages > 0 ? reportedPages : 1);
        setStatus("success");
        setLoadMoreStatus("idle");
        loadLockRef.current = false;
      })
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        if (page === 1) setStatus("error");
        else setLoadMoreStatus("error");
        loadLockRef.current = false;
      });

    return () => controller.abort();
  }, [currentUser, filter, page, requestVersion]);

  const selectFilter = (value) => {
    if (value === filter) return;
    setFilter(value);
    setActivities([]);
    setPage(1);
    setTotalPages(1);
    setStatus("loading");
    setLoadMoreStatus("idle");
    loadLockRef.current = false;
  };

  const retry = () => {
    if (page === 1) setStatus("loading");
    else setLoadMoreStatus("loading");
    setRequestVersion((version) => version + 1);
  };

  const loadMore = () => {
    if (loadLockRef.current || loadMoreStatus !== "idle" || page >= totalPages) return;
    loadLockRef.current = true;
    setLoadMoreStatus("loading");
    setPage((current) => current + 1);
  };

  if (!currentUser) {
    return (
      <section className="activity-page" aria-labelledby="activity-heading">
        <header className="activity-page__header">
          <span className="home-section-kicker">Your network</span>
          <h1 id="activity-heading">Activity</h1>
          <p>Follow conversations and stories from writers across Unsaid.</p>
        </header>
        <StatePanel className="activity-state" icon={LogIn} title="Sign in to view activity" description="Your personalized feed is available after you log in." action={<Link className="ui-button--primary" to="/login" state={{ from: "/feed" }}><LogIn size={17} aria-hidden="true" /> Log in</Link>} />
      </section>
    );
  }

  const activeFilter = filters.find((item) => item.value === filter)?.label || "activity";
  const hasMore = page < totalPages;

  return (
    <section className="activity-page" aria-labelledby="activity-heading">
      <header className="activity-page__header">
        <span className="home-section-kicker">Your network</span>
        <h1 id="activity-heading">Activity</h1>
        <p>Recent posts and interactions from writers you follow, plus activity involving you.</p>
      </header>

      <div className="activity-filters" role="group" aria-label="Filter activity">
        {filters.map(({ label, value }) => (
          <button className={`activity-filter${filter === value ? " is-active" : ""}`} type="button" aria-pressed={filter === value} onClick={() => selectFilter(value)} key={value}>{label}</button>
        ))}
      </div>

      <div className="activity-page__content" aria-live="polite" aria-busy={status === "loading" || loadMoreStatus === "loading"}>
        {status === "loading" && <ActivitySkeleton />}

        {status === "error" && (
          <StatePanel className="activity-state" tone="error" role="alert" icon={Activity} title="Activity couldn’t be loaded" description="Check your connection and try again." action={<button className="ui-button--primary" type="button" onClick={retry}><RotateCcw size={17} aria-hidden="true" /> Retry</button>} />
        )}

        {status === "success" && activities.length === 0 && (
          <StatePanel className="activity-state" icon={Users} title={filter === "all" ? "No activity yet" : `No ${activeFilter.toLocaleLowerCase()} yet`} description={filter === "all" ? "Follow writers and join conversations to build your activity feed." : "Try another filter or check back after more activity."} action={filter !== "all" ? <button className="ui-button--secondary" type="button" onClick={() => selectFilter("all")}>View all activity</button> : null} />
        )}

        {activities.length > 0 && (
          <>
            <ol className="activity-list" aria-label="Recent activity">
              {activities.map((activity) => <ActivityItem activity={activity} key={activity.id} />)}
            </ol>

            {loadMoreStatus === "error" && (
              <div className="activity-load-state" role="alert">
                <span>More activity couldn’t be loaded.</span>
                <button className="ui-button--secondary" type="button" onClick={retry}><RotateCcw size={16} aria-hidden="true" /> Try again</button>
              </div>
            )}

            {hasMore && loadMoreStatus !== "error" && (
              <div className="activity-load-state">
                <LoadingButton className="ui-button--secondary" onClick={loadMore} loading={loadMoreStatus === "loading"} loadingLabel="Loading…">Load more</LoadingButton>
              </div>
            )}

            {!hasMore && loadMoreStatus === "idle" && <p className="activity-feed-end"><CircleCheck size={17} aria-hidden="true" /> You’re all caught up.</p>}
          </>
        )}
      </div>
    </section>
  );
}

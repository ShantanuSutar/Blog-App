import { AlertCircle, Inbox, RotateCcw } from "lucide-react";
import Skeleton from "../ui/Skeleton.jsx";
import StatePanel from "../ui/StatePanel.jsx";
import LoadingButton from "../ui/LoadingButton.jsx";

export function CollectionSkeleton({ count = 3 }) {
  return (
    <div className="collection-skeleton-list" role="status" aria-label="Loading content">
      {Array.from({ length: count }, (_, index) => (
        <div className="collection-skeleton" aria-hidden="true" key={index}>
          <Skeleton className="collection-skeleton__image" />
          <span className="collection-skeleton__content">
            <Skeleton className="collection-skeleton__line collection-skeleton__line--short" />
            <Skeleton className="collection-skeleton__line collection-skeleton__line--title" />
            <Skeleton className="collection-skeleton__line" />
            <Skeleton className="collection-skeleton__line collection-skeleton__line--medium" />
          </span>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function CollectionLoadMore({ loading, onClick, label = "Load more" }) {
  return (
    <div className="collection-load-more">
      <LoadingButton
        className="ui-button--secondary"
        type="button"
        loading={loading}
        loadingLabel="Loading more…"
        onClick={onClick}
      >
        {label}
      </LoadingButton>
    </div>
  );
}

export default function CollectionPage({
  title,
  description,
  count,
  countLabel,
  status,
  errorMessage,
  emptyTitle,
  emptyDescription,
  emptyIcon: EmptyIcon = Inbox,
  emptyAction,
  onRetry,
  children,
}) {
  const headingId = `collection-${title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const showCount = status === "success" && Number.isInteger(count);

  return (
    <section className="collection-page" aria-labelledby={headingId}>
      <header className="collection-page__header">
        <div>
          <span className="home-section-kicker">Your library</span>
          <h1 id={headingId}>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {showCount && <span className="collection-page__count">{count} {countLabel}</span>}
      </header>

      <div className="collection-page__body" aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" && <CollectionSkeleton />}
        {status === "error" && (
          <StatePanel className="collection-state" tone="error" role="alert" icon={AlertCircle} title="We couldn’t load this page" description={errorMessage} action={onRetry ? <button className="ui-button--secondary" type="button" onClick={onRetry}><RotateCcw size={17} aria-hidden="true" /> Try again</button> : null} />
        )}
        {status === "empty" && (
          <StatePanel className="collection-state" icon={EmptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
        )}
        {status === "success" && children}
      </div>
    </section>
  );
}

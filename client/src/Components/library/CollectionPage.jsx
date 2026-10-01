import { AlertCircle, Inbox, RotateCcw, X } from "lucide-react";

export function CollectionFeedback({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="collection-feedback" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <span>{message}</span>
      <button className="ui-button--icon" type="button" onClick={onDismiss} aria-label="Dismiss message"><X size={17} aria-hidden="true" /></button>
    </div>
  );
}

export function CollectionSkeleton({ count = 3 }) {
  return (
    <div className="collection-skeleton-list" role="status" aria-label="Loading content">
      {Array.from({ length: count }, (_, index) => (
        <div className="collection-skeleton" aria-hidden="true" key={index}>
          <span className="collection-skeleton__image" />
          <span className="collection-skeleton__content">
            <span className="collection-skeleton__line collection-skeleton__line--short" />
            <span className="collection-skeleton__line collection-skeleton__line--title" />
            <span className="collection-skeleton__line" />
            <span className="collection-skeleton__line collection-skeleton__line--medium" />
          </span>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
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
          <div className="collection-state" role="alert">
            <AlertCircle size={28} strokeWidth={1.6} aria-hidden="true" />
            <h2>We couldn’t load this page</h2>
            <p>{errorMessage}</p>
            {onRetry && <button className="ui-button--secondary" type="button" onClick={onRetry}><RotateCcw size={17} aria-hidden="true" /> Try again</button>}
          </div>
        )}
        {status === "empty" && (
          <div className="collection-state">
            <EmptyIcon size={30} strokeWidth={1.5} aria-hidden="true" />
            <h2>{emptyTitle}</h2>
            <p>{emptyDescription}</p>
            {emptyAction}
          </div>
        )}
        {status === "success" && children}
      </div>
    </section>
  );
}

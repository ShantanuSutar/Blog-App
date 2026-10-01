import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Clock3, Edit3, ImageOff, LoaderCircle, Send, Trash2 } from "lucide-react";
import { formatPostDate, getPostExcerpt, getPostTags, resolveMediaUrl } from "../home/postPresentation";

const categoryLabels = { art: "Art", scitech: "Sci-Tech", sports: "Sports", cinema: "Cinema", food: "Food", travel: "Travel" };

function formatScheduledDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date,
    display: new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date),
  };
}

function getRelativeSchedule(date) {
  const minutes = Math.round((date.getTime() - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function ManagedImage({ post, baseUrl }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveMediaUrl(post.img, baseUrl);

  return (
    <div className="managed-post__image" aria-hidden="true">
      {imageUrl && !failed
        ? <img src={imageUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        : <span><ImageOff size={23} strokeWidth={1.5} /><small>Unsaid</small></span>}
    </div>
  );
}

export default function ManagedPostCard({ post, type, baseUrl, busyAction, actionsDisabled = false, onPublish, onRequestDelete }) {
  const scheduled = type === "scheduled";
  const title = post.title?.trim() || (scheduled ? "Untitled scheduled post" : "Untitled draft");
  const excerpt = getPostExcerpt(post.desc, 180);
  const tags = getPostTags(post.tags).slice(0, 4);
  const createdDate = formatPostDate(post.date);
  const schedule = scheduled ? formatScheduledDate(post.scheduled_publish_date) : null;
  const busy = actionsDisabled || Boolean(busyAction);
  const publishing = busyAction === "publish";
  const deleting = busyAction === "delete";

  return (
    <article className="managed-post">
      <ManagedImage post={post} baseUrl={baseUrl} />
      <div className="managed-post__content">
        <div className="managed-post__eyebrow">
          <span className={`managed-post__status managed-post__status--${scheduled ? "scheduled" : "draft"}`}>{scheduled ? "Scheduled" : "Draft"}</span>
          {post.cat && <span>{categoryLabels[post.cat] || post.cat}</span>}
        </div>

        <h2><Link to={`/write?edit=${post.id}`}>{title}</Link></h2>
        {excerpt && <p className="managed-post__excerpt">{excerpt}</p>}

        {scheduled && schedule && (
          <div className="managed-post__schedule">
            <CalendarClock size={20} aria-hidden="true" />
            <div>
              <span>Publishes {getRelativeSchedule(schedule.date)}</span>
              <time dateTime={schedule.date.toISOString()}>{schedule.display}</time>
            </div>
          </div>
        )}

        {scheduled && !schedule && <p className="managed-post__date"><CalendarClock size={15} aria-hidden="true" /> Publication date unavailable</p>}

        {!scheduled && createdDate && (
          <p className="managed-post__date"><Clock3 size={15} aria-hidden="true" /> Created <time dateTime={new Date(post.date).toISOString()}>{createdDate}</time></p>
        )}

        {tags.length > 0 && (
          <div className="managed-post__tags" aria-label="Post tags">
            {tags.map((tag) => <span className="ui-tag" key={tag} title={`#${tag}`}>#{tag}</span>)}
          </div>
        )}

        <div className="managed-post__actions">
          <Link className="ui-button--secondary" to={`/write?edit=${post.id}`}><Edit3 size={17} aria-hidden="true" /> Edit</Link>
          <button className="ui-button--primary" type="button" onClick={() => onPublish(post.id)} disabled={busy} aria-busy={publishing}>
            {publishing ? <LoaderCircle className="interaction-spinner" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
            {publishing ? "Publishing…" : scheduled ? "Publish now" : "Publish"}
          </button>
          <button className="ui-button--ghost managed-post__delete" type="button" onClick={() => onRequestDelete(post)} disabled={busy} aria-busy={deleting}>
            {deleting ? <LoaderCircle className="interaction-spinner" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
            {scheduled ? "Cancel & delete" : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}

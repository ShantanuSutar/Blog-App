export default function HomeSkeleton({ featured = false, count = 3 }) {
  return (
    <div className={featured ? "home-featured-grid" : "home-feed-list"} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className={`story-skeleton ${featured ? "story-skeleton--featured" : ""}`} key={index}>
          <span className="story-skeleton__image" />
          <div className="story-skeleton__body">
            <span className="story-skeleton__line story-skeleton__line--short" />
            <span className="story-skeleton__line story-skeleton__line--title" />
            <span className="story-skeleton__line" />
            <span className="story-skeleton__line story-skeleton__line--medium" />
          </div>
        </div>
      ))}
    </div>
  );
}

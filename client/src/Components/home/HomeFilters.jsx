import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

const categories = [
  { label: "All", value: "" },
  { label: "Art", value: "art" },
  { label: "Sci-Tech", value: "scitech" },
  { label: "Sports", value: "sports" },
  { label: "Cinema", value: "cinema" },
  { label: "Food", value: "food" },
  { label: "Travel", value: "travel" },
];

export default function HomeFilters({ activeCategory, activeTag, searchQuery, tags, onSearch, onCategory, onTag, onClear }) {
  const [query, setQuery] = useState(searchQuery);
  const [tagQuery, setTagQuery] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const tagRef = useRef(null);
  const triggerRef = useRef(null);
  const tagListId = useId();
  const hasFilters = Boolean(activeCategory || activeTag || searchQuery);
  const visibleTags = tags.filter((tag) => tag.toLocaleLowerCase().includes(tagQuery.trim().toLocaleLowerCase()));

  useEffect(() => setQuery(searchQuery), [searchQuery]);
  useEffect(() => setTagOpen(false), [activeCategory, activeTag, searchQuery]);

  useEffect(() => {
    if (!tagOpen) return;
    const closeOutside = (event) => {
      if (!tagRef.current?.contains(event.target)) setTagOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") {
        setTagOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [tagOpen]);

  return (
    <section className="home-filters" aria-labelledby="explore-stories-heading">
      <div className="home-filters__heading">
        <div>
          <span className="home-section-kicker">Explore</span>
          <h2 id="explore-stories-heading">Find your next story</h2>
        </div>
        {hasFilters && <button className="ui-button--ghost home-filters__clear" type="button" onClick={onClear}><X size={16} aria-hidden="true" /> Clear filters</button>}
      </div>
      <div className="home-filters__controls">
        <form className="home-filters__search" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(query.trim()); }}>
          <label className="sr-only" htmlFor="home-search">Search stories</label>
          <Search size={18} aria-hidden="true" />
          <input id="home-search" className="ui-input" type="search" placeholder="Search stories" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="ui-button--primary" type="submit">Search</button>
        </form>
        <div className="home-filters__tag-control" ref={tagRef}>
          <button
            ref={triggerRef}
            className={`ui-button--secondary home-filters__tag-trigger ${activeTag ? "is-active" : ""}`}
            type="button"
            aria-expanded={tagOpen}
            aria-controls={tagListId}
            onClick={() => setTagOpen((open) => !open)}
          >
            <span>{activeTag ? `#${activeTag}` : "Browse tags"}</span><ChevronDown size={16} aria-hidden="true" />
          </button>
          {tagOpen && (
            <div className="home-filters__tag-menu" id={tagListId}>
              <label className="sr-only" htmlFor="home-tag-search">Search tags</label>
              <input id="home-tag-search" className="ui-input" type="search" placeholder="Search tags" value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} autoFocus />
              <div className="home-filters__tag-list">
                {visibleTags.length ? visibleTags.map((tag) => (
                  <button key={tag} type="button" className="home-filters__tag-option" aria-current={tag === activeTag ? "true" : undefined} onClick={() => { onTag(tag); setTagOpen(false); setTagQuery(""); }}>#{tag}</button>
                )) : <p className="home-filters__no-tags">No matching tags</p>}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="home-filters__categories" role="group" aria-label="Filter by category">
        {categories.map(({ label, value }) => (
          <button key={label} className={`home-filters__category ${!activeTag && activeCategory === value ? "is-active" : ""}`} type="button" aria-pressed={!activeTag && activeCategory === value} onClick={() => onCategory(value)}>{label}</button>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import LoadingButton from "../ui/LoadingButton.jsx";

const categories = [
  { label: "All", value: "" },
  { label: "Art", value: "art" },
  { label: "Sci-Tech", value: "scitech" },
  { label: "Sports", value: "sports" },
  { label: "Cinema", value: "cinema" },
  { label: "Food", value: "food" },
  { label: "Travel", value: "travel" },
];

const categoryLabel = (value) => categories.find((category) => category.value === value)?.label || value;

export default function HomeFilters({
  activeCategory,
  activeTag,
  searchQuery,
  tags,
  tagsStatus = "success",
  isLoading = false,
  onSearch,
  onCategory,
  onTag,
  onClear,
}) {
  const [query, setQuery] = useState(searchQuery);
  const [tagQuery, setTagQuery] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const tagRef = useRef(null);
  const triggerRef = useRef(null);
  const searchId = useId();
  const tagSearchId = useId();
  const tagListId = useId();
  const hasFilters = Boolean(activeCategory || activeTag || searchQuery);
  const visibleTags = tags.filter((tag) => tag.toLocaleLowerCase().includes(tagQuery.trim().toLocaleLowerCase()));
  const searchInProgress = isLoading && Boolean(searchQuery) && query.trim() === searchQuery;

  useEffect(() => setQuery(searchQuery), [searchQuery]);
  useEffect(() => {
    setTagOpen(false);
    setTagQuery("");
  }, [activeCategory, activeTag, searchQuery]);

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

  const clearSearch = () => {
    setQuery("");
    if (searchQuery) onSearch("");
  };

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
        <form className="home-filters__search" role="search" aria-busy={searchInProgress} onSubmit={(event) => { event.preventDefault(); onSearch(query.trim()); }}>
          <label className="sr-only" htmlFor={searchId}>Search published stories</label>
          <Search size={18} aria-hidden="true" />
          <input
            id={searchId}
            className="ui-input"
            type="search"
            placeholder="Search titles and stories"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          {query && (
            <button className="home-filters__search-clear" type="button" onClick={clearSearch} aria-label="Clear search">
              <X size={17} aria-hidden="true" />
            </button>
          )}
          <LoadingButton className="ui-button--primary home-filters__search-submit" type="submit" loading={searchInProgress} loadingLabel="Searching…">Search</LoadingButton>
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
            <span title={activeTag ? `#${activeTag}` : undefined}>{activeTag ? `#${activeTag}` : "Browse tags"}</span><ChevronDown size={16} aria-hidden="true" />
          </button>
          {tagOpen && (
            <div className="home-filters__tag-menu" id={tagListId} role="region" aria-label="Browse story tags">
              <label className="sr-only" htmlFor={tagSearchId}>Search available tags</label>
              <div className="home-filters__tag-search">
                <Search size={16} aria-hidden="true" />
                <input id={tagSearchId} className="ui-input" type="search" placeholder="Find a tag" value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} autoComplete="off" autoFocus />
                {tagQuery && <button type="button" onClick={() => setTagQuery("")} aria-label="Clear tag search"><X size={16} aria-hidden="true" /></button>}
              </div>
              <div className="home-filters__tag-list">
                {activeTag && (
                  <button type="button" className="home-filters__tag-option home-filters__tag-option--clear" onClick={() => onTag("")}>
                    <span>All tags</span><X size={16} aria-hidden="true" />
                  </button>
                )}
                {tagsStatus === "loading" && tags.length === 0 && <p className="home-filters__no-tags" role="status">Loading tags…</p>}
                {tagsStatus === "error" && tags.length === 0 && <p className="home-filters__no-tags" role="alert">Tags couldn’t be loaded.</p>}
                {tagsStatus !== "loading" && visibleTags.length > 0 && visibleTags.map((tag) => (
                  <button key={tag} type="button" className="home-filters__tag-option" aria-pressed={tag === activeTag} onClick={() => { onTag(tag); setTagOpen(false); setTagQuery(""); }}>
                    <span title={`#${tag}`}>#{tag}</span>{tag === activeTag && <Check size={16} aria-hidden="true" />}
                  </button>
                ))}
                {tagsStatus !== "loading" && tags.length > 0 && visibleTags.length === 0 && <p className="home-filters__no-tags">No matching tags</p>}
                {tagsStatus === "success" && tags.length === 0 && <p className="home-filters__no-tags">No tags available yet</p>}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="home-filters__categories" role="group" aria-label="Filter by category">
        {categories.map(({ label, value }) => (
          <button key={label} className={`home-filters__category ${activeCategory === value ? "is-active" : ""}`} type="button" aria-pressed={activeCategory === value} onClick={() => onCategory(value)}>{label}</button>
        ))}
      </div>
      {hasFilters && (
        <div className="home-filters__active" aria-label="Active filters">
          <span className="home-filters__active-label">Active filters</span>
          {searchQuery && (
            <span className="home-filters__chip">
              <span>Search: “{searchQuery}”</span>
              <button type="button" onClick={() => onSearch("")} aria-label={`Remove search filter ${searchQuery}`}><X size={14} aria-hidden="true" /></button>
            </span>
          )}
          {activeCategory && (
            <span className="home-filters__chip">
              <span>{categoryLabel(activeCategory)}</span>
              <button type="button" onClick={() => onCategory("")} aria-label={`Remove ${categoryLabel(activeCategory)} category filter`}><X size={14} aria-hidden="true" /></button>
            </span>
          )}
          {activeTag && (
            <span className="home-filters__chip">
              <span title={`#${activeTag}`}>#{activeTag}</span>
              <button type="button" onClick={() => onTag("")} aria-label={`Remove tag filter ${activeTag}`}><X size={14} aria-hidden="true" /></button>
            </span>
          )}
        </div>
      )}
    </section>
  );
}

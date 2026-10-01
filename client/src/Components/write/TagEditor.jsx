import { Plus, Tag, X } from "lucide-react";

export default function TagEditor({ tags, input, error, onInputChange, onAdd, onRemove }) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      onAdd();
    }
  };

  return (
    <section className="write-panel" aria-labelledby="tags-heading">
      <div className="write-panel__heading">
        <div>
          <span className="write-panel__eyebrow">Discoverability</span>
          <h2 id="tags-heading">Tags</h2>
        </div>
        <Tag size={19} aria-hidden="true" />
      </div>

      {tags.length > 0 && (
        <div className="write-tags" aria-label="Added tags">
          {tags.map((tag) => (
            <span className="write-tag" key={tag}>
              #{tag}
              <button type="button" onClick={() => onRemove(tag)} aria-label={`Remove tag ${tag}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="write-tag-input">
        <label className="sr-only" htmlFor="post-tag">Add a tag</label>
        <input
          id="post-tag"
          type="text"
          value={input}
          maxLength={24}
          placeholder="Add a tag"
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-describedby="tag-help"
        />
        <button className="ui-button--secondary" type="button" onClick={onAdd} disabled={!input.trim() || tags.length >= 8}>
          <Plus size={17} aria-hidden="true" /> Add
        </button>
      </div>
      <p className="write-field-help" id="tag-help">Press Enter or comma to add up to 8 tags.</p>
      {error && <p className="write-field-error" role="alert">{error}</p>}
    </section>
  );
}

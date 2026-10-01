import { Image, RefreshCw, Trash2, UploadCloud } from "lucide-react";

export default function CoverImageField({
  inputRef,
  previewUrl,
  fileName,
  error,
  dragging,
  uploading,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onRemove,
}) {
  return (
    <section className="write-panel write-cover-panel" aria-labelledby="cover-heading">
      <div className="write-panel__heading">
        <div>
          <span className="write-panel__eyebrow">Presentation</span>
          <h2 id="cover-heading">Cover image</h2>
        </div>
        <Image size={19} aria-hidden="true" />
      </div>

      <input
        ref={inputRef}
        className="sr-only"
        id="cover-image"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => onFileChange(event.target.files?.[0])}
      />

      {previewUrl ? (
        <div className="write-cover-preview">
          <img src={previewUrl} alt="Current article cover preview" />
          {uploading && <div className="write-cover-preview__loading" role="status"><span className="ui-spinner" /> Uploading cover…</div>}
          <div className="write-cover-preview__actions">
            <label className="ui-button--secondary" htmlFor="cover-image">
              <RefreshCw size={17} aria-hidden="true" /> Replace
            </label>
            <button className="ui-button--ghost write-cover-remove" type="button" onClick={onRemove}>
              <Trash2 size={17} aria-hidden="true" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          className={`write-cover-dropzone ${dragging ? "is-dragging" : ""}`}
          htmlFor="cover-image"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <UploadCloud size={26} aria-hidden="true" />
          <strong>Select a cover image</strong>
          <span>or drop a JPG, PNG, WebP, or GIF here</span>
          <small>Maximum file size: 8 MB</small>
        </label>
      )}

      {fileName && previewUrl && <p className="write-cover-filename">Selected: {fileName}</p>}
      {error && <p className="write-field-error" role="alert">{error}</p>}
    </section>
  );
}

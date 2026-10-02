import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  CalendarClock,
  ChevronRight,
  FileText,
  LoaderCircle,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import {
  Link,
  unstable_useBlocker as useBlocker,
  useBeforeUnload,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api from "../api/axios.js";
import { AuthContext } from "../AuthContext/authContext.jsx";
import CoverImageField from "../Components/write/CoverImageField.jsx";
import TagEditor from "../Components/write/TagEditor.jsx";
import LoadingButton from "../Components/ui/LoadingButton.jsx";
import { useToast } from "../Context/ToastContext.jsx";
import useModalAccessibility from "../hooks/useModalAccessibility.js";

const cloudName = import.meta.env.VITE_CLOUD_NAME;
const cloudUploadPreset = import.meta.env.VITE_CLOUD_UPLOAD_PRESET;
const titleLimit = 140;
const imageSizeLimit = 8 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const categories = [
  ["art", "Art"],
  ["scitech", "Sci-Tech"],
  ["sports", "Sports"],
  ["cinema", "Cinema"],
  ["food", "Food"],
  ["travel", "Travel"],
];

const quillModules = {
  toolbar: [
    [{ header: [2, 3, 4, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
  clipboard: { matchVisual: false },
};

const quillFormats = ["header", "bold", "italic", "underline", "strike", "list", "bullet", "blockquote", "code-block", "link"];

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    const normalized = value.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim());
    return normalized.filter((tag, index) => normalized.findIndex((candidate) => candidate.toLowerCase() === tag.toLowerCase()) === index);
  }
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeTags(parsed) : [];
  } catch {
    return [];
  }
};

const normalizeCategory = (value) => ["tech", "technology", "science"].includes(value) ? "scitech" : value || "";

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const getMinimumSchedule = () => {
  const date = new Date(Date.now() + 60_000);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const getPlainText = (html) => {
  if (!html) return "";
  return new DOMParser().parseFromString(html, "text/html").body.textContent?.replace(/\s+/g, " ").trim() || "";
};

const snapshot = ({ title, value, category, scheduledDate, tags, featured, existingImage, coverRemoved, file }) => JSON.stringify({
  title,
  value,
  category,
  scheduledDate,
  tags,
  featured,
  existingImage,
  coverRemoved,
  file: file ? `${file.name}:${file.size}:${file.lastModified}` : "",
});

const getErrorMessage = (error, fallback) => {
  if (error?.message === "Image upload is not configured.") return "Cover image upload is not configured. Remove the cover and try again.";
  if (error?.message === "Cover image upload failed.") return "The cover image couldn’t be uploaded. Try another image or save without it.";
  if (error?.response?.status === 401) return "Your session has expired. Log in again before saving.";
  if (error?.response?.status === 403) return "You don’t have permission to change this article.";
  if (error?.response?.status === 404) return "This article could not be found.";
  if (error?.response?.status === 413) return "The cover image is too large. Choose a smaller image.";
  if (error?.response?.status === 429) return "Too many requests were made. Wait a moment and try again.";
  return fallback;
};

function LeaveDialog({ blocker, onLeave }) {
  const stayButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const open = blocker.state === "blocked";
  useModalAccessibility({ open, containerRef: dialogRef, initialFocusRef: stayButtonRef, onClose: () => blocker.reset() });

  if (!open) return null;
  return (
    <div className="write-dialog-backdrop" role="presentation">
      <div ref={dialogRef} className="write-dialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-description" tabIndex={-1}>
        <h2 id="leave-title">Leave this draft?</h2>
        <p id="leave-description">Your unsaved changes will be lost.</p>
        <div className="write-dialog__actions">
          <button ref={stayButtonRef} className="ui-button--secondary" type="button" onClick={() => blocker.reset()}>Keep writing</button>
          <button className="ui-button--danger" type="button" onClick={onLeave}>Leave page</button>
        </div>
      </div>
    </div>
  );
}

export default function Write() {
  const location = useLocation();
  const routePost = location.state;
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const quillRef = useRef(null);
  const navigationAllowedRef = useRef(false);
  const toast = useToast();

  const routeTags = normalizeTags(routePost?.tags);
  const [title, setTitle] = useState(routePost?.title || "");
  const [value, setValue] = useState(routePost?.desc || "");
  const [category, setCategory] = useState(normalizeCategory(routePost?.cat));
  const [scheduledDate, setScheduledDate] = useState(toDateTimeLocalValue(routePost?.scheduled_publish_date));
  const [tags, setTags] = useState(routeTags);
  const [tagInput, setTagInput] = useState("");
  const [featured, setFeatured] = useState(Boolean(routePost?.featured));
  const [existingImage, setExistingImage] = useState(routePost?.img || "");
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(routePost?.img || "");
  const [dragging, setDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [submitAction, setSubmitAction] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editStatus, setEditStatus] = useState(editId ? "loading" : "ready");
  const [originalStatus, setOriginalStatus] = useState(routePost?.draft ? (routePost?.scheduled_publish_date ? "scheduled" : "draft") : "published");

  const initialSnapshotRef = useRef(snapshot({
    title: routePost?.title || "",
    value: routePost?.desc || "",
    category: normalizeCategory(routePost?.cat),
    scheduledDate: toDateTimeLocalValue(routePost?.scheduled_publish_date),
    tags: routeTags,
    featured: Boolean(routePost?.featured),
    existingImage: routePost?.img || "",
    coverRemoved: false,
    file: null,
  }));

  const currentSnapshot = snapshot({ title, value, category, scheduledDate, tags, featured, existingImage, coverRemoved, file });
  const isDirty = editStatus === "ready" && currentSnapshot !== initialSnapshotRef.current;
  const blocker = useBlocker(isDirty && !navigationAllowedRef.current && !submitAction);

  useBeforeUnload(useCallback((event) => {
    if (!isDirty || navigationAllowedRef.current) return;
    event.preventDefault();
    event.returnValue = "";
  }, [isDirty]));

  useEffect(() => {
    if (!editId || !currentUser) return undefined;
    const controller = new AbortController();
    setEditStatus("loading");
    setFeedback(null);

    api.get(`/api/posts/${editId}/edit`, { signal: controller.signal })
      .then(({ data: post }) => {
        const loadedTags = normalizeTags(post.tags);
        const loadedSchedule = toDateTimeLocalValue(post.scheduled_publish_date);
        const loadedFeatured = Boolean(post.featured);
        setTitle(post.title || "");
        setValue(post.desc || "");
        const loadedCategory = normalizeCategory(post.cat);
        setCategory(loadedCategory);
        setScheduledDate(loadedSchedule);
        setTags(loadedTags);
        setFeatured(loadedFeatured);
        setExistingImage(post.img || "");
        setPreviewUrl(post.img || "");
        setCoverRemoved(false);
        setFile(null);
        setOriginalStatus(post.draft ? (post.scheduled_publish_date ? "scheduled" : "draft") : "published");
        initialSnapshotRef.current = snapshot({
          title: post.title || "",
          value: post.desc || "",
          category: loadedCategory,
          scheduledDate: loadedSchedule,
          tags: loadedTags,
          featured: loadedFeatured,
          existingImage: post.img || "",
          coverRemoved: false,
          file: null,
        });
        setEditStatus("ready");
      })
      .catch((error) => {
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return;
        setEditStatus("error");
        setFeedback({ type: "error", message: getErrorMessage(error, "This article could not be loaded for editing.") });
      });

    return () => controller.abort();
  }, [editId, currentUser]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(coverRemoved ? "" : existingImage);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, existingImage, coverRemoved]);

  useEffect(() => {
    const input = titleInputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    const editor = quillRef.current?.getEditor?.().root;
    if (!editor) return;
    editor.id = "post-content";
    editor.setAttribute("aria-label", "Story content");
    editor.setAttribute("aria-describedby", fieldErrors.content ? "editor-help content-error" : "editor-help");
    editor.setAttribute("aria-invalid", String(Boolean(fieldErrors.content)));
  }, [editStatus, fieldErrors.content]);

  useEffect(() => {
    const toolbar = document.querySelector(".write-editor .ql-toolbar");
    if (!toolbar) return undefined;

    toolbar.setAttribute("aria-label", "Story formatting toolbar");
    const labels = [
      [".ql-bold", "Bold"],
      [".ql-italic", "Italic"],
      [".ql-underline", "Underline"],
      [".ql-strike", "Strikethrough"],
      ['.ql-list[value="ordered"]', "Numbered list"],
      ['.ql-list[value="bullet"]', "Bulleted list"],
      [".ql-blockquote", "Block quote"],
      [".ql-code-block", "Code block"],
      [".ql-link", "Insert link"],
      [".ql-clean", "Clear formatting"],
    ];
    const toggleSelectors = new Set(labels.slice(0, 8).map(([selector]) => selector));
    const buttons = labels.flatMap(([selector, label]) => [...toolbar.querySelectorAll(selector)].map((button) => ({ button, label, selector })));
    const syncButtons = () => buttons.forEach(({ button, label, selector }) => {
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      if (toggleSelectors.has(selector)) button.setAttribute("aria-pressed", String(button.classList.contains("ql-active")));
    });
    syncButtons();

    const pickerLabel = toolbar.querySelector(".ql-picker-label");
    pickerLabel?.setAttribute("aria-label", "Text style");
    pickerLabel?.setAttribute("title", "Text style");

    const observer = new MutationObserver(syncButtons);
    buttons.forEach(({ button }) => observer.observe(button, { attributes: true, attributeFilter: ["class"] }));
    return () => observer.disconnect();
  }, [editStatus]);

  const articleText = useMemo(() => getPlainText(value), [value]);
  const wordCount = articleText ? articleText.split(/\s+/).length : 0;
  const minimumSchedule = getMinimumSchedule();
  const scheduleIsFuture = scheduledDate && new Date(scheduledDate).getTime() > Date.now();

  const selectCover = (selectedFile) => {
    setDragging(false);
    setFieldErrors((errors) => ({ ...errors, cover: "" }));
    if (!selectedFile) return;
    if (!allowedImageTypes.has(selectedFile.type)) {
      setFieldErrors((errors) => ({ ...errors, cover: "Choose a JPG, PNG, WebP, or GIF image." }));
      return;
    }
    if (selectedFile.size > imageSizeLimit) {
      setFieldErrors((errors) => ({ ...errors, cover: "Cover images must be 8 MB or smaller." }));
      return;
    }
    setFile(selectedFile);
    setCoverRemoved(false);
  };

  const removeCover = () => {
    setFile(null);
    setCoverRemoved(true);
    setFieldErrors((errors) => ({ ...errors, cover: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addTag = () => {
    const nextTag = tagInput.trim().replace(/^#/, "").replace(/\s+/g, "-");
    if (!nextTag) return;
    if (tags.length >= 8) {
      setFieldErrors((errors) => ({ ...errors, tags: "You can add up to 8 tags." }));
      return;
    }
    if (tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setFieldErrors((errors) => ({ ...errors, tags: "That tag has already been added." }));
      return;
    }
    setTags((current) => [...current, nextTag]);
    setTagInput("");
    setFieldErrors((errors) => ({ ...errors, tags: "" }));
  };

  const removeTag = (tagToRemove) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
    setFieldErrors((errors) => ({ ...errors, tags: "" }));
  };

  const uploadCover = async () => {
    if (!file) return coverRemoved ? "" : existingImage;
    if (!cloudName || !cloudUploadPreset) throw new Error("Image upload is not configured.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", cloudUploadPreset);
    formData.append("cloud_name", cloudName);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok || (!data.secure_url && !data.url)) throw new Error(data.error?.message || "Cover image upload failed.");
    return data.secure_url || data.url;
  };

  const validate = (action) => {
    const errors = {};
    if (!title.trim()) errors.title = "Add a title before saving.";
    if (action !== "draft" && !articleText) errors.content = "Write some article content before publishing.";
    if (action !== "draft" && !category) errors.category = "Choose a category before publishing.";
    if (action === "schedule") {
      if (!scheduledDate) errors.schedule = "Choose a publication date and time.";
      else if (!scheduleIsFuture) errors.schedule = "Scheduled publication must be in the future.";
    }
    setFieldErrors((current) => ({
      ...current,
      title: errors.title || "",
      content: errors.content || "",
      category: errors.category || "",
      schedule: errors.schedule || "",
    }));
    if (Object.keys(errors).length > 0) {
      const target = errors.title
        ? titleInputRef.current
        : errors.content
          ? quillRef.current?.getEditor?.().root
          : errors.category
            ? document.querySelector('input[name="category"]')
            : document.getElementById("schedule-date");
      window.requestAnimationFrame(() => target?.focus());
      return false;
    }
    return true;
  };

  const submit = async (action) => {
    if (submitAction || editStatus !== "ready" || !validate(action)) return;
    setSubmitAction(action);
    setFeedback({ type: "progress", message: file ? "Uploading cover image…" : action === "draft" ? "Saving draft…" : action === "schedule" ? "Scheduling article…" : editId ? "Updating article…" : "Publishing article…" });

    try {
      setUploading(Boolean(file));
      const imageUrl = await uploadCover();
      setUploading(false);
      setFeedback({ type: "progress", message: action === "draft" ? "Saving draft…" : action === "schedule" ? "Scheduling article…" : editId ? "Updating article…" : "Publishing article…" });
      const payload = {
        title: title.trim(),
        desc: value,
        cat: category,
        img: imageUrl,
        draft: action === "draft",
        scheduled_publish_date: action === "schedule" ? new Date(scheduledDate).toISOString() : null,
        tags,
        featured,
      };

      const response = editId
        ? await api.put(`/api/posts/${editId}`, payload)
        : await api.post("/api/posts/", { ...payload, date: new Date().toISOString() });

      const savedId = editId || response.data?.id;
      navigationAllowedRef.current = true;
      initialSnapshotRef.current = currentSnapshot;
      toast.success(action === "draft" ? "Draft saved." : action === "schedule" ? "Article scheduled." : editId ? "Article updated." : "Article published.");
      if (action === "draft") navigate("/drafts", { replace: true });
      else if (action === "schedule") navigate("/scheduled", { replace: true });
      else navigate(savedId ? `/post/${savedId}` : "/", { replace: true });
    } catch (error) {
      setUploading(false);
      setFeedback({ type: "error", message: getErrorMessage(error, "Your article could not be saved. Please try again.") });
      setSubmitAction(null);
    }
  };

  const leavePage = () => {
    navigationAllowedRef.current = true;
    if (blocker.state === "blocked") blocker.proceed();
  };

  if (!currentUser) {
    return (
      <section className="write-access-state" aria-labelledby="write-access-title">
        <FileText size={34} aria-hidden="true" />
        <h1 id="write-access-title">Sign in to start writing</h1>
        <p>Your drafts and publishing tools are available after you log in.</p>
        <Link className="ui-button--primary" to="/login">Log in</Link>
      </section>
    );
  }

  if (editStatus === "loading") {
    return <div className="write-loading" role="status"><LoaderCircle className="write-spinner" size={24} aria-hidden="true" /> Loading your article…</div>;
  }

  if (editStatus === "error") {
    return (
      <section className="write-access-state" aria-labelledby="write-error-title">
        <FileText size={34} aria-hidden="true" />
        <h1 id="write-error-title">This article can’t be edited</h1>
        <p>{feedback?.message}</p>
        <Link className="ui-button--secondary" to="/">Return home</Link>
      </section>
    );
  }

  const primaryLabel = editId ? (originalStatus === "published" ? "Update post" : "Publish now") : "Publish";
  const draftLabel = editId && originalStatus === "published" ? "Move to drafts" : "Save draft";

  return (
    <div className="write-workspace">
      <header className="write-workspace__header">
        <div>
          <span className="write-workspace__eyebrow">{editId ? "Editing story" : "New story"}</span>
          <h1>{editId ? "Refine your story" : "Tell a story worth reading"}</h1>
        </div>
        <div className="write-workspace__status" aria-live="polite">
          <span className={`write-dirty-indicator ${isDirty ? "is-dirty" : ""}`} aria-hidden="true" />
          {isDirty ? "Unsaved changes" : editId ? "All changes saved" : "Ready to write"}
        </div>
      </header>

      {feedback && (
        <div className={`write-feedback write-feedback--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
          {feedback.type === "progress" ? <LoaderCircle className="write-spinner" size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
          <span>{feedback.message}</span>
          {feedback.type === "error" && <button type="button" aria-label="Dismiss message" onClick={() => setFeedback(null)}>×</button>}
        </div>
      )}

      <div className="write-workspace__grid">
        <section className="write-canvas" aria-label="Story editor">
          <div className={`write-title-field ${fieldErrors.title ? "has-error" : ""}`}>
            <label className="sr-only" htmlFor="post-title">Article title</label>
            <textarea
              ref={titleInputRef}
              id="post-title"
              rows="2"
              maxLength={titleLimit}
              value={title}
              placeholder="Your story starts with a title…"
              onChange={(event) => {
                setTitle(event.target.value.replace(/\n/g, ""));
                setFieldErrors((errors) => ({ ...errors, title: "" }));
              }}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "title-count title-error" : "title-count"}
              required
            />
            <div className="write-title-field__meta">
              <span className="write-field-error" id="title-error" role="alert">{fieldErrors.title}</span>
              <span id="title-count">{title.length}/{titleLimit}</span>
            </div>
          </div>

          <section className={`write-editor-shell ${fieldErrors.content ? "has-error" : ""}`} id="post-editor" aria-labelledby="editor-heading">
            <div className="write-editor-shell__heading">
              <h2 id="editor-heading">Story</h2>
              <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
            </div>
            <ReactQuill
              ref={quillRef}
              className="write-editor"
              theme="snow"
              value={value}
              onChange={(nextValue) => {
                setValue(nextValue);
                setFieldErrors((errors) => ({ ...errors, content: "" }));
              }}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Write your story…"
              preserveWhitespace
            />
            <p className="sr-only" id="editor-help">Article content is required to publish or schedule. Drafts may be incomplete.</p>
            {fieldErrors.content && <p className="write-field-error write-editor-error" id="content-error" role="alert">{fieldErrors.content}</p>}
          </section>
        </section>

        <aside className="write-settings" aria-label="Publishing settings">
          <CoverImageField
            inputRef={fileInputRef}
            previewUrl={previewUrl}
            fileName={file?.name}
            error={fieldErrors.cover}
            dragging={dragging}
            uploading={uploading}
            onFileChange={selectCover}
            onDrop={(event) => { event.preventDefault(); selectCover(event.dataTransfer.files?.[0]); }}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onRemove={removeCover}
          />

          <section className="write-panel" aria-labelledby="category-heading">
            <div className="write-panel__heading">
              <div>
                <span className="write-panel__eyebrow">Organization</span>
                <h2 id="category-heading">Category</h2>
              </div>
              <ChevronRight size={19} aria-hidden="true" />
            </div>
            <div className="write-categories" role="radiogroup" aria-labelledby="category-heading" aria-describedby={fieldErrors.category ? "category-error" : undefined}>
              {categories.map(([valueName, label]) => (
                <label className={category === valueName ? "is-selected" : ""} key={valueName}>
                  <input
                    type="radio"
                    name="category"
                    value={valueName}
                    checked={category === valueName}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      setFieldErrors((errors) => ({ ...errors, category: "" }));
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {fieldErrors.category && <p className="write-field-error" id="category-error" role="alert">{fieldErrors.category}</p>}
          </section>

          <TagEditor tags={tags} input={tagInput} error={fieldErrors.tags} onInputChange={setTagInput} onAdd={addTag} onRemove={removeTag} />

          <section className="write-panel" aria-labelledby="schedule-heading">
            <div className="write-panel__heading">
              <div>
                <span className="write-panel__eyebrow">Timing</span>
                <h2 id="schedule-heading">Schedule</h2>
              </div>
              <CalendarClock size={19} aria-hidden="true" />
            </div>
            <label className="write-control-label" htmlFor="schedule-date">Publication date and time</label>
            <div className="write-schedule-control">
              <input
                id="schedule-date"
                type="datetime-local"
                min={minimumSchedule}
                value={scheduledDate}
                onChange={(event) => {
                  setScheduledDate(event.target.value);
                  setFieldErrors((errors) => ({ ...errors, schedule: "" }));
                }}
                aria-invalid={Boolean(fieldErrors.schedule)}
                aria-describedby={fieldErrors.schedule ? "schedule-error" : scheduledDate ? "schedule-summary" : undefined}
              />
              {scheduledDate && <button className="ui-button--ghost" type="button" onClick={() => setScheduledDate("")}>Clear</button>}
            </div>
            {scheduledDate && (
              <p className={`write-schedule-summary ${scheduleIsFuture ? "" : "is-invalid"}`} id="schedule-summary">
                {scheduleIsFuture ? `Ready to publish ${new Date(scheduledDate).toLocaleString()}.` : "Choose a future date and time."}
              </p>
            )}
            {fieldErrors.schedule && <p className="write-field-error" id="schedule-error" role="alert">{fieldErrors.schedule}</p>}
          </section>

          <section className="write-panel write-feature-panel" aria-labelledby="featured-heading">
            <div>
              <span className="write-panel__eyebrow">Homepage</span>
              <h2 id="featured-heading">Featured story</h2>
              <p>Give this article additional prominence when it is published.</p>
            </div>
            <label className="write-switch">
              <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
              <span aria-hidden="true" />
              <span className="sr-only">Mark as featured</span>
            </label>
          </section>

          <section className="write-publish-panel" aria-labelledby="publish-heading">
            <div className="write-publish-panel__heading">
              <div>
                <span className="write-panel__eyebrow">Finish</span>
                <h2 id="publish-heading">Publish your story</h2>
              </div>
              <Sparkles size={19} aria-hidden="true" />
            </div>
            <LoadingButton className="ui-button--primary write-primary-action" onClick={() => submit("publish")} disabled={Boolean(submitAction)} loading={submitAction === "publish"} loadingLabel="Working…" icon={Send}>{primaryLabel}</LoadingButton>
            <div className="write-secondary-actions">
              <LoadingButton className="ui-button--secondary" onClick={() => submit("draft")} disabled={Boolean(submitAction)} loading={submitAction === "draft"} loadingLabel="Saving…" icon={Save}>{draftLabel}</LoadingButton>
              <LoadingButton className="ui-button--ghost" onClick={() => submit("schedule")} disabled={Boolean(submitAction)} loading={submitAction === "schedule"} loadingLabel="Scheduling…" icon={CalendarClock}>Schedule</LoadingButton>
            </div>
            <p className="write-publish-note">Drafts can be incomplete. Publishing and scheduling require a title, story, and category.</p>
          </section>
        </aside>
      </div>

      <LeaveDialog blocker={blocker} onLeave={leavePage} />
    </div>
  );
}

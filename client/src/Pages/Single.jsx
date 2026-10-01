import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BookOpen, ImageOff, LoaderCircle, MessageCircle, RotateCcw, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../AuthContext/authContext.jsx";
import ArticleActions from "../Components/article/ArticleActions.jsx";
import ArticleAuthor from "../Components/article/ArticleAuthor.jsx";
import Comment from "../Components/Comment.jsx";
import MentionInput from "../Components/MentionInput.jsx";
import Menu from "../Components/Menu.jsx";
import ProfileAvatar from "../Components/ProfileAvatar.jsx";
import { useThemeContext } from "../Context/theme.jsx";
import { formatPostDate, getPostTags, resolveMediaUrl } from "../Components/home/postPresentation";
import { calculateReadingTime } from "../utils/readingTime";

const baseUrl = import.meta.env.VITE_BASE_URL || "";

const categoryLabels = {
  art: "Art",
  science: "Science",
  technology: "Technology",
  cinema: "Cinema",
  design: "Design",
  food: "Food",
};

function ArticleCover({ image, title }) {
  const [failed, setFailed] = useState(false);
  const source = resolveMediaUrl(image, baseUrl);

  return (
    <figure className="article-cover">
      {source && !failed ? (
        <img
          src={source}
          alt={`Cover for ${title}`}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="article-cover__fallback" role="img" aria-label={`No cover image available for ${title}`}>
          <ImageOff size={28} aria-hidden="true" />
          <span>No cover image</span>
        </div>
      )}
    </figure>
  );
}

function InlineAuthor({ post }) {
  const [failed, setFailed] = useState(false);
  const avatar = resolveMediaUrl(post.userAvatar, baseUrl);
  const username = post.username || "Unknown author";

  return (
    <Link className="article-byline__author" to={`/profile/${encodeURIComponent(username)}`}>
      <span className="article-byline__avatar" aria-hidden="true">
        {avatar && !failed ? (
          <img src={avatar} alt="" onError={() => setFailed(true)} />
        ) : (
          username.charAt(0).toUpperCase()
        )}
      </span>
      <span>{username}</span>
    </Link>
  );
}

function ArticlePageSkeleton() {
  return (
    <div className="article-state article-state--loading" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading article</span>
      <div className="article-skeleton__line article-skeleton__line--label" />
      <div className="article-skeleton__line article-skeleton__line--title" />
      <div className="article-skeleton__line article-skeleton__line--title-short" />
      <div className="article-skeleton__line article-skeleton__line--meta" />
      <div className="article-skeleton__cover" />
    </div>
  );
}

export default function Single() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeContext();
  const { currentUser } = useContext(AuthContext);
  const [postState, setPostState] = useState({ status: "loading", post: null });
  const [postVersion, setPostVersion] = useState(0);
  const [author, setAuthor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsStatus, setCommentsStatus] = useState("loading");
  const [comment, setComment] = useState("");
  const [commentStatus, setCommentStatus] = useState("idle");
  const [commentError, setCommentError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadComments = useCallback(async (signal) => {
    setCommentsStatus("loading");
    try {
      const response = await axios.get(`${baseUrl}/api/comments/${postId}`, { signal });
      setComments(Array.isArray(response.data) ? response.data : []);
      setCommentsStatus("success");
    } catch (error) {
      if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED") {
        setComments([]);
        setCommentsStatus("error");
      }
    }
  }, [postId]);

  useEffect(() => {
    const controller = new AbortController();
    setPostState({ status: "loading", post: null });

    axios.get(`${baseUrl}/api/posts/${postId}`, { signal: controller.signal })
      .then((response) => setPostState({ status: "success", post: response.data }))
      .catch((error) => {
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return;
        setPostState({ status: error.response?.status === 404 ? "missing" : "error", post: null });
      });

    return () => controller.abort();
  }, [postId, postVersion]);

  useEffect(() => {
    const controller = new AbortController();
    loadComments(controller.signal);
    return () => controller.abort();
  }, [loadComments]);

  useEffect(() => {
    const username = postState.post?.username;
    if (!username) {
      setAuthor(null);
      return undefined;
    }

    const controller = new AbortController();
    api.get(`/api/users/${encodeURIComponent(username)}`, { signal: controller.signal })
      .then((response) => setAuthor(response.data))
      .catch((error) => {
        if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED") setAuthor(null);
      });
    return () => controller.abort();
  }, [postState.post?.username]);

  const post = postState.post;
  const articleHtml = useMemo(
    () => (post?.desc || "").replace(/<h1(\s|>)/gi, "<h2$1").replace(/<\/h1>/gi, "</h2>"),
    [post?.desc],
  );

  const handleAddComment = async (event) => {
    event.preventDefault();
    const value = comment.trim();
    if (!currentUser || !value || commentStatus === "loading") return;
    setCommentStatus("loading");
    setCommentError("");

    try {
      await api.post(`/api/comments/${postId}`, { comment: value });
      setComment("");
      await loadComments();
      setCommentStatus("success");
    } catch {
      setCommentStatus("error");
      setCommentError("Your comment could not be posted. Please try again.");
    }
  };

  const handleCommentChange = (value) => {
    setComment(value);
    if (commentError) setCommentError("");
    if (commentStatus === "success" || commentStatus === "error") setCommentStatus("idle");
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this article? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/posts/${postId}`);
      navigate("/");
    } catch {
      setDeleting(false);
    }
  };

  if (postState.status === "loading") return <ArticlePageSkeleton />;

  if (postState.status === "error" || postState.status === "missing") {
    const missing = postState.status === "missing";
    return (
      <section className="article-state" aria-labelledby="article-state-title">
        <BookOpen size={32} aria-hidden="true" />
        <h1 id="article-state-title">{missing ? "This story is unavailable" : "We couldn't load this story"}</h1>
        <p>{missing ? "It may have been removed or the link may be incorrect." : "Check your connection, then try again."}</p>
        {missing ? (
          <Link className="ui-button--primary" to="/">Browse stories</Link>
        ) : (
          <button className="ui-button--secondary" type="button" onClick={() => setPostVersion((version) => version + 1)}>
            <RotateCcw size={18} aria-hidden="true" /> Try again
          </button>
        )}
      </section>
    );
  }

  const tags = getPostTags(post);
  const date = formatPostDate(post.date);
  const readingTime = calculateReadingTime(post.desc);
  const category = post.cat && categoryLabels[post.cat] ? categoryLabels[post.cat] : post.cat;
  const isOwner = currentUser?.username === post.username;

  return (
    <div className="article-layout">
      <div className="article-main">
        <article className="article-page">
          <header className="article-header">
            {(category || tags.length > 0) && (
              <div className="article-taxonomy" aria-label="Article topics">
                {category && <Link className="article-category" to={`/?cat=${encodeURIComponent(post.cat)}`}>{category}</Link>}
                {tags.slice(0, 3).map((tag) => (
                  <Link key={tag} className="article-topic" to={`/tag/${encodeURIComponent(tag)}`}>#{tag}</Link>
                ))}
              </div>
            )}
            <h1>{post.title}</h1>
            {post.excerpt && <p className="article-deck">{post.excerpt}</p>}
            <div className="article-header__meta">
              <div className="article-byline">
                <InlineAuthor post={post} />
                {date && <><span className="article-byline__dot" aria-hidden="true" /> <time dateTime={post.date}>{date}</time></>}
                <span className="article-byline__dot" aria-hidden="true" />
                <span>{readingTime}</span>
              </div>
              <ArticleActions post={post} postId={postId} theme={theme} isOwner={isOwner} onDelete={handleDelete} deleting={deleting} />
            </div>
          </header>

          <ArticleCover image={post.img} title={post.title} />

          <div className="article-prose" dangerouslySetInnerHTML={{ __html: articleHtml }} />

          {tags.length > 0 && (
            <footer className="article-footer">
              <span>Topics</span>
              <div className="article-footer__tags">
                {tags.map((tag) => <Link key={tag} to={`/tag/${encodeURIComponent(tag)}`}>#{tag}</Link>)}
              </div>
            </footer>
          )}
        </article>

        <ArticleAuthor author={author} fallbackPost={post} baseUrl={baseUrl} currentUser={currentUser} />

        <section className="article-comments" aria-labelledby="comments-title">
          <header className="article-comments__header">
            <div>
              <span className="article-comments__eyebrow">Join the conversation</span>
              <h2 id="comments-title">Comments</h2>
            </div>
            {commentsStatus === "success" && (
              <span aria-label={`${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}>{comments.length}</span>
            )}
          </header>

          {currentUser ? (
            <form className="article-comment-form" onSubmit={handleAddComment}>
              <ProfileAvatar source={currentUser.avatar || currentUser.img} username={currentUser.username} className="profile-avatar--comment" />
              <div className="article-comment-form__content">
                <label htmlFor="article-comment">Add a thoughtful response</label>
                <MentionInput
                  id="article-comment"
                  name="comment"
                  value={comment}
                  onChange={handleCommentChange}
                  placeholder="Write a comment… Use @ to mention someone"
                  ariaLabel="Comment text"
                  ariaDescribedBy="article-comment-help article-comment-feedback"
                  disabled={commentStatus === "loading"}
                  maxLength={5000}
                />
                <div className="article-comment-form__footer">
                  <div className="article-comment-form__meta">
                    <span id="article-comment-help">Be constructive and keep the conversation welcoming.</span>
                    <span aria-label={`${comment.length} of 5000 characters`}>{comment.length}/5000</span>
                  </div>
                  <button className="ui-button--primary" type="submit" disabled={!comment.trim() || commentStatus === "loading"} aria-busy={commentStatus === "loading"}>
                    {commentStatus === "loading"
                      ? <><LoaderCircle className="interaction-spinner" size={18} aria-hidden="true" /> Posting…</>
                      : <><Send size={18} aria-hidden="true" /> Post comment</>}
                  </button>
                </div>
                <span id="article-comment-feedback" className={`article-comment-form__feedback${commentError ? " is-error" : ""}`} role={commentError ? "alert" : "status"} aria-live="polite">
                  {commentError || (commentStatus === "success" ? "Your comment has been posted." : "")}
                </span>
              </div>
            </form>
          ) : (
            <div className="article-comments__login">
              <MessageCircle size={22} aria-hidden="true" />
              <p><Link to="/login" state={{ from: `/post/${postId}` }}>Log in</Link> to add your perspective.</p>
            </div>
          )}

          {commentsStatus === "loading" && (
            <div className="comment-skeleton-list" role="status" aria-label="Loading comments" aria-busy="true">
              {[0, 1].map((item) => (
                <div className="comment-skeleton" key={item} aria-hidden="true">
                  <span className="comment-skeleton__avatar" />
                  <span className="comment-skeleton__lines"><span /><span /></span>
                </div>
              ))}
            </div>
          )}
          {commentsStatus === "error" && (
            <div className="article-comments__status article-comments__status--error" role="alert">
              <span>Comments couldn't be loaded.</span>
              <button className="ui-button--ghost" type="button" onClick={() => loadComments()}>Try again</button>
            </div>
          )}
          {commentsStatus === "success" && comments.length === 0 && (
            <div className="article-comments__empty">
              <MessageCircle size={24} aria-hidden="true" />
              <p><strong>No comments yet.</strong> Start the conversation with a thoughtful response.</p>
            </div>
          )}
          {commentsStatus === "success" && comments.length > 0 && (
            <div className="article-comments__list">
              {comments.map((item) => <Comment key={item.id} c={item} baseUrl={baseUrl} />)}
            </div>
          )}
        </section>
      </div>

      <aside className="article-sidebar" aria-label="More stories">
        <Menu cat={post.cat} />
      </aside>
    </div>
  );
}

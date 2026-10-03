import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, FileText, LogIn } from "lucide-react";
import { AuthContext } from "../AuthContext/authContext";
import api from "../api/axios";
import ConfirmDialog from "../Components/ConfirmDialog";
import CollectionPage, { CollectionLoadMore } from "../Components/library/CollectionPage";
import ManagedPostCard from "../Components/library/ManagedPostCard";
import { useToast } from "../Context/ToastContext.jsx";
import { decrementPaginationTotal, mergeUniqueById, readPaginatedList } from "../utils/pagination";

const baseUrl = import.meta.env.VITE_BASE_URL;

export default function Drafts() {
  const { currentUser } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState(currentUser ? "loading" : "empty");
  const [requestVersion, setRequestVersion] = useState(0);
  const [pendingAction, setPendingAction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const actionLockRef = useRef(false);
  const toast = useToast();

  const loadDrafts = useCallback(async (page, { append = false, signal } = {}) => {
    if (append) setLoadingMore(true);
    else setStatus("loading");
    try {
      const response = await api.get("/api/posts/drafts/user", {
        params: { page, limit: 20 },
        signal,
      });
      const { items, pagination: nextPagination } = readPaginatedList(response.data, "posts");
      setPosts((current) => append ? mergeUniqueById(current, items) : items);
      setPagination(nextPagination);
      setStatus("success");
    } catch (error) {
      if (error.code === "ERR_CANCELED") return;
      if (append) toast.error("More drafts couldn’t be loaded. Try again.");
      else setStatus("error");
    } finally {
      if (!signal?.aborted) setLoadingMore(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!currentUser) {
      setPosts([]);
      setPagination(null);
      setStatus("empty");
      return undefined;
    }

    const controller = new AbortController();
    setPosts([]);
    setPagination(null);
    loadDrafts(1, { signal: controller.signal });
    return () => controller.abort();
  }, [currentUser, loadDrafts, requestVersion]);

  const removeFromCollection = (postId) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    setPagination(decrementPaginationTotal);
  };

  const publishDraft = async (postId) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setPendingAction({ postId, type: "publish" });
    try {
      await api.put(`/api/posts/${postId}`, { draft: false });
      removeFromCollection(postId);
      toast.success("Draft published.");
    } catch {
      toast.error("The draft couldn’t be published. Your draft is still safe; please try again.");
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  };

  const deleteDraft = async () => {
    if (!deleteTarget || actionLockRef.current) return;
    actionLockRef.current = true;
    const postId = deleteTarget.id;
    setPendingAction({ postId, type: "delete" });
    try {
      await api.delete(`/api/posts/${postId}`);
      removeFromCollection(postId);
      setDeleteTarget(null);
      toast.success("Draft deleted.");
    } catch {
      toast.error("The draft couldn’t be deleted. Please try again.");
      setDeleteTarget(null);
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  };

  const pageStatus = status === "success" && posts.length === 0 ? "empty" : status;
  const activeActionFor = (postId) => pendingAction?.postId === postId ? pendingAction.type : "";
  const targetTitle = deleteTarget?.title?.trim() || "Untitled draft";

  return (
    <>
      <CollectionPage
        title="Drafts"
        description="Shape unfinished ideas before they meet the world."
        count={pagination?.total ?? posts.length}
        countLabel={(pagination?.total ?? posts.length) === 1 ? "draft" : "drafts"}
        status={pageStatus}
        errorMessage="Your drafts couldn’t be loaded. Check your connection and try again."
        emptyTitle={currentUser ? "No drafts yet" : "Sign in to manage your drafts"}
        emptyDescription={currentUser ? "Save an unfinished article and continue writing whenever you’re ready." : "Drafts and publishing tools are available from your Unsaid account."}
        emptyIcon={currentUser ? FileText : LogIn}
        emptyAction={currentUser
          ? <Link className="ui-button--primary" to="/write"><FilePlus2 size={17} aria-hidden="true" /> Start writing</Link>
          : <Link className="ui-button--primary" to="/login" state={{ from: "/drafts" }}><LogIn size={17} aria-hidden="true" /> Log in</Link>}
        onRetry={() => setRequestVersion((version) => version + 1)}
      >
        <div className="managed-post-list">
          {posts.map((post) => (
            <ManagedPostCard
              key={post.id}
              post={post}
              type="draft"
              baseUrl={baseUrl}
              busyAction={activeActionFor(post.id)}
              actionsDisabled={Boolean(pendingAction)}
              onPublish={publishDraft}
              onRequestDelete={setDeleteTarget}
            />
          ))}
          {pagination?.hasNext && (
            <CollectionLoadMore
              loading={loadingMore}
              label="Load more drafts"
              onClick={() => loadDrafts(pagination.page + 1, { append: true })}
            />
          )}
        </div>
      </CollectionPage>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete “${targetTitle}”?`}
        description="This permanently deletes the draft and cannot be undone."
        confirmLabel="Delete draft"
        loading={pendingAction?.type === "delete"}
        onConfirm={deleteDraft}
        onClose={() => { if (!pendingAction) setDeleteTarget(null); }}
      />
    </>
  );
}

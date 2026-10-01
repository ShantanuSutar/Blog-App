import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, FileText, LogIn } from "lucide-react";
import { AuthContext } from "../AuthContext/authContext";
import api from "../api/axios";
import ConfirmDialog from "../Components/ConfirmDialog";
import CollectionPage from "../Components/library/CollectionPage";
import ManagedPostCard from "../Components/library/ManagedPostCard";
import { useToast } from "../Context/ToastContext.jsx";

const baseUrl = import.meta.env.VITE_BASE_URL;

export default function Drafts() {
  const { currentUser } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState(currentUser ? "loading" : "empty");
  const [requestVersion, setRequestVersion] = useState(0);
  const [pendingAction, setPendingAction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const actionLockRef = useRef(false);
  const toast = useToast();

  useEffect(() => {
    if (!currentUser) {
      setPosts([]);
      setStatus("empty");
      return undefined;
    }

    const controller = new AbortController();
    setStatus("loading");
    api.get("/api/posts/drafts/user", { signal: controller.signal })
      .then((response) => {
        setPosts(Array.isArray(response.data) ? response.data : []);
        setStatus("success");
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setStatus("error");
      });
    return () => controller.abort();
  }, [currentUser, requestVersion]);

  const publishDraft = async (postId) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setPendingAction({ postId, type: "publish" });
    try {
      await api.put(`/api/posts/${postId}`, { draft: false });
      setPosts((current) => current.filter((post) => post.id !== postId));
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
      setPosts((current) => current.filter((post) => post.id !== postId));
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
        count={posts.length}
        countLabel={posts.length === 1 ? "draft" : "drafts"}
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

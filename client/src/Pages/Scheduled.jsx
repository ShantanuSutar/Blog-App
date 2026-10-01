import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, FilePlus2, LogIn } from "lucide-react";
import { AuthContext } from "../AuthContext/authContext";
import api from "../api/axios";
import ConfirmDialog from "../Components/ConfirmDialog";
import CollectionPage from "../Components/library/CollectionPage";
import ManagedPostCard from "../Components/library/ManagedPostCard";
import { useToast } from "../Context/ToastContext.jsx";

const baseUrl = import.meta.env.VITE_BASE_URL;

export default function Scheduled() {
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
    api.get("/api/posts/scheduled/user", { signal: controller.signal })
      .then((response) => {
        setPosts(Array.isArray(response.data) ? response.data : []);
        setStatus("success");
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setStatus("error");
      });
    return () => controller.abort();
  }, [currentUser, requestVersion]);

  const publishNow = async (postId) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setPendingAction({ postId, type: "publish" });
    try {
      await api.put(`/api/posts/${postId}`, { draft: false, scheduled_publish_date: null });
      setPosts((current) => current.filter((post) => post.id !== postId));
      toast.success("Scheduled post published.");
    } catch {
      toast.error("The post couldn’t be published. Its schedule has not been changed.");
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  };

  const deleteScheduledPost = async () => {
    if (!deleteTarget || actionLockRef.current) return;
    actionLockRef.current = true;
    const postId = deleteTarget.id;
    setPendingAction({ postId, type: "delete" });
    try {
      await api.delete(`/api/posts/${postId}`);
      setPosts((current) => current.filter((post) => post.id !== postId));
      setDeleteTarget(null);
      toast.success("Scheduled post deleted.");
    } catch {
      toast.error("The scheduled post couldn’t be deleted. Its schedule remains unchanged.");
      setDeleteTarget(null);
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  };

  const pageStatus = status === "success" && posts.length === 0 ? "empty" : status;
  const activeActionFor = (postId) => pendingAction?.postId === postId ? pendingAction.type : "";
  const targetTitle = deleteTarget?.title?.trim() || "Untitled scheduled post";

  return (
    <>
      <CollectionPage
        title="Scheduled posts"
        description="Review upcoming stories and control when they go live."
        count={posts.length}
        countLabel={posts.length === 1 ? "scheduled post" : "scheduled posts"}
        status={pageStatus}
        errorMessage="Your scheduled posts couldn’t be loaded. Check your connection and try again."
        emptyTitle={currentUser ? "No scheduled posts" : "Sign in to manage scheduled posts"}
        emptyDescription={currentUser ? "Schedule an article and its publication time will appear here." : "Scheduling and publishing tools are available from your Unsaid account."}
        emptyIcon={currentUser ? CalendarClock : LogIn}
        emptyAction={currentUser
          ? <Link className="ui-button--primary" to="/write"><FilePlus2 size={17} aria-hidden="true" /> Write a story</Link>
          : <Link className="ui-button--primary" to="/login" state={{ from: "/scheduled" }}><LogIn size={17} aria-hidden="true" /> Log in</Link>}
        onRetry={() => setRequestVersion((version) => version + 1)}
      >
        <div className="managed-post-list">
          {posts.map((post) => (
            <ManagedPostCard
              key={post.id}
              post={post}
              type="scheduled"
              baseUrl={baseUrl}
              busyAction={activeActionFor(post.id)}
              actionsDisabled={Boolean(pendingAction)}
              onPublish={publishNow}
              onRequestDelete={setDeleteTarget}
            />
          ))}
        </div>
      </CollectionPage>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete “${targetTitle}”?`}
        description="This cancels the schedule and permanently deletes the post. This action cannot be undone."
        confirmLabel="Cancel & delete"
        loading={pendingAction?.type === "delete"}
        onConfirm={deleteScheduledPost}
        onClose={() => { if (!pendingAction) setDeleteTarget(null); }}
      />
    </>
  );
}

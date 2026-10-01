import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Feather, FileText, Pencil, RotateCcw, UserRoundX } from "lucide-react";
import { AuthContext } from "../AuthContext/authContext.jsx";
import { useThemeContext } from "../Context/theme.jsx";
import api from "../api/axios.js";
import FollowButton from "../Components/FollowButton.jsx";
import FollowersModal from "../Components/FollowersModal.jsx";
import PostCard from "../Components/home/PostCard.jsx";
import ProfileAvatar from "../Components/ProfileAvatar.jsx";
import ProfileSkeleton from "../Components/states/ProfileSkeleton.jsx";
import StatePanel from "../Components/ui/StatePanel.jsx";

const baseUrl = import.meta.env.VITE_BASE_URL;

function getPostImage(value) {
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  const normalized = value.replace(/^\/+/, "");
  return `${baseUrl.replace(/\/$/, "")}/${normalized.startsWith("api/") || normalized.startsWith("upload/") ? normalized : `upload/${normalized}`}`;
}

function formatMembershipDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const { theme } = useThemeContext();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [requestVersion, setRequestVersion] = useState(0);
  const [openList, setOpenList] = useState(null);
  const isOwnProfile = Boolean(currentUser && currentUser.username === username);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setUser(null);
    api.get(`/api/users/${encodeURIComponent(username)}`, { signal: controller.signal })
      .then((response) => {
        setUser(response.data);
        setStatus("success");
      })
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setStatus(error.response?.status === 404 ? "missing" : "error");
      });
    return () => controller.abort();
  }, [requestVersion, username]);

  const profilePosts = useMemo(() => (user?.recentPosts || []).map((post) => ({
    ...post,
    img: getPostImage(post.img),
    username: user.username,
    userAvatar: user.avatar,
  })), [user]);

  if (status === "loading") {
    return <ProfileSkeleton />;
  }

  if (status === "missing") {
    return <StatePanel className="profile-state" icon={UserRoundX} eyebrow="Profile unavailable" title="We couldn’t find that writer" description="The account may have moved or no longer exists." headingLevel={1} action={<Link className="ui-button--primary" to="/">Browse stories</Link>} />;
  }

  if (status === "error" || !user) {
    return <StatePanel className="profile-state" tone="error" role="alert" eyebrow="Connection interrupted" title="This profile couldn’t be loaded" description="Check your connection and try again." headingLevel={1} action={<button className="ui-button--primary" type="button" onClick={() => setRequestVersion((version) => version + 1)}><RotateCcw size={17} aria-hidden="true" /> Retry</button>} />;
  }

  const membershipDate = formatMembershipDate(user.created_at);

  return (
    <div className="profile-page">
      <header className="profile-header">
        <ProfileAvatar source={user.avatar} username={user.username} className="profile-avatar--large" loading="eager" />
        <div className="profile-header__content">
          <span className="profile-kicker">Writer profile</span>
          <div className="profile-header__title-row">
            <div><h1>@{user.username}</h1>{membershipDate && <p className="profile-membership"><CalendarDays size={15} aria-hidden="true" /> Member since {membershipDate}</p>}</div>
            <div className="profile-header__actions">
              {isOwnProfile ? (
                <button className="ui-button--secondary" type="button" onClick={() => navigate(`/profile/${encodeURIComponent(username)}/edit`)}><Pencil size={17} aria-hidden="true" /> Edit profile</button>
              ) : (
                <FollowButton
                  userId={user.id}
                  username={user.username}
                  initialFollowing={Boolean(user.isFollowing)}
                  onChange={(following) => setUser((current) => ({ ...current, isFollowing: following, followerCount: Math.max(0, Number(current.followerCount || 0) + (following ? 1 : -1)) }))}
                />
              )}
            </div>
          </div>
          {user.bio && <p className="profile-bio">{user.bio}</p>}

          <div className="profile-stats" role="group" aria-label={`${user.username}'s profile statistics`}>
            <div><span>Posts</span><strong>{Number(user.postsCount || 0)}</strong></div>
            <button type="button" onClick={() => setOpenList("followers")} aria-label={`View ${user.followerCount || 0} followers`}><span>Followers</span><strong>{Number(user.followerCount || 0)}</strong></button>
            <button type="button" onClick={() => setOpenList("following")} aria-label={`View ${user.followingCount || 0} followed accounts`}><span>Following</span><strong>{Number(user.followingCount || 0)}</strong></button>
          </div>
        </div>
      </header>

      <FollowersModal userId={user.id} isOpen={Boolean(openList)} onClose={() => setOpenList(null)} type={openList || "followers"} />

      <section className="profile-posts" aria-labelledby="profile-posts-heading">
        <div className="profile-section-heading">
          <div><span className="profile-kicker">Published work</span><h2 id="profile-posts-heading">Stories by {user.username}</h2></div>
          {profilePosts.length > 0 && <span><FileText size={16} aria-hidden="true" /> {profilePosts.length} recent {profilePosts.length === 1 ? "story" : "stories"}</span>}
        </div>

        {profilePosts.length > 0 ? (
          <div className="profile-story-list">{profilePosts.map((post) => <PostCard key={post.id} post={post} theme={theme} baseUrl={baseUrl} />)}</div>
        ) : (
          <StatePanel className="profile-state profile-state--empty" icon={Feather} title="No published stories yet" description={isOwnProfile ? "Your first story can start whenever you’re ready." : `${user.username} hasn’t published a story yet.`} headingLevel={3} action={isOwnProfile ? <Link className="ui-button--primary" to="/write">Write your first story</Link> : null} />
        )}
      </section>
    </div>
  );
}

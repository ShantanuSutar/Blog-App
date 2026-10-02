import { useContext, useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, Save, Trash2 } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext.jsx";
import api from "../api/axios.js";
import ProfileAvatar from "./ProfileAvatar.jsx";
import StatePanel from "./ui/StatePanel.jsx";
import InlineLoader from "./ui/InlineLoader.jsx";
import LoadingButton from "./ui/LoadingButton.jsx";
import { useToast } from "../Context/ToastContext.jsx";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const acceptedAvatarTypes = ["image/jpeg", "image/png", "image/webp"];

export default function ProfileEdit() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();

  useEffect(() => {
    if (!currentUser || currentUser.username !== username) return undefined;
    const controller = new AbortController();
    setStatus("loading");
    api.get(`/api/users/${encodeURIComponent(username)}`, { signal: controller.signal })
      .then((response) => {
        setUser(response.data);
        setBio(response.data.bio || "");
        setAvatarPreview(response.data.avatar || null);
        setStatus("success");
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setStatus("error");
      });
    return () => controller.abort();
  }, [currentUser, username]);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.username !== username) return <Navigate to={`/profile/${encodeURIComponent(currentUser.username)}`} replace />;

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!acceptedAvatarTypes.includes(file.type)) {
      setErrors((current) => ({ ...current, avatar: "Choose a JPEG, PNG, or WebP image." }));
      event.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setErrors((current) => ({ ...current, avatar: "Avatar images must be smaller than 5 MB." }));
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    setAvatarFile(file);
    setRemoveAvatar(false);
    setErrors((current) => ({ ...current, avatar: "", form: "" }));
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
    setErrors((current) => ({ ...current, avatar: "", form: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || !user) return;
    if (bio.length > 500) {
      setErrors((current) => ({ ...current, bio: "Keep your bio within 500 characters." }));
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      if (bio !== (user.bio || "")) await api.put(`/api/users/${user.id}`, { bio: bio.trim() });

      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const response = await api.post(`/api/users/${user.id}/avatar`, formData);
        updateCurrentUser({ avatar: response.data.avatar });
      } else if (removeAvatar && user.avatar) {
        await api.delete(`/api/users/${user.id}/avatar`);
        updateCurrentUser({ avatar: null });
      }

      toast.success("Your profile has been updated.");
      navigate(`/profile/${encodeURIComponent(username)}`, { replace: true });
    } catch (error) {
      setErrors({ form: error.response?.status === 413 ? "That avatar is too large." : "We couldn’t save your profile. Please try again." });
      setSaving(false);
    }
  };

  if (status === "loading") return <div className="profile-edit-page"><StatePanel className="profile-state" compact action={<InlineLoader label="Loading your profile…" />} /></div>;
  if (status === "error" || !user) return <div className="profile-edit-page"><StatePanel className="profile-state" tone="error" role="alert" title="Your profile editor couldn’t be loaded" description="Return to your profile and try again." headingLevel={1} action={<button className="ui-button--secondary" type="button" onClick={() => navigate(`/profile/${encodeURIComponent(username)}`)}>Back to profile</button>} /></div>;

  const hasAvatar = Boolean(avatarPreview);

  return (
    <div className="profile-edit-page">
      <header className="profile-edit-heading">
        <button className="ui-button--ghost" type="button" onClick={() => navigate(`/profile/${encodeURIComponent(username)}`)}><ArrowLeft size={18} aria-hidden="true" /> Back to profile</button>
        <span className="profile-kicker">Profile settings</span>
        <h1>Edit your profile</h1>
        <p>Keep your public identity simple and recognizable.</p>
      </header>

      <form className="profile-edit-form" onSubmit={handleSubmit} noValidate>
        {errors.form && <div className="profile-feedback profile-feedback--error" role="alert">{errors.form}</div>}

        <section className="profile-edit-section" aria-labelledby="avatar-heading">
          <div className="profile-edit-section__heading"><div><h2 id="avatar-heading">Profile photo</h2><p>JPEG, PNG, or WebP. Maximum 5 MB.</p></div></div>
          <div className="profile-avatar-editor">
            <ProfileAvatar source={avatarPreview} username={user.username} className="profile-avatar--editor" loading="eager" />
            <div className="profile-avatar-editor__actions">
              <input className="sr-only" id="profile-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} aria-invalid={Boolean(errors.avatar)} aria-describedby={errors.avatar ? "avatar-help avatar-error" : "avatar-help"} />
              <label className="ui-button--secondary" htmlFor="profile-avatar-input"><ImagePlus size={17} aria-hidden="true" /> {hasAvatar ? "Replace photo" : "Choose photo"}</label>
              {hasAvatar && <button className="ui-button--danger" type="button" onClick={handleRemoveAvatar}><Trash2 size={17} aria-hidden="true" /> Remove</button>}
              <span className="profile-field-help" id="avatar-help">Changes are applied when you save.</span>
              {errors.avatar && <span className="profile-field-error" id="avatar-error" role="alert">{errors.avatar}</span>}
            </div>
          </div>
        </section>

        <section className="profile-edit-section" aria-labelledby="about-heading">
          <div className="profile-edit-section__heading"><div><h2 id="about-heading">About you</h2><p>This appears below your username.</p></div></div>
          <div className={`profile-field ${errors.bio ? "has-error" : ""}`}>
            <label htmlFor="profile-bio">Bio</label>
            <textarea id="profile-bio" value={bio} onChange={(event) => { setBio(event.target.value); setErrors((current) => ({ ...current, bio: "", form: "" })); }} maxLength={500} rows={5} placeholder="Tell readers a little about yourself…" aria-describedby={`profile-bio-count${errors.bio ? " profile-bio-error" : ""}`} aria-invalid={Boolean(errors.bio)} />
            <div className="profile-field__meta"><span id="profile-bio-count">{bio.length} / 500 characters</span>{errors.bio && <span className="profile-field-error" id="profile-bio-error">{errors.bio}</span>}</div>
          </div>
        </section>

        <div className="profile-edit-actions">
          <button className="ui-button--secondary" type="button" onClick={() => navigate(`/profile/${encodeURIComponent(username)}`)} disabled={saving}>Cancel</button>
          <LoadingButton className="ui-button--primary" type="submit" loading={saving} loadingLabel="Saving…" icon={Save}>Save profile</LoadingButton>
        </div>
      </form>
    </div>
  );
}

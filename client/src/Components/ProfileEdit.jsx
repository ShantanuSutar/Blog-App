import React, { useState, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext.jsx";
import axios from "axios";
import api from "../api/axios";

const ProfileEdit = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const URL = import.meta.env.VITE_BASE_URL;

  // Fetch user profile data on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await axios.get(`${URL}/api/users/${username}`);
        setUser(res.data);
        setBio(res.data.bio || "");
        setAvatarPreview(res.data.avatar || null);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load profile data");
      }
    };
    fetchUserProfile();
  }, [username]);

  if (!user && !loading) {
    return (
      <div className="profile-edit-page">
        <div className="profile-edit-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const handleBioChange = (e) => {
    setBio(e.target.value);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        setError("Please select an image file (JPEG, PNG, WEBP)");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      setAvatar(file);
      setError("");
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Update bio
      if (bio !== user?.bio) {
        await api.put(`/api/users/${user.id}`, { bio });
      }

      // Upload avatar
      if (avatar) {
        const formData = new FormData();
        formData.append("avatar", avatar);
        
        const res = await api.post(`/api/users/${user.id}/avatar`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        
        // Update local storage with new avatar
        const updatedUser = { ...currentUser, avatar: res.data.avatar };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      // Navigate back to profile
      navigate(`/profile/${username}`);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await api.delete(`/api/users/${currentUser.id}/avatar`);
      setAvatar(null);
      setAvatarPreview(null);
      
      // Update local storage
      const updatedUser = { ...currentUser, avatar: null };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (err) {
      console.error("Error deleting avatar:", err);
      setError("Failed to delete avatar");
    }
  };

  return (
    <div className="profile-edit-page">
      <div className="profile-edit-container">
        <h2>Edit Profile</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="profile-edit-form">
          {/* Avatar Section */}
          <div className="avatar-section">
            <label className="avatar-label">
              <div className="avatar-preview-wrapper">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview.startsWith('data:') ? avatarPreview : `${URL}${avatarPreview}`} 
                    alt="Avatar preview"
                    className="avatar-preview"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {user?.username?.charAt(0).toUpperCase() || currentUser?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="avatar-overlay">
                  <span>Change</span>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange}
                className="avatar-input"
              />
            </label>
            
            {(user?.avatar || currentUser?.avatar) && !avatar && (
              <button 
                type="button" 
                className="delete-avatar-btn"
                onClick={handleDeleteAvatar}
              >
                Remove Avatar
              </button>
            )}
          </div>

          {/* Bio Section */}
          <div className="bio-section">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={handleBioChange}
              placeholder="Tell us about yourself..."
              maxLength={500}
              rows={5}
              className="bio-textarea"
            />
            <div className="char-count">
              {bio.length}/500 characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="save-btn"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => navigate(`/profile/${username}`)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;

import React, { useEffect, useState, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../AuthContext/authContext.jsx";
import moment from "moment";
import FollowButton from "../Components/FollowButton.jsx";

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useContext(AuthContext);
  const URL = import.meta.env.VITE_BASE_URL;

  const isOwnProfile = currentUser && currentUser.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${URL}/api/users/${username}`);
        setUser(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p className="text">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile error">
        <h2>User not found</h2>
        <Link to="/">Go back to home</Link>
      </div>
    );
  }

  const handleEditProfile = () => {
    navigate(`/profile/${username}/edit`);
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            {user.avatar ? (
              <img 
                src={`${URL}${user.avatar}`} 
                alt={user.username}
                className="profile-avatar"
              />
            ) : (
              <div className="profile-avatar-placeholder">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="profile-info">
            <h1 className="profile-username">@{user.username}</h1>
            {user.bio && <p className="profile-bio">{user.bio}</p>}
            
            {/* Follow Button - Only show if not own profile */}
            {!isOwnProfile && (
              <FollowButton 
                userId={user.id} 
                username={user.username}
                initialFollowing={user.isFollowing || false}
              />
            )}
            
            <div className="profile-meta">
              <span className="member-since">
                Member since {moment(user.created_at).format("MMMM YYYY")}
              </span>
              <span className="posts-count">
                {user.postsCount} {user.postsCount === 1 ? 'post' : 'posts'}
              </span>
            </div>

            {isOwnProfile && (
              <button className="edit-profile-btn" onClick={handleEditProfile}>
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* User's Posts */}
        {user.recentPosts && user.recentPosts.length > 0 && (
          <div className="profile-posts">
            <h2 className="section-title">Recent Posts</h2>
            <div className="posts-grid">
              {user.recentPosts.map((post) => (
                <Link 
                  to={`/post/${post.id}`} 
                  className="post-card" 
                  key={post.id}
                >
                  {post.img && (
                    <img 
                      src={`${URL}/upload/${post.img}`} 
                      alt={post.title}
                      className="post-image"
                    />
                  )}
                  <div className="post-content">
                    <h3 className="post-title">{post.title}</h3>
                    <div className="post-meta">
                      <span className="post-date">
                        {moment(post.created_at).format("MMM D, YYYY")}
                      </span>
                      {post.views !== undefined && (
                        <span className="post-views">
                          👁️ {post.views}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(!user.recentPosts || user.recentPosts.length === 0) && (
          <div className="no-posts">
            <p>No posts yet</p>
            {isOwnProfile && (
              <Link to="/write" className="write-first-post">
                Write your first post
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

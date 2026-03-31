import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext/authContext.jsx';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const FollowButton = ({ userId, username, initialFollowing = false }) => {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Fetch follow status and count on mount
  useEffect(() => {
    fetchFollowInfo();
  }, [userId]);

  // Update local state if initialFollowing prop changes
  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  const fetchFollowInfo = async () => {
    try {
      const res = await api.get(`/api/follows/info/${userId}`);
      setIsFollowing(res.data.following || false);
      setFollowerCount(res.data.followerCount || 0);
    } catch (err) {
      console.error('Error fetching follow info:', err);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/api/follows/${userId}`);
      
      if (res.data.action === 'follow') {
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      } else if (res.data.action === 'unfollow') {
        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 403) {
        alert(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="follow-section">
      <button
        className={`follow-button ${isFollowing ? 'following' : ''}`}
        onClick={handleToggleFollow}
        disabled={loading}
      >
        {loading ? (
          <span className="loading-spinner"></span>
        ) : isFollowing ? (
          <>
            <span className="icon">✓</span>
            <span className="text">Following</span>
          </>
        ) : (
          <>
            <span className="icon">+</span>
            <span className="text">Follow</span>
          </>
        )}
      </button>

      <div className="follow-counts">
        <span className="follower-count">
          <strong>{followerCount}</strong> Followers
        </span>
      </div>
    </div>
  );
};

export default FollowButton;

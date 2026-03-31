import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const FollowersModal = ({ userId, isOpen, onClose, type }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const URL = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    if (isOpen && userId) {
      fetchUsers();
    }
  }, [userId, isOpen, type]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const endpoint = type === 'followers' 
        ? `/api/follows/${userId}/followers`
        : `/api/follows/${userId}/following`;
      
      const res = await api.get(endpoint);
      setUsers(res.data[type] || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsers([]);
    onClose();
  };

  const handleUserClick = (username) => {
    handleClose();
    navigate(`/profile/${username}`);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="followers-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>
        
        <div className="modal-content">
          {loading ? (
            <div className="modal-loading">
              <div className="loader"></div>
              <p>Loading...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="no-users">
              <p>No {type} yet</p>
            </div>
          ) : (
            <div className="users-list">
              {users.map((user) => (
                <div 
                  key={user.id} 
                  className="user-item"
                  onClick={() => handleUserClick(user.username)}
                >
                  <div className="user-avatar-small">
                    {user.avatar ? (
                      <img 
                        src={`${URL}${user.avatar}`} 
                        alt={user.username}
                      />
                    ) : (
                      <div className="avatar-placeholder-small">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="user-info">
                    <span className="user-username">@{user.username}</span>
                    {user.bio && (
                      <span className="user-bio">{user.bio}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowersModal;

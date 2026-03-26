import React, { useState, useEffect, useContext } from 'react';
import { BiBookmark, BiSolidBookmark } from 'react-icons/bi';
import api from '../api/axios';
import { AuthContext } from '../AuthContext/authContext.jsx';
import { useNavigate } from 'react-router-dom';

// Helper function to format large numbers
const formatCount = (count) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
};

const BookmarkButton = ({ postId, theme }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Fetch bookmark status and count
  useEffect(() => {
    fetchBookmarkData();
  }, [postId]);

  const fetchBookmarkData = async () => {
    try {
      // Fetch count for the post (all users)
      const countRes = await api.post('/api/bookmarks/counts', { 
        postIds: [postId] 
      });
      setBookmarkCount(countRes.data[postId] || 0);

      // Fetch user's bookmark status for this specific post
      if (currentUser) {
        const statusRes = await api.get(`/api/bookmarks/check/${postId}`);
        setIsBookmarked(statusRes.data);
      }
    } catch (err) {
      console.error('Error fetching bookmark data:', err);
    }
  };

  const handleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isBookmarked) {
        // Remove bookmark
        const res = await api.delete(`/api/bookmarks/${postId}`);
        
        if (res.status === 200) {
          setIsBookmarked(false);
          setBookmarkCount(prev => Math.max(0, prev - 1));
        }
      } else {
        // Add bookmark
        const res = await api.post('/api/bookmarks', { postId });
        
        // Handle both 200 and 201 status codes
        if (res.status === 200 || res.status === 201) {
          setIsBookmarked(true);
          setBookmarkCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error('Bookmark error:', err);
      // If 409 conflict (already bookmarked), treat as success
      if (err.response?.status === 409) {
        setIsBookmarked(true);
        return;
      }
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 300);
    }
  };

  return (
    <div className="bookmark-container">
      <div className="bookmark-content-wrapper">
        <button
          className={`btn-grad bookmark-btn ${isBookmarked ? 'active' : ''}`}
          onClick={handleBookmark}
          title={currentUser ? (isBookmarked ? "Remove bookmark" : "Add bookmark") : "Login to bookmark"}
          disabled={!currentUser && !isProcessing}
        >
          {isBookmarked ? (
            <BiSolidBookmark />
          ) : (
            <BiBookmark />
          )}
        </button>
        
        {bookmarkCount > 0 && (
          <span className="bookmark-count" title="Bookmarks">
            {formatCount(bookmarkCount)}
          </span>
        )}
      </div>
    </div>
  );
};

export default BookmarkButton;

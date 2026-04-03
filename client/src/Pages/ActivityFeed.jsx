import React, { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext.jsx";
import api from "../api/axios.js";
import ActivityCard from "../Components/ActivityCard.jsx";
import moment from "moment";

const ActivityFeed = () => {
  const { currentUser } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("all"); // all, posts, comments, reactions, follows
  const URL = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    if (!currentUser) return;
    
    fetchActivityFeed();
  }, [page, filter]);

  const fetchActivityFeed = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/activity/feed?page=${page}&limit=20&filter=${filter}`);
      
      if (page === 1) {
        setActivities(res.data.activities);
      } else {
        setActivities(prev => [...prev, ...res.data.activities]);
      }
      
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("Error fetching activity feed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  const getFilterClass = (filterName) => {
    return `filter-btn ${filter === filterName ? 'active' : ''}`;
  };

  if (!currentUser) {
    return (
      <div className="activity-feed-page">
        <div className="login-prompt">
          <h2>Please login to view your activity feed</h2>
          <Link to="/login" className="btn-grad">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed-page">
      <div className="feed-header">
        <h1>Your Activity Feed</h1>
        <p className="feed-subtitle">Stay updated with activities from users you follow</p>
      </div>

      {/* Filter Tabs */}
      <div className="activity-filters">
        <button 
          className={getFilterClass('all')}
          onClick={() => { setFilter('all'); setPage(1); }}
        >
          All
        </button>
        <button 
          className={getFilterClass('posts')}
          onClick={() => { setFilter('posts'); setPage(1); }}
        >
          Posts
        </button>
        <button 
          className={getFilterClass('comments')}
          onClick={() => { setFilter('comments'); setPage(1); }}
        >
          Comments
        </button>
        <button 
          className={getFilterClass('follows')}
          onClick={() => { setFilter('follows'); setPage(1); }}
        >
          Follows
        </button>
      </div>

      {/* Activities List */}
      <div className="activities-container">
        {activities.length === 0 && !loading ? (
          <div className="empty-feed">
            <h3>No activities yet</h3>
            <p>Start following users to see their activities in your feed!</p>
          </div>
        ) : (
          <>
            <div className="activities-list">
              {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
            
            {page < totalPages && (
              <div className="load-more-container">
                <button 
                  className="btn-grad load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}

        {loading && page === 1 && (
          <div className="loading-container">
            <div className="loader"></div>
            <p>Loading activities...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;

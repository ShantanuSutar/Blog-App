import React from "react";
import { Link } from "react-router-dom";
import moment from "moment";

const ActivityCard = ({ activity }) => {
  const URL = import.meta.env.VITE_BASE_URL;
  
  const getActivityIcon = (type) => {
    switch (type) {
      case 'post':
        return '📝';
      case 'comment':
        return '💬';
      case 'reaction':
        return '❤️';
      case 'follow':
        return '👤';
      default:
        return '📢';
    }
  };

  const getActivityText = () => {
    const username = activity.username;
    const avatar = activity.avatar;
    
    switch (activity.activity_type) {
      case 'post':
        return (
          <>
            <span className="activity-user">
              <Link to={`/profile/${username}`}>@{username}</Link>
            </span>
            <span className="activity-action">published a new article</span>
            <div className="activity-content-preview">
              {activity.post_img && (
                <img 
                  src={`${URL}/upload/${activity.post_img}`} 
                  alt={activity.post_title}
                  className="activity-thumbnail"
                />
              )}
              <h4 className="activity-title">{activity.post_title}</h4>
            </div>
          </>
        );
      
      case 'comment':
        return (
          <>
            <span className="activity-user">
              <Link to={`/profile/${username}`}>@{username}</Link>
            </span>
            <span className="activity-action">commented on a post</span>
            {activity.comment_text && (
              <p className="activity-comment-preview">
                "{activity.comment_text.substring(0, 150)}{activity.comment_text.length > 150 ? '...' : ''}"
              </p>
            )}
          </>
        );
      
      case 'follow':
        return (
          <>
            <span className="activity-user">
              <Link to={`/profile/${username}`}>@{username}</Link>
            </span>
            <span className="activity-action">started following</span>
            <span className="activity-user">
              <Link to={`/profile/${activity.target_username}`}>@{activity.target_username}</Link>
            </span>
          </>
        );
      
      case 'reaction':
        return (
          <>
            <span className="activity-user">
              <Link to={`/profile/${username}`}>@{username}</Link>
            </span>
            <span className="activity-action">
              reacted to {activity.target_username ? `@${activity.target_username}'s` : 'a'} post
            </span>
            {activity.post_title && (
              <div className="activity-content-preview">
                <h4 className="activity-title">{activity.post_title}</h4>
              </div>
            )}
          </>
        );
      
      default:
        return (
          <>
            <span className="activity-user">
              <Link to={`/profile/${username}`}>@{username}</Link>
            </span>
            <span className="activity-action">did something</span>
          </>
        );
    }
  };

  return (
    <div className="activity-card">
      <div className="activity-header">
        <div className="activity-avatar">
          {activity.avatar ? (
            <img 
              src={`${URL}${activity.avatar}`} 
              alt={activity.username}
            />
          ) : (
            <div className="avatar-placeholder">
              {activity.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="activity-icon">
          {getActivityIcon(activity.activity_type)}
        </div>
      </div>

      <div className="activity-body">
        <div className="activity-text">
          {getActivityText()}
        </div>
        
        <div className="activity-timestamp">
          {moment.utc(activity.created_at).local().fromNow()}
        </div>
      </div>

      {/* Link to the related content */}
      {(activity.activity_type === 'post' || activity.activity_type === 'reaction') && activity.post_id && (
        <Link 
          to={`/post/${activity.post_id}`}
          className="activity-link-overlay"
        />
      )}
    </div>
  );
};

export default ActivityCard;

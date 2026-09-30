import React, { useState, useEffect, useContext } from 'react';
import { ThumbsUp, Heart, PartyPopper } from 'lucide-react';
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

const ReactionButtons = ({ postId, commentId, theme }) => {
  const [userReaction, setUserReaction] = useState(null);
  const [reactions, setReactions] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const reactionTypes = [
    { type: 'like', icon: ThumbsUp, color: 'var(--color-reaction-like)', softColor: 'var(--color-reaction-like-soft)', label: 'Like' },
    { type: 'love', icon: Heart, color: 'var(--color-reaction-love)', softColor: 'var(--color-reaction-love-soft)', label: 'Love' },
    { type: 'celebrate', icon: PartyPopper, color: 'var(--color-reaction-celebrate)', softColor: 'var(--color-reaction-celebrate-soft)', label: 'Celebrate' }
  ];

  const fetchReactions = async () => {
    try {
      const endpoint = postId 
        ? `/api/reactions/post/${postId}`
        : `/api/reactions/comment/${commentId}`;
      const res = await api.get(endpoint);
      setReactions(res.data.grouped || {});
    } catch (err) {
      console.log(err);
    }
  };

  const fetchUserReaction = async () => {
    if (!currentUser?.token) return;
    
    try {
      const endpoint = postId
        ? `/api/reactions/check/post/${postId}`
        : `/api/reactions/check/comment/${commentId}`;
      const res = await api.get(endpoint, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`
        }
      });
      setUserReaction(res.data.reaction);
    } catch (err) {
      // Silently fail - user might not be logged in
    }
  };

  useEffect(() => {
    fetchReactions();
    fetchUserReaction();
    
    // Cleanup timeout on unmount
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [postId, commentId, hoverTimeout]);

  const handleReaction = async (type) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const res = await api.post('/api/reactions', {
        postId,
        commentId,
        reactionType: type
      }, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`
        }
      });

      // Handle all three cases: added, updated, removed
      if (res.data.action === 'added' || res.data.action === 'updated') {
        setUserReaction(type);
      } else if (res.data.action === 'removed') {
        setUserReaction(null);
      }

      // Refresh reactions - keep picker open for better UX
      await fetchReactions();
    } catch (err) {
      console.error('Reaction error:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle mouse enter main button - clear any pending close timeout
  const handleMainMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    if (currentUser) {
      setShowPicker(true);
    }
  };

  // Handle mouse leave main button - delay closing to allow transition to picker
  const handleMainMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowPicker(false);
    }, 300);
    setHoverTimeout(timeout);
  };

  // Handle mouse enter picker - clear any pending close timeout
  const handlePickerMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  // Handle mouse leave picker - close after delay
  const handlePickerMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowPicker(false);
    }, 200);
    setHoverTimeout(timeout);
  };

  const getTotalCount = () => {
    return Object.values(reactions).reduce((sum, r) => sum + r.count, 0);
  };

  const getCurrentReaction = () => {
    if (!userReaction) return reactionTypes[0]; // Default to like
    return reactionTypes.find(r => r.type === userReaction) || reactionTypes[0];
  };
  const CurrentIcon = getCurrentReaction().icon;

  return (
    <div className="reaction-container">
      {/* Main reaction button with hover picker */}
      <div 
        className="reaction-main-wrapper"
        onMouseEnter={handleMainMouseEnter}
        onMouseLeave={handleMainMouseLeave}
        onFocus={() => currentUser && setShowPicker(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setShowPicker(false);
        }}
      >
        {/* Single main button */}
        <button
          className={`reaction-main ${userReaction ? 'active' : ''}`}
          onClick={() => handleReaction(userReaction || 'like')}
          title={currentUser ? "React or hover for more" : "Login to react"}
          aria-label={userReaction ? `Remove ${userReaction} reaction` : 'Like this post'}
          aria-pressed={Boolean(userReaction)}
          aria-busy={isProcessing}
          disabled={isProcessing}
        >
          <CurrentIcon size={20} aria-hidden="true" fill={userReaction === 'love' ? 'currentColor' : 'none'} />
        </button>

        {/* Hover reaction picker */}
        {showPicker && currentUser && (
          <div 
            className="reaction-picker-hover"
            onMouseEnter={handlePickerMouseEnter}
            onMouseLeave={handlePickerMouseLeave}
          >
            {reactionTypes.map((reaction) => {
              const Icon = reaction.icon;
              return (
              <button
                key={reaction.type}
                className={`reaction-option-hover ${userReaction === reaction.type ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReaction(reaction.type);
                }}
                style={{
                  borderColor: userReaction === reaction.type ? reaction.color : 'var(--color-border)',
                  backgroundColor: userReaction === reaction.type ? reaction.softColor : 'var(--color-surface)'
                }}
                title={reaction.label}
                aria-label={reaction.label}
                aria-pressed={userReaction === reaction.type}
                disabled={isProcessing}
              >
                <Icon size={22} aria-hidden="true" fill={userReaction === reaction.type && reaction.type === 'love' ? 'currentColor' : 'none'} />
              </button>
            );})}
          </div>
        )}

        {/* Login prompt for non-authenticated users */}
        {!currentUser && showPicker && (
          <div className="reaction-login-prompt">
            <span>Login to react</span>
          </div>
        )}
      </div>

      {/* Reaction count display */}
      {getTotalCount() > 0 && (
        <div className="reaction-count">
          {formatCount(getTotalCount())}
        </div>
      )}
    </div>
  );
};

export default ReactionButtons;

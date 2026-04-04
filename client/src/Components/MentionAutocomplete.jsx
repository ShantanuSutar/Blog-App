import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';

const MentionAutocomplete = ({ query, onSelect, position }) => {
  const [users, setUsers] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useEffect(() => {
    if (query && query.length > 0) {
      fetchUsers(query);
    } else {
      setUsers([]);
    }
  }, [query]);
  
  const fetchUsers = async (searchTerm) => {
    try {
      const res = await api.get(`/api/users/search?query=${encodeURIComponent(searchTerm)}`);
      setUsers(res.data);
      setSelectedIndex(0); // Reset selection when new results come in
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };
  
  // Handle keyboard navigation - using useCallback to stabilize the function
  const handleKeyDown = useCallback((e) => {
    if (users.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((prev) => (prev + 1) % users.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (selectedIndex >= 0 && selectedIndex < users.length) {
        onSelect(users[selectedIndex].username);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [users, selectedIndex, onSelect]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  if (users.length === 0) return null;
  
  return (
    <div 
      className="mention-autocomplete" 
      style={{ top: position.y, left: position.x }}
    >
      {users.map((user, index) => (
        <div 
          key={user.id}
          className={`mention-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(user.username)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          {user.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            <img 
              src="https://t4.ftcdn.net/jpg/02/29/75/83/360_F_229758328_7x8jwCwjtBMmC6rgFzLFhZoEpLobB6L8.jpg" 
              alt="" 
            />
          )}
          <span>@{user.username}</span>
        </div>
      ))}
    </div>
  );
};

export default MentionAutocomplete;

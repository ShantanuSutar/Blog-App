import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import api from '../api/axios.js';

const MentionAutocomplete = forwardRef(function MentionAutocomplete({ id, query, onSelect, onActiveOptionChange }, ref) {
  const [users, setUsers] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!query) {
      setUsers([]);
      return undefined;
    }

    const controller = new AbortController();
    api.get(`/api/users/search?query=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => {
        setUsers(Array.isArray(response.data) ? response.data : []);
        setSelectedIndex(0);
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setUsers([]);
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    const activeUser = users[selectedIndex];
    onActiveOptionChange(activeUser ? `${id}-option-${activeUser.id}` : undefined);
  }, [id, onActiveOptionChange, selectedIndex, users]);

  useImperativeHandle(ref, () => ({
    handleKeyDown(event) {
      if (!users.length || !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return false;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "ArrowDown") setSelectedIndex((index) => (index + 1) % users.length);
      else if (event.key === "ArrowUp") setSelectedIndex((index) => (index - 1 + users.length) % users.length);
      else onSelect(users[selectedIndex].username);
      return true;
    },
  }), [onSelect, selectedIndex, users]);

  if (users.length === 0) return null;

  return (
    <div className="mention-autocomplete" id={id} role="listbox" aria-label="Mention a user">
      {users.map((user, index) => (
        <div
          id={`${id}-option-${user.id}`}
          key={user.id}
          className={`mention-item ${index === selectedIndex ? 'selected' : ''}`}
          role="option"
          aria-selected={index === selectedIndex}
          onClick={() => onSelect(user.username)}
          onMouseDown={(event) => event.preventDefault()}
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
});

export default MentionAutocomplete;

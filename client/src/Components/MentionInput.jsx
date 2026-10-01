import { useState, useRef, useEffect } from 'react';
import MentionAutocomplete from './MentionAutocomplete.jsx';

const MentionInput = ({ id, value, onChange, placeholder, ariaLabel }) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [mentionStartPos, setMentionStartPos] = useState(null); // Track where @ was typed
  const [mentionEndPos, setMentionEndPos] = useState(null); // Track cursor position while typing mention
  const textareaRef = useRef(null);
  const blurTimeoutRef = useRef(null); // Store timeout ID to clear it if needed
  
  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowMentions(false);
        setMentionStartPos(null);
        setMentionEndPos(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Clean up any pending timeouts
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);
  
  const calculateCursorPosition = (textarea, cursorPos) => {
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLineText = lines[currentLineIndex];
    
    // Create a temporary element to measure text width
    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.whiteSpace = 'pre';
    tempElement.style.font = window.getComputedStyle(textarea).font;
    tempElement.textContent = currentLineText;
    document.body.appendChild(tempElement);
    
    const rect = textarea.getBoundingClientRect();
    const textWidth = tempElement.offsetWidth;
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    
    document.body.removeChild(tempElement);
    
    setCursorPosition({
      x: rect.left + textWidth + 5, // 5px offset
      y: rect.top + (currentLineIndex * lineHeight) + lineHeight + 5
    });
  };
  
  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Clear any pending blur timeout when user types
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    
    // Check if @ was just typed
    if (newValue[cursorPos - 1] === '@') {
      setShowMentions(true);
      setMentionQuery('');
      setMentionStartPos(cursorPos - 1); // Store position of @
      setMentionEndPos(cursorPos); // Store current cursor position
      calculateCursorPosition(e.target, cursorPos);
    } else if (showMentions) {
      // Extract current mention being typed
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtSymbol !== -1) {
        const query = textBeforeCursor.substring(lastAtSymbol + 1);
        
        // Check if there's a space in the query (user finished typing mention)
        if (query.includes(' ')) {
          // User typed space after @username, close dropdown and reset
          setShowMentions(false);
          setMentionStartPos(null);
          setMentionEndPos(null);
        } else if (/^\w*$/.test(query)) {
          // Valid mention characters (alphanumeric and underscore)
          setMentionQuery(query);
          setMentionStartPos(lastAtSymbol); // Update position as user types
          setMentionEndPos(cursorPos); // Update end position
        } else {
          // Invalid character typed, close dropdown and reset
          setShowMentions(false);
          setMentionStartPos(null);
          setMentionEndPos(null);
        }
      } else {
        // No @ symbol found, close dropdown and reset
        setShowMentions(false);
        setMentionStartPos(null);
        setMentionEndPos(null);
      }
    }
    
    onChange(newValue);
  };
  
  const handleSelectMention = (username) => {
    const textarea = textareaRef.current;
    
    // Use the tracked mention start and end positions
    if (mentionStartPos !== null && mentionEndPos !== null) {
      const beforeMention = value.substring(0, mentionStartPos);
      const afterMention = value.substring(mentionEndPos);
      const newValue = `${beforeMention}@${username} ${afterMention}`;
      
      onChange(newValue);
      setShowMentions(false);
      setMentionQuery('');
      setMentionStartPos(null);
      setMentionEndPos(null);
      
      // Focus back on textarea and set cursor position after inserted mention
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = beforeMention.length + username.length + 2; // +2 for @ and space
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };
  
  const handleKeyDown = (e) => {
    // Close autocomplete on Escape
    if (e.key === 'Escape' && showMentions) {
      e.preventDefault();
      e.stopPropagation();
      setShowMentions(false);
      setMentionStartPos(null);
      setMentionEndPos(null);
      return;
    }
    
    // Pass arrow keys and enter to MentionAutocomplete when dropdown is open
    if (showMentions && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter')) {
      // Prevent default textarea behavior for these keys
      e.preventDefault();
      e.stopPropagation();
      // The MentionAutocomplete component will handle the actual selection
    }
  };
  
  const handleBlur = () => {
    // Reset mention state when textarea loses focus
    blurTimeoutRef.current = setTimeout(() => {
      setShowMentions(false);
      setMentionStartPos(null);
      setMentionEndPos(null);
      blurTimeoutRef.current = null;
    }, 200); // Small delay to allow click events on dropdown items
  };
  
  return (
    <div className="mention-input-container" ref={textareaRef}>
      <textarea
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {showMentions && (
        <MentionAutocomplete
          query={mentionQuery}
          onSelect={handleSelectMention}
          position={cursorPosition}
        />
      )}
    </div>
  );
};

export default MentionInput;

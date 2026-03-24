// Reading Time Configuration
// Average adult reading speed varies by content type and language
// Source: https://en.wikipedia.org/wiki/Words_per_minute

export const READING_CONFIG = {
  // Words per minute for different content types
  WPM: {
    DEFAULT: 200,      // Default reading speed (comfortable average)
    TECHNICAL: 150,    // Technical/scientific content (slower)
    CASUAL: 230,       // Casual/blog content (faster)
    ACADEMIC: 130,     // Academic/research papers (much slower)
  },
  
  // You can adjust the default based on your audience
  DEFAULT_TYPE: 'DEFAULT',
};

/**
 * Calculate reading time based on text content
 * @param {string} text - HTML or plain text content
 * @param {number} wpm - Words per minute (optional, uses default if not provided)
 * @returns {string} Formatted reading time (e.g., "3 min read")
 */
export const calculateReadingTime = (text, wpm) => {
  if (!text) return '0 min read';
  
  // Strip HTML tags for accurate word count
  const plainText = text.replace(/<[^>]+>/g, '');
  
  // Count words (split by whitespace and filter empty strings)
  const words = plainText.split(/\s+/).filter(word => word.length > 0).length;
  
  // Use provided WPM or default
  const wordsPerMinute = wpm || READING_CONFIG.WPM[READING_CONFIG.DEFAULT_TYPE];
  
  // Calculate minutes (round up)
  const minutes = Math.ceil(words / wordsPerMinute);
  
  return `${minutes} min read`;
};

/**
 * Calculate reading time with more detailed output
 * @param {string} text - HTML or plain text content
 * @param {number} wpm - Words per minute (optional)
 * @returns {object} Object with minutes, seconds, and formatted string
 */
export const calculateReadingTimeDetailed = (text, wpm) => {
  if (!text) return { minutes: 0, seconds: 0, formatted: '0 min read' };
  
  const plainText = text.replace(/<[^>]+>/g, '');
  const words = plainText.split(/\s+/).filter(word => word.length > 0).length;
  const wordsPerMinute = wpm || READING_CONFIG.WPM[READING_CONFIG.DEFAULT_TYPE];
  
  const totalSeconds = Math.floor((words / wordsPerMinute) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  let formatted = '';
  if (minutes > 0) {
    formatted = `${minutes} min read`;
  } else {
    formatted = `${seconds} sec read`;
  }
  
  return {
    minutes,
    seconds,
    formatted,
    wordCount: words
  };
};

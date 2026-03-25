import axios from "axios";
import api from "../api/axios";
import { useEffect, useState, useContext, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useThemeContext } from "../Context/theme";
import { BiBookmark, BiSolidBookmark, BiSearch, BiShow } from "react-icons/bi";
import { AuthContext } from "../AuthContext/authContext";
import Tilt from "react-parallax-tilt";
import Menu from "../Components/Menu";
import Newsletter from "../Components/Newsletter";
import { calculateReadingTime } from "../utils/readingTime";

const Home = () => {
  console.log('Home component rendering...');
  const { theme, setTheme } = useThemeContext();
  const { currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagSearch, setTagSearch] = useState('');
  const [postsSearchQuery, setPostsSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Reset page on filter change


  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const catParam = params.get('cat');
  const cat = catParam ? `?cat=${catParam}` : '';
  const search = params.get('search') || '';

  const URL = import.meta.env.VITE_BASE_URL;

  // Bookmarking
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [bookmarkCounts, setBookmarkCounts] = useState({});
  const isProcessingBookmark = useRef(false);

  // Featured posts
  const [featuredPosts, setFeaturedPosts] = useState([]);

  // Reading time helper (now using centralized utility)
  // You can pass custom WPM if needed: calculateReadingTime(text, 150) for technical content

  const handleBookmark = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent action if already processing
    if (isProcessingBookmark.current) return;
    isProcessingBookmark.current = true;
    
    try {
      const isBookmarked = bookmarkedPosts.includes(postId);
      
      if (isBookmarked) {
        const res = await api.delete(`/api/bookmarks/${postId}`);
        
        // Only update local state if API call succeeded
        if (res.status === 200) {
          setBookmarkedPosts(prev => prev.filter(id => id !== postId));
          // Update bookmark count instantly
          setBookmarkCounts(prev => ({
            ...prev,
            [postId]: Math.max(0, (prev[postId] || 0) - 1)
          }));
        } else {
          console.error('Failed to remove bookmark, status:', res.status);
        }
      } else {
        const res = await api.post(`/api/bookmarks`, { postId });
        // Only update if successful (not already bookmarked)
        if (res.status === 200) {
          setBookmarkedPosts(prev => [...prev, postId]);
          // Update bookmark count instantly
          setBookmarkCounts(prev => ({
            ...prev,
            [postId]: (prev[postId] || 0) + 1
          }));
        }
      }
    } catch (err) {
      // If already bookmarked (409), sync state but don't show error
      if (err.response?.status === 409) {
        if (!bookmarkedPosts.includes(postId)) {
          setBookmarkedPosts(prev => [...prev, postId]);
        }
        return;
      }
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setTimeout(() => {
        isProcessingBookmark.current = false;
      }, 300); // Debounce to prevent rapid clicks
    }
  };

  // Effect to fetch user bookmarks
  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const res = await api.get(`/api/bookmarks`);
        // Assuming API returns array of posts, we map to IDs
        setBookmarkedPosts(res.data.map(item => item.id));
      } catch (err) {
        // User likely not logged in
      }
    };
    fetchBookmarks();
  }, [URL]);

  // Fetch bookmark counts for visible posts
  useEffect(() => {
    const fetchBookmarkCounts = async () => {
      if (posts.length === 0) return;
      
      try {
        const postIds = posts.map(post => post.id);
        const res = await api.post(`/api/bookmarks/counts`, { postIds });
        setBookmarkCounts(prevCounts => ({
          ...prevCounts,
          ...res.data
        }));
      } catch (err) {
        console.error('Error fetching bookmark counts:', err);
      }
    };
    fetchBookmarkCounts();
  }, [posts, URL]);

  // Fetch featured posts
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await axios.get(`${URL}/api/posts/featured`);
        setFeaturedPosts(res.data);
      } catch (err) {
        console.log('Error fetching featured posts:', err);
      }
    };
    fetchFeatured();
  }, [URL]);

  // Extract tag from URL path (for /tag/:tag routes)
  const pathSegments = location.pathname.split('/');
  const urlTag = pathSegments[1] === 'tag' ? pathSegments[2] : null;

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [cat, search, selectedTag, urlTag]);

  // Infinite Scroll - Auto load more posts when reaching bottom
  useEffect(() => {
    const handleLoadMore = () => {
      if (!isLoadingMore && page < totalPages) {
        setPage(prevPage => prevPage + 1);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px' // Increased trigger zone for smoother experience
      }
    );

    let sentinelElement = document.getElementById('sentinel');
    if (sentinelElement) {
      observer.observe(sentinelElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [page, totalPages, isLoadingMore]);

  console.log('Home component state:', { theme, loading, posts: posts.length, allTags: allTags.length, filteredTags: filteredTags.length, selectedTag, tagSearch, cat, urlTag, URL });

  // Filter tags based on search input
  useEffect(() => {
    if (tagSearch) {
      setFilteredTags(
        allTags.filter(tag =>
          tag.toLowerCase().includes(tagSearch.toLowerCase())
        )
      );
    } else {
      setFilteredTags(allTags);
    }
  }, [tagSearch, allTags]);

  useEffect(() => {
    const fetchData = async () => {
      // Only show full screen loading on initial page load (page 1)
      if (page === 1) {
        setLoading(true);
      }
      try {
        let apiUrl;

        if (urlTag) {
          apiUrl = `${URL}/api/posts/tag/${urlTag}`;
        } else if (selectedTag) {
          apiUrl = `${URL}/api/posts/tag/${selectedTag}`;
        } else {
          // Base query
          apiUrl = `${URL}/api/posts` + (cat ? cat : '?');
          if (!cat.includes('?')) apiUrl = `${URL}/api/posts?` + (cat ? cat : ''); // Correct generic logic

          if (cat) apiUrl = `${URL}/api/posts${cat}`;
          else apiUrl = `${URL}/api/posts?`;

          if (search) apiUrl += `&search=${search}`;

          apiUrl += `&page=${page}&limit=10`; // Increased from 5 to 10 for better UX
        }

        const res = await axios.get(apiUrl);

        if (res.data.posts) {
          if (page === 1) {
            setPosts(res.data.posts);
          } else {
            // For infinite scroll, append new posts
            setPosts(prevPosts => [...prevPosts, ...res.data.posts]);
          }
          setTotalPages(res.data.totalPages);
        } else {
          // Fallback for tags calls that return direct array
          setPosts(Array.isArray(res.data) ? res.data : []);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setPosts([]);
      } finally {
        if (page === 1) {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [cat, selectedTag, urlTag, URL, search, page]);

  // Fetch all tags to populate the filter dropdown
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await axios.get(`${URL}/api/posts`);
        const allPostTags = [];
        const postsData = res.data.posts || (Array.isArray(res.data) ? res.data : []);

        postsData.forEach(post => {
          if (post.tags) {
            try {
              const postTags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags;
              postTags.forEach(tag => {
                if (!allPostTags.includes(tag)) {
                  allPostTags.push(tag);
                }
              });
            } catch (e) {
              console.error('Error parsing tags:', e);
            }
          }
        });
        setAllTags(allPostTags);
      } catch (error) {
        console.log(error);
      }
    };
    fetchTags();
  }, []);

  const getText = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent;
  };

  // Format large numbers (e.g., 1.2K, 3.5M, 1.0B)
  const formatCount = (count) => {
    if (count >= 1000000000) {
      return (count / 1000000000).toFixed(1) + 'B';
    }
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const handleTagChange = (e) => {
    const tag = e.target.value;
    setSelectedTag(tag || null);
    if (!tag) {
      navigate('/');
    }
  };

  const clearFilter = () => {
    setSelectedTag(null);
    navigate('/');
  };

  // State for dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.custom-tag-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (loading) {
    return (
      <div className={`${theme === "dark" ? "dark" : ""} loading-container`}>
        <div className="loader"></div>
        <p className={`${theme === "dark" ? "text dark" : "text"}`}>Loading stories...</p>
      </div>
    );
  }

  return (
    <div className={theme === "dark" ? "home dark" : "home"}>
      <div className={`main-content ${theme === "dark" ? "dark" : ""}`}>
        <div className={`filter-section ${theme === "dark" ? "dark" : ""}`}>
          <div className="filters-container">
            <div className="tag-filter">
              <div className="custom-tag-dropdown">
                <div
                  className={`dropdown-header ${theme === "dark" ? "dark" : ""} ${isDropdownOpen ? "open" : ""}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span>{selectedTag || "Filter by Tag"}</span>
                  <span className="dropdown-arrow">▼</span>
                </div>

                {isDropdownOpen && (
                  <div className={`dropdown-content ${theme === "dark" ? "dark" : ""}`}>
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Search tags..."
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        className={theme === "dark" ? "tag-search-input dark" : "tag-search-input"}
                        autoFocus
                      />
                    </div>
                    <div className="tags-list">
                      {filteredTags.length > 0 ? (
                        filteredTags.map((tag, index) => (
                          <div
                            key={index}
                            className={`tag-option ${theme === 'dark' ? 'dark' : ''}`}
                            onClick={() => {
                              setSelectedTag(tag);
                              setIsDropdownOpen(false);
                              navigate(`/tag/${tag}`);
                            }}
                          >
                            {tag}
                          </div>
                        ))
                      ) : (
                        <div className={`no-tags ${theme === 'dark' ? 'dark' : ''}`}>No tags found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedTag && (
                <button
                  onClick={clearFilter}
                  className="btn-grad"
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className="post-search-filter">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (postsSearchQuery.trim()) {
                  navigate(`/?search=${postsSearchQuery}`);
                } else {
                  navigate('/');
                }
              }}>
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={postsSearchQuery}
                  onChange={(e) => setPostsSearchQuery(e.target.value)}
                  className={theme === "dark" ? "post-search-input dark" : "post-search-input"}
                />
                <BiSearch
                  className={theme === "dark" ? "dark" : ""}
                  onClick={() => {
                    if (postsSearchQuery.trim()) {
                      navigate(`/?search=${postsSearchQuery}`);
                    } else {
                      navigate('/');
                    }
                  }}
                />
              </form>
            </div>

            {search && (
              <button
                onClick={() => {
                  setPostsSearchQuery('');
                  navigate('/');
                }}
                className="btn-grad clear-btn"
              >
                Clear Search
              </button>
            )}
          </div>
          {selectedTag && (
            <h2 className={theme === "dark" ? "text dark" : "text"} style={{ marginTop: '20px' }}>Posts tagged with: <span className="highlight-tag">{selectedTag}</span></h2>
          )}
        {search && (
            <h2 className={theme === "dark" ? "text dark" : "text"} style={{ marginTop: '20px' }}>Search results for: <span className="highlight-tag">{search}</span></h2>
          )}
        </div>

        {/* Featured Posts Section */}
        {featuredPosts.length > 0 && !selectedTag && !search && !cat && (
          <div className="featured-section" style={{ marginBottom: '40px' }}>
            <h2 className={theme === "dark" ? "text dark" : "text"} style={{ marginBottom: '25px', color: '#ec1257' }}>
              ⭐ Featured Posts
            </h2>
            <div className="posts featured-posts">
              {featuredPosts.map((post) => (
                <div className="post featured-post" key={post.id}>
                  {post?.img ? (
                    <div className={theme === "dark" ? "img dark" : "img"}>
                      <Tilt>
                        <img 
                          src={post.img} 
                          alt={post.title}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </Tilt>
                    </div>
                  ) : (
                    <div className="no-image-placeholder">
                      <div className="placeholder-content">
                        <span className="placeholder-icon">⭐</span>
                        <span className="placeholder-text">Featured Post</span>
                      </div>
                    </div>
                  )}
                  <div className="content">
                    <Link className="link" to={`/post/${post.id}`}>
                      <h1 className={theme === "dark" ? "text dark" : "text"}>{post.title}</h1>
                    </Link>
                    <p className={theme === "dark" ? "dark" : ""}>
                      {getText(post.desc)?.substring(0, 150)}...
                    </p>
                    <div className="post-meta">
                      <span className="date">
                        {new Date(post.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="reading-time">
                        📖 {calculateReadingTime(post.desc)}
                      </span>
                    </div>
                    <div className="post-actions">
                      {currentUser && (
                        <>
                          <button
                            className="btn-grad bookmark-btn"
                            onClick={(e) => handleBookmark(e, post.id)}
                          >
                            {bookmarkedPosts.includes(post.id) ? (
                              <BiSolidBookmark />
                            ) : (
                              <BiBookmark />
                            )}
                          </button>
                          <span className="bookmark-count" title="Bookmarks">
                            🔖 {formatCount(bookmarkCounts[post.id] || 0)}
                          </span>
                        </>
                      )}
                      <Link className="link" to={`/post/${post.id}`}>
                        <button className="btn-grad">Read More</button>
                      </Link>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="posts">
          {console.log('Rendering posts, count:', posts ? posts.length : 0)}
          {posts && posts.length > 0 ? (
            posts.map((post) => (
              <div className="post" key={post.id}>
                {post?.img ? (
                  <div className={theme === "dark" ? "img dark" : "img"}>
                    <Tilt>
                      <img 
                        src={post.img} 
                        alt={post.title}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </Tilt>
                  </div>
                ) : (
                  <div className="no-image-placeholder">
                    <div className="placeholder-content">
                      <span className="placeholder-icon">📝</span>
                      <span className="placeholder-text">Featured Post</span>
                    </div>
                  </div>
                )}
                <div className="content">
                  <Link className="link" to={`/post/${post.id}`}>
                    <h1 className={theme === "dark" ? "text dark" : "text"}>
                      {post.title}
                    </h1>
                  </Link>
                  <p className={theme === "dark" ? "dark" : ""}>
                    {getText(post.desc)}
                  </p>
                  <div className="post-tags">
                    {post.tags && (
                      <>
                        <strong className={theme === 'dark' ? 'dark' : ''}>Tags:</strong>
                        {(typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags)
                          .map((tag, idx) => (
                            <span
                              key={idx}
                              className="tag"
                              onClick={() => {
                                setSelectedTag(tag);
                                navigate(`/tag/${tag}`);
                              }}
                            >
                              #{tag}
                            </span>
                          ))
                        }
                      </>
                    )}
                  </div>
                  <div className="post-actions">
                    <span className="view-count" title="Views">
                      👁️ {formatCount(post.views || 0)}
                    </span>
                    {currentUser && (
                      <>
                        <div
                          className="bookmark-icon"
                          onClick={(e) => handleBookmark(e, post.id)}
                          title={bookmarkedPosts.includes(post.id) ? "Remove Bookmark" : "Bookmark"}
                        >
                          {bookmarkedPosts.includes(post.id) ? (
                            <BiSolidBookmark />
                          ) : (
                            <BiBookmark />
                          )}
                        </div>
                        <span className="bookmark-count" title="Bookmarks">
                          🔖 {formatCount(bookmarkCounts[post.id] || 0)}
                        </span>
                      </>
                    )}
                    <Link to={`/post/${post.id}`}>
                      <button className="btn-grad">Read More</button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-posts">
              <p className={theme === "dark" ? "text dark" : "text"}>No posts found for this filter.</p>
            </div>
          )}
        </div>

        {/* Infinite Scroll Sentinel - Triggers auto-load when visible */}
        <div id="sentinel" style={{ height: '100px', margin: '20px 0' }}></div>
        
        {/* Loading Indicator for Infinite Scroll - Subtle spinner at bottom */}
        {isLoadingMore && (
          <div className="infinite-scroll-loading" style={{ 
            textAlign: 'center', 
            padding: '20px',
            marginTop: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #ec1257',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p className={theme === "dark" ? "text dark" : "text"} style={{ 
              fontSize: '14px',
              marginTop: '10px',
              color: '#888'
            }}>
              Loading more posts...
            </p>
          </div>
        )}
        
        {/* End of Posts Message */}
        {page >= totalPages && posts.length > 0 && !isLoadingMore && (
          <div className="end-of-posts" style={{ textAlign: 'center', padding: '40px 20px', marginTop: '30px' }}>
            <p className={theme === "dark" ? "text dark" : "text"} style={{ color: '#888', fontSize: '16px' }}>
              🎉 You've reached the end!
            </p>
          </div>
        )}
      </div>
      <div className="sidebar-content">
        <Menu cat={catParam} />
        <Newsletter />
      </div >
    </div >
  );
};

export default Home;

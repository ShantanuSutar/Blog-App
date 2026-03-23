import axios from "axios";
import api from "../api/axios";
import { useEffect, useState, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useThemeContext } from "../Context/theme";
import { BiBookmark, BiSolidBookmark, BiSearch } from "react-icons/bi";
import { AuthContext } from "../AuthContext/authContext";
import Tilt from "react-parallax-tilt";
import Menu from "../Components/Menu";
import Newsletter from "../Components/Newsletter";

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

  // Reading time helper
  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  const handleBookmark = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (bookmarkedPosts.includes(postId)) {
        await api.delete(`/api/bookmarks/${postId}`);
        setBookmarkedPosts(prev => prev.filter(id => id !== postId));
      } else {
        await api.post(`/api/bookmarks`, { postId });
        setBookmarkedPosts(prev => [...prev, postId]);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
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

  // Extract tag from URL path (for /tag/:tag routes)
  const pathSegments = location.pathname.split('/');
  const urlTag = pathSegments[1] === 'tag' ? pathSegments[2] : null;

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [cat, search, selectedTag, urlTag]);

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
      setLoading(true);
      try {
        // Reset page if category or search changes (need separate effect or logic, but for now simple)
        // Note: In a real app we'd separate page change from filter change

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

          apiUrl += `&page=${page}&limit=5`;
        }

        const res = await axios.get(apiUrl);

        if (res.data.posts) {
          setPosts(res.data.posts);
          setTotalPages(res.data.totalPages);
          // setPage(res.data.currentPage); // Don't override local page request
        } else {
          // Fallback for tags calls that return direct array
          setPosts(Array.isArray(res.data) ? res.data : []);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setPosts([]);
      } finally {
        setLoading(false);
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
      <div className={`${theme === "dark" ? "text dark" : "text"} loading`}>
        Loading...
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
                    {currentUser && (
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
        <div className={`pagination ${theme === "dark" ? "dark" : ""}`}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-grad page-nav"
          >
            Prev
          </button>

          <div className="page-numbers">
            {(() => {
              const pages = [];
              const maxVisible = 7;

              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);

                if (page > 4) pages.push("...");

                const start = Math.max(2, page - 2);
                const end = Math.min(totalPages - 1, page + 2);

                for (let i = start; i <= end; i++) {
                  if (!pages.includes(i)) pages.push(i);
                }

                if (page < totalPages - 3) pages.push("...");
                if (!pages.includes(totalPages)) pages.push(totalPages);
              }

              return pages.map((p, index) => (
                <button
                  key={index}
                  onClick={() => typeof p === 'number' && setPage(p)}
                  className={`page-number ${p === page ? 'active' : ''} ${p === '...' ? 'dots' : ''}`}
                >
                  {p}
                </button>
              ));
            })()}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-grad page-nav"
          >
            Next
          </button>
        </div>
      </div>
      <div className="sidebar-content">
        <Menu cat={catParam} />
        <Newsletter />
      </div >
    </div >
  );
};

export default Home;

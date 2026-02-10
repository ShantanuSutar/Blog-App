import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useThemeContext } from "../Context/theme";
import Tilt from "react-parallax-tilt";
import Menu from "../Components/Menu";

const Home = () => {
  console.log('Home component rendering...');
  const { theme, setTheme } = useThemeContext();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagSearch, setTagSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const cat = params.get('cat') ? `?cat=${params.get('cat')}` : '';
  
  // Extract tag from URL path (for /tag/:tag routes)
  const pathSegments = location.pathname.split('/');
  const urlTag = pathSegments[1] === 'tag' ? pathSegments[2] : null;
  
  const URL = import.meta.env.VITE_BASE_URL;
  
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
        console.log('Starting data fetch...');
        console.log('URL:', URL);
        console.log('Category:', cat);
        console.log('Selected Tag:', selectedTag);
        console.log('URL Tag:', urlTag);
        
        // Reset selected tag if URL tag is present but different
        if (urlTag && urlTag !== selectedTag) {
          setSelectedTag(urlTag);
        }
        
        // Determine the API URL based on filters
        let apiUrl;
        console.log('URL tag:', urlTag, 'Selected tag:', selectedTag, 'Category:', cat);
        if (urlTag) {
          apiUrl = `${URL}/api/posts/tag/${urlTag}`;
          console.log('Fetching by URL tag:', apiUrl);
        } else if (selectedTag) {
          apiUrl = `${URL}/api/posts/tag/${selectedTag}`;
          console.log('Fetching by selected tag:', apiUrl);
        } else if (cat) {
          // If there's a category but no selected tag
          const catParam = cat.startsWith('?') ? cat.substring(1) : cat;
          apiUrl = `${URL}/api/posts?${catParam}`;
          console.log('Fetching by category:', apiUrl);
        } else {
          // Default to all posts
          apiUrl = `${URL}/api/posts`;
          console.log('Fetching all posts:', apiUrl);
        }
        
        console.log('Making API call to:', apiUrl);
        const res = await axios.get(apiUrl);
        console.log('API Response:', res);
        console.log('Fetched posts:', res.data);
        setPosts(res.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        console.error('Error response:', error.response);
        setPosts([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cat, selectedTag, urlTag, URL]);
  
  // Fetch all tags to populate the filter dropdown
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await axios.get(`${URL}/api/posts`);
        const allPostTags = [];
        res.data.forEach(post => {
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
      <div className="filter-section">
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
                        className="tag-option"
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
                    <div className="no-tags">No tags found</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {selectedTag && (
            <button 
              onClick={clearFilter}
              className="btn-grad clear-btn"
            >
              Clear Filter
            </button>
          )}
        </div>
        {selectedTag && (
          <h2 className={theme === "dark" ? "text dark" : "text"}>Posts tagged with: <span className="highlight-tag">{selectedTag}</span></h2>
        )}
      </div>
      <div className="posts">
        {console.log('Rendering posts, count:', posts ? posts.length : 0)}
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <div className="post" key={post.id}>
              <div className={theme === "dark" ? "img dark" : "img"}>
                <Tilt>
                  <img src={post?.img} alt="" />
                </Tilt>
              </div>
              <div className="content">
                <Link className="link" to={`/post/${post.id}`}>
                  <h1 className={theme === "dark" ? "text dark" : "text"}>
                    {post.title}
                  </h1>
                </Link>
                <p className={theme === "dark" ? "text dark" : "text"}>
                  {getText(post.desc)}
                </p>
                <div className="post-tags">
                  {post.tags && (
                    <>
                      <strong>Tags:</strong> 
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
                <Link className="" to={`/post/${post.id}`}>
                  <button className="btn-grad">Read More</button>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="no-posts">
            <p className={theme === "dark" ? "text dark" : "text"}>No posts found for this filter.</p>
          </div>
        )}
      </div>
      <Menu cat={cat} />
    </div>
  );
};

export default Home;

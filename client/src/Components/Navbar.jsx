import { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, Bookmark, CalendarClock, ChevronDown, CircleUserRound, FileText,
  LogOut, Menu, Moon, PenLine, Search, Sun, UserRound, X
} from "lucide-react";
import Logo from "../img/logos/logo-no-background.png";
import { AuthContext } from "../AuthContext/authContext.jsx";
import { useThemeContext } from "../Context/theme";

const categories = [
  { label: "Art", value: "art" },
  { label: "Sci-Tech", value: "scitech" },
  { label: "Sports", value: "sports" },
  { label: "Cinema", value: "cinema" },
  { label: "Food", value: "food" },
  { label: "Travel", value: "travel" },
];

const Navbar = () => {
  const { theme, setTheme } = useThemeContext();
  const { currentUser, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const profileTriggerRef = useRef(null);
  const mobileTriggerRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const activeCategory = location.pathname === "/"
    ? new URLSearchParams(location.search).get("cat")
    : null;
  const avatarBaseUrl = import.meta.env.VITE_BASE_URL;

  const closePanels = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    setSearchOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    closePanels();
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) closePanels();
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (profileOpen) profileTriggerRef.current?.focus();
      else if (searchOpen) searchTriggerRef.current?.focus();
      else if (mobileOpen) mobileTriggerRef.current?.focus();
      closePanels();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen, mobileOpen, searchOpen]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/?search=${encodeURIComponent(query)}` : "/");
    closePanels();
  };

  const handleLogout = async () => {
    closePanels();
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const profileUrl = `/profile/${currentUser?.username}`;

  const categoryLinks = categories.map(({ label, value }) => (
    <Link
      key={value}
      to={`/?cat=${value}`}
      className="nav-topic"
      aria-current={activeCategory === value ? "page" : undefined}
      onClick={closePanels}
    >
      {label}
    </Link>
  ));

  return (
    <header ref={headerRef} className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <nav className="site-nav ui-container" aria-label="Primary navigation">
        <Link className="site-brand" to="/" onClick={closePanels} aria-label="Unsaid home">
          <img src={Logo} alt="" />
          <span className="site-brand-copy">
            <span className="site-brand-name">Unsaid</span>
            <span className="site-brand-tagline">Stories &amp; more</span>
          </span>
        </Link>

        <div className="desktop-topics" aria-label="Explore topics">
          {categoryLinks}
        </div>

        <div className="nav-actions">
          <button
            ref={searchTriggerRef}
            type="button"
            className="ui-button--icon nav-icon-button"
            aria-label={searchOpen ? "Close search" : "Search stories"}
            aria-expanded={searchOpen}
            aria-controls="nav-search"
            onClick={() => {
              setSearchOpen(!searchOpen);
              setProfileOpen(false);
              setMobileOpen(false);
            }}
          >
            {searchOpen ? <X size={19} aria-hidden="true" /> : <Search size={19} aria-hidden="true" />}
          </button>

          <button
            type="button"
            className="ui-button--icon nav-icon-button theme-toggle"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>

          {currentUser ? (
            <div className="desktop-account-actions">
              <Link to="/feed" className="ui-button--icon nav-icon-button" aria-label="Activity feed" title="Activity feed"><Activity size={19} aria-hidden="true" /></Link>
              <Link to="/bookmarks" className="ui-button--icon nav-icon-button" aria-label="Bookmarks" title="Bookmarks"><Bookmark size={19} aria-hidden="true" /></Link>
              <Link to="/write" className="ui-button--primary nav-write-action"><PenLine size={17} aria-hidden="true" /> Write</Link>
              <div className="profile-control">
                <button
                  ref={profileTriggerRef}
                  type="button"
                  className="profile-trigger"
                  aria-label={`${currentUser.username} account menu`}
                  aria-expanded={profileOpen}
                  aria-controls="profile-menu"
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                    setSearchOpen(false);
                  }}
                >
                  {currentUser.avatar
                    ? <img src={`${avatarBaseUrl}${currentUser.avatar}`} alt="" />
                    : <CircleUserRound size={26} aria-hidden="true" />}
                  <ChevronDown className="profile-chevron" size={15} aria-hidden="true" />
                </button>
                {profileOpen && (
                  <div id="profile-menu" className="profile-popover">
                    <div className="profile-popover-heading">
                      <span className="profile-popover-name">{currentUser.username}</span>
                      <span className="ui-caption">Your account</span>
                    </div>
                    <Link to={profileUrl} onClick={closePanels}><UserRound size={17} aria-hidden="true" /> Profile</Link>
                    <Link to="/drafts" onClick={closePanels}><FileText size={17} aria-hidden="true" /> Drafts</Link>
                    <Link to="/scheduled" onClick={closePanels}><CalendarClock size={17} aria-hidden="true" /> Scheduled posts</Link>
                    <Link to="/bookmarks" onClick={closePanels}><Bookmark size={17} aria-hidden="true" /> Bookmarks</Link>
                    <div className="profile-popover-divider" />
                    <button type="button" onClick={handleLogout}><LogOut size={17} aria-hidden="true" /> Log out</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="desktop-guest-actions">
              <Link to="/login" className="ui-button--ghost">Log in</Link>
              <Link to="/register" className="ui-button--primary">Join Unsaid</Link>
            </div>
          )}

          <button
            ref={mobileTriggerRef}
            type="button"
            className="ui-button--icon nav-icon-button mobile-menu-trigger"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setProfileOpen(false);
              setSearchOpen(false);
            }}
          >
            {mobileOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {searchOpen && (
        <div id="nav-search" className="nav-search-panel">
          <form onSubmit={handleSearch} role="search">
            <label className="sr-only" htmlFor="nav-search-input">Search stories</label>
            <Search size={18} aria-hidden="true" />
            <input
              ref={searchInputRef}
              id="nav-search-input"
              type="search"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button type="submit" className="ui-button--primary">Search</button>
          </form>
        </div>
      )}

      {mobileOpen && (
        <div id="mobile-nav" className="mobile-nav-panel">
          <div className="mobile-nav-inner ui-container">
            <span className="mobile-nav-label">Explore</span>
            <div className="mobile-topics">{categoryLinks}</div>
            <div className="mobile-nav-divider" />
            {currentUser ? (
              <div className="mobile-quick-links">
                <Link to="/write" onClick={closePanels}><PenLine size={18} aria-hidden="true" /> Write a story</Link>
                <Link to="/bookmarks" onClick={closePanels}><Bookmark size={18} aria-hidden="true" /> Bookmarks</Link>
                <Link to="/feed" onClick={closePanels}><Activity size={18} aria-hidden="true" /> Activity feed</Link>
                <Link to={profileUrl} onClick={closePanels}><UserRound size={18} aria-hidden="true" /> Profile</Link>
                <Link to="/drafts" onClick={closePanels}><FileText size={18} aria-hidden="true" /> Drafts</Link>
                <Link to="/scheduled" onClick={closePanels}><CalendarClock size={18} aria-hidden="true" /> Scheduled posts</Link>
                <button type="button" onClick={handleLogout}><LogOut size={18} aria-hidden="true" /> Log out</button>
              </div>
            ) : (
              <div className="mobile-guest-actions">
                <Link to="/login" className="ui-button--secondary" onClick={closePanels}>Log in</Link>
                <Link to="/register" className="ui-button--primary" onClick={closePanels}>Join Unsaid</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

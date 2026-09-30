import { Link, useNavigate } from "react-router-dom";
import Logo from "../img/logos/logo-no-background.png";
import { AuthContext } from "../AuthContext/authContext.jsx";
import { CircleUserRound, Moon, Sun } from "lucide-react";
import { useContext, useState, useRef, useEffect } from "react";
import { useThemeContext } from "../Context/theme";

const Navbar = () => {
  const { theme, setTheme } = useThemeContext();
  const { currentUser, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const handleTheme = () => {
    if (theme === "dark") setTheme("light");
    else setTheme("dark");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const URL = import.meta.env.VITE_BASE_URL;

  return (
    <div className={theme === "dark" ? "navbar dark" : "navbar"}>
      <div className="container">
        <div className="logo">
          <Link to={"/"}>
            <img src={Logo} alt="Logo" />
          </Link>
        </div>

        <div className="links">
          <div className="category-links">
            <Link className="link" to={"/?cat=art"}>
              <span className={theme === "dark" ? "text dark" : "text"}>Art</span>
            </Link>
            <Link className="link" to={"/?cat=scitech"}>
              <span className={theme === "dark" ? "text dark" : "text"}> Sci-Tech </span>
            </Link>
            <Link className="link" to={"/?cat=sports"}>
              <span className={theme === "dark" ? "text dark" : "text"}>Sports</span>
            </Link>
            <Link className="link" to={"/?cat=cinema"}>
              <span className={theme === "dark" ? "text dark" : "text"}>Cinema</span>
            </Link>
            <Link className="link" to={"/?cat=food"}>
              <span className={theme === "dark" ? "text dark" : "text"}>Food</span>
            </Link>
            <Link className="link" to={"/?cat=travel"}>
              <span className={theme === "dark" ? "text dark" : "text"}>Travel</span>
            </Link>
          </div>

          <div className="user-menu-container" ref={menuRef}>
            {currentUser ? (
              <>
              <div className={theme === "dark" ? "user-profile dark" : "user-profile"}>
              <button type="button" className="profile-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open account menu" aria-expanded={menuOpen} aria-controls="account-menu">
                {currentUser.avatar ? (
                  <img 
                    src={`${URL}${currentUser.avatar}`} 
                    alt={currentUser.username}
                    className="user-avatar"
                  />
                ) : (
                  <>
                    <CircleUserRound size={24} aria-hidden="true" />
                    <span className={theme === "dark" ? "username dark" : "username"}>{currentUser.username}</span>
                  </>
                )}

              </button>
                {menuOpen && (
                  <div id="account-menu" className={theme === "dark" ? "profile-dropdown dark" : "profile-dropdown"}>
                    <Link className={theme === "dark" ? "dark" : ""} to="/feed" onClick={() => setMenuOpen(false)}>Activity Feed</Link>
                    <Link className={theme === "dark" ? "dark" : ""} to={`/profile/${currentUser.username}`} onClick={() => setMenuOpen(false)}>My Profile</Link>
                    <Link className={theme === "dark" ? "dark" : ""} to="/write" onClick={() => setMenuOpen(false)}>Write</Link>
                    <Link className={theme === "dark" ? "dark" : ""} to="/drafts" onClick={() => setMenuOpen(false)}>Drafts</Link>
                    <Link className={theme === "dark" ? "dark" : ""} to="/scheduled" onClick={() => setMenuOpen(false)}>Scheduled</Link>
                    <Link className={theme === "dark" ? "dark" : ""} to="/bookmarks" onClick={() => setMenuOpen(false)}>Bookmarks</Link>
                    <hr className={theme === "dark" ? "dark" : ""} />
                    <button type="button" className={theme === "dark" ? "dark" : ""} onClick={() => { logout(); setMenuOpen(false); }}>Logout</button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <Link className="btn-grad" to="/login">
                Login
              </Link>
            )}
          </div>

          <button type="button" className="theme-toggle" onClick={handleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

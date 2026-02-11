import { Link, useNavigate } from "react-router-dom";
import Logo from "../img/logos/logo-no-background.png";
import { AuthContext } from "../AuthContext/authContext.jsx";
import Dark from "../img/icons/dark-mode.gif";
import Light from "../img/icons/light-mode.gif";
import Profile from "../img/icons/profile.gif";
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
              <div className={theme === "dark" ? "user-profile dark" : "user-profile"} onClick={() => setMenuOpen(!menuOpen)}>
                <img src={Profile} alt="Profile" />
                <span className={theme === "dark" ? "username dark" : "username"}>{currentUser.username}</span>

                {menuOpen && (
                  <div className={theme === "dark" ? "profile-dropdown dark" : "profile-dropdown"}>
                    <Link className={theme === "dark" ? "dark" : ""} to="/write" onClick={() => setMenuOpen(false)}>Write</Link>
                    <Link className={theme === "dark" ? "dark" : ""} to="/drafts" onClick={() => setMenuOpen(false)}>Drafts</Link>
                    <Link className={theme === "dark" ? "dark" : ""} to="/scheduled" onClick={() => setMenuOpen(false)}>Scheduled</Link>
                    <Link className={theme === "dark" ? "dark" : ""} to="/bookmarks" onClick={() => setMenuOpen(false)}>Bookmarks</Link>
                    <hr className={theme === "dark" ? "dark" : ""} />
                    <span className={theme === "dark" ? "dark" : ""} onClick={() => { logout(); setMenuOpen(false); }}>Logout</span>
                  </div>
                )}
              </div>
            ) : (
              <Link className="btn-grad" to="/login">
                Login
              </Link>
            )}
          </div>

          <span className="theme-toggle" onClick={handleTheme}>
            {theme === "dark" ? (
              <img src={Light} alt="Light Mode" />
            ) : (
              <img src={Dark} alt="Dark Mode" />
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

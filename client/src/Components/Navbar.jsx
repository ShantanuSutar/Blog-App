import { Link } from "react-router-dom";
import Logo from "../img/logos/logo-no-background.png";
import { AuthContext } from "../AuthContext/authContext.jsx";
import Dark from "../img/icons/dark-mode.gif";
import Light from "../img/icons/light-mode.gif";
import Profile from "../img/icons/profile.gif";

import { useContext } from "react";
import { useThemeContext } from "../Context/theme";
const Navbar = () => {
  const { theme, setTheme } = useThemeContext();
  const { currentUser, logout } = useContext(AuthContext);

  const handleTheme = () => {
    if (theme === "dark") setTheme("light");
    else setTheme("dark");
  };
  return (
    <div className={theme === "dark" ? "navbar dark" : "navbar"}>
      <div className="container">
        <div className="logo">
          <Link to={"/"}>
            <img src={Logo} alt="Logo" />
          </Link>
        </div>
        <div className="links">
          <Link className="link" to={"/?cat=art"}>
            <h6 className={theme === "dark" ? "text dark" : "text"}>Art</h6>
          </Link>
          <Link className="link" to={"/?cat=scitech"}>
            <h6 className={theme === "dark" ? "text dark" : "text"}>
              Sci-Tech
            </h6>
          </Link>
          <Link className="link" to={"/?cat=sports"}>
            <h6 className={theme === "dark" ? "text dark" : "text"}>Sports</h6>
          </Link>
          <Link className="link" to={"/?cat=cinema"}>
            <h6 className={theme === "dark" ? "text dark" : "text"}>Cinema</h6>
          </Link>
          <Link className="link" to={"/?cat=food"}>
            <h6 className={theme === "dark" ? "text dark" : "text"}>Food</h6>
          </Link>
          <Link className="link" to={"/?cat=travel"}>
            <h6 className={theme === "dark" ? "text dark" : "text"}>Travel</h6>
          </Link>
          {currentUser && (
            <div className="tooltip user">
              <img src={Profile} alt="" />
              <span className="tooltip-text">{currentUser.username}</span>
            </div>
          )}
          {currentUser ? (
            <span
              className={theme === "dark" ? "text dark" : "text"}
              onClick={logout}
            >
              Logout
            </span>
          ) : (
            <Link className="btn-grad" to="/login">
              Login
            </Link>
          )}
          {currentUser && (
            <Link to="/write" className="write">
              <span className="writelink">Write</span>
            </Link>
          )}
          {/* <span className="btn-grad" onClick={handleTheme}>
            Dark
          </span> */}
          <span onClick={handleTheme}>
            {theme === "dark" ? (
              <img src={Light} alt="" />
            ) : (
              <img src={Dark} alt="" />
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

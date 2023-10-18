import { Link } from "react-router-dom";
import Logo from "../img/logos/logo-no-background.png";
import { AuthContext } from "../../../api/context/authContext";
import { useContext } from "react";
const Navbar = () => {
  const { currentUser, logout } = useContext(AuthContext);
  return (
    <div className="navbar">
      <div className="container">
        <div className="logo">
          <Link to={"/"}>
            <img src={Logo} alt="Logo" />
          </Link>
        </div>
        <div className="links">
          <Link className="link" to={"/?cat=art"}>
            <h6>Art</h6>
          </Link>
          <Link className="link" to={"/?cat=scitech"}>
            <h6>Sci-Tech</h6>
          </Link>
          <Link className="link" to={"/?cat=sports"}>
            <h6>Sports</h6>
          </Link>
          <Link className="link" to={"/?cat=cinema"}>
            <h6>Cinema</h6>
          </Link>
          <Link className="link" to={"/?cat=food"}>
            <h6>Food</h6>
          </Link>
          <Link className="link" to={"/?cat=travel"}>
            <h6>Travel</h6>
          </Link>
          <span>{currentUser?.username}</span>
          {currentUser ? (
            <span onClick={logout}>Logout</span>
          ) : (
            <Link to="/login">Login</Link>
          )}
          <span className="write">
            <Link to="/write" className="link">
              Write
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

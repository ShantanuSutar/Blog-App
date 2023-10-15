import { Link } from "react-router-dom";
import Logo from "../img/logos/logo-no-background.png";
const Navbar = () => {
  return (
    <div className="navbar">
      <div className="container">
        <div className="logo">
          <img src={Logo} alt="Logo" />
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
          <span>John</span>
          <span>Logout</span>
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

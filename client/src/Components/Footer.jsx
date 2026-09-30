import Logo from "../img/logos/logo-no-background.png";
import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner ui-container">
        <img src={Logo} alt="" />
        <span className="text">
          Made with <Heart size={16} fill="currentColor" aria-label="love" /> and <b>Reactjs</b>
        </span>
      </div>
    </footer>
  );
};

export default Footer;

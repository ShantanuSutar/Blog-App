import { useContext } from "react";
import { ArrowRight, PenLine } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext.jsx";
import Logo from "../img/logos/logo-no-background.png";

const discoveryLinks = [
  { label: "Latest stories", to: "/" },
  { label: "Art", to: "/?cat=art" },
  { label: "Sci-Tech", to: "/?cat=scitech" },
  { label: "Cinema", to: "/?cat=cinema" },
  { label: "Food", to: "/?cat=food" },
  { label: "Travel", to: "/?cat=travel" },
];

const Footer = () => {
  const { currentUser } = useContext(AuthContext);
  const profilePath = currentUser
    ? `/profile/${encodeURIComponent(currentUser.username)}`
    : "/login";
  const accountLinks = currentUser
    ? [
        { label: "Your profile", to: profilePath },
        { label: "Bookmarks", to: "/bookmarks" },
        { label: "Activity", to: "/feed" },
        { label: "Drafts", to: "/drafts" },
        { label: "Scheduled posts", to: "/scheduled" },
      ]
    : [
        { label: "Log in", to: "/login" },
        { label: "Create an account", to: "/register" },
      ];

  return (
    <footer className="site-footer">
      <div className="site-footer__inner ui-container">
        <div className="site-footer__grid">
          <section className="site-footer__about" aria-labelledby="footer-brand-name">
            <Link className="site-footer__brand" to="/" aria-label="Unsaid home">
              <img src={Logo} alt="" />
              <span>
                <strong id="footer-brand-name">Unsaid</strong>
                <small>Stories &amp; more</small>
              </span>
            </Link>
            <p>Ideas, experiences, and perspectives worth slowing down for.</p>
            <Link className="site-footer__action" to={currentUser ? "/write" : "/register"}>
              <PenLine size={17} aria-hidden="true" />
              {currentUser ? "Write a story" : "Start writing"}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>

          <nav className="site-footer__nav" aria-labelledby="footer-discover-heading">
            <h2 id="footer-discover-heading">Discover</h2>
            <ul>
              {discoveryLinks.map((link) => (
                <li key={link.label}><Link to={link.to}>{link.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav className="site-footer__nav" aria-labelledby="footer-account-heading">
            <h2 id="footer-account-heading">{currentUser ? "Your space" : "Join Unsaid"}</h2>
            <ul>
              {accountLinks.map((link) => (
                <li key={link.label}><Link to={link.to}>{link.label}</Link></li>
              ))}
              {!currentUser && <li><Link to="/bookmarks">Save stories</Link></li>}
            </ul>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <p>&copy; {new Date().getFullYear()} Unsaid. All stories belong to their authors.</p>
          <p>Read thoughtfully. Write honestly.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

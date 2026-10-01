import { Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../../img/logos/logo-no-background.png";
import { useThemeContext } from "../../Context/theme.jsx";

export default function AuthLayout({ eyebrow, title, description, children, footer }) {
  const { theme, setTheme } = useThemeContext();
  const dark = theme === "dark";

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="auth-brand" to="/" aria-label="Unsaid home">
          <img src={Logo} alt="" />
          <span>
            <strong>Unsaid</strong>
            <small>Stories &amp; more</small>
          </span>
        </Link>
        <button
          className="ui-button--icon auth-theme-toggle"
          type="button"
          aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
          aria-pressed={dark}
          onClick={() => setTheme(dark ? "light" : "dark")}
        >
          {dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
        </button>
      </header>

      <main className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card__heading">
            <span className="auth-eyebrow">{eyebrow}</span>
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          <div className="auth-card__footer">{footer}</div>
        </section>
      </main>

      <footer className="auth-page-footer">Read thoughtfully. Write honestly.</footer>
    </div>
  );
}

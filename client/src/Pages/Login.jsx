import { useContext, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext/authContext.jsx";
import AuthLayout from "../Components/auth/AuthLayout.jsx";
import PasswordField from "../Components/auth/PasswordField.jsx";
import LoadingButton from "../Components/ui/LoadingButton.jsx";

const mapLoginError = (error) => {
  if (!error.response) return "We couldn’t reach Unsaid. Check your connection and try again.";
  if ([400, 401, 404].includes(error.response.status)) return "The username or password is incorrect.";
  if (error.response.status === 429) return "Too many login attempts. Please wait a moment and try again.";
  return "We couldn’t log you in right now. Please try again.";
};

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, login } = useContext(AuthContext);
  const [inputs, setInputs] = useState({ username: location.state?.username || "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const registrationSuccess = Boolean(location.state?.registrationSuccess);
  const requestedDestination = location.state?.from;
  const destination = typeof requestedDestination === "string"
    && requestedDestination.startsWith("/")
    && !requestedDestination.startsWith("//")
    ? requestedDestination
    : "/";

  if (currentUser) return <Navigate to={destination} replace />;

  const updateField = (field, value) => {
    setInputs((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setFormError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!inputs.username.trim()) nextErrors.username = "Enter your username.";
    if (!inputs.password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    const firstInvalid = nextErrors.username ? "login-username" : nextErrors.password ? "login-password" : null;
    if (firstInvalid) window.requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    setFormError("");
    try {
      await login({ username: inputs.username.trim(), password: inputs.password });
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(mapLoginError(error));
      setLoading(false);
    }
  };

  const useDemoAccount = () => {
    setInputs({ username: "demo", password: "demo" });
    setErrors({});
    setFormError("");
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Continue your story"
      description="Log in to write, save stories, and join the conversation."
      footer={<p>New to Unsaid? <Link to="/register">Create an account</Link></p>}
    >
      {registrationSuccess && (
        <div className="auth-notice auth-notice--success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>Your account is ready. Log in to continue.</span>
        </div>
      )}

      {formError && <div className="auth-notice auth-notice--error" role="alert">{formError}</div>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className={`auth-field ${errors.username ? "has-error" : ""}`}>
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            name="username"
            type="text"
            value={inputs.username}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            autoFocus
            onChange={(event) => updateField("username", event.target.value)}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? "login-username-error" : undefined}
            required
          />
          {errors.username && <p className="auth-field__error" id="login-username-error">{errors.username}</p>}
        </div>

        <PasswordField
          id="login-password"
          value={inputs.password}
          visible={passwordVisible}
          error={errors.password}
          autoComplete="current-password"
          required
          onChange={(event) => updateField("password", event.target.value)}
          onToggle={() => setPasswordVisible((visible) => !visible)}
        />

        <LoadingButton className="ui-button--primary auth-submit" type="submit" loading={loading} loadingLabel="Logging in…" icon={KeyRound}>Log in</LoadingButton>
      </form>

      <aside className="auth-demo" aria-labelledby="demo-heading">
        <div>
          <h2 id="demo-heading">Just looking around?</h2>
          <p>Use the project’s demo account without creating a profile.</p>
        </div>
        <button className="ui-button--ghost" type="button" onClick={useDemoAccount}>Use demo account</button>
      </aside>
    </AuthLayout>
  );
}

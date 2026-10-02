import { useContext, useState } from "react";
import { UserPlus } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { AuthContext } from "../AuthContext/authContext.jsx";
import AuthLayout from "../Components/auth/AuthLayout.jsx";
import PasswordField from "../Components/auth/PasswordField.jsx";
import LoadingButton from "../Components/ui/LoadingButton.jsx";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-zA-Z0-9_]+$/;

const mapRegistrationError = (error) => {
  if (!error.response) return "We couldn’t reach Unsaid. Check your connection and try again.";
  if (error.response.status === 409) return "An account with that username or email already exists.";
  if (error.response.status === 429) return "Too many attempts. Please wait a moment and try again.";
  return "We couldn’t create your account right now. Please try again.";
};

export default function Register() {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const [inputs, setInputs] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  if (currentUser) return <Navigate to="/" replace />;

  const updateField = (field, value) => {
    setInputs((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setFormError("");
  };

  const validate = () => {
    const nextErrors = {};
    const username = inputs.username.trim();
    const email = inputs.email.trim();
    if (!username) nextErrors.username = "Choose a username.";
    else if (username.length < 3) nextErrors.username = "Use at least 3 characters.";
    else if (username.length > 30) nextErrors.username = "Use no more than 30 characters.";
    else if (!usernamePattern.test(username)) nextErrors.username = "Use only letters, numbers, and underscores.";
    if (!email) nextErrors.email = "Enter your email address.";
    else if (!emailPattern.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!inputs.password) nextErrors.password = "Create a password.";
    else if (inputs.password.length < 6) nextErrors.password = "Use at least 6 characters.";
    setErrors(nextErrors);
    const firstInvalid = nextErrors.username ? "register-username" : nextErrors.email ? "register-email" : nextErrors.password ? "register-password" : null;
    if (firstInvalid) window.requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    setFormError("");
    const payload = {
      username: inputs.username.trim(),
      email: inputs.email.trim().toLowerCase(),
      password: inputs.password,
    };
    try {
      await api.post("/api/auth/register", payload);
      navigate("/login", { replace: true, state: { registrationSuccess: true, username: payload.username } });
    } catch (error) {
      setFormError(mapRegistrationError(error));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Join Unsaid"
      title="Create your account"
      description="A simple account is all you need to publish stories and save the ones you love."
      footer={<p>Already have an account? <Link to="/login">Log in</Link></p>}
    >
      {formError && <div className="auth-notice auth-notice--error" role="alert">{formError}</div>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className={`auth-field ${errors.username ? "has-error" : ""}`}>
          <label htmlFor="register-username">Username</label>
          <input
            id="register-username"
            name="username"
            type="text"
            value={inputs.username}
            maxLength={30}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            autoFocus
            onChange={(event) => updateField("username", event.target.value)}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? "register-username-help register-username-error" : "register-username-help"}
            required
          />
          <p className="auth-field__help" id="register-username-help">Letters, numbers, and underscores only.</p>
          {errors.username && <p className="auth-field__error" id="register-username-error">{errors.username}</p>}
        </div>

        <div className={`auth-field ${errors.email ? "has-error" : ""}`}>
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            value={inputs.email}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck="false"
            onChange={(event) => updateField("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            required
          />
          {errors.email && <p className="auth-field__error" id="register-email-error">{errors.email}</p>}
        </div>

        <PasswordField
          id="register-password"
          value={inputs.password}
          visible={passwordVisible}
          error={errors.password}
          help="Use at least 6 characters."
          autoComplete="new-password"
          required
          onChange={(event) => updateField("password", event.target.value)}
          onToggle={() => setPasswordVisible((visible) => !visible)}
        />

        <LoadingButton className="ui-button--primary auth-submit" type="submit" loading={loading} loadingLabel="Creating account…" icon={UserPlus}>Create account</LoadingButton>
      </form>
    </AuthLayout>
  );
}

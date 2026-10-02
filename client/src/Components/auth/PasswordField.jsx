import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({
  id = "password",
  label = "Password",
  value,
  visible,
  error,
  help,
  autoComplete,
  required = false,
  onChange,
  onToggle,
}) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = [help && !error ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`auth-field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-password-control">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          value={value}
          maxLength={72}
          autoComplete={autoComplete}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required={required}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={onToggle}
        >
          {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
      </div>
      {help && !error && <p className="auth-field__help" id={helpId}>{help}</p>}
      {error && <p className="auth-field__error" id={errorId}>{error}</p>}
    </div>
  );
}

export default function StatePanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  compact = false,
  tone = "neutral",
  role,
  headingLevel = 2,
  className = "",
}) {
  const Heading = `h${headingLevel}`;
  const classes = ["ui-state-panel", compact && "ui-state-panel--compact", `ui-state-panel--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role={role}>
      {Icon && <Icon className="ui-state-panel__icon" size={compact ? 24 : 30} strokeWidth={1.6} aria-hidden="true" />}
      {eyebrow && <span className="ui-state-panel__eyebrow">{eyebrow}</span>}
      {title && <Heading>{title}</Heading>}
      {description && <p>{description}</p>}
      {action && <div className="ui-state-panel__action">{action}</div>}
    </div>
  );
}

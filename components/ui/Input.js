/**
 * Input component - text input or textarea with optional icon.
 *
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} placeholder
 * @param {string} value
 * @param {Function} onChange
 * @param {string} type - Input type (defaults to "text")
 * @param {boolean} multiline - Renders textarea instead of input
 * @param {number} rows - Number of rows for textarea (defaults to 4)
 * @param {boolean} readOnly - Read-only state
 * @param {boolean} disabled - Disabled state
 * @param {string} className - Additional CSS classes
 */
export function Input({
  icon: Icon,
  placeholder,
  value,
  onChange,
  type = "text",
  multiline = false,
  rows = 4,
  readOnly = false,
  disabled = false,
  className = "",
  ...props
}) {
  const baseStyles = `w-full ${Icon ? "pl-10" : "px-4"} pr-4 py-2 border border-ink/15 rounded-ui focus-ring focus:border-ink/40 text-ink font-body bg-newsprint placeholder:text-ink/30 transition-all duration-fast ease-smooth`;
  const stateStyles = readOnly ? "bg-ink/5 cursor-default" : disabled ? "opacity-50 cursor-not-allowed bg-ink/5" : "";

  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink/40" />
      )}
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          rows={rows}
          readOnly={readOnly}
          disabled={disabled}
          className={`${baseStyles} ${stateStyles} resize-none`}
          {...props}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          disabled={disabled}
          className={`${baseStyles} ${stateStyles}`}
          {...props}
        />
      )}
    </div>
  );
}

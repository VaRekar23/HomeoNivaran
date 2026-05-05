import { clsx } from "clsx"

const Input = ({
  label,
  error,
  hint,
  className = "",
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        className={clsx(
          "input",
          error && "input-error",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  )
}

export default Input
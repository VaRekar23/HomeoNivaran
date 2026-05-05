import { clsx } from "clsx"
import { Loader2 } from "lucide-react"

const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) => {
  const variants = {
    primary:   "btn-primary",
    secondary: "btn-secondary",
    danger:    "btn-danger",
    ghost:     "btn-ghost",
  }

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  }

  return (
    <button
      className={clsx(
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {children}
    </button>
  )
}

export default Button
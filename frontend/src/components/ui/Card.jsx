import { clsx } from "clsx"

const Card = ({
  children,
  className = "",
  padding = true,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "card",
        padding && "p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = "" }) => (
  <div className={clsx("mb-4", className)}>{children}</div>
)

export const CardTitle = ({ children, className = "" }) => (
  <h3 className={clsx("text-slate-900", className)}>{children}</h3>
)

export default Card
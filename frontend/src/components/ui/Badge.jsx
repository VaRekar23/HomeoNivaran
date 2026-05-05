import { clsx } from "clsx"
import { getStatusColor, formatStatus } from "../../utils/formatters"

const Badge = ({ status, label, className = "" }) => {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        getStatusColor(status),
        className
      )}
    >
      {label || formatStatus(status)}
    </span>
  )
}

export default Badge
import { Loader2 } from "lucide-react"
import { clsx } from "clsx"

const Spinner = ({ size = "md", className = "" }) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  return (
    <div className={clsx("flex items-center justify-center", className)}>
      <Loader2
        className={clsx(
          sizes[size],
          "animate-spin text-primary-600"
        )}
      />
    </div>
  )
}

export const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Spinner size="lg" />
  </div>
)

export default Spinner
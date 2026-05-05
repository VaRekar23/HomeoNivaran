import { useEffect } from "react"
import { X } from "lucide-react"
import { clsx } from "clsx"

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEsc)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal box */}
      <div
        className={clsx(
          "relative w-full bg-white rounded-2xl shadow-modal z-10",
          sizes[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="btn-ghost p-2 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default Modal
import Modal from "./Modal"
import Button from "./Button"
import { AlertTriangle } from "lucide-react"

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  loading = false,
  variant = "danger",
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
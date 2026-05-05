import { MapPin, Edit2, Trash2, Star } from "lucide-react"
import { clsx } from "clsx"

const LABEL_ICONS = {
  Home:    "🏠",
  Office:  "🏢",
  Parents: "👨‍👩‍👧",
  Other:   "📍",
}

const AddressCard = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  selectable = false,
  selected = false,
  onSelect,
}) => {
  const isDefault = address.is_default

  return (
    <div
      onClick={selectable ? () => onSelect?.(address) : undefined}
      className={clsx(
        "card p-4 transition-all duration-150",
        selectable && "cursor-pointer",
        selected && "border-2 border-primary-500 bg-primary-50",
        !selected && selectable && "hover:border-primary-300 hover:bg-slate-50",
        isDefault && !selectable && "border-primary-200 bg-primary-50/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {LABEL_ICONS[address.label] || "📍"}
          </span>
          <div>
            <span className="text-sm font-semibold text-slate-800">
              {address.label}
            </span>
            {isDefault && (
              <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                Default
              </span>
            )}
          </div>
        </div>

        {/* Actions — only when not in selectable mode */}
        {!selectable && (
          <div className="flex gap-1">
            {!isDefault && (
              <button
                onClick={() => onSetDefault?.(address.id)}
                className="btn-ghost p-1.5 text-slate-400 hover:text-amber-500"
                title="Set as default"
              >
                <Star className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onEdit?.(address)}
              className="btn-ghost p-1.5 text-slate-400 hover:text-primary-600"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete?.(address)}
              className="btn-ghost p-1.5 text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selected indicator */}
        {selectable && selected && (
          <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </div>

      {/* Address content */}
      <div className="space-y-0.5 text-sm text-slate-600">
        <p className="font-medium text-slate-800">{address.full_name}</p>
        <p className="text-xs text-slate-500">{address.phone}</p>
        <p className="text-xs text-slate-500 mt-1">
          {address.line1}
          {address.line2 && `, ${address.line2}`}
        </p>
        <p className="text-xs text-slate-500">
          {address.city}, {address.state} — {address.pincode}
        </p>
      </div>
    </div>
  )
}

export default AddressCard
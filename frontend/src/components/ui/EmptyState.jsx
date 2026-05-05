import { Inbox } from "lucide-react"

const EmptyState = ({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  description = "",
  action = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-slate-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}

export default EmptyState
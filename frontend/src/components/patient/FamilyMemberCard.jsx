import { User, Edit2, Trash2, AlertCircle, Calendar } from "lucide-react"
import { clsx } from "clsx"

const GENDER_ICONS = {
  male:   "👨",
  female: "👩",
  other:  "🧑",
}

const RELATION_COLORS = {
  self:    "bg-primary-100 text-primary-800",
  spouse:  "bg-pink-100 text-pink-800",
  child:   "bg-green-100 text-green-700",
  parent:  "bg-amber-100 text-amber-700",
  sibling: "bg-purple-100 text-purple-700",
  other:   "bg-slate-100 text-slate-600",
}

const FamilyMemberCard = ({ member, onEdit, onDelete }) => {
  const relationColor =
    RELATION_COLORS[member.relation] || RELATION_COLORS.other

  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-200">

      {/* Top row — avatar + actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
            {GENDER_ICONS[member.gender] || "🧑"}
          </div>
          {/* Name + relation badge */}
          <div>
            <h3 className="text-slate-900 text-base">{member.name}</h3>
            <span
              className={clsx(
                "inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize mt-0.5",
                relationColor
              )}
            >
              {member.relation}
            </span>
          </div>
        </div>

        {/* Edit + Delete buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(member)}
            className="btn-ghost p-2 text-slate-400 hover:text-primary-600"
            title="Edit member"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(member)}
            className="btn-ghost p-2 text-slate-400 hover:text-red-600"
            title="Remove member"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info row — age + gender */}
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          {member.age} years · {member.gender}
          <span className="text-slate-300">·</span>
          <span className="text-xs">
            DOB: {new Date(member.dob).toLocaleDateString("en-IN")}
          </span>
        </span>
      </div>

      {/* Allergies */}
      {member.known_allergies && (
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-700 mb-0.5">
              Known Allergies
            </p>
            <p className="text-xs text-amber-600">{member.known_allergies}</p>
          </div>
        </div>
      )}

      {/* Medical notes */}
      {member.medical_notes && (
        <div className="mt-2 px-3 py-2 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">{member.medical_notes}</p>
        </div>
      )}
    </div>
  )
}

export default FamilyMemberCard
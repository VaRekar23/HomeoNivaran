import { Users, Plus, ChevronRight } from "lucide-react"
import { clsx } from "clsx"
import { Link } from "react-router-dom"
import { PageSpinner } from "../../ui/Spinner"
import { useFamilyMembers } from "../../../hooks/useFamilyMembers"

const GENDER_ICONS = {
  male: "👨",
  female: "👩",
  other: "🧑",
}

const Step1_Member = ({ selectedMemberId, onSelect }) => {
  const { data, isLoading } = useFamilyMembers()
  const members = Array.isArray(data) ? data : []

  if (isLoading) return <PageSpinner />

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-slate-700 mb-2">No family members yet</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
          You need to add at least one family member before starting
          a consultation.
        </p>
        <Link
          to="/patient/family"
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Family Member
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-slate-900 mb-1">
        Who needs the consultation?
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Select the family member this consultation is for.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((member) => {
          const isSelected = selectedMemberId === member.id
          return (
            <button
              key={member.id}
              onClick={() => onSelect(member)}
              className={clsx(
                "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150",
                isSelected
                  ? "border-primary-500 bg-primary-50"
                  : "border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50"
              )}
            >
              {/* Avatar */}
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                {GENDER_ICONS[member.gender] || "🧑"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className={clsx(
                    "font-semibold text-sm",
                    isSelected
                      ? "text-primary-800"
                      : "text-slate-900"
                  )}
                >
                  {member.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">
                  {member.relation} · {member.age} yrs ·{" "}
                  {member.gender}
                </p>
                {member.known_allergies && (
                  <p className="text-xs text-amber-600 mt-1 truncate">
                    ⚠️ {member.known_allergies}
                  </p>
                )}
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Step1_Member
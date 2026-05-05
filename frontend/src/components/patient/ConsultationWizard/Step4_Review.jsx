import { CheckCircle2, User, HeartPulse, MessageSquare } from "lucide-react"
import { MapPin } from "lucide-react"

const Step4_Review = ({ member, ailment, address, questions, answers }) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-slate-900 mb-0">Review your answers</h2>
          <p className="text-slate-500 text-sm">
            Please review before submitting to the doctor.
          </p>
        </div>
      </div>

      {/* Member summary */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          <User className="w-3.5 h-3.5" />
          Patient
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-xl">
            {member?.gender === "female" ? "👩" : "👨"}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{member?.name}</p>
            <p className="text-xs text-slate-500 capitalize">
              {member?.relation} · {member?.age} years ·{" "}
              {member?.gender}
            </p>
          </div>
        </div>
      </div>

      {/* Ailment summary */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          <HeartPulse className="w-3.5 h-3.5" />
          Condition
        </div>
        <div>
          <p className="font-semibold text-slate-800">{ailment?.name}</p>
          <p className="text-xs text-slate-500">{ailment?.category}</p>
        </div>
      </div>

      {/* Address summary */}
      {address && (
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            <MapPin className="w-3.5 h-3.5" />
            Delivery Address
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {address.label} — {address.full_name}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {address.line1}{address.line2 && `, ${address.line2}`}
          </p>
          <p className="text-xs text-slate-500">
            {address.city}, {address.state} — {address.pincode}
          </p>
        </div>
      )}

      {/* Q&A summary */}
      <div className="card p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          <MessageSquare className="w-3.5 h-3.5" />
          Your Answers ({questions.length} questions)
        </div>
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="border-b border-slate-50 pb-3 last:border-0 last:pb-0"
            >
              <p className="text-xs text-slate-500 mb-1">
                Q{index + 1}. {q.question_text}
              </p>
              <p className="text-sm font-medium text-slate-800">
                {answers[q.id] || (
                  <span className="text-amber-500 font-normal">
                    Not answered
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Submit note */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          Once submitted, our doctor will review your case and
          prepare a personalised homeopathy prescription for you.
          You will be notified when it's ready.
        </p>
      </div>
    </div>
  )
}

export default Step4_Review
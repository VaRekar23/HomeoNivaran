import { useState } from "react"
import { Star, ThumbsUp, ThumbsDown, Send, CheckCircle2 } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { treatmentFeedbackApi } from "../../api/treatmentFeedback.api"
import Button from "../ui/Button"

// ── Star Rating Component ──
const StarRating = ({ value, onChange, label, size = "normal" }) => {
  const [hover, setHover] = useState(0)
  const starSize = size === "large" ? "w-8 h-8" : "w-5 h-5"

  return (
    <div className="space-y-1">
      {label && (
        <p className="text-xs text-slate-500">{label}</p>
      )}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`${starSize} transition-colors ${
                star <= (hover || value)
                  ? "text-amber-400 fill-amber-400"
                  : "text-slate-200"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Yes/No Toggle ──
const YesNoToggle = ({ value, onChange, label }) => (
  <div className="space-y-1">
    <p className="text-xs text-slate-500">{label}</p>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(value === true ? null : true)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
          value === true
            ? "border-green-500 bg-green-50 text-green-700"
            : "border-slate-200 text-slate-500 hover:border-green-300"
        }`}
      >
        <ThumbsUp className="w-4 h-4" />
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(value === false ? null : false)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
          value === false
            ? "border-red-400 bg-red-50 text-red-700"
            : "border-slate-200 text-slate-500 hover:border-red-300"
        }`}
      >
        <ThumbsDown className="w-4 h-4" />
        No
      </button>
    </div>
  </div>
)

// ── Main Form ──
const TreatmentFeedbackForm = ({
  consultationId,
  ailmentName,
  existingFeedback = null,
  onSuccess,
  compact = false,
}) => {
  const queryClient = useQueryClient()

  const [ratings, setRatings] = useState({
    overall_rating:          existingFeedback?.overall_rating || 0,
    treatment_effectiveness: existingFeedback?.treatment_effectiveness || 0,
    doctor_communication:    existingFeedback?.doctor_communication || 0,
    delivery_experience:     existingFeedback?.delivery_experience || 0,
  })
  const [feelingBetter,   setFeelingBetter]   = useState(
    existingFeedback?.feeling_better ?? null
  )
  const [wouldRecommend, setWouldRecommend] = useState(
    existingFeedback?.would_recommend ?? null
  )
  const [comments,       setComments]       = useState(
    existingFeedback?.comments || ""
  )

  const mutation = useMutation({
    mutationFn: (data) => treatmentFeedbackApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["treatment-feedback", consultationId]
      })
      toast.success("Thank you for your feedback!")
      onSuccess?.()
    },
    onError: (e) => {
      toast.error(
        e.response?.data?.detail || "Failed to submit feedback"
      )
    },
  })

  const handleSubmit = () => {
    if (!ratings.overall_rating) {
      toast.error("Please give an overall rating")
      return
    }
    mutation.mutate({
      consultation_id:         consultationId,
      overall_rating:          ratings.overall_rating,
      treatment_effectiveness: ratings.treatment_effectiveness || null,
      doctor_communication:    ratings.doctor_communication || null,
      delivery_experience:     ratings.delivery_experience || null,
      feeling_better:          feelingBetter,
      would_recommend:         wouldRecommend,
      comments:                comments || null,
    })
  }

  return (
    <div className="space-y-5">
      {!compact && ailmentName && (
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-400 mb-0.5">
            Feedback for
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {ailmentName}
          </p>
        </div>
      )}

      {/* Overall rating — prominent */}
      <div className="text-center py-4 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-sm font-medium text-slate-700 mb-3">
          Overall, how was your experience?
        </p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() =>
                setRatings((r) => ({ ...r, overall_rating: star }))
              }
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= ratings.overall_rating
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-200"
                }`}
              />
            </button>
          ))}
        </div>
        {ratings.overall_rating > 0 && (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][
              ratings.overall_rating
            ]}
          </p>
        )}
      </div>

      {/* Detailed ratings */}
      {!compact && (
        <div className="space-y-4">
          {/* Each rating on its own row — works at any width */}
          {[
            {
              key:   "treatment_effectiveness",
              label: "Treatment Effectiveness",
            },
            {
              key:   "doctor_communication",
              label: "Doctor Communication",
            },
            {
              key:   "delivery_experience",
              label: "Delivery Experience",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0"
            >
              <span className="text-xs text-slate-500 flex-shrink-0">
                {item.label}
              </span>
              <div className="flex gap-1 flex-shrink-0">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setRatings((r) => ({ ...r, [item.key]: star }))
                    }
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 transition-colors ${
                        star <= ratings[item.key]
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yes/No questions */}
      <div className="space-y-3">
        <YesNoToggle
          label="Are you feeling better after treatment?"
          value={feelingBetter}
          onChange={setFeelingBetter}
        />
        <YesNoToggle
          label="Would you recommend HomeoNivaran?"
          value={wouldRecommend}
          onChange={setWouldRecommend}
        />
      </div>

      {/* Comments */}
      <div className="space-y-1">
        <label className="text-xs text-slate-500">
          Additional comments (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Share anything about your treatment experience..."
          className="input resize-none text-sm"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </div>

      <Button
        variant="primary"
        onClick={handleSubmit}
        loading={mutation.isPending}
        disabled={!ratings.overall_rating}
        className="w-full"
      >
        <Send className="w-4 h-4" />
        {existingFeedback
          ? "Update Feedback"
          : "Submit Feedback"
        }
      </Button>
    </div>
  )
}

export default TreatmentFeedbackForm
import { useState, useEffect } from "react"
import { Brain, AlertCircle } from "lucide-react"
import { clsx } from "clsx"

const QuestionCard = ({ question, value, onChange, index }) => {
  const renderInput = () => {
    switch (question.question_type) {

      case "yes_no":
        return (
          <div className="flex gap-3">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={clsx(
                  "flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all",
                  value === opt
                    ? "border-primary-500 bg-primary-50 text-primary-800"
                    : "border-slate-200 text-slate-600 hover:border-primary-300"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )

      case "mcq":
        return (
          <div className="space-y-2">
            {(question.options || []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={clsx(
                  "w-full py-3 px-4 rounded-xl border-2 text-left text-sm font-medium transition-all",
                  value === opt
                    ? "border-primary-500 bg-primary-50 text-primary-800"
                    : "border-slate-200 text-slate-600 hover:border-primary-300 hover:bg-slate-50"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )

      case "scale":
        return (
          <div>
            <div className="flex gap-2 mb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onChange(String(num))}
                  className={clsx(
                    "flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all",
                    value === String(num)
                      ? "border-primary-500 bg-primary-600 text-white"
                      : "border-slate-200 text-slate-600 hover:border-primary-300"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>No pain</span>
              <span>Severe</span>
            </div>
          </div>
        )

      case "text":
      default:
        return (
          <textarea
            rows={3}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer here..."
            className="input resize-none"
          />
        )
    }
  }

  return (
    <div className="card p-5">
      {/* Question number + text */}
      <div className="flex items-start gap-3 mb-4">
        <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
          {index + 1}
        </span>
        <p className="text-slate-800 font-medium text-sm leading-relaxed">
          {question.question_text}
        </p>
      </div>

      {/* Input based on type */}
      {renderInput()}

      {/* Unanswered indicator */}
      {!value && (
        <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Please answer this question
        </p>
      )}
    </div>
  )
}

const Step3_Questions = ({
  consultation,
  answers,
  onAnswerChange,
}) => {
  const questions = consultation?.questions || []
  const answeredCount = Object.values(answers).filter(
    (a) => a && a.trim()
  ).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Brain className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-slate-900 mb-1">
            Answer these questions
          </h2>
          <p className="text-slate-500 text-sm">
            These questions help our doctor understand your condition
            better. Please answer as accurately as possible.
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{answeredCount} of {questions.length} answered</span>
          <span>
            {Math.round((answeredCount / questions.length) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all duration-300"
            style={{
              width: `${(answeredCount / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, index) => (
          <QuestionCard
            key={q.id}
            question={q}
            value={answers[q.id] || ""}
            onChange={(val) => onAnswerChange(q.id, val)}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}

export default Step3_Questions
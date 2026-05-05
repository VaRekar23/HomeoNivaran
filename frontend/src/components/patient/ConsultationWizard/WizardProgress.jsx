import { Check } from "lucide-react"
import { clsx } from "clsx"

const STEPS = [
  { number: 1, label: "Select Member" },
  { number: 2, label: "Select Ailment" },
  { number: 3, label: "Select Address" },
  { number: 4, label: "Answer Questions" },
  { number: 5, label: "Review & Submit" },
]

const WizardProgress = ({ currentStep }) => {
  return (
    <div className="mb-8">
      {/* Desktop — horizontal stepper */}
      <div className="hidden sm:flex items-center justify-between relative">

        {/* Connector line behind steps */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary-600 z-0 transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
          }}
        />

        {STEPS.map((step) => {
          const isDone = step.number < currentStep
          const isActive = step.number === currentStep

          return (
            <div
              key={step.number}
              className="flex flex-col items-center gap-2 relative z-10"
            >
              {/* Circle */}
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-all duration-300",
                  isDone &&
                    "bg-primary-600 border-primary-600 text-white",
                  isActive &&
                    "bg-white border-primary-600 text-primary-700",
                  !isDone &&
                    !isActive &&
                    "bg-white border-slate-200 text-slate-400"
                )}
              >
                {isDone ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>

              {/* Label */}
              <span
                className={clsx(
                  "text-xs font-medium whitespace-nowrap",
                  isActive ? "text-primary-700" : "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile — simple text indicator */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="text-sm text-slate-500">
            {STEPS[currentStep - 1].label}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all duration-500"
            style={{
              width: `${(currentStep / STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default WizardProgress
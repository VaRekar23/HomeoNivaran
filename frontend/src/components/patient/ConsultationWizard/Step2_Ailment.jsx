import { useState } from "react"
import { ChevronRight, ArrowLeft } from "lucide-react"
import { clsx } from "clsx"
import { PageSpinner } from "../../ui/Spinner"
import {
  useAilments,
  useAilmentCategories,
} from "../../../hooks/useAilments"
import { getAilmentIcon } from "../../../utils/ailmentIcons"

const Step2_Ailment = ({ selectedAilmentId, onSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState(null)

  const { data: categories = [], isLoading: loadingCats } =
    useAilmentCategories()

  const { data: ailments = [], isLoading: loadingAilments } =
    useAilments(selectedCategory)

  if (loadingCats) return <PageSpinner />

  return (
    <div>
      {!selectedCategory ? (
        // ── Category selection ──
        <>
          <h2 className="text-slate-900 mb-1">
            What's the condition?
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Select a category to see specific conditions we treat.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const CatIcon = getAilmentIcon(cat.icon)
              return (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50 transition-all duration-150 group"
                >
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                    <CatIcon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-700">
                      {cat.category}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cat.ailment_count} condition
                      {cat.ailment_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500" />
                </button>
              )
            })}
          </div>
        </>
      ) : (
        // ── Ailment selection within category ──
        <>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className="btn-ghost p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-slate-900 mb-0">
                {selectedCategory}
              </h2>
              <p className="text-slate-500 text-sm">
                Select the specific condition
              </p>
            </div>
          </div>

          {loadingAilments ? (
            <PageSpinner />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ailments.map((ailment) => {
                const AilmentIcon = getAilmentIcon(ailment.icon)
                const isSelected = selectedAilmentId === ailment.id
                return (
                  <button
                    key={ailment.id}
                    onClick={() => onSelect(ailment)}
                    className={clsx(
                      "flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary-500 bg-primary-50"
                        : "border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0",
                        isSelected ? "bg-primary-100" : "bg-slate-50"
                      )}
                    >
                      <AilmentIcon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p
                        className={clsx(
                          "font-semibold text-sm",
                          isSelected
                            ? "text-primary-800"
                            : "text-slate-900"
                        )}
                      >
                        {ailment.name}
                      </p>
                      {ailment.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {ailment.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                        <ChevronRight className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Step2_Ailment
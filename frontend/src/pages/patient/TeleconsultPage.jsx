import { Phone, Clock, Calendar, CheckCircle2 } from "lucide-react"
import Card from "../../components/ui/Card"
import { PageSpinner } from "../../components/ui/Spinner"
import { usePublicAvailability } from "../../hooks/useAvailability"

const DAYS = [
  "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday", "Sunday"
]

const formatTime = (timeStr) => {
  if (!timeStr) return ""
  const [h, m] = timeStr.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

const TeleconsultPage = () => {
  const { data: availability = [], isLoading } = usePublicAvailability()

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-slate-900 mb-1">
          Teleconsultation
        </h1>
        <p className="text-slate-500 text-sm">
          Call the doctor directly during available hours for
          quick questions or follow-ups.
        </p>
      </div>

      {availability.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <Phone className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">
              No availability schedule set yet.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Check back later or contact via your consultation.
            </p>
          </div>
        </Card>
      ) : (
        availability.map((doctor) => (
          <div key={doctor.doctor_id} className="space-y-4">

            {/* Status card */}
            <Card>
              <div className={`flex items-center gap-4 p-4 rounded-xl mb-4 ${
                doctor.is_available_now
                  ? "bg-green-50 border border-green-200"
                  : "bg-slate-50 border border-slate-200"
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  doctor.is_available_now ? "bg-green-100" : "bg-slate-100"
                }`}>
                  <Phone className={`w-6 h-6 ${
                    doctor.is_available_now
                      ? "text-green-600"
                      : "text-slate-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 text-sm">
                      {doctor.doctor_name}
                    </p>
                    {doctor.is_available_now && (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Available Now
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {doctor.is_available_now
                      ? "Doctor is online — you can call now"
                      : doctor.next_slot
                      ? `Next available: ${doctor.next_slot.day_name}, ${formatTime(doctor.next_slot.start_time)}`
                      : "Currently offline"}
                  </p>
                </div>
              </div>

              {/* Call button */}
              {doctor.is_available_now ? (
                <a
                  href={`tel:${doctor.doctor_phone}`}
                  className="flex items-center justify-center gap-2 w-full bg-primary-800 text-white py-4 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Call Dr. {doctor.doctor_name.split(" ")[0]}
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-400 py-4 rounded-xl font-medium">
                  <Clock className="w-5 h-5" />
                  Doctor is Offline
                </div>
              )}
            </Card>

            {/* Weekly schedule */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Weekly Availability Schedule
              </h3>
              <div className="space-y-3">
                {DAYS.map((day, index) => {
                  const daySlots = doctor.slots?.filter(
                    (s) => s.day_of_week === index
                  ) || []
                  return (
                    <div
                      key={day}
                      className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0"
                    >
                      <span className={`text-sm w-28 flex-shrink-0 ${
                        daySlots.length > 0
                          ? "text-slate-700 font-medium"
                          : "text-slate-300"
                      }`}>
                        {day}
                      </span>
                      {daySlots.length > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                          {daySlots.map((slot) => (
                            <span
                              key={slot.id}
                              className="text-sm text-primary-700 font-medium"
                            >
                              {formatTime(slot.start_time)} —{" "}
                              {formatTime(slot.end_time)}
                              {slot.label && (
                                <span className="text-xs text-slate-400 ml-1">
                                  ({slot.label})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">
                          Not available
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Note */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
              <strong>Note:</strong> Teleconsultation is for quick
              questions and follow-ups only. For a new health concern,
              please start a new consultation through the app so the
              doctor can review your case properly.
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default TeleconsultPage
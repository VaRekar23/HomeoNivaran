import { Link } from "react-router-dom"
import {
  Leaf,
  Stethoscope,
  ClipboardList,
  Brain,
  CreditCard,
  Package,
  Shield,
  Clock,
  Users,
  Star,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ArrowRight,
  HeartPulse,
  Pill,
  Microscope,
  Menu,
  X,
  Calendar,
} from "lucide-react"
import { useEffect, useState } from "react"
import { authApi } from "../../api/auth.api"
import api from "../../api/axios"
import { usePublicAvailability } from "../../hooks/useAvailability"
import { usePublicAilments, usePublicAilmentCategories } from "../../hooks/useAilments"
import { getAilmentIcon } from "../../utils/ailmentIcons"

// ─────────────────────────────────────────
// DATA — defined outside component so it
// doesn't recreate on every render
// ─────────────────────────────────────────

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Teleconsult",   href: "#teleconsult" },
  { label: "Conditions", href: "#conditions" },
  { label: "Contact", href: "#contact" },
]

const STEPS = [
  {
    step: "01",
    icon: Users,
    title: "Create Your Profile",
    description:
      "Register and add your family members. Each member has their own health profile with age, gender, and medical history.",
  },
  {
    step: "02",
    icon: ClipboardList,
    title: "Select a Condition",
    description:
      "Choose from our list of conditions we treat. Select which family member needs the consultation.",
  },
  {
    step: "03",
    icon: Brain,
    title: "Answer AI Questions",
    description:
      "Our AI asks you the same clinical questions a doctor would ask — symptoms, duration, severity, triggers.",
  },
  {
    step: "04",
    icon: Stethoscope,
    title: "Doctor Reviews Your Case",
    description:
      "Dr. reviews all your answers with AI assistance and prepares a personalised homeopathy prescription.",
  },
  {
    step: "05",
    icon: Package,
    title: "Medicine Delivered",
    description:
      "Pay securely online and your homeopathy medicine is dispatched directly to your doorstep.",
  },
]

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Consultation",
    description:
      "Our AI generates personalised clinical questions based on your condition, age, and gender — just like sitting with a doctor.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Stethoscope,
    title: "Real Doctor Review",
    description:
      "Every case is personally reviewed by a qualified homeopathy doctor. AI assists — the doctor decides.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Shield,
    title: "Safe & Private",
    description:
      "Your medical data is encrypted and private. We follow strict data protection practices for all patient records.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Users,
    title: "Family Profiles",
    description:
      "Manage consultations for your entire family — spouse, children, parents — all from one account.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: Clock,
    title: "No Waiting Rooms",
    description:
      "Consult from anywhere, anytime. No appointments needed. Get your prescription without leaving home.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: Package,
    title: "Home Delivery",
    description:
      "Authentic homeopathy medicines dispatched directly to your door with full tracking information.",
    color: "bg-pink-50 text-pink-600",
  },
]

const STATS = [
  { value: "100+", label: "Patients Served" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "10+", label: "Conditions Treated" },
  { value: "24h", label: "Avg. Response Time" },
]

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

// Navbar
const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  const scrollToSection = (e, href) => {
    e.preventDefault()
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">
              Homeo<span className="text-primary-700">Nivaran</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="text-sm text-slate-600 hover:text-primary-700 font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-primary-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="btn-primary text-sm px-4 py-2"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden btn-ghost p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen
              ? <X className="w-5 h-5" />
              : <Menu className="w-5 h-5" />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="block text-sm text-slate-600 font-medium py-2"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              to="/login"
              className="btn-secondary w-full justify-center"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="btn-primary w-full justify-center"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ConditionsSection with dynamic version:
const ConditionsSection = () => {
  const { data: ailments = [], isLoading } = usePublicAilments()
  const { data: categories = [] } = usePublicAilmentCategories()

  if (isLoading || ailments.length === 0) return null

  return (
    <section id="conditions" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <span className="text-primary-700 text-sm font-semibold uppercase tracking-wider">
            Conditions We Treat
          </span>
          <h2 className="text-slate-900 mt-2 mb-4">
            Natural Relief for Common Ailments
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            We specialise in treating everyday health conditions with
            personalised homeopathy prescriptions.
          </p>
        </div>

        <div className="space-y-10">
          {categories.map((cat) => {
            const catAilments = ailments.filter(
              (a) => a.category === cat.category
            )
            if (catAilments.length === 0) return null

            // Use category icon from first ailment
            const CatIcon = getAilmentIcon(cat.icon)

            return (
              <div key={cat.category}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 bg-primary-50 rounded-lg flex items-center justify-center">
                    <CatIcon className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-sm font-semibold text-primary-700 uppercase tracking-wider">
                    {cat.category}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="flex flex-wrap gap-3">
                  {catAilments.map((ailment) => {
                    const Icon = getAilmentIcon(ailment.icon)
                    return (
                      <div
                        key={ailment.id}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:border-primary-300 hover:shadow-md transition-all duration-200"
                      >
                        <Icon className="w-4 h-4 text-primary-500" />
                        <span className="text-sm font-medium text-slate-700">
                          {ailment.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-3">
          <HeartPulse className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 mb-1">
              Important Note
            </p>
            <p className="text-sm text-blue-600">
              HomeoNivaran treats mild to moderate everyday conditions
              only. For serious or emergency conditions please consult
              a doctor in person.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Teleconsult Section for Landing Page ──
const TeleconsultSection = () => {
  const { data: availability = [], isLoading } = usePublicAvailability()

  if (isLoading || availability.length === 0) return null

  const doctor = availability[0]

  const DAYS = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday"
  ]

  const formatTime = (timeStr) => {
    if (!timeStr) return ""
    const [h, m] = timeStr.split(":").map(Number)
    const period = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, "0")} ${period}`
  }

  return (
    <section id="teleconsult" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — content */}
          <div>
            <span className="text-primary-700 text-sm font-semibold uppercase tracking-wider">
              Direct Access
            </span>
            <h2 className="text-slate-900 mt-2 mb-4">
              Teleconsultation Available
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Need a quick answer? Call the doctor directly during
              available hours. No appointment needed — just call
              during the scheduled times below.
            </p>

            {/* Live status */}
            <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
              doctor.is_available_now
                ? "bg-green-50 border border-green-200"
                : "bg-slate-50 border border-slate-100"
            }`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                doctor.is_available_now
                  ? "bg-green-500 animate-pulse"
                  : "bg-slate-300"
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  doctor.is_available_now
                    ? "text-green-800"
                    : "text-slate-700"
                }`}>
                  {doctor.is_available_now
                    ? "Dr. is available right now!"
                    : "Dr. is currently offline"}
                </p>
                {!doctor.is_available_now && doctor.next_slot && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Next available: {doctor.next_slot.day_name},{" "}
                    {formatTime(doctor.next_slot.start_time)}
                  </p>
                )}
              </div>
              {doctor.is_available_now && (
                <a
                  href={`tel:${doctor.doctor_phone}`}
                  className="ml-auto flex items-center gap-2 bg-primary-800 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </a>
              )}
            </div>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm text-primary-700 font-medium hover:underline"
            >
              Create account for full consultation →
            </Link>
          </div>

          {/* Right — weekly schedule */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary-600" />
              Weekly Teleconsult Schedule
            </h3>
            <div className="space-y-2">
              {DAYS.map((day, index) => {
                const daySlots = doctor.slots?.filter(
                  (s) => s.day_of_week === index
                ) || []
                return (
                  <div
                    key={day}
                    className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0"
                  >
                    <span className={`text-sm ${
                      daySlots.length > 0
                        ? "text-slate-700 font-medium"
                        : "text-slate-300"
                    }`}>
                      {day}
                    </span>
                    {daySlots.length > 0 ? (
                      <div className="flex flex-col items-end gap-0.5">
                        {daySlots.map((slot) => (
                          <span
                            key={slot.id}
                            className="text-sm text-primary-700 font-semibold"
                          >
                            {formatTime(slot.start_time)} —{" "}
                            {formatTime(slot.end_time)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">
                        Unavailable
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Hero Section
const HeroSection = () => (
  <section className="pt-24 pb-20 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 relative overflow-hidden">

    {/* Background decorative circles */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/20 rounded-full -translate-y-1/2 translate-x-1/3" />
    <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-600/20 rounded-full translate-y-1/2 -translate-x-1/3" />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-3xl mx-auto text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-sm font-medium px-4 py-2 rounded-full mb-8 border border-white/20">
          <Leaf className="w-4 h-4" />
          Personalised Homeopathy Consultations
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight text-balance">
          Natural Healing,
          <br />
          <span className="text-blue-300">Delivered to Your Door</span>
        </h1>

        {/* Subtext */}
        <p className="text-lg text-primary-200 mb-10 max-w-2xl mx-auto leading-relaxed">
          Consult with a qualified homeopathy doctor from the comfort of your home.
          AI-assisted case review, personalised prescriptions, and doorstep delivery
          — for you and your entire family.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 bg-white text-primary-800 font-semibold px-8 py-4 rounded-xl hover:bg-primary-50 transition-colors text-base"
          >
            Start Your Consultation
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault()
              document.querySelector("#how-it-works")
                ?.scrollIntoView({ behavior: "smooth" })
            }}
            className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-medium px-8 py-4 rounded-xl hover:bg-white/20 transition-colors border border-white/20 text-base"
          >
            See How It Works
          </a>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {[
            "No appointment needed",
            "Real doctor review",
            "Home delivery",
          ].map((text) => (
            <div
              key={text}
              className="flex items-center gap-2 text-primary-200 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-300 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

// Stats Bar
const StatsBar = () => {
  const [stats, setStats] = useState({
    patients_served: "100+",
    satisfaction_rate: "98%",
    conditions_treated: "10+",
    avg_response_hours: "24h",
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await authApi.getPublicStats()
        const data = res.data
        setStats({
          patients_served:
            data.patients_served > 0
              ? `${data.patients_served}+`
              : "100+",
          satisfaction_rate: `${data.satisfaction_rate}%`,
          conditions_treated:
            data.conditions_treated > 0
            ? `${data.conditions_treated}+`
            : "10+",
          avg_response_hours: `${data.avg_response_hours}h`,
        })
      } catch {
        // Keep default values if API fails
      }
    }
    fetchStats()
  }, [])

  const STATS = [
    { value: stats.patients_served, label: "Patients Served" },
    { value: stats.satisfaction_rate, label: "Satisfaction Rate" },
    { value: stats.conditions_treated, label: "Conditions Treated" },
    { value: stats.avg_response_hours, label: "Avg. Response Time" },
  ]

  return (
    <section className="bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
          {STATS.map((stat) => (
            <div key={stat.label} className="py-8 text-center">
              <div className="text-3xl font-bold text-primary-800 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// How It Works Section
const HowItWorksSection = () => (
  <section
    id="how-it-works"
    className="py-24 bg-slate-50"
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* Section header */}
      <div className="text-center mb-16">
        <span className="text-primary-700 text-sm font-semibold uppercase tracking-wider">
          Simple Process
        </span>
        <h2 className="text-slate-900 mt-2 mb-4">
          How HomeoNivaran Works
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          From registration to receiving your medicine — the entire process
          is designed to be as simple and stress-free as possible.
        </p>
      </div>

      {/* Steps */}
      <div className="relative">

        {/* Connecting line (desktop only) */}
        <div className="hidden lg:block absolute top-16 left-[10%] right-[10%] h-0.5 bg-slate-200 z-0" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 relative z-10">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.step}
                className="flex flex-col items-center text-center"
              >
                {/* Icon circle */}
                <div className="w-16 h-16 bg-white border-2 border-primary-200 rounded-full flex items-center justify-center mb-4 shadow-sm relative">
                  <Icon className="w-7 h-7 text-primary-700" />
                  {/* Step number badge */}
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary-800 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>
                <h4 className="text-slate-900 mb-2 text-sm font-semibold">
                  {step.title}
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA below steps */}
      <div className="text-center mt-16">
        <Link
          to="/register"
          className="btn-primary px-8 py-3 text-base"
        >
          Start Your First Consultation
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  </section>
)

// Features Section
const FeaturesSection = () => (
  <section id="features" className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* Section header */}
      <div className="text-center mb-16">
        <span className="text-primary-700 text-sm font-semibold uppercase tracking-wider">
          Why Choose Us
        </span>
        <h2 className="text-slate-900 mt-2 mb-4">
          Everything You Need for Better Health
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          HomeoNivaran combines the wisdom of traditional homeopathy with
          modern AI technology to give you the best care possible.
        </p>
      </div>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="card p-6 hover:shadow-md transition-shadow duration-200 group"
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Content */}
              <h3 className="text-slate-900 text-base mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  </section>
)

// How AI Helps Section
const AISection = () => (
  <section className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left — content */}
        <div>
          <span className="text-primary-700 text-sm font-semibold uppercase tracking-wider">
            AI + Human Expertise
          </span>
          <h2 className="text-slate-900 mt-2 mb-4">
            The Best of Both Worlds
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Our AI doesn't replace the doctor — it makes her better.
            By gathering detailed patient information upfront, the doctor
            can focus entirely on diagnosis and finding the perfect remedy.
          </p>

          <div className="space-y-5">
            {[
              {
                icon: Brain,
                title: "AI Gathers Information",
                desc: "Asks the right clinical questions based on your specific condition, age, and gender",
              },
              {
                icon: ClipboardList,
                title: "AI Summarises Your Case",
                desc: "Creates a concise clinical summary so the doctor understands your situation instantly",
              },
              {
                icon: Pill,
                title: "AI Suggests Remedies",
                desc: "Provides medicine suggestions as a reference — the doctor always makes the final decision",
              },
              {
                icon: Stethoscope,
                title: "Doctor Prescribes",
                desc: "Your qualified homeopathy doctor reviews everything and writes your personalised prescription",
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex gap-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-700" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 text-sm font-semibold mb-1">
                      {item.title}
                    </h4>
                    <p className="text-slate-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right — visual card */}
        <div className="bg-gradient-to-br from-primary-900 to-primary-700 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Microscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-semibold">AI Case Analysis</div>
              <div className="text-primary-300 text-xs">
                Powered by Claude AI
              </div>
            </div>
          </div>

          {/* Mock AI output */}
          <div className="space-y-4">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-xs text-primary-300 mb-2 uppercase tracking-wider">
                Patient Summary
              </div>
              <p className="text-sm leading-relaxed text-primary-100">
                "28-year-old female presenting with dry, itchy skin for
                3 weeks. Symptoms worsen in cold weather and improve with
                warm compresses. No known allergies..."
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-xs text-primary-300 mb-2 uppercase tracking-wider">
                AI Suggestion
              </div>
              <div className="space-y-2">
                {[
                  { med: "Sulphur 30C", reason: "Dry, burning skin" },
                  { med: "Graphites 200C", reason: "Cracked, oozing skin" },
                ].map((s) => (
                  <div
                    key={s.med}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">{s.med}</span>
                    <span className="text-xs text-primary-300">
                      {s.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/20 rounded-xl p-4 border border-white/30">
              <div className="flex items-center gap-2 text-blue-300 text-xs mb-1">
                <Shield className="w-3 h-3" />
                Doctor reviews and finalises prescription
              </div>
              <div className="text-xs text-primary-300">
                AI suggestions are reference only. Your doctor makes all
                final prescribing decisions.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)

// CTA Section
const CTASection = () => (
  <section className="py-24 bg-primary-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-white mb-4">
        Ready to Start Your Healing Journey?
      </h2>
      <p className="text-primary-200 mb-10 max-w-2xl mx-auto">
        Join hundreds of patients who have found natural relief through
        HomeoNivaran. Register today and get your first consultation.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/register"
          className="inline-flex items-center justify-center gap-2 bg-white text-primary-800 font-semibold px-8 py-4 rounded-xl hover:bg-primary-50 transition-colors text-base"
        >
          Create Free Account
          <ArrowRight className="w-5 h-5" />
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-medium px-8 py-4 rounded-xl hover:bg-white/20 transition-colors border border-white/20 text-base"
        >
          Already have an account? Sign In
        </Link>
      </div>
    </div>
  </section>
)

// Footer
const Footer = () => (
  <footer id="contact" className="bg-slate-900 text-slate-400">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* Brand column */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">
              Homeo<span className="text-primary-400">Nivaran</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-6 max-w-sm">
            Personalised homeopathy consultations from the comfort of
            your home. Qualified doctors, AI assistance, and genuine
            medicines delivered to your door.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-primary-400" />
              contact@homeonivaran.in
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary-400" />
              +91 7057185582
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary-400" />
              Navi Mumbai, Maharashtra, India
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="text-white text-sm font-semibold mb-4">
            Quick Links
          </h4>
          <ul className="space-y-2 text-sm">
            {[
              { label: "How It Works", href: "#how-it-works" },
              { label: "Features", href: "#features" },
              { label: "Conditions", href: "#conditions" },
              { label: "Register", href: "/register" },
              { label: "Sign In", href: "/login" },
              { label: "Terms & Conditions", href: "/terms" },
              { label: "Privacy Policy",     href: "/terms#privacy" },
            ].map((link) => (
              <li key={link.label}>
                {link.href.startsWith("#") ? (
                  <a
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    to={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Conditions */}
        {/* <div>
          <h4 className="text-white text-sm font-semibold mb-4">
            Conditions We Treat
          </h4>
          <ul className="space-y-2 text-sm">
            {CONDITIONS.slice(0, 8).map((c) => (
              <li key={c.name} className="hover:text-white transition-colors">
                {c.name}
              </li>
            ))}
          </ul>
        </div> */}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs">
          © {new Date().getFullYear()} HomeoNivaran. All rights reserved.
        </p>
        <div className="flex items-center gap-2 text-xs">
          <Shield className="w-3 h-3 text-primary-400" />
          Medical consultations for informational purposes only.
          Always consult a doctor for serious conditions.
        </div>
      </div>
    </div>
  </footer>
)

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <StatsBar />
        <HowItWorksSection />
        <FeaturesSection />
        <TeleconsultSection />
        <ConditionsSection />
        <AISection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}

export default LandingPage
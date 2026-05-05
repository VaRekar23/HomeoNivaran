import { Link } from "react-router-dom"
import { Leaf } from "lucide-react"

const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex-col justify-between p-12 relative overflow-hidden">

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xl font-bold">
            Homeo<span className="text-blue-300">Nivaran</span>
          </span>
        </Link>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold leading-tight mb-6">
            Natural healing,
            <br />
            <span className="text-blue-300">wherever you are.</span>
          </h2>
          <p className="text-primary-200 text-lg leading-relaxed mb-10">
            Consult with a qualified homeopathy doctor from
            the comfort of your home. AI-assisted, personalised,
            and delivered to your door.
          </p>

          {/* Feature bullets */}
          <div className="space-y-4">
            {[
              "Personalised AI-assisted consultation",
              "Real doctor review for every case",
              "Genuine medicines delivered home",
              "Manage your entire family's health",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-blue-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-300 rounded-full" />
                </div>
                <span className="text-primary-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom disclaimer */}
        <p className="text-primary-400 text-xs relative z-10">
          For mild to moderate conditions only.
          Not a substitute for emergency medical care.
        </p>
      </div>

      {/* Right panel — form area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">

        {/* Mobile logo (shown only on small screens) */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">
              Homeo<span className="text-primary-700">Nivaran</span>
            </span>
          </Link>
        </div>

        {/* Form content injected here */}
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}

export default PublicLayout
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, UserPlus, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"

import PublicLayout from "../../layouts/PublicLayout"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { registerSchema } from "../../utils/validators"
import { authApi } from "../../api/auth.api"
import useAuthStore from "../../store/auth.store"

const RegisterPage = () => {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  })

  // Watch password for strength indicator
  const passwordValue = watch("password")

  const getPasswordStrength = (password) => {
    if (!password) return null
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }
    const passed = Object.values(checks).filter(Boolean).length
    if (passed <= 1) return { label: "Weak", color: "bg-red-400", width: "w-1/4" }
    if (passed === 2) return { label: "Fair", color: "bg-amber-400", width: "w-2/4" }
    if (passed === 3) return { label: "Good", color: "bg-blue-400", width: "w-3/4" }
    return { label: "Strong", color: "bg-green-500", width: "w-full" }
  }

  const strength = getPasswordStrength(passwordValue)

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      // Step 1 — Register
      await authApi.register({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      })

      // Step 2 — Auto login after registration
      const loginResponse = await authApi.login({
        email: data.email,
        password: data.password,
      })

      const { access_token, user } = loginResponse.data
      login(user, access_token)

      toast.success(`Welcome to HomeoNivaran, ${user.name}!`)
      navigate("/patient/dashboard")

    } catch (error) {
      // 400 errors (duplicate email/phone) are shown by interceptor
      // Only handle unexpected cases here
      if (!error.response) {
        toast.error("Registration failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-slate-900 mb-2">Create your account</h2>
        <p className="text-slate-500 text-sm">
          Join HomeoNivaran and start your consultation today
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Name */}
        <Input
          label="Full name"
          type="text"
          placeholder="Vaibhav Sharma"
          error={errors.name?.message}
          {...register("name")}
        />

        {/* Email */}
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        {/* Phone */}
        <Input
          label="Mobile number"
          type="tel"
          placeholder="9876543210"
          hint="10-digit mobile number without country code"
          error={errors.phone?.message}
          {...register("phone")}
        />

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              className={`input pr-10 ${errors.password ? "input-error" : ""}`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          </div>

          {/* Password strength indicator */}
          {passwordValue && strength && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                />
              </div>
              <p className="text-xs text-slate-400">
                Password strength:{" "}
                <span className="font-medium text-slate-600">
                  {strength.label}
                </span>
              </p>
            </div>
          )}

          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              className={`input pr-10 ${errors.confirmPassword ? "input-error" : ""}`}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirm
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms notice */}
        <div className="flex items-start gap-2 py-2">
          <CheckCircle2 className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-500">
            By creating an account you agree to our{" "}
            <Link
              to="/terms"
              target="_blank"
              className="text-primary-700 font-medium hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              to="/terms#privacy"
              target="_blank"
              className="text-primary-700 font-medium hover:underline"
            >
              Privacy Policy
            </Link>
            . Your medical data is kept private and secure.
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          className="w-full py-3 text-base"
        >
          <UserPlus className="w-4 h-4" />
          Create Account
        </Button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary-700 font-medium hover:underline"
        >
          Sign in here
        </Link>
      </p>
    </PublicLayout>
  )
}

export default RegisterPage
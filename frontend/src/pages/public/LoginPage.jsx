import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, LogIn } from "lucide-react"
import toast from "react-hot-toast"

import PublicLayout from "../../layouts/PublicLayout"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { loginSchema } from "../../utils/validators"
import { authApi } from "../../api/auth.api"
import useAuthStore from "../../store/auth.store"

const LoginPage = () => {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const response = await authApi.login(data)
      const { access_token, user } = response.data

      // Save to Zustand store (also saves to localStorage via persist)
      login(user, access_token)

      toast.success(`Welcome back, ${user.name}!`)

      // Redirect based on role
      const redirects = {
        patient: "/patient/dashboard",
        doctor:  "/doctor/dashboard",
        admin:   "/admin/dashboard",
      }
      navigate(redirects[user.role] || "/patient/dashboard")

    } catch (error) {
      // Axios interceptor already shows toast for 401
      // We only need to handle unexpected errors here
      if (!error.response) {
        toast.error("Login failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-slate-900 mb-2">Welcome back</h2>
        <p className="text-slate-500 text-sm">
          Sign in to your HomeoNivaran account
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Email */}
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          className="w-full py-3 text-base mt-2"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </Button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-slate-500 mt-6">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="text-primary-700 font-medium hover:underline"
        >
          Create one free
        </Link>
      </p>

      {/* Demo credentials hint (remove in production) */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-medium text-slate-600 mb-2">
          Demo Credentials
        </p>
        <div className="space-y-1 text-xs text-slate-500">
          <p>
            <span className="font-medium">Patient:</span>{" "}
            vaibhav@example.com / password123
          </p>
          <p>
            <span className="font-medium">Doctor:</span>{" "}
            doctor@homeopathy.com / Doctor@1234
          </p>
          <p>
            <span className="font-medium">Admin:</span>{" "}
            admin@homeopathy.com / Admin@1234
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}

export default LoginPage
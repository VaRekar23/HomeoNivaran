import { z } from "zod"

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string()
    .min(10, "Phone must be at least 10 digits")
    .max(15, "Phone must be at most 15 digits")
    .regex(/^\d+$/, "Phone must contain only numbers"),
  password: z.string()
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: "Passwords do not match", path: ["confirmPassword"] }
)

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export const familyMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], {
    message: "Select a valid gender"
  }),
  relation: z.string().min(2, "Relation is required"),
  known_allergies: z.string().optional(),
  medical_notes: z.string().optional(),
})

export const prescriptionItemSchema = z.object({
  medicine_name: z.string().min(2, "Medicine name is required"),
  potency: z.string().min(1, "Potency is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional(),
})

export const prescriptionSchema = z.object({
  doctor_notes: z.string().optional(),
  total_amount: z.number().min(1, "Amount must be greater than 0"),
  medicines: z.array(prescriptionItemSchema)
    .min(1, "At least one medicine is required"),
})

export const feedbackSchema = z.object({
  type: z.enum(["bug_report", "feature_request", "general"]),
  page: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  rating: z.number().min(1).max(5).optional().nullable(),
})

export const dispatchSchema = z.object({
  courier_name: z.string().min(2, "Courier name is required"),
  tracking_number: z.string().min(2, "Tracking number is required"),
})

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string()
    .min(10, "Phone must be at least 10 digits")
    .max(15, "Phone must be at most 15 digits")
    .regex(/^\d+$/, "Phone must contain only numbers"),
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
}).refine(
  (data) => data.new_password === data.confirm_password,
  { message: "Passwords do not match", path: ["confirm_password"] }
)
import { createBrowserRouter, Navigate } from "react-router-dom"
import ProtectedRoute from "./ProtectedRoute"
import RoleRoute from "./RoleRoute"

// Layouts
import PatientLayout from "../layouts/PatientLayout"

// Public pages
import LandingPage from "../pages/public/LandingPage"
import LoginPage from "../pages/public/LoginPage"
import RegisterPage from "../pages/public/RegisterPage"
import TermsPage from "../pages/public/TermsPage"

// Patient pages
import DashboardPage from "../pages/patient/DashboardPage"
import FamilyMembersPage from "../pages/patient/FamilyMembersPage"
import NewConsultationPage from "../pages/patient/NewConsultationPage"
import ConsultationHistoryPage from "../pages/patient/ConsultationHistoryPage"
import ConsultationDetailPage from "../pages/patient/ConsultationDetailPage"
import OrdersPage from "../pages/patient/OrdersPage"
import OrderDetailPage from "../pages/patient/OrderDetailPage"
import ProfilePage from "../pages/patient/ProfilePage"
import NotificationsPage from "../pages/patient/NotificationsPage"
import AnswerQuestionsPage from "../pages/patient/AnswerQuestionsPage"
import TeleconsultPage from "../pages/patient/TeleconsultPage"

// Doctor pages
import DoctorLayout from "../layouts/DoctorLayout"
import DoctorDashboardPage from "../pages/doctor/DoctorDashboardPage"
import PatientQueuePage from "../pages/doctor/PatientQueuePage"
import CaseReviewPage from "../pages/doctor/CaseReviewPage"
import DoctorOrdersPage from "../pages/doctor/DoctorOrdersPage"
import AvailabilityPage from "../pages/doctor/AvailabilityPage"
import AddPatientPage from "../pages/doctor/AddPatientPage"
import InventoryPage   from "../pages/doctor/InventoryPage"
import AilmentsPage from "../pages/doctor/AilmentsPage"

// Admin pages
import AdminLayout from "../layouts/AdminLayout"
import AdminDashboardPage from "../pages/admin/AdminDashboardPage"
import LogsPage from "../pages/admin/LogsPage"
import FeedbackPage from "../pages/admin/FeedbackPage"
import UsersPage from "../pages/admin/UsersPage"
import AdminOrdersPage from "../pages/admin/AdminOrdersPage"
import HealthPage from "../pages/admin/HealthPage"
import AnalyticsPage   from "../pages/admin/AnalyticsPage"
import MonitorPage from "../pages/admin/MonitorPage"

// We'll uncomment these as we build each page
// Placeholder for now
const ComingSoon = ({ page }) => (
  <div className="flex items-center justify-center min-h-screen">
    <p className="text-slate-500">{page} — coming soon</p>
  </div>
)

export const router = createBrowserRouter([
  // ── Public routes ──
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/terms", element: <TermsPage /> },

  // ── Patient routes ──
  {
    path: "/patient",
    element: (
      <RoleRoute allowedRoles={["patient"]}>
        <PatientLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "family", element: <FamilyMembersPage /> },
      { path: "consultations/new", element: <NewConsultationPage /> },
      { path: "consultations", element: <ConsultationHistoryPage /> },
      { path: "consultations/:id", element: <ConsultationDetailPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "orders/:id", element: <OrderDetailPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "consultations/:id/answer", element: <AnswerQuestionsPage /> },
      { path: "teleconsult", element: <TeleconsultPage /> },
    ],
  },

  // ── Doctor routes ──
  {
    path: "/doctor",
    element: (
      <RoleRoute allowedRoles={["doctor"]}>
        <DoctorLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
    { path: "dashboard", element: <DoctorDashboardPage /> },
    { path: "queue", element: <PatientQueuePage /> },
    { path: "cases/:id", element: <CaseReviewPage /> },
    { path: "orders", element: <DoctorOrdersPage /> },
    { path: "availability",  element: <AvailabilityPage /> },
    { path: "add-patient",   element: <AddPatientPage /> },
    { path: "inventory", element: <InventoryPage /> },
    { path: "ailments", element: <AilmentsPage /> },
    ],
  },

  // ── Admin routes ──
  {
    path: "/admin",
    element: (
      <RoleRoute allowedRoles={["admin"]}>
        <AdminLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <AdminDashboardPage /> },
      { path: "logs", element: <LogsPage /> },
      { path: "feedback", element: <FeedbackPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "orders", element: <AdminOrdersPage /> },
      { path: "health", element: <HealthPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "monitor", element: <MonitorPage /> },
    ],
  },

  // ── Fallback redirects ──
  { path: "/doctor", element: <Navigate to="/doctor/dashboard" replace /> },
  { path: "/admin", element: <Navigate to="/admin/dashboard" replace /> },

  // ── 404 ──
  {
    path: "*",
    element: (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-6xl font-bold text-slate-200">404</h1>
        <p className="text-slate-500">Page not found</p>
        <a href="/" className="btn-primary">Go Home</a>
      </div>
    ),
  },
])
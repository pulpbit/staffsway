import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import { LoadingState } from '@/components/ui/state'

import ManagementDashboardPage from '@/features/dashboard/ManagementDashboardPage'
import EmployeesPage from '@/features/employees/EmployeesPage'
import ClientsPage from '@/features/clients/ClientsPage'
import SitesPage from '@/features/sites/SitesPage'
import AttendancePage from '@/features/attendance/AttendancePage'
import RecruitmentPage from '@/features/recruitment/RecruitmentPage'
import LeavesPage from '@/features/leaves/LeavesPage'
import PayrollPage from '@/features/payroll/PayrollPage'
import SalarySlipsPage from '@/features/slips/SalarySlipsPage'
import ReportsPage from '@/features/reports/ReportsPage'
import CompliancePage from '@/features/compliance/CompliancePage'
import PerformancePage from '@/features/performance/PerformancePage'
import DocumentsPage from '@/features/documents/DocumentsPage'
import AssetsPage from '@/features/assets/AssetsPage'
import TrainingPage from '@/features/training/TrainingPage'
import SeparationPage from '@/features/separation/SeparationPage'
import HelpdeskPage from '@/features/helpdesk/HelpdeskPage'
import MySpacePage from '@/features/myspace/MySpacePage'
import SettingsPage from '@/features/settings/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingState />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function IndexRoute() {
  const { user } = useAuth()
  if (user?.role === 'employee') return <Navigate to="/my" replace />
  return <ManagementDashboardPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<IndexRoute />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="recruitment" element={<RecruitmentPage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="slips" element={<SalarySlipsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="separation" element={<SeparationPage />} />
        <Route path="helpdesk" element={<HelpdeskPage />} />
        <Route path="my" element={<MySpacePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

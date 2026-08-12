import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import { LoadingState } from '@/components/ui/state'

import DashboardPage from '@/features/dashboard/DashboardPage'
import EmployeesPage from '@/features/employees/EmployeesPage'
import ClientsPage from '@/features/clients/ClientsPage'
import SitesPage from '@/features/sites/SitesPage'
import AttendancePage from '@/features/attendance/AttendancePage'
import PayrollPage from '@/features/payroll/PayrollPage'
import SalarySlipsPage from '@/features/slips/SalarySlipsPage'
import ReportsPage from '@/features/reports/ReportsPage'
import SettingsPage from '@/features/settings/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingState />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
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
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="slips" element={<SalarySlipsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

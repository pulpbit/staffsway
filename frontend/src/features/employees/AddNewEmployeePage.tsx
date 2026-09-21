import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, Card } from '@/components/ui/layout'
import EmployeeForm from './EmployeeForm'

export default function AddNewEmployeePage() {
  const navigate = useNavigate()

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      <div className="shrink-0">
        <PageHeader
          title="Add New Employee"
          description="Register a new employee. The form opens with Aadhaar verification and unlocks once a new 12-digit Aadhaar is confirmed."
        />
      </div>
      <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-5">
          <EmployeeForm
            employeeId={null}
            onClose={() => navigate('/employees')}
            onSaved={(createdId) => {
              toast.success('Employee added.')
              navigate('/employees', { state: { joinId: createdId } })
            }}
            onSwitchToEdit={(id) => navigate(`/employees?focus=${id}`)}
          />
        </div>
      </Card>
    </div>
  )
}
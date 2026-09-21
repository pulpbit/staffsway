import { PageHeader } from '@/components/ui/layout'
import { EmptyState } from '@/components/ui/state'
import { ArrowRightLeft } from 'lucide-react'

export default function EmployeeTransferPage() {
  return (
    <div>
      <PageHeader
        title="Employee Transfer"
        description="Move employees between sites or clients."
      />
      <div className="bg-white card-shadow rounded-md">
        <EmptyState
          icon={ArrowRightLeft}
          title="Employee Transfer — coming soon"
          description="This module is not available yet."
        />
      </div>
    </div>
  )
}
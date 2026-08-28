import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceApi, employeeApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import type { Column } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Trash2, Star, Target, MessageSquare, AlertTriangle, History, ClipboardCheck } from 'lucide-react'

const TABS = [
  { key: 'kpi', label: 'KPI/KRA' },
  { key: 'goals', label: 'Goals' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'appraisal', label: 'Self-Appraisal' },
  { key: 'increments', label: 'Increments' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'pips', label: 'PIP' },
  { key: 'history', label: 'History' },
]

const CATEGORIES = ['quality', 'productivity', 'teamwork', 'leadership', 'communication', 'initiative', 'attendance', 'other']
const RATING_COLORS: Record<string, string> = { 1: 'bg-error-soft text-error-deep', 2: 'bg-warning-soft text-warning-deep', 3: 'bg-canvas-soft-2 text-body', 4: 'bg-link-soft text-link-deep', 5: 'bg-success-soft text-success' }
const GOAL_STATUS: Record<string, string> = { not_started: 'bg-canvas-soft-2 text-mute', in_progress: 'bg-warning-soft text-warning-deep', completed: 'bg-success-soft text-success', not_achieved: 'bg-error-soft text-error-deep' }
const REVIEW_STATUS: Record<string, string> = { draft: 'bg-canvas-soft-2 text-mute', submitted: 'bg-warning-soft text-warning-deep', finalized: 'bg-success-soft text-success' }
const REC_STATUS: Record<string, string> = { pending: 'bg-warning-soft text-warning-deep', approved: 'bg-success-soft text-success', rejected: 'bg-error-soft text-error-deep' }
const PIP_STATUS: Record<string, string> = { active: 'bg-warning-soft text-warning-deep', completed: 'bg-success-soft text-success', extended: 'bg-link-soft text-link-deep', cancelled: 'bg-canvas-soft-2 text-mute' }

const goalLabel = (s: string) => ({ not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', not_achieved: 'Not Achieved' }[s] || s)
const reviewLabel = (s: string) => ({ draft: 'Draft', submitted: 'Submitted', finalized: 'Finalized' }[s] || s)
const recLabel = (s: string) => ({ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[s] || s)
const pipLabel = (s: string) => ({ active: 'Active', completed: 'Completed', extended: 'Extended', cancelled: 'Cancelled' }[s] || s)

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => ({ value: String(currentYear - i), label: String(currentYear - i) }))

export default function PerformancePage() {
  const [tab, setTab] = useState('kpi')
  const [empFilter, setEmpFilter] = useState('')
  const [yearFilter, setYearFilter] = useState(String(currentYear))
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number } | null>(null)
  const qc = useQueryClient()

  const { data: empData } = useQuery({ queryKey: ['employees-select'], queryFn: () => employeeApi.list({ page: '1', page_size: '200', status: 'active' }) })
  const employees = (empData?.data || []) as any[]
  const empParams: Record<string, string> = {}
  if (empFilter) empParams.employee_id = empFilter
  if (yearFilter) empParams.fiscal_year = yearFilter

  const { data: summary, isLoading: summaryLoading } = useQuery({ queryKey: ['perf-summary', empFilter, yearFilter], queryFn: () => performanceApi.summary(empFilter ? Number(empFilter) : undefined, Number(yearFilter)) })

  // KPIs
  const { data: kpiData, isLoading: kpiLoading } = useQuery({ queryKey: ['perf-kpis', empParams], queryFn: () => performanceApi.kpis(empParams), enabled: tab === 'kpi' })
  const [kpiForm, setKpiForm] = useState({ employee_id: '', title: '', description: '', category: 'quality', weight: '25', target: '' })
  const kpiCreateMut = useMutation({
    mutationFn: () => performanceApi.createKpi({ ...kpiForm, employee_id: Number(kpiForm.employee_id), fiscal_year: Number(yearFilter), weight: Number(kpiForm.weight) }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-kpis'] }); toast.success('KPI created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const kpiDeleteMut = useMutation({
    mutationFn: (id: number) => performanceApi.deleteKpi(id),
    onSuccess: () => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['perf-kpis'] }); toast.success('KPI deleted.') },
  })

  // Goals
  const { data: goalData, isLoading: goalLoading } = useQuery({ queryKey: ['perf-goals', empParams], queryFn: () => performanceApi.goals(empParams), enabled: tab === 'goals' })
  const [goalForm, setGoalForm] = useState({ employee_id: '', title: '', description: '', target_value: '', actual_value: '', weight: '25', status: 'not_started', quarter: '' })
  const goalCreateMut = useMutation({
    mutationFn: () => performanceApi.createGoal({ ...goalForm, employee_id: Number(goalForm.employee_id), fiscal_year: Number(yearFilter), quarter: goalForm.quarter ? Number(goalForm.quarter) : null, weight: Number(goalForm.weight) }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-goals'] }); toast.success('Goal created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const goalUpdateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => performanceApi.updateGoal(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perf-goals'] }); toast.success('Goal updated.') },
  })

  // Reviews
  const { data: reviewData, isLoading: reviewLoading } = useQuery({ queryKey: ['perf-reviews', empParams], queryFn: () => performanceApi.reviews(empParams), enabled: tab === 'reviews' })
  const [reviewForm, setReviewForm] = useState({ employee_id: '', review_period: '', review_type: 'quarterly', reviewer_name: '', overall_rating: '', strengths: '', improvements: '', comments: '' })
  const reviewCreateMut = useMutation({
    mutationFn: () => performanceApi.createReview({ ...reviewForm, employee_id: Number(reviewForm.employee_id), overall_rating: reviewForm.overall_rating ? Number(reviewForm.overall_rating) : null }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-reviews'] }); toast.success('Review created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Feedback
  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({ queryKey: ['perf-feedback', empParams], queryFn: () => performanceApi.feedback(empParams), enabled: tab === 'feedback' })
  const [fbForm, setFbForm] = useState({ employee_id: '', feedback_type: 'manager', from_name: '', rating: '', strengths: '', areas_improvement: '', comments: '', is_anonymous: false })
  const fbCreateMut = useMutation({
    mutationFn: () => performanceApi.createFeedback({ ...fbForm, employee_id: Number(fbForm.employee_id), rating: fbForm.rating ? Number(fbForm.rating) : null, is_anonymous: fbForm.is_anonymous }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-feedback'] }); toast.success('Feedback submitted.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Self-Appraisal
  const { data: appraisalData, isLoading: appraisalLoading } = useQuery({ queryKey: ['perf-appraisals', empParams], queryFn: () => performanceApi.selfAppraisals(empParams), enabled: tab === 'appraisal' })
  const [appraisalForm, setAppraisalForm] = useState({ employee_id: '', achievements: '', challenges: '', goals_next_period: '', training_needs: '', overall_comments: '', quarter: '' })
  const appraisalCreateMut = useMutation({
    mutationFn: () => performanceApi.createSelfAppraisal({ ...appraisalForm, employee_id: Number(appraisalForm.employee_id), fiscal_year: Number(yearFilter), quarter: appraisalForm.quarter ? Number(appraisalForm.quarter) : null }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-appraisals'] }); toast.success('Self-appraisal submitted.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Increments
  const { data: incrData, isLoading: incrLoading } = useQuery({ queryKey: ['perf-increments', empParams], queryFn: () => performanceApi.increments(empParams), enabled: tab === 'increments' })
  const [incrForm, setIncrForm] = useState({ employee_id: '', current_salary: '', recommended_increment: '', increment_percent: '', justification: '', performance_score: '' })
  const incrCreateMut = useMutation({
    mutationFn: () => performanceApi.createIncrement({ ...incrForm, employee_id: Number(incrForm.employee_id), fiscal_year: Number(yearFilter), current_salary: incrForm.current_salary ? Number(incrForm.current_salary) : null, recommended_increment: incrForm.recommended_increment ? Number(incrForm.recommended_increment) : null, increment_percent: incrForm.increment_percent ? Number(incrForm.increment_percent) : null, performance_score: incrForm.performance_score ? Number(incrForm.performance_score) : null }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-increments'] }); toast.success('Increment recommendation created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const incrUpdateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => performanceApi.updateIncrement(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perf-increments'] }); toast.success('Recommendation updated.') },
  })

  // Promotions
  const { data: promoData, isLoading: promoLoading } = useQuery({ queryKey: ['perf-promotions', empParams], queryFn: () => performanceApi.promotions(empParams), enabled: tab === 'promotions' })
  const [promoForm, setPromoForm] = useState({ employee_id: '', current_designation: '', recommended_designation: '', justification: '', performance_score: '' })
  const promoCreateMut = useMutation({
    mutationFn: () => performanceApi.createPromotion({ ...promoForm, employee_id: Number(promoForm.employee_id), fiscal_year: Number(yearFilter), performance_score: promoForm.performance_score ? Number(promoForm.performance_score) : null }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-promotions'] }); toast.success('Promotion recommendation created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const promoUpdateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => performanceApi.updatePromotion(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perf-promotions'] }); toast.success('Recommendation updated.') },
  })

  // PIPs
  const { data: pipData, isLoading: pipLoading } = useQuery({ queryKey: ['perf-pips', empParams], queryFn: () => performanceApi.pips(empParams), enabled: tab === 'pips' })
  const [pipForm, setPipForm] = useState({ employee_id: '', title: '', description: '', start_date: '', end_date: '', goals: '', manager_comments: '' })
  const pipCreateMut = useMutation({
    mutationFn: () => performanceApi.createPip({ ...pipForm, employee_id: Number(pipForm.employee_id) }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-pips'] }); toast.success('PIP created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const pipUpdateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => performanceApi.updatePip(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perf-pips'] }); toast.success('PIP updated.') },
  })

  // History
  const { data: histData, isLoading: histLoading } = useQuery({ queryKey: ['perf-history', empParams], queryFn: () => performanceApi.history(empParams), enabled: tab === 'history' })

  const empOptions = employees.map((e: any) => ({ value: String(e.id), label: `${e.employee_code} - ${fullName(e.first_name, e.last_name)}` }))

  const renderStarRating = (rating: number | null) => {
    if (!rating) return <span className="text-[12px] text-mute">—</span>
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-3 h-3 ${s <= rating ? 'text-gold fill-gold' : 'text-hairline'}`} />
        ))}
        <span className="ml-1 text-[11px] text-mute">{rating}</span>
      </div>
    )
  }

  const showFormModal = (type: string) => {
    if (type === 'kpi') setKpiForm({ employee_id: '', title: '', description: '', category: 'quality', weight: '25', target: '' })
    if (type === 'goal') setGoalForm({ employee_id: '', title: '', description: '', target_value: '', actual_value: '', weight: '25', status: 'not_started', quarter: '' })
    if (type === 'review') setReviewForm({ employee_id: '', review_period: '', review_type: 'quarterly', reviewer_name: '', overall_rating: '', strengths: '', improvements: '', comments: '' })
    if (type === 'feedback') setFbForm({ employee_id: '', feedback_type: 'manager', from_name: '', rating: '', strengths: '', areas_improvement: '', comments: '', is_anonymous: false })
    if (type === 'appraisal') setAppraisalForm({ employee_id: '', achievements: '', challenges: '', goals_next_period: '', training_needs: '', overall_comments: '', quarter: '' })
    if (type === 'increment') setIncrForm({ employee_id: '', current_salary: '', recommended_increment: '', increment_percent: '', justification: '', performance_score: '' })
    if (type === 'promotion') setPromoForm({ employee_id: '', current_designation: '', recommended_designation: '', justification: '', performance_score: '' })
    if (type === 'pip') setPipForm({ employee_id: '', title: '', description: '', start_date: '', end_date: '', goals: '', manager_comments: '' })
    setShowForm(true)
  }

  const FormTitle: Record<string, string> = { kpi: 'Add KPI/KRA', goal: 'Add Performance Goal', review: 'Add Performance Review', feedback: 'Add Feedback', appraisal: 'Add Self-Appraisal', increment: 'Recommend Increment', promotion: 'Recommend Promotion', pip: 'Create PIP' }

  return (
    <div>
      <PageHeader title="Performance Management" subtitle="KPIs, goals, reviews & more" />

      {/* Summary Cards */}
      {!summaryLoading && summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'KPIs', value: summary.data.kpi_count, icon: Target },
            { label: 'Goals', value: summary.data.goals.total, icon: ClipboardCheck },
            { label: 'Avg Rating', value: summary.data.avg_rating ?? '—', icon: Star },
            { label: 'Reviews', value: summary.data.total_reviews, icon: MessageSquare },
            { label: 'Feedback', value: summary.data.total_feedback, icon: MessageSquare },
            { label: 'Active PIPs', value: summary.data.active_pips, icon: AlertTriangle, danger: summary.data.active_pips > 0 },
          ].map((s, i) => (
            <div key={i} className={`bg-white card-shadow rounded-md p-3 ${s.danger ? 'border border-error/20' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-3.5 h-3.5 ${s.danger ? 'text-error' : 'text-mute'}`} />
                <span className="text-[11px] text-mute">{s.label}</span>
              </div>
              <p className={`text-[18px] font-semibold ${s.danger ? 'text-error' : 'text-ink'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select
          options={[{ value: '', label: 'All Employees' }, ...empOptions]}
          value={empFilter}
          onChange={(e) => setEmpFilter(e.target.value)}
          className="w-full sm:w-56"
        />
        <Select
          options={YEAR_OPTIONS}
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="w-full sm:w-28"
        />
        <div className="flex-1" />
        <Button onClick={() => showFormModal(tab === 'goals' ? 'goal' : tab === 'reviews' ? 'review' : tab === 'feedback' ? 'feedback' : tab === 'appraisal' ? 'appraisal' : tab === 'increments' ? 'increment' : tab === 'promotions' ? 'promotion' : tab === 'pips' ? 'pip' : 'kpi')}>
          <Plus className="w-3.5 h-3.5" /> Add {FormTitle[tab === 'goals' ? 'goal' : tab === 'reviews' ? 'review' : tab === 'feedback' ? 'feedback' : tab === 'appraisal' ? 'appraisal' : tab === 'increments' ? 'increment' : tab === 'promotions' ? 'promotion' : tab === 'pips' ? 'pip' : 'kpi']?.replace('Add ', '').replace('Recommend ', '').replace('Create ', '') || 'New'}
        </Button>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="bg-white card-shadow rounded-md p-4 mt-4">
        {/* KPI Tab */}
        {tab === 'kpi' && (
          kpiLoading ? <LoadingState /> :
          (kpiData?.data || []).length === 0 ? <EmptyState title="No KPIs defined" description="Create KPIs to track employee performance metrics." /> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
                { key: 'name', header: 'Employee', render: (r: any) => fullName(r.first_name, r.last_name) },
                { key: 'title', header: 'KPI', render: (r: any) => <div><p className="text-[13px] font-medium text-ink">{r.title}</p><p className="text-[11px] text-mute">{r.description}</p></div> },
                { key: 'category', header: 'Category', render: (r: any) => <Badge className="bg-canvas-soft-2 text-body">{r.category}</Badge> },
                { key: 'weight', header: 'Weight', render: (r: any) => <span className="text-[12px]">{r.weight}%</span> },
                { key: 'actions', header: '', render: (r: any) => <button onClick={() => setConfirmDelete({ type: 'kpi', id: r.id })} className="text-error hover:text-error-deep"><Trash2 className="w-3.5 h-3.5" /></button> },
              ]}
              data={kpiData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No KPIs found."
            />
          )
        )}

        {/* Goals Tab */}
        {tab === 'goals' && (
          goalLoading ? <LoadingState /> :
          (goalData?.data || []).length === 0 ? <EmptyState title="No goals set" description="Create performance goals for employees." /> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
                { key: 'name', header: 'Employee', render: (r: any) => fullName(r.first_name, r.last_name) },
                { key: 'title', header: 'Goal', render: (r: any) => <div><p className="text-[13px] font-medium text-ink">{r.title}</p>{r.quarter && <span className="text-[11px] text-mute">Q{r.quarter}</span>}</div> },
                { key: 'weight', header: 'Weight', render: (r: any) => <span className="text-[12px]">{r.weight}%</span> },
                { key: 'status', header: 'Status', render: (r: any) => <Badge className={GOAL_STATUS[r.status] || ''}>{goalLabel(r.status)}</Badge> },
                { key: 'actions', header: '', render: (r: any) => (
                  <div className="flex gap-1">
                    {r.status !== 'completed' && <select value={r.status} onChange={e => goalUpdateMut.mutate({ id: r.id, data: { status: e.target.value } })} className="h-7 text-[11px] border border-hairline rounded-sm px-1">{['not_started', 'in_progress', 'completed', 'not_achieved'].map(s => <option key={s} value={s}>{goalLabel(s)}</option>)}</select>}
                    <button onClick={() => setConfirmDelete({ type: 'goal', id: r.id })} className="text-error hover:text-error-deep"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )},
              ]}
              data={goalData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No goals found."
            />
          )
        )}

        {/* Reviews Tab */}
        {tab === 'reviews' && (
          reviewLoading ? <LoadingState /> :
          (reviewData?.data || []).length === 0 ? <EmptyState title="No reviews yet" description="Schedule monthly/quarterly/annual reviews." /> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Code', className: 'font-mono text-[11px]' },
                { key: 'name', header: 'Employee', render: (r: any) => fullName(r.first_name, r.last_name) },
                { key: 'review_period', header: 'Period', render: (r: any) => <span className="text-[12px]">{r.review_period} <Badge className="bg-canvas-soft-2 text-mute ml-1">{r.review_type}</Badge></span> },
                { key: 'overall_rating', header: 'Rating', render: (r: any) => renderStarRating(r.overall_rating) },
                { key: 'reviewer_name', header: 'Reviewer', render: (r: any) => <span className="text-[12px]">{r.reviewer_name || '—'}</span> },
                { key: 'status', header: 'Status', render: (r: any) => <Badge className={REVIEW_STATUS[r.status] || ''}>{reviewLabel(r.status)}</Badge> },
                { key: 'actions', header: '', render: (r: any) => <button onClick={() => setConfirmDelete({ type: 'review', id: r.id })} className="text-error hover:text-error-deep"><Trash2 className="w-3.5 h-3.5" /></button> },
              ]}
              data={reviewData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No reviews found."
            />
          )
        )}

        {/* Feedback Tab */}
        {tab === 'feedback' && (
          feedbackLoading ? <LoadingState /> :
          (feedbackData?.data || []).length === 0 ? <EmptyState title="No feedback recorded" description="Collect manager, peer, or 360-degree feedback." /> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-[13px]">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.feedback_type}</p></div> },
                { key: 'from_name', header: 'From', render: (r: any) => <span className="text-[12px]">{r.is_anonymous ? 'Anonymous' : (r.from_name || '—')}</span> },
                { key: 'rating', header: 'Rating', render: (r: any) => renderStarRating(r.rating) },
                { key: 'strengths', header: 'Strengths', render: (r: any) => <p className="text-[12px] text-body max-w-[200px] truncate">{r.strengths || '—'}</p> },
                { key: 'areas_improvement', header: 'Improvements', render: (r: any) => <p className="text-[12px] text-body max-w-[200px] truncate">{r.areas_improvement || '—'}</p> },
                { key: 'actions', header: '', render: (r: any) => <button onClick={() => setConfirmDelete({ type: 'feedback', id: r.id })} className="text-error hover:text-error-deep"><Trash2 className="w-3.5 h-3.5" /></button> },
              ]}
              data={feedbackData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No feedback found."
            />
          )
        )}

        {/* Self-Appraisal Tab */}
        {tab === 'appraisal' && (
          appraisalLoading ? <LoadingState /> :
          (appraisalData?.data || []).length === 0 ? <EmptyState title="No self-appraisals" description="Employees can submit self-appraisals for each review period." /> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-[13px]">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.fiscal_year}{r.quarter ? ` Q${r.quarter}` : ''}</p></div> },
                { key: 'achievements', header: 'Achievements', render: (r: any) => <p className="text-[12px] text-body max-w-[250px] truncate">{r.achievements || '—'}</p> },
                { key: 'training_needs', header: 'Training Needs', render: (r: any) => <p className="text-[12px] text-body max-w-[200px] truncate">{r.training_needs || '—'}</p> },
                { key: 'status', header: 'Status', render: (r: any) => <Badge className={r.status === 'submitted' ? 'bg-success-soft text-success' : 'bg-canvas-soft-2 text-mute'}>{r.status === 'submitted' ? 'Submitted' : 'Draft'}</Badge> },
              ]}
              data={appraisalData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No appraisals found."
            />
          )
        )}

        {/* Increments Tab */}
        {tab === 'increments' && (
          incrLoading ? <LoadingState /> :
          (incrData?.data || []).length === 0 ? <EmptyState title="No increment recommendations" description="Recommend salary increments based on performance." /> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-[13px]">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.employee_code}</p></div> },
                { key: 'current_salary', header: 'Current', render: (r: any) => <span className="text-[12px]">₹{Number(r.current_salary || 0).toLocaleString('en-IN')}</span> },
                { key: 'recommended_increment', header: 'Increment', render: (r: any) => <span className="text-[12px] font-medium text-success">₹{Number(r.recommended_increment || 0).toLocaleString('en-IN')}</span> },
                { key: 'increment_percent', header: '%', render: (r: any) => <span className="text-[12px]">{r.increment_percent ? `${r.increment_percent}%` : '—'}</span> },
                { key: 'performance_score', header: 'Rating', render: (r: any) => renderStarRating(r.performance_score) },
                { key: 'status', header: 'Status', render: (r: any) => <Badge className={REC_STATUS[r.status] || ''}>{recLabel(r.status)}</Badge> },
                { key: 'actions', header: '', render: (r: any) => r.status === 'pending' ? (
                  <div className="flex gap-1">
                    <button onClick={() => incrUpdateMut.mutate({ id: r.id, data: { status: 'approved' } })} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs">Approve</button>
                    <button onClick={() => incrUpdateMut.mutate({ id: r.id, data: { status: 'rejected' } })} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs">Reject</button>
                  </div>
                ) : null },
              ]}
              data={incrData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No increment recommendations found."
            />
          )
        )}

        {/* Promotions Tab */}
        {tab === 'promotions' && (
          promoLoading ? <LoadingState /> :
          (promoData?.data || []).length === 0 ? <EmptyState title="No promotion recommendations" description="Recommend promotions based on performance." /> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-[13px]">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.employee_code}</p></div> },
                { key: 'current_designation', header: 'Current Role', render: (r: any) => <span className="text-[12px]">{r.current_designation || '—'}</span> },
                { key: 'recommended_designation', header: 'Recommended', render: (r: any) => <span className="text-[12px] font-medium text-link">{r.recommended_designation}</span> },
                { key: 'performance_score', header: 'Rating', render: (r: any) => renderStarRating(r.performance_score) },
                { key: 'status', header: 'Status', render: (r: any) => <Badge className={REC_STATUS[r.status] || ''}>{recLabel(r.status)}</Badge> },
                { key: 'actions', header: '', render: (r: any) => r.status === 'pending' ? (
                  <div className="flex gap-1">
                    <button onClick={() => promoUpdateMut.mutate({ id: r.id, data: { status: 'approved' } })} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs">Approve</button>
                    <button onClick={() => promoUpdateMut.mutate({ id: r.id, data: { status: 'rejected' } })} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs">Reject</button>
                  </div>
                ) : null },
              ]}
              data={promoData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No promotion recommendations found."
            />
          )
        )}

        {/* PIP Tab */}
        {tab === 'pips' && (
          pipLoading ? <LoadingState /> :
          (pipData?.data || []).length === 0 ? <EmptyState title="No active PIPs" description="Create Performance Improvement Plans when needed." /> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-[13px]">{fullName(r.first_name, r.last_name)}</p><p className="text-[11px] text-mute">{r.employee_code}</p></div> },
                { key: 'title', header: 'PIP', render: (r: any) => <div><p className="text-[13px] font-medium text-ink">{r.title}</p><p className="text-[11px] text-mute">{r.start_date} — {r.end_date}</p></div> },
                { key: 'status', header: 'Status', render: (r: any) => <Badge className={PIP_STATUS[r.status] || ''}>{pipLabel(r.status)}</Badge> },
                { key: 'outcome', header: 'Outcome', render: (r: any) => r.outcome ? <Badge className={r.outcome === 'successful' ? 'bg-success-soft text-success' : 'bg-error-soft text-error-deep'}>{r.outcome}</Badge> : '—' },
                { key: 'actions', header: '', render: (r: any) => r.status === 'active' ? (
                  <div className="flex gap-1">
                    <button onClick={() => pipUpdateMut.mutate({ id: r.id, data: { status: 'completed', outcome: 'successful' } })} className="px-1.5 py-0.5 text-[11px] text-success hover:bg-success-soft rounded-xs">Complete</button>
                    <button onClick={() => pipUpdateMut.mutate({ id: r.id, data: { status: 'cancelled' } })} className="px-1.5 py-0.5 text-[11px] text-error hover:bg-error-soft rounded-xs">Cancel</button>
                  </div>
                ) : null },
              ]}
              data={pipData?.data || []}
              keyFn={(r: any) => String(r.id)}
              emptyMessage="No PIPs found."
            />
          )
        )}

        {/* History Tab */}
        {tab === 'history' && (
          histLoading ? <LoadingState /> :
          (histData?.data || []).length === 0 ? <EmptyState title="No performance history" description="All performance actions are logged here." /> : (
            <div className="divide-y divide-hairline max-h-[50vh] overflow-y-auto">
              {(histData?.data || []).map((h: any) => (
                <div key={h.id} className="py-2.5 flex items-start gap-3">
                  <History className="w-3.5 h-3.5 text-mute mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink">{h.details}</p>
                    <p className="text-[11px] text-mute">{fullName(h.first_name, h.last_name)} ({h.employee_code}) · {h.action} · by {h.performed_by || '—'} · {dateShort(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={FormTitle[tab === 'goals' ? 'goal' : tab === 'reviews' ? 'review' : tab === 'feedback' ? 'feedback' : tab === 'appraisal' ? 'appraisal' : tab === 'increments' ? 'increment' : tab === 'promotions' ? 'promotion' : tab === 'pips' ? 'pip' : 'kpi']} size="md">
        <div className="space-y-3">
          {(tab === 'kpi' || tab === 'goals' || tab === 'reviews' || tab === 'feedback' || tab === 'appraisal' || tab === 'increments' || tab === 'promotions' || tab === 'pips') && (
            <Select label="Employee" options={[{ value: '', label: 'Select employee...' }, ...empOptions]} value={tab === 'kpi' ? kpiForm.employee_id : tab === 'goals' ? goalForm.employee_id : tab === 'reviews' ? reviewForm.employee_id : tab === 'feedback' ? fbForm.employee_id : tab === 'appraisal' ? appraisalForm.employee_id : tab === 'increments' ? incrForm.employee_id : tab === 'promotions' ? promoForm.employee_id : pipForm.employee_id} onChange={e => {
              const v = e.target.value
              if (tab === 'kpi') setKpiForm(f => ({ ...f, employee_id: v }))
              else if (tab === 'goals') setGoalForm(f => ({ ...f, employee_id: v }))
              else if (tab === 'reviews') setReviewForm(f => ({ ...f, employee_id: v }))
              else if (tab === 'feedback') setFbForm(f => ({ ...f, employee_id: v }))
              else if (tab === 'appraisal') setAppraisalForm(f => ({ ...f, employee_id: v }))
              else if (tab === 'increments') setIncrForm(f => ({ ...f, employee_id: v }))
              else if (tab === 'promotions') setPromoForm(f => ({ ...f, employee_id: v }))
              else setPipForm(f => ({ ...f, employee_id: v }))
            }} />
          )}

          {tab === 'kpi' && <>
            <Input label="KPI Title" value={kpiForm.title} onChange={e => setKpiForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" value={kpiForm.description} onChange={e => setKpiForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Category" options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} value={kpiForm.category} onChange={e => setKpiForm(f => ({ ...f, category: e.target.value }))} />
              <Input label="Weight (%)" type="number" value={kpiForm.weight} onChange={e => setKpiForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            <Textarea label="Target" value={kpiForm.target} onChange={e => setKpiForm(f => ({ ...f, target: e.target.value }))} />
          </>}

          {tab === 'goals' && <>
            <Input label="Goal Title" value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" value={goalForm.description} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Target Value" value={goalForm.target_value} onChange={e => setGoalForm(f => ({ ...f, target_value: e.target.value }))} />
              <Input label="Weight (%)" type="number" value={goalForm.weight} onChange={e => setGoalForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Quarter" options={[{ value: '', label: 'Annual' }, { value: '1', label: 'Q1' }, { value: '2', label: 'Q2' }, { value: '3', label: 'Q3' }, { value: '4', label: 'Q4' }]} value={goalForm.quarter} onChange={e => setGoalForm(f => ({ ...f, quarter: e.target.value }))} />
              <Select label="Status" options={['not_started', 'in_progress', 'completed', 'not_achieved'].map(s => ({ value: s, label: goalLabel(s) }))} value={goalForm.status} onChange={e => setGoalForm(f => ({ ...f, status: e.target.value }))} />
            </div>
          </>}

          {tab === 'reviews' && <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Review Period" placeholder="e.g. 2024-Q1 or 2024-01" value={reviewForm.review_period} onChange={e => setReviewForm(f => ({ ...f, review_period: e.target.value }))} />
              <Select label="Review Type" options={[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annual', label: 'Annual' }]} value={reviewForm.review_type} onChange={e => setReviewForm(f => ({ ...f, review_type: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Reviewer Name" value={reviewForm.reviewer_name} onChange={e => setReviewForm(f => ({ ...f, reviewer_name: e.target.value }))} />
              <Select label="Overall Rating" options={[{ value: '', label: 'Select...' }, { value: '1', label: '1 - Poor' }, { value: '2', label: '2 - Below Average' }, { value: '3', label: '3 - Average' }, { value: '4', label: '4 - Good' }, { value: '5', label: '5 - Excellent' }]} value={reviewForm.overall_rating} onChange={e => setReviewForm(f => ({ ...f, overall_rating: e.target.value }))} />
            </div>
            <Textarea label="Strengths" value={reviewForm.strengths} onChange={e => setReviewForm(f => ({ ...f, strengths: e.target.value }))} />
            <Textarea label="Areas for Improvement" value={reviewForm.improvements} onChange={e => setReviewForm(f => ({ ...f, improvements: e.target.value }))} />
            <Textarea label="Comments" value={reviewForm.comments} onChange={e => setReviewForm(f => ({ ...f, comments: e.target.value }))} />
          </>}

          {tab === 'feedback' && <>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Feedback Type" options={[{ value: 'manager', label: 'Manager' }, { value: 'peer', label: 'Peer' }, { value: 'self', label: 'Self' }, { value: '360', label: '360 Degree' }]} value={fbForm.feedback_type} onChange={e => setFbForm(f => ({ ...f, feedback_type: e.target.value }))} />
              <Input label="From Name" value={fbForm.from_name} onChange={e => setFbForm(f => ({ ...f, from_name: e.target.value }))} />
            </div>
            <Select label="Rating" options={[{ value: '', label: 'Select...' }, { value: '1', label: '1 - Poor' }, { value: '2', label: '2 - Below Average' }, { value: '3', label: '3 - Average' }, { value: '4', label: '4 - Good' }, { value: '5', label: '5 - Excellent' }]} value={fbForm.rating} onChange={e => setFbForm(f => ({ ...f, rating: e.target.value }))} />
            <Textarea label="Strengths" value={fbForm.strengths} onChange={e => setFbForm(f => ({ ...f, strengths: e.target.value }))} />
            <Textarea label="Areas for Improvement" value={fbForm.areas_improvement} onChange={e => setFbForm(f => ({ ...f, areas_improvement: e.target.value }))} />
            <Textarea label="Comments" value={fbForm.comments} onChange={e => setFbForm(f => ({ ...f, comments: e.target.value }))} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fbForm.is_anonymous} onChange={e => setFbForm(f => ({ ...f, is_anonymous: e.target.checked }))} className="w-3.5 h-3.5 accent-black" />
              <span className="text-[13px] text-body">Anonymous feedback</span>
            </label>
          </>}

          {tab === 'appraisal' && <>
            <Select label="Quarter" options={[{ value: '', label: 'Annual' }, { value: '1', label: 'Q1' }, { value: '2', label: 'Q2' }, { value: '3', label: 'Q3' }, { value: '4', label: 'Q4' }]} value={appraisalForm.quarter} onChange={e => setAppraisalForm(f => ({ ...f, quarter: e.target.value }))} />
            <Textarea label="Key Achievements" value={appraisalForm.achievements} onChange={e => setAppraisalForm(f => ({ ...f, achievements: e.target.value }))} />
            <Textarea label="Challenges Faced" value={appraisalForm.challenges} onChange={e => setAppraisalForm(f => ({ ...f, challenges: e.target.value }))} />
            <Textarea label="Goals for Next Period" value={appraisalForm.goals_next_period} onChange={e => setAppraisalForm(f => ({ ...f, goals_next_period: e.target.value }))} />
            <Textarea label="Training Needs" value={appraisalForm.training_needs} onChange={e => setAppraisalForm(f => ({ ...f, training_needs: e.target.value }))} />
            <Textarea label="Overall Comments" value={appraisalForm.overall_comments} onChange={e => setAppraisalForm(f => ({ ...f, overall_comments: e.target.value }))} />
          </>}

          {tab === 'increments' && <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Current Salary (₹)" type="number" value={incrForm.current_salary} onChange={e => setIncrForm(f => ({ ...f, current_salary: e.target.value }))} />
              <Input label="Recommended Increment (₹)" type="number" value={incrForm.recommended_increment} onChange={e => setIncrForm(f => ({ ...f, recommended_increment: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Increment %" type="number" value={incrForm.increment_percent} onChange={e => setIncrForm(f => ({ ...f, increment_percent: e.target.value }))} />
              <Select label="Performance Score" options={[{ value: '', label: 'Select...' }, { value: '1', label: '1 - Poor' }, { value: '2', label: '2 - Below Average' }, { value: '3', label: '3 - Average' }, { value: '4', label: '4 - Good' }, { value: '5', label: '5 - Excellent' }]} value={incrForm.performance_score} onChange={e => setIncrForm(f => ({ ...f, performance_score: e.target.value }))} />
            </div>
            <Textarea label="Justification" value={incrForm.justification} onChange={e => setIncrForm(f => ({ ...f, justification: e.target.value }))} />
          </>}

          {tab === 'promotions' && <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Current Designation" value={promoForm.current_designation} onChange={e => setPromoForm(f => ({ ...f, current_designation: e.target.value }))} />
              <Input label="Recommended Designation" value={promoForm.recommended_designation} onChange={e => setPromoForm(f => ({ ...f, recommended_designation: e.target.value }))} />
            </div>
            <Select label="Performance Score" options={[{ value: '', label: 'Select...' }, { value: '1', label: '1 - Poor' }, { value: '2', label: '2 - Below Average' }, { value: '3', label: '3 - Average' }, { value: '4', label: '4 - Good' }, { value: '5', label: '5 - Excellent' }]} value={promoForm.performance_score} onChange={e => setPromoForm(f => ({ ...f, performance_score: e.target.value }))} />
            <Textarea label="Justification" value={promoForm.justification} onChange={e => setPromoForm(f => ({ ...f, justification: e.target.value }))} />
          </>}

          {tab === 'pips' && <>
            <Input label="PIP Title" value={pipForm.title} onChange={e => setPipForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" value={pipForm.description} onChange={e => setPipForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={pipForm.start_date} onChange={e => setPipForm(f => ({ ...f, start_date: e.target.value }))} />
              <Input label="End Date" type="date" value={pipForm.end_date} onChange={e => setPipForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <Textarea label="PIP Goals (JSON or text)" value={pipForm.goals} onChange={e => setPipForm(f => ({ ...f, goals: e.target.value }))} />
            <Textarea label="Manager Comments" value={pipForm.manager_comments} onChange={e => setPipForm(f => ({ ...f, manager_comments: e.target.value }))} />
          </>}

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              loading={kpiCreateMut.isPending || goalCreateMut.isPending || reviewCreateMut.isPending || fbCreateMut.isPending || appraisalCreateMut.isPending || incrCreateMut.isPending || promoCreateMut.isPending || pipCreateMut.isPending}
              onClick={() => {
                if (tab === 'kpi') kpiCreateMut.mutate()
                else if (tab === 'goals') goalCreateMut.mutate()
                else if (tab === 'reviews') reviewCreateMut.mutate()
                else if (tab === 'feedback') fbCreateMut.mutate()
                else if (tab === 'appraisal') appraisalCreateMut.mutate()
                else if (tab === 'increments') incrCreateMut.mutate()
                else if (tab === 'promotions') promoCreateMut.mutate()
                else if (tab === 'pips') pipCreateMut.mutate()
              }}
            >Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return
          if (confirmDelete.type === 'kpi') kpiDeleteMut.mutate(confirmDelete.id)
          else if (confirmDelete.type === 'goal') { /* delete goal */ }
          else if (confirmDelete.type === 'review') { /* delete review */ }
          else if (confirmDelete.type === 'feedback') { /* delete feedback */ }
          else if (confirmDelete.type === 'pip') { /* delete pip */ }
        }}
        title="Delete Record"
        message="Are you sure you want to delete this record?"
        danger
      />
    </div>
  )
}

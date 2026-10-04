import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceApi, employeeApi } from '@/services/api'
import { Button, Input, Textarea, Select } from '@/components/ui/fields'
import { Table, Badge, Tabs } from '@/components/ui/data'
import { PageHeader, LoadingState, PageError, EmptyState } from '@/components/ui/state'
import { Modal, ConfirmDialog } from '@/components/ui/overlay'
import { fullName, dateShort } from '@/utils/format'
import { toast } from 'sonner'
import {
  Plus, Trash2, Star, Target, MessageSquare, AlertTriangle, History, ClipboardCheck,
  TrendingUp, Award, UserCheck, CheckCircle2, XCircle, Search, Filter, Sparkles
} from 'lucide-react'

const TABS = [
  { key: 'kpi', label: 'KPI / KRA' },
  { key: 'goals', label: 'Goals' },
  { key: 'reviews', label: 'Appraisal Reviews' },
  { key: 'feedback', label: '360° Feedback' },
  { key: 'appraisal', label: 'Self-Appraisal' },
  { key: 'increments', label: 'Increments' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'pips', label: 'PIP Tracker' },
  { key: 'history', label: 'Audit History' },
]

const CATEGORIES = ['quality', 'productivity', 'teamwork', 'leadership', 'communication', 'initiative', 'attendance', 'other']

const RATING_COLORS: Record<string, string> = {
  1: 'bg-rose-50 text-rose-700 border-rose-200',
  2: 'bg-amber-50 text-amber-700 border-amber-200',
  3: 'bg-blue-50 text-blue-700 border-blue-200',
  4: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  5: 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

const GOAL_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  not_started: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  not_achieved: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
}

const REVIEW_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  submitted: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  finalized: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' }
}

const REC_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' }
}

const PIP_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  extended: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
}

const goalLabel = (s: string) => ({ not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', not_achieved: 'Not Achieved' }[s] || s)
const reviewLabel = (s: string) => ({ draft: 'Draft', submitted: 'Submitted', finalized: 'Finalized' }[s] || s)
const recLabel = (s: string) => ({ pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[s] || s)
const pipLabel = (s: string) => ({ active: 'Active', completed: 'Completed', extended: 'Extended', cancelled: 'Cancelled' }[s] || s)

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => ({ value: String(currentYear - i), label: `FY ${currentYear - i}` }))

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
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-kpis'] }); qc.invalidateQueries({ queryKey: ['perf-summary'] }); toast.success('KPI created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const kpiDeleteMut = useMutation({
    mutationFn: (id: number) => performanceApi.deleteKpi(id),
    onSuccess: () => { setConfirmDelete(null); qc.invalidateQueries({ queryKey: ['perf-kpis'] }); qc.invalidateQueries({ queryKey: ['perf-summary'] }); toast.success('KPI deleted.') },
  })

  // Goals
  const { data: goalData, isLoading: goalLoading } = useQuery({ queryKey: ['perf-goals', empParams], queryFn: () => performanceApi.goals(empParams), enabled: tab === 'goals' })
  const [goalForm, setGoalForm] = useState({ employee_id: '', title: '', description: '', target_value: '', actual_value: '', weight: '25', status: 'not_started', quarter: '' })
  const goalCreateMut = useMutation({
    mutationFn: () => performanceApi.createGoal({ ...goalForm, employee_id: Number(goalForm.employee_id), fiscal_year: Number(yearFilter), quarter: goalForm.quarter ? Number(goalForm.quarter) : null, weight: Number(goalForm.weight) }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-goals'] }); qc.invalidateQueries({ queryKey: ['perf-summary'] }); toast.success('Goal created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const goalUpdateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => performanceApi.updateGoal(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perf-goals'] }); qc.invalidateQueries({ queryKey: ['perf-summary'] }); toast.success('Goal updated.') },
  })

  // Reviews
  const { data: reviewData, isLoading: reviewLoading } = useQuery({ queryKey: ['perf-reviews', empParams], queryFn: () => performanceApi.reviews(empParams), enabled: tab === 'reviews' })
  const [reviewForm, setReviewForm] = useState({ employee_id: '', review_period: '', review_type: 'quarterly', reviewer_name: '', overall_rating: '', strengths: '', improvements: '', comments: '' })
  const reviewCreateMut = useMutation({
    mutationFn: () => performanceApi.createReview({ ...reviewForm, employee_id: Number(reviewForm.employee_id), overall_rating: reviewForm.overall_rating ? Number(reviewForm.overall_rating) : null }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-reviews'] }); qc.invalidateQueries({ queryKey: ['perf-summary'] }); toast.success('Review created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })

  // Feedback
  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({ queryKey: ['perf-feedback', empParams], queryFn: () => performanceApi.feedback(empParams), enabled: tab === 'feedback' })
  const [fbForm, setFbForm] = useState({ employee_id: '', feedback_type: 'manager', from_name: '', rating: '', strengths: '', areas_improvement: '', comments: '', is_anonymous: false })
  const fbCreateMut = useMutation({
    mutationFn: () => performanceApi.createFeedback({ ...fbForm, employee_id: Number(fbForm.employee_id), rating: fbForm.rating ? Number(fbForm.rating) : null, is_anonymous: fbForm.is_anonymous }),
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-feedback'] }); qc.invalidateQueries({ queryKey: ['perf-summary'] }); toast.success('Feedback submitted.') },
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
    onSuccess: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ['perf-pips'] }); qc.invalidateQueries({ queryKey: ['perf-summary'] }); toast.success('PIP created.') },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed.'),
  })
  const pipUpdateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => performanceApi.updatePip(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perf-pips'] }); qc.invalidateQueries({ queryKey: ['perf-summary'] }); toast.success('PIP updated.') },
  })

  // History
  const { data: histData, isLoading: histLoading } = useQuery({ queryKey: ['perf-history', empParams], queryFn: () => performanceApi.history(empParams), enabled: tab === 'history' })

  const empOptions = employees.map((e: any) => ({ value: String(e.id), label: `${e.employee_code} — ${fullName(e.first_name, e.last_name)}` }))

  const renderStarRating = (rating: number | null) => {
    if (!rating) return <span className="text-xs text-slate-400 font-mono">—</span>
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-700 ml-1">{rating}.0</span>
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

  const FormTitle: Record<string, string> = {
    kpi: 'Define KPI / KRA',
    goal: 'Create Performance Goal',
    review: 'Log Appraisal Review',
    feedback: 'Submit 360° Feedback',
    appraisal: 'Submit Self-Appraisal',
    increment: 'Recommend Salary Increment',
    promotion: 'Recommend Promotion',
    pip: 'Initiate Performance Improvement Plan'
  }

  const currentActionLabel = {
    kpi: 'Add KPI',
    goals: 'Add Goal',
    reviews: 'Add Review',
    feedback: 'Add Feedback',
    appraisal: 'Add Appraisal',
    increments: 'Add Increment',
    promotions: 'Add Promotion',
    pips: 'Initiate PIP',
    history: 'Log Action'
  }[tab] || 'Add New'

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Performance & Appraisal</h1>
          </div>
          <p className="text-xs text-slate-500">Continuous appraisal cycles, KPI scorecards, feedback loops & career pathways</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => showFormModal(tab === 'goals' ? 'goal' : tab === 'reviews' ? 'review' : tab === 'feedback' ? 'feedback' : tab === 'appraisal' ? 'appraisal' : tab === 'increments' ? 'increment' : tab === 'promotions' ? 'promotion' : tab === 'pips' ? 'pip' : 'kpi')}
            className="shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> {currentActionLabel}
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      {!summaryLoading && summary?.data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Active KPIs', value: summary.data.kpi_count, icon: Target, gradient: 'from-blue-600 to-indigo-600' },
            { label: 'Target Goals', value: summary.data.goals.total, icon: ClipboardCheck, gradient: 'from-emerald-600 to-teal-600' },
            { label: 'Average Rating', value: summary.data.avg_rating ? `${summary.data.avg_rating} / 5` : '—', icon: Star, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Reviews Logged', value: summary.data.total_reviews, icon: MessageSquare, gradient: 'from-purple-600 to-pink-600' },
            { label: '360° Feedbacks', value: summary.data.total_feedback, icon: UserCheck, gradient: 'from-sky-600 to-cyan-600' },
            { label: 'Active PIPs', value: summary.data.active_pips, icon: AlertTriangle, gradient: summary.data.active_pips > 0 ? 'from-rose-600 to-red-600' : 'from-slate-600 to-slate-700' },
          ].map((s, i) => (
            <div key={i} className="relative overflow-hidden bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-sm`}>
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter and Switcher Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Select
                options={[{ value: '', label: 'All Employees' }, ...empOptions]}
                value={empFilter}
                onChange={(e) => setEmpFilter(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-36">
              <Select
                options={YEAR_OPTIONS}
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              />
            </div>
            {(empFilter || yearFilter !== String(currentYear)) && (
              <button
                onClick={() => { setEmpFilter(''); setYearFilter(String(currentYear)) }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="pt-2 border-t border-slate-100">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* KPI Tab */}
        {tab === 'kpi' && (
          kpiLoading ? <div className="p-8"><LoadingState /></div> :
          (kpiData?.data || []).length === 0 ? <div className="p-8"><EmptyState title="No KPIs Defined" description="Establish Key Performance Indicators (KPIs) to align team goals and expectations." action={<Button onClick={() => showFormModal('kpi')}><Plus className="w-4 h-4 mr-1.5" /> Define KPI</Button>} /></div> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Code', className: 'font-mono text-xs text-slate-600' },
                { key: 'name', header: 'Employee', render: (r: any) => <span className="font-semibold text-slate-800">{fullName(r.first_name, r.last_name)}</span> },
                { key: 'title', header: 'KPI Title & Description', render: (r: any) => <div><p className="text-xs font-semibold text-slate-900">{r.title}</p><p className="text-xs text-slate-500 line-clamp-1">{r.description || '—'}</p></div> },
                { key: 'category', header: 'Category', render: (r: any) => <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">{r.category}</span> },
                { key: 'weight', header: 'Weightage', render: (r: any) => <span className="font-semibold text-slate-800">{r.weight}%</span> },
                { key: 'actions', header: '', render: (r: any) => (
                  <button onClick={() => setConfirmDelete({ type: 'kpi', id: r.id })} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete KPI">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )},
              ]}
              data={kpiData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}

        {/* Goals Tab */}
        {tab === 'goals' && (
          goalLoading ? <div className="p-8"><LoadingState /></div> :
          (goalData?.data || []).length === 0 ? <div className="p-8"><EmptyState title="No Goals Set" description="Set quarterly or annual performance goals with measurable targets." action={<Button onClick={() => showFormModal('goal')}><Plus className="w-4 h-4 mr-1.5" /> Create Goal</Button>} /></div> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Code', className: 'font-mono text-xs text-slate-600' },
                { key: 'name', header: 'Employee', render: (r: any) => <span className="font-semibold text-slate-800">{fullName(r.first_name, r.last_name)}</span> },
                { key: 'title', header: 'Goal Details', render: (r: any) => <div><p className="text-xs font-semibold text-slate-900">{r.title}</p>{r.quarter && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">Q{r.quarter} Target</span>}</div> },
                { key: 'weight', header: 'Weight', render: (r: any) => <span className="font-semibold text-slate-800">{r.weight}%</span> },
                { key: 'status', header: 'Status', render: (r: any) => {
                  const s = GOAL_STATUS[r.status] || GOAL_STATUS.not_started
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {goalLabel(r.status)}
                    </span>
                  )
                }},
                { key: 'actions', header: '', render: (r: any) => (
                  <div className="flex items-center gap-1.5">
                    {r.status !== 'completed' && (
                      <select
                        value={r.status}
                        onChange={e => goalUpdateMut.mutate({ id: r.id, data: { status: e.target.value } })}
                        className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 outline-none focus:border-indigo-500 font-medium text-slate-700"
                      >
                        {['not_started', 'in_progress', 'completed', 'not_achieved'].map(s => <option key={s} value={s}>{goalLabel(s)}</option>)}
                      </select>
                    )}
                    <button onClick={() => setConfirmDelete({ type: 'goal', id: r.id })} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )},
              ]}
              data={goalData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}

        {/* Reviews Tab */}
        {tab === 'reviews' && (
          reviewLoading ? <div className="p-8"><LoadingState /></div> :
          (reviewData?.data || []).length === 0 ? <div className="p-8"><EmptyState title="No Reviews Logged" description="Schedule and track quarterly or annual performance evaluations." action={<Button onClick={() => showFormModal('review')}><Plus className="w-4 h-4 mr-1.5" /> Log Review</Button>} /></div> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Code', className: 'font-mono text-xs text-slate-600' },
                { key: 'name', header: 'Employee', render: (r: any) => <span className="font-semibold text-slate-800">{fullName(r.first_name, r.last_name)}</span> },
                { key: 'review_period', header: 'Period & Type', render: (r: any) => <div className="flex items-center gap-1.5"><span className="text-xs font-semibold text-slate-900">{r.review_period}</span><span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 uppercase">{r.review_type}</span></div> },
                { key: 'overall_rating', header: 'Rating', render: (r: any) => renderStarRating(r.overall_rating) },
                { key: 'reviewer_name', header: 'Reviewer', render: (r: any) => <span className="text-xs text-slate-600">{r.reviewer_name || '—'}</span> },
                { key: 'status', header: 'Status', render: (r: any) => {
                  const s = REVIEW_STATUS[r.status] || REVIEW_STATUS.draft
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {reviewLabel(r.status)}
                    </span>
                  )
                }},
                { key: 'actions', header: '', render: (r: any) => (
                  <button onClick={() => setConfirmDelete({ type: 'review', id: r.id })} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )},
              ]}
              data={reviewData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}

        {/* Feedback Tab */}
        {tab === 'feedback' && (
          feedbackLoading ? <div className="p-8"><LoadingState /></div> :
          (feedbackData?.data || []).length === 0 ? <div className="p-8"><EmptyState title="No 360° Feedback" description="Gather constructive feedback from peers, managers, and direct reports." action={<Button onClick={() => showFormModal('feedback')}><Plus className="w-4 h-4 mr-1.5" /> Submit Feedback</Button>} /></div> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p><span className="text-[10px] font-medium text-slate-500 uppercase">{r.feedback_type} Feedback</span></div> },
                { key: 'from_name', header: 'Evaluator', render: (r: any) => <span className="text-xs font-medium text-slate-700">{r.is_anonymous ? '🔒 Anonymous' : (r.from_name || '—')}</span> },
                { key: 'rating', header: 'Score', render: (r: any) => renderStarRating(r.rating) },
                { key: 'strengths', header: 'Key Strengths', render: (r: any) => <p className="text-xs text-slate-600 max-w-[200px] truncate">{r.strengths || '—'}</p> },
                { key: 'areas_improvement', header: 'Growth Areas', render: (r: any) => <p className="text-xs text-slate-600 max-w-[200px] truncate">{r.areas_improvement || '—'}</p> },
                { key: 'actions', header: '', render: (r: any) => (
                  <button onClick={() => setConfirmDelete({ type: 'feedback', id: r.id })} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )},
              ]}
              data={feedbackData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}

        {/* Self-Appraisal Tab */}
        {tab === 'appraisal' && (
          appraisalLoading ? <div className="p-8"><LoadingState /></div> :
          (appraisalData?.data || []).length === 0 ? <div className="p-8"><EmptyState title="No Self-Appraisals" description="Staff members can submit their periodic self-reflections and accomplishments." action={<Button onClick={() => showFormModal('appraisal')}><Plus className="w-4 h-4 mr-1.5" /> Submit Appraisal</Button>} /></div> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p><p className="text-[10px] text-slate-500 font-mono">{r.fiscal_year}{r.quarter ? ` Q${r.quarter}` : ''}</p></div> },
                { key: 'achievements', header: 'Key Achievements', render: (r: any) => <p className="text-xs text-slate-700 max-w-[260px] line-clamp-2">{r.achievements || '—'}</p> },
                { key: 'training_needs', header: 'Training Needs', render: (r: any) => <p className="text-xs text-slate-600 max-w-[200px] truncate">{r.training_needs || '—'}</p> },
                { key: 'status', header: 'Status', render: (r: any) => (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'submitted' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {r.status === 'submitted' ? 'Submitted' : 'Draft'}
                  </span>
                )},
              ]}
              data={appraisalData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}

        {/* Increments Tab */}
        {tab === 'increments' && (
          incrLoading ? <div className="p-8"><LoadingState /></div> :
          (incrData?.data || []).length === 0 ? <div className="p-8"><EmptyState title="No Increment Proposals" description="Recommend compensation revisions tied directly to merit and performance." action={<Button onClick={() => showFormModal('increment')}><Plus className="w-4 h-4 mr-1.5" /> Recommend Increment</Button>} /></div> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p><p className="text-[10px] font-mono text-slate-500">{r.employee_code}</p></div> },
                { key: 'current_salary', header: 'Current CTC', render: (r: any) => <span className="font-mono text-xs text-slate-700 font-medium">₹{Number(r.current_salary || 0).toLocaleString('en-IN')}</span> },
                { key: 'recommended_increment', header: 'Increment', render: (r: any) => <span className="font-mono text-xs text-emerald-600 font-bold">+₹{Number(r.recommended_increment || 0).toLocaleString('en-IN')}</span> },
                { key: 'increment_percent', header: 'Hike %', render: (r: any) => <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700">{r.increment_percent ? `${r.increment_percent}%` : '—'}</span> },
                { key: 'performance_score', header: 'Rating', render: (r: any) => renderStarRating(r.performance_score) },
                { key: 'status', header: 'Status', render: (r: any) => {
                  const s = REC_STATUS[r.status] || REC_STATUS.pending
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {recLabel(r.status)}
                    </span>
                  )
                }},
                { key: 'actions', header: '', render: (r: any) => r.status === 'pending' ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => incrUpdateMut.mutate({ id: r.id, data: { status: 'approved' } })} className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">Approve</button>
                    <button onClick={() => incrUpdateMut.mutate({ id: r.id, data: { status: 'rejected' } })} className="px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">Reject</button>
                  </div>
                ) : null },
              ]}
              data={incrData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}

        {/* Promotions Tab */}
        {tab === 'promotions' && (
          promoLoading ? <div className="p-8"><LoadingState /></div> :
          (promoData?.data || []).length === 0 ? <div className="p-8"><EmptyState title="No Promotion Requests" description="Nominate high-performing talent for role advancements and designations." action={<Button onClick={() => showFormModal('promotion')}><Plus className="w-4 h-4 mr-1.5" /> Recommend Promotion</Button>} /></div> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p><p className="text-[10px] font-mono text-slate-500">{r.employee_code}</p></div> },
                { key: 'current_designation', header: 'Current Designation', render: (r: any) => <span className="text-xs text-slate-600">{r.current_designation || '—'}</span> },
                { key: 'recommended_designation', header: 'Proposed Role', render: (r: any) => <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{r.recommended_designation}</span> },
                { key: 'performance_score', header: 'Rating', render: (r: any) => renderStarRating(r.performance_score) },
                { key: 'status', header: 'Status', render: (r: any) => {
                  const s = REC_STATUS[r.status] || REC_STATUS.pending
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {recLabel(r.status)}
                    </span>
                  )
                }},
                { key: 'actions', header: '', render: (r: any) => r.status === 'pending' ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => promoUpdateMut.mutate({ id: r.id, data: { status: 'approved' } })} className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">Approve</button>
                    <button onClick={() => promoUpdateMut.mutate({ id: r.id, data: { status: 'rejected' } })} className="px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">Reject</button>
                  </div>
                ) : null },
              ]}
              data={promoData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}

        {/* PIP Tab */}
        {tab === 'pips' && (
          pipLoading ? <div className="p-8"><LoadingState /></div> :
          (pipData?.data || []).length === 0 ? <div className="p-8"><EmptyState title="No Active PIPs" description="Structure and monitor Performance Improvement Plans with concrete milestone goals." action={<Button onClick={() => showFormModal('pip')}><Plus className="w-4 h-4 mr-1.5" /> Initiate PIP</Button>} /></div> : (
            <Table
              columns={[
                { key: 'employee_code', header: 'Employee', render: (r: any) => <div><p className="text-xs font-semibold text-slate-900">{fullName(r.first_name, r.last_name)}</p><p className="text-[10px] font-mono text-slate-500">{r.employee_code}</p></div> },
                { key: 'title', header: 'Plan & Timeline', render: (r: any) => <div><p className="text-xs font-semibold text-slate-900">{r.title}</p><p className="text-[11px] text-slate-500">{dateShort(r.start_date)} — {dateShort(r.end_date)}</p></div> },
                { key: 'status', header: 'Status', render: (r: any) => {
                  const s = PIP_STATUS[r.status] || PIP_STATUS.active
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {pipLabel(r.status)}
                    </span>
                  )
                }},
                { key: 'outcome', header: 'Outcome', render: (r: any) => r.outcome ? <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${r.outcome === 'successful' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{r.outcome}</span> : '—' },
                { key: 'actions', header: '', render: (r: any) => r.status === 'active' ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => pipUpdateMut.mutate({ id: r.id, data: { status: 'completed', outcome: 'successful' } })} className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">Complete</button>
                    <button onClick={() => pipUpdateMut.mutate({ id: r.id, data: { status: 'cancelled' } })} className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                  </div>
                ) : null },
              ]}
              data={pipData?.data || []}
              keyFn={(r: any) => String(r.id)}
            />
          )
        )}

        {/* History Tab */}
        {tab === 'history' && (
          histLoading ? <div className="p-8"><LoadingState /></div> :
          (histData?.data || []).length === 0 ? <div className="p-8"><EmptyState title="No Performance History" description="All appraisal events and milestone changes will be logged here." /></div> : (
            <div className="divide-y divide-slate-100 p-4 max-h-[60vh] overflow-y-auto">
              {(histData?.data || []).map((h: any) => (
                <div key={h.id} className="py-3 flex items-start gap-3 hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-0.5">
                    <History className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800">{h.details}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700">{fullName(h.first_name, h.last_name)}</span> ({h.employee_code}) · <span className="capitalize">{h.action}</span> · by {h.performed_by || 'System'} · {dateShort(h.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Dynamic Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={FormTitle[tab === 'goals' ? 'goal' : tab === 'reviews' ? 'review' : tab === 'feedback' ? 'feedback' : tab === 'appraisal' ? 'appraisal' : tab === 'increments' ? 'increment' : tab === 'promotions' ? 'promotion' : tab === 'pips' ? 'pip' : 'kpi']} size="md">
        <div className="space-y-4 pt-1">
          {(tab === 'kpi' || tab === 'goals' || tab === 'reviews' || tab === 'feedback' || tab === 'appraisal' || tab === 'increments' || tab === 'promotions' || tab === 'pips') && (
            <Select label="Select Employee" options={[{ value: '', label: 'Select employee...' }, ...empOptions]} value={tab === 'kpi' ? kpiForm.employee_id : tab === 'goals' ? goalForm.employee_id : tab === 'reviews' ? reviewForm.employee_id : tab === 'feedback' ? fbForm.employee_id : tab === 'appraisal' ? appraisalForm.employee_id : tab === 'increments' ? incrForm.employee_id : tab === 'promotions' ? promoForm.employee_id : pipForm.employee_id} onChange={e => {
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
            <Input label="KPI Title" placeholder="e.g. Code Review Turnaround Time" value={kpiForm.title} onChange={e => setKpiForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" placeholder="Clarify measurement details..." value={kpiForm.description} onChange={e => setKpiForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Category" options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} value={kpiForm.category} onChange={e => setKpiForm(f => ({ ...f, category: e.target.value }))} />
              <Input label="Weight (%)" type="number" value={kpiForm.weight} onChange={e => setKpiForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            <Textarea label="Target Milestone" placeholder="Target expectations..." value={kpiForm.target} onChange={e => setKpiForm(f => ({ ...f, target: e.target.value }))} />
          </>}

          {tab === 'goals' && <>
            <Input label="Goal Title" placeholder="e.g. Complete ISO Certification Audit" value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" placeholder="Goal criteria..." value={goalForm.description} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Target Metric" placeholder="e.g. 100%" value={goalForm.target_value} onChange={e => setGoalForm(f => ({ ...f, target_value: e.target.value }))} />
              <Input label="Weight (%)" type="number" value={goalForm.weight} onChange={e => setGoalForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Quarter Period" options={[{ value: '', label: 'Annual Goal' }, { value: '1', label: 'Quarter 1' }, { value: '2', label: 'Quarter 2' }, { value: '3', label: 'Quarter 3' }, { value: '4', label: 'Quarter 4' }]} value={goalForm.quarter} onChange={e => setGoalForm(f => ({ ...f, quarter: e.target.value }))} />
              <Select label="Status" options={['not_started', 'in_progress', 'completed', 'not_achieved'].map(s => ({ value: s, label: goalLabel(s) }))} value={goalForm.status} onChange={e => setGoalForm(f => ({ ...f, status: e.target.value }))} />
            </div>
          </>}

          {tab === 'reviews' && <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Review Period" placeholder="e.g. 2026-Q1" value={reviewForm.review_period} onChange={e => setReviewForm(f => ({ ...f, review_period: e.target.value }))} />
              <Select label="Review Type" options={[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annual', label: 'Annual' }]} value={reviewForm.review_type} onChange={e => setReviewForm(f => ({ ...f, review_type: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Reviewer Name" placeholder="Evaluator" value={reviewForm.reviewer_name} onChange={e => setReviewForm(f => ({ ...f, reviewer_name: e.target.value }))} />
              <Select label="Overall Rating" options={[{ value: '', label: 'Select Rating...' }, { value: '1', label: '⭐ 1 - Needs Improvement' }, { value: '2', label: '⭐⭐ 2 - Below Expectations' }, { value: '3', label: '⭐⭐⭐ 3 - Meets Expectations' }, { value: '4', label: '⭐⭐⭐⭐ 4 - Exceeds Expectations' }, { value: '5', label: '⭐⭐⭐⭐⭐ 5 - Outstanding' }]} value={reviewForm.overall_rating} onChange={e => setReviewForm(f => ({ ...f, overall_rating: e.target.value }))} />
            </div>
            <Textarea label="Key Strengths" value={reviewForm.strengths} onChange={e => setReviewForm(f => ({ ...f, strengths: e.target.value }))} />
            <Textarea label="Areas for Improvement" value={reviewForm.improvements} onChange={e => setReviewForm(f => ({ ...f, improvements: e.target.value }))} />
            <Textarea label="Manager Comments" value={reviewForm.comments} onChange={e => setReviewForm(f => ({ ...f, comments: e.target.value }))} />
          </>}

          {tab === 'feedback' && <>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Feedback Type" options={[{ value: 'manager', label: 'Manager Review' }, { value: 'peer', label: 'Peer Feedback' }, { value: 'self', label: 'Self Feedback' }, { value: '360', label: '360° Assessment' }]} value={fbForm.feedback_type} onChange={e => setFbForm(f => ({ ...f, feedback_type: e.target.value }))} />
              <Input label="From Name" placeholder="Your name" value={fbForm.from_name} onChange={e => setFbForm(f => ({ ...f, from_name: e.target.value }))} />
            </div>
            <Select label="Rating" options={[{ value: '', label: 'Select rating...' }, { value: '1', label: '⭐ 1 - Poor' }, { value: '2', label: '⭐⭐ 2 - Below Average' }, { value: '3', label: '⭐⭐⭐ 3 - Good' }, { value: '4', label: '⭐⭐⭐⭐ 4 - Very Good' }, { value: '5', label: '⭐⭐⭐⭐⭐ 5 - Excellent' }]} value={fbForm.rating} onChange={e => setFbForm(f => ({ ...f, rating: e.target.value }))} />
            <Textarea label="Strengths" value={fbForm.strengths} onChange={e => setFbForm(f => ({ ...f, strengths: e.target.value }))} />
            <Textarea label="Areas for Improvement" value={fbForm.areas_improvement} onChange={e => setFbForm(f => ({ ...f, areas_improvement: e.target.value }))} />
            <Textarea label="Comments" value={fbForm.comments} onChange={e => setFbForm(f => ({ ...f, comments: e.target.value }))} />
            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input type="checkbox" checked={fbForm.is_anonymous} onChange={e => setFbForm(f => ({ ...f, is_anonymous: e.target.checked }))} className="w-4 h-4 rounded text-indigo-600 accent-indigo-600" />
              <span className="text-xs font-medium text-slate-700">Submit anonymously</span>
            </label>
          </>}

          {tab === 'appraisal' && <>
            <Select label="Quarter" options={[{ value: '', label: 'Annual Appraisal' }, { value: '1', label: 'Quarter 1' }, { value: '2', label: 'Quarter 2' }, { value: '3', label: 'Quarter 3' }, { value: '4', label: 'Quarter 4' }]} value={appraisalForm.quarter} onChange={e => setAppraisalForm(f => ({ ...f, quarter: e.target.value }))} />
            <Textarea label="Key Achievements" placeholder="Highlight primary successes..." value={appraisalForm.achievements} onChange={e => setAppraisalForm(f => ({ ...f, achievements: e.target.value }))} />
            <Textarea label="Challenges Faced" placeholder="Roadblocks encountered..." value={appraisalForm.challenges} onChange={e => setAppraisalForm(f => ({ ...f, challenges: e.target.value }))} />
            <Textarea label="Goals for Next Period" value={appraisalForm.goals_next_period} onChange={e => setAppraisalForm(f => ({ ...f, goals_next_period: e.target.value }))} />
            <Textarea label="Training & Skill Needs" value={appraisalForm.training_needs} onChange={e => setAppraisalForm(f => ({ ...f, training_needs: e.target.value }))} />
            <Textarea label="Overall Comments" value={appraisalForm.overall_comments} onChange={e => setAppraisalForm(f => ({ ...f, overall_comments: e.target.value }))} />
          </>}

          {tab === 'increments' && <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Current CTC (₹)" type="number" value={incrForm.current_salary} onChange={e => setIncrForm(f => ({ ...f, current_salary: e.target.value }))} />
              <Input label="Increment (₹)" type="number" value={incrForm.recommended_increment} onChange={e => setIncrForm(f => ({ ...f, recommended_increment: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Hike %" type="number" value={incrForm.increment_percent} onChange={e => setIncrForm(f => ({ ...f, increment_percent: e.target.value }))} />
              <Select label="Performance Score" options={[{ value: '', label: 'Select rating...' }, { value: '1', label: '1 - Low' }, { value: '2', label: '2 - Average' }, { value: '3', label: '3 - Good' }, { value: '4', label: '4 - Very Good' }, { value: '5', label: '5 - Outstanding' }]} value={incrForm.performance_score} onChange={e => setIncrForm(f => ({ ...f, performance_score: e.target.value }))} />
            </div>
            <Textarea label="Justification" placeholder="Reasoning for revision..." value={incrForm.justification} onChange={e => setIncrForm(f => ({ ...f, justification: e.target.value }))} />
          </>}

          {tab === 'promotions' && <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Current Designation" value={promoForm.current_designation} onChange={e => setPromoForm(f => ({ ...f, current_designation: e.target.value }))} />
              <Input label="Proposed Designation" value={promoForm.recommended_designation} onChange={e => setPromoForm(f => ({ ...f, recommended_designation: e.target.value }))} />
            </div>
            <Select label="Performance Score" options={[{ value: '', label: 'Select rating...' }, { value: '1', label: '1 - Low' }, { value: '2', label: '2 - Average' }, { value: '3', label: '3 - Good' }, { value: '4', label: '4 - Very Good' }, { value: '5', label: '5 - Outstanding' }]} value={promoForm.performance_score} onChange={e => setPromoForm(f => ({ ...f, performance_score: e.target.value }))} />
            <Textarea label="Justification" placeholder="Promotional merit details..." value={promoForm.justification} onChange={e => setPromoForm(f => ({ ...f, justification: e.target.value }))} />
          </>}

          {tab === 'pips' && <>
            <Input label="PIP Title" placeholder="e.g. Sales Metric Alignment Plan" value={pipForm.title} onChange={e => setPipForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description & Issues" value={pipForm.description} onChange={e => setPipForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={pipForm.start_date} onChange={e => setPipForm(f => ({ ...f, start_date: e.target.value }))} />
              <Input label="Target End Date" type="date" value={pipForm.end_date} onChange={e => setPipForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <Textarea label="Milestone Objectives" placeholder="Measurable expectations..." value={pipForm.goals} onChange={e => setPipForm(f => ({ ...f, goals: e.target.value }))} />
            <Textarea label="Managerial Support & Comments" value={pipForm.manager_comments} onChange={e => setPipForm(f => ({ ...f, manager_comments: e.target.value }))} />
          </>}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
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
            >
              Save Record
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return
          if (confirmDelete.type === 'kpi') kpiDeleteMut.mutate(confirmDelete.id)
        }}
        title="Delete Record"
        message="Are you sure you want to delete this performance record? This action cannot be undone."
        danger
      />
    </div>
  )
}

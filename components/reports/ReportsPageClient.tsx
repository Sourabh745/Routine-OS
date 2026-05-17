'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Report } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  FileText,
  Sparkles,
  Trash2,
  Loader2,
  CheckCircle2,
  Target,
  Flame,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ReportsPageClientProps = {
  initialReports: Report[]
}

export function ReportsPageClient({ initialReports }: ReportsPageClientProps) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [generating, setGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(
    initialReports[0]?.id || null
  )

  const generateReport = async () => {
    setGenerating(true)

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }

      const data = await res.json()
      setReports((prev) => [data.report, ...prev])
      setExpandedId(data.report.id)
      toast.success('Weekly report generated')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate'
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  const deleteReport = async (reportId: string) => {
    setDeletingId(reportId)
    const previousReports = reports

    setReports((prev) => prev.filter((r) => r.id !== reportId))

    try {
      const res = await fetch('/api/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId }),
      })

      if (!res.ok) throw new Error('Failed')
      toast.success('Report deleted')
    } catch {
      setReports(previousReports)
      toast.error('Failed to delete report')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Generate Weekly Executive Summary
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              AI will analyze your tasks, goals, habits, and journal from the past 7 days.
            </p>
          </div>

          <Button
            onClick={generateReport}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {reports.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium">No reports yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Generate your first weekly summary above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isExpanded = expandedId === report.id
            const metrics = report.metrics

            return (
              <Card
                key={report.id}
                className="bg-slate-900 border-slate-800 transition-all"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-cyan-400" />
                        {report.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className="border border-slate-700 bg-slate-800 text-slate-300 capitalize">
                          {report.report_type}
                        </Badge>
                        {report.week_start && report.week_end && (
                          <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                            {format(new Date(report.week_start), 'MMM d')} -{' '}
                            {format(new Date(report.week_end), 'MMM d')}
                          </Badge>
                        )}
                        <Badge className="border border-slate-700 bg-slate-800 text-slate-400 text-xs">
                          {format(new Date(report.created_at), 'PPP')}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : report.id)
                        }
                        className="border-slate-700 text-white hover:bg-slate-800"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteReport(report.id)}
                        disabled={deletingId === report.id}
                        className="text-slate-500 hover:text-red-400 hover:bg-red-950/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-6">
                    {metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <MetricCard
                          label="Tasks Done"
                          value={`${metrics.tasks_completed}/${metrics.tasks_total}`}
                          icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
                        />
                        <MetricCard
                          label="Completion"
                          value={`${metrics.completion_rate}%`}
                          icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
                        />
                        <MetricCard
                          label="Goals Progressed"
                          value={metrics.goals_progressed}
                          icon={<Target className="w-4 h-4 text-purple-400" />}
                        />
                        <MetricCard
                          label="Best Streak"
                          value={metrics.habits_streak}
                          icon={<Flame className="w-4 h-4 text-orange-400" />}
                        />
                        <MetricCard
                          label="Journal Entries"
                          value={metrics.journal_entries}
                          icon={<BookOpen className="w-4 h-4 text-yellow-400" />}
                        />
                      </div>
                    )}

                    {metrics?.top_win && (
                      <InsightBlock
                        icon={<Trophy className="w-4 h-4 text-yellow-400" />}
                        title="Top Win"
                        body={metrics.top_win}
                        accent="border-yellow-500/30 bg-yellow-500/10"
                      />
                    )}

                    {metrics?.main_challenge && (
                      <InsightBlock
                        icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
                        title="Main Challenge"
                        body={metrics.main_challenge}
                        accent="border-orange-500/30 bg-orange-500/10"
                      />
                    )}

                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                      <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {report.content}
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-white text-lg font-semibold">{value}</p>
      <p className="text-slate-400 text-xs mt-1">{label}</p>
    </div>
  )
}

function InsightBlock({
  icon,
  title,
  body,
  accent,
}: {
  icon: React.ReactNode
  title: string
  body: string
  accent: string
}) {
  return (
    <div className={cn('rounded-lg border p-3', accent)}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <p className="text-white text-xs font-medium uppercase tracking-wider">
          {title}
        </p>
      </div>
      <p className="text-slate-200 text-sm leading-relaxed">{body}</p>
    </div>
  )
}
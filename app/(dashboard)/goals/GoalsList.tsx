'use client'

import { Goal } from '@/lib/types/goals'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface GoalsListProps {
  goals: Goal[]
}

const categoryEmojis: Record<string, string> = {
  health: '💪', career: '💼', learning: '📚',
  finance: '💰', relationships: '❤️', personal: '🌟', other: '🎯',
}

const priorityStyles: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
}

export function GoalsList({ goals }: GoalsListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="text-5xl mb-4">🎯</div>
        <p className="text-lg font-medium text-white mb-2">No goals yet</p>
        <p>Add your first goal and let AI break it down into daily actions</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const [expanded, setExpanded] = useState(false)
  const daysLeft = goal.target_date 
    ? differenceInDays(new Date(goal.target_date), new Date())
    : null

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{categoryEmojis[goal.category]}</span>
            <div>
              <h3 className="text-white font-semibold">{goal.title}</h3>
              {goal.description && (
                <p className="text-slate-400 text-sm mt-0.5">{goal.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={cn("border text-xs", priorityStyles[goal.priority])}>
              {goal.priority}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Progress</span>
              <span className="text-white font-medium">{goal.progress_percentage}%</span>
            </div>
            <Progress value={goal.progress_percentage} className="h-2 bg-slate-700" />
          </div>
          
          {daysLeft !== null && (
            <div className={cn(
              "flex items-center gap-1 text-xs whitespace-nowrap",
              daysLeft < 7 ? "text-red-400" : daysLeft < 30 ? "text-yellow-400" : "text-slate-400"
            )}>
              <Clock className="w-3 h-3" />
              {daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`}
            </div>
          )}
        </div>
      </CardHeader>

      {goal.ai_breakdown && (
        <>
          <div className="px-6 pb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white p-0 h-auto"
            >
              {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {expanded ? 'Hide' : 'View'} AI Plan
            </Button>
          </div>

          {expanded && (
            <CardContent className="pt-0 border-t border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <h4 className="text-slate-300 text-xs uppercase tracking-wider mb-2">AI Summary</h4>
                  <p className="text-slate-400 text-sm">{goal.ai_breakdown.summary}</p>
                </div>
                <div>
                  <h4 className="text-slate-300 text-xs uppercase tracking-wider mb-2">Key Milestones</h4>
                  <ul className="space-y-1">
                    {goal.ai_breakdown.quarterly_milestones?.map((m, i) => (
                      <li key={i} className="text-slate-400 text-sm flex gap-2">
                        <span className="text-purple-400 flex-shrink-0">→</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-slate-300 text-xs uppercase tracking-wider mb-2">Daily Habits</h4>
                  <ul className="space-y-1">
                    {goal.ai_breakdown.daily_habits?.map((h, i) => (
                      <li key={i} className="text-slate-400 text-sm flex gap-2">
                        <span className="text-green-400">✓</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-slate-300 text-xs uppercase tracking-wider mb-2">Watch Out For</h4>
                  <ul className="space-y-1">
                    {goal.ai_breakdown.key_risks?.map((r, i) => (
                      <li key={i} className="text-slate-400 text-sm flex gap-2">
                        <span className="text-yellow-400">⚠</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          )}
        </>
      )}
    </Card>
  )
}
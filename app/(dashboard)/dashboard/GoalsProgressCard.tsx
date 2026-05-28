import { Goal } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Target } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const categoryColors: Record<string, string> = {
  health: 'text-green-400',
  career: 'text-blue-400',
  learning: 'text-yellow-400',
  finance: 'text-emerald-400',
  relationships: 'text-pink-400',
  personal: 'text-purple-400',
  other: 'text-slate-400',
}

const categoryEmojis: Record<string, string> = {
  health: '💪',
  career: '💼',
  learning: '📚',
  finance: '💰',
  relationships: '❤️',
  personal: '🌟',
  other: '🎯',
}

interface GoalsProgressCardProps {
  goals: Goal[]
}

export function GoalsProgressCard({ goals }: GoalsProgressCardProps) {
  console.log('Rendering GoalsProgressCard with goals:', goals) // Debug log
  const topGoals = goals.slice(0, 4)

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-blue-400" />
          Active Goals
        </CardTitle>
        <Link href="/goals" className="text-purple-400 hover:text-purple-300 text-xs">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {topGoals.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm">No active goals yet</p>
            <Link href="/goals" className="text-purple-400 text-xs hover:text-purple-300">
              Add your first goal →
            </Link>
          </div>
        ) : (
          topGoals.map((goal) => (
            <div key={goal.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span>{categoryEmojis[goal.category] || '🎯'}</span>
                  <span className="text-sm text-white truncate max-w-32">{goal.title}</span>
                </div>
                <span className={cn("text-xs font-medium", categoryColors[goal.category] || 'text-slate-400')}>
                  {goal.progress_percentage}%
                </span>
              </div>
              <Progress 
                value={goal.progress_percentage} 
                className="h-1.5 bg-slate-700" 
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
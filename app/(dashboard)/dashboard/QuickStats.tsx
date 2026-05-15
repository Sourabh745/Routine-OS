import { Target, CheckSquare, Activity, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface QuickStatsProps {
  totalGoals: number
  completedTasks: number
  totalTasks: number
  activeHabits: number
}

export function QuickStats({ totalGoals, completedTasks, totalTasks, activeHabits }: QuickStatsProps) {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const stats = [
    {
      label: 'Active Goals',
      value: totalGoals,
      icon: Target,
      color: 'text-blue-400',
      bg: 'bg-blue-950/30',
    },
    {
      label: "Today's Progress",
      value: `${completionRate}%`,
      icon: CheckSquare,
      color: 'text-green-400',
      bg: 'bg-green-950/30',
    },
    {
      label: 'Active Habits',
      value: activeHabits,
      icon: Activity,
      color: 'text-orange-400',
      bg: 'bg-orange-950/30',
    },
    {
      label: 'Tasks Done',
      value: `${completedTasks}/${totalTasks}`,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-950/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-slate-400 text-xs">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
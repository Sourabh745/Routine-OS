'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Task } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Sparkles,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type GoalOption = {
  id: string
  title: string
}

type TodayPageClientProps = {
  initialTasks: Task[]
  initialOverdueTasks: Task[]
  goals: GoalOption[]
}

const priorityOrder = { high: 0, medium: 1, low: 2 }

const priorityStyles: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
}

export function TodayPageClient({
  initialTasks,
  initialOverdueTasks,
  goals,
}: TodayPageClientProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [overdueTasks, setOverdueTasks] = useState<Task[]>(initialOverdueTasks)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskGoalId, setNewTaskGoalId] = useState<string>('none')
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [newTaskDuration, setNewTaskDuration] = useState('30')

  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const totalCount = tasks.length
  const progressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const grouped = useMemo(() => {
    const sorted = [...tasks].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    )

    return {
      high: sorted.filter((t) => t.priority === 'high'),
      medium: sorted.filter((t) => t.priority === 'medium'),
      low: sorted.filter((t) => t.priority === 'low'),
      completed: sorted.filter((t) => t.status === 'completed'),
    }
  }, [tasks])

  const updateTaskStatus = async (
    task: Task,
    status: 'pending' | 'completed' | 'skipped'
  ) => {
    if (updatingId) return
    setUpdatingId(task.id)

    const previousTasks = tasks
    const previousOverdue = overdueTasks

    const updateList = (list: Task[]) =>
      list.map((t) => (t.id === task.id ? { ...t, status } : t))

    setTasks((prev) => updateList(prev))
    setOverdueTasks((prev) => updateList(prev))

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status }),
      })

      if (!res.ok) throw new Error('Failed to update task')

      if (status === 'completed') toast.success('Task completed')
      if (status === 'skipped') toast.success('Task skipped')
      if (status === 'pending') toast.success('Task moved back to pending')

      router.refresh()
    } catch {
      setTasks(previousTasks)
      setOverdueTasks(previousOverdue)
      toast.error('Failed to update task')
    } finally {
      setUpdatingId(null)
    }
  }

  const createTask = async () => {
    if (!newTaskTitle.trim()) return
    setCreating(true)

    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          goal_id: newTaskGoalId === 'none' ? null : newTaskGoalId,
          priority: newTaskPriority,
          duration_minutes: Number(newTaskDuration) || 30,
          scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        }),
      })

      if (!res.ok) throw new Error('Failed to create task')

      const data = await res.json()
      setTasks((prev) => [data.task, ...prev])
      setNewTaskTitle('')
      setNewTaskGoalId('none')
      setNewTaskPriority('medium')
      setNewTaskDuration('30')
      toast.success('Task added for today')
      router.refresh()
    } catch {
      toast.error('Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  const moveOverdueToToday = async (task: Task) => {
    if (updatingId) return
    setUpdatingId(task.id)

    try {
      const res = await fetch('/api/tasks/reschedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        }),
      })

      if (!res.ok) throw new Error('Failed to reschedule task')

      setOverdueTasks((prev) => prev.filter((t) => t.id !== task.id))
      setTasks((prev) => [{ ...task, scheduled_date: format(new Date(), 'yyyy-MM-dd') }, ...prev])
      toast.success('Task moved to today')
      router.refresh()
    } catch {
      toast.error('Failed to move task')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Daily Progress
            </span>
            <span className="text-sm text-slate-400">
              {completedCount}/{totalCount} complete
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressValue} className="h-2 bg-slate-800" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="High Priority" value={grouped.high.length} color="text-red-400" />
            <StatCard label="Medium Priority" value={grouped.medium.length} color="text-yellow-400" />
            <StatCard label="Low Priority" value={grouped.low.length} color="text-green-400" />
            <StatCard label="Overdue" value={overdueTasks.length} color="text-orange-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" />
            Quick Add Task
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task for today..."
            className="md:col-span-2 bg-slate-800 border-slate-700 text-white"
          />

          <Select value={newTaskGoalId} onValueChange={setNewTaskGoalId}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Goal" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="none">No goal</SelectItem>
              {goals.map((goal) => (
                <SelectItem key={goal.id} value={goal.id}>
                  {goal.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-3">
            <Select
              value={newTaskPriority}
              onValueChange={(v: 'high' | 'medium' | 'low') => setNewTaskPriority(v)}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={newTaskDuration}
              onChange={(e) => setNewTaskDuration(e.target.value)}
              placeholder="30"
              className="w-20 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <Button
            onClick={createTask}
            disabled={creating || !newTaskTitle.trim()}
            className="md:col-span-4 bg-purple-600 hover:bg-purple-700"
          >
            {creating ? 'Adding...' : 'Add Task'}
          </Button>
        </CardContent>
      </Card>

      {overdueTasks.length > 0 && (
        <Card className="bg-slate-900 border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-800/60 border border-slate-700"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{task.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {task.scheduled_date}
                    </span>
                    <Badge className={cn('text-xs border', priorityStyles[task.priority])}>
                      {task.priority}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => moveOverdueToToday(task)}
                    className="border-slate-600 text-white hover:bg-slate-800"
                    disabled={updatingId === task.id}
                  >
                    Move to Today
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateTaskStatus(task, 'completed')}
                    className="text-green-400 hover:text-green-300 hover:bg-green-950/20"
                    disabled={updatingId === task.id}
                  >
                    Complete
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TaskSection
          title="High Priority"
          icon={<Zap className="w-4 h-4 text-red-400" />}
          tasks={grouped.high.filter((t) => t.status !== 'completed')}
          emptyText="No high priority tasks"
          updatingId={updatingId}
          onToggle={updateTaskStatus}
        />

        <TaskSection
          title="Medium / Low"
          icon={<Circle className="w-4 h-4 text-yellow-400" />}
          tasks={[...grouped.medium, ...grouped.low].filter((t) => t.status !== 'completed')}
          emptyText="No remaining medium or low tasks"
          updatingId={updatingId}
          onToggle={updateTaskStatus}
        />

        <TaskSection
          title="Completed"
          icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
          tasks={grouped.completed}
          emptyText="Nothing completed yet"
          updatingId={updatingId}
          onToggle={updateTaskStatus}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-3">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={cn('text-lg font-semibold mt-1', color)}>{value}</p>
    </div>
  )
}

function TaskSection({
  title,
  icon,
  tasks,
  emptyText,
  updatingId,
  onToggle,
}: {
  title: string
  icon: React.ReactNode
  tasks: Task[]
  emptyText: string
  updatingId: string | null
  onToggle: (task: Task, status: 'pending' | 'completed' | 'skipped') => Promise<void>
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-slate-500 text-sm">{emptyText}</p>
        ) : (
          tasks.map((task) => {
            const completed = task.status === 'completed'
            return (
              <div
                key={task.id}
                className={cn(
                  'p-3 rounded-lg border transition-all',
                  completed
                    ? 'bg-slate-800/30 border-slate-700/30 opacity-70'
                    : 'bg-slate-800/60 border-slate-700/60'
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={completed}
                    disabled={updatingId === task.id}
                    onCheckedChange={() =>
                      onToggle(task, completed ? 'pending' : 'completed')
                    }
                    className="mt-1 border-slate-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          completed ? 'line-through text-slate-500' : 'text-white'
                        )}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-1.5">
                        {task.is_ai_generated && (
                          <Sparkles className="w-3 h-3 text-purple-400" />
                        )}
                        <Badge className={cn('text-xs border', priorityStyles[task.priority])}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-slate-400 text-xs mt-1">{task.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.duration_minutes} min
                      </span>
                      {task.goals?.title && (
                        <span className="text-purple-400 truncate">
                          {task.goals.title}
                        </span>
                      )}
                    </div>

                    {!completed && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onToggle(task, 'completed')}
                          className="h-8 text-green-400 hover:text-green-300 hover:bg-green-950/20"
                          disabled={updatingId === task.id}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onToggle(task, 'skipped')}
                          className="h-8 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/20"
                          disabled={updatingId === task.id}
                        >
                          Skip
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
'use client'

import { useState } from 'react'
import { Task } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckSquare, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TodaysTasksCardProps {
  initialTasks: Task[]
}

const priorityColors = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
}

export function TodaysTasksCard({ initialTasks }: TodaysTasksCardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [updating, setUpdating] = useState<string | null>(null)

  const completed = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length
  const progressPercent = total > 0 ? (completed / total) * 100 : 0

  const toggleTask = async (task: Task) => {
    if (updating) return
    setUpdating(task.id)

    const newStatus = task.status === 'completed' ? 'pending' : 'completed'

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: newStatus as Task['status'] } : t
    ))

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update')
      
      if (newStatus === 'completed') {
        toast.success('Task completed! 🎉')
      }
    } catch {
      // Revert on error
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: task.status } : t
      ))
      toast.error('Failed to update task')
    } finally {
      setUpdating(null)
    }
  }

  const pendingTasks = tasks.filter(t => t.status !== 'completed')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-green-400" />
            Today&apos;s Tasks
          </CardTitle>
          <span className="text-slate-400 text-sm">
            {completed}/{total} done
          </span>
        </div>
        <Progress value={progressPercent} className="h-2 bg-slate-700" />
      </CardHeader>
      <CardContent className="space-y-2">
        {total === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No tasks scheduled for today.</p>
            <p className="text-sm mt-1">Add a goal and let AI plan your day!</p>
          </div>
        ) : (
          <>
            {pendingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                isUpdating={updating === task.id}
              />
            ))}
            {completedTasks.length > 0 && (
              <>
                <div className="pt-2 pb-1">
                  <span className="text-slate-500 text-xs uppercase tracking-wider">
                    Completed ({completedTasks.length})
                  </span>
                </div>
                {completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    isUpdating={updating === task.id}
                  />
                ))}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TaskItem({ task, onToggle, isUpdating }: { 
  task: Task
  onToggle: (task: Task) => void
  isUpdating: boolean
}) {
  const isCompleted = task.status === 'completed'

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border transition-all",
      isCompleted 
        ? "bg-slate-800/30 border-slate-700/30 opacity-60" 
        : "bg-slate-800/60 border-slate-700/60 hover:border-slate-600"
    )}>
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => onToggle(task)}
        disabled={isUpdating}
        className="mt-0.5 border-slate-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium",
            isCompleted ? "line-through text-slate-500" : "text-white"
          )}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {task.is_ai_generated && (
              <Zap className="w-3 h-3 text-purple-400" title="AI Generated" />
            )}
            <Badge className={cn("text-xs border", priorityColors[task.priority])}>
              {task.priority}
            </Badge>
          </div>
        </div>
        {task.description && (
          <p className="text-slate-400 text-xs mt-0.5">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {task.duration_minutes && (
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.duration_minutes}min
            </span>
          )}
          {task.goals?.title && (
            <span className="text-purple-400 text-xs truncate max-w-32">
              {task.goals.title}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
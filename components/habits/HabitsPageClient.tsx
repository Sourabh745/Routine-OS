'use client'

import { useMemo, useState } from 'react'
import { addDays, format, startOfWeek, subDays } from 'date-fns'
import { Habit, HabitLog } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Activity, Flame, Plus, Trash2, CalendarCheck, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

type HabitsPageClientProps = {
  initialHabits: Habit[]
  initialLogs: HabitLog[]
}

const colors = [
  { label: "Blue", value: "#6366f1" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
  { label: "Yellow", value: "#f59e0b" },
  { label: "Green", value: "#10b981" },
  { label: "Cyan", value: "#06b6d4" },
];
const icons = ['⭐', '💪', '📚', '🧘', '🏃', '💧', '📝', '🎯', '🔥', '🥗']

export function HabitsPageClient({ initialHabits, initialLogs }: HabitsPageClientProps) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits)
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    target_count: '1',
    category: 'health',
    color: '#6366f1',
    icon: '⭐',
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  const activeHabits = habits.filter((h) => h.is_active)
  const completedToday = activeHabits.filter((habit) =>
    logs.some((log) => log.habit_id === habit.id && log.logged_date === today)
  ).length

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // 1 = Monday
  const weeklyRange = Array.from({ length: 7 }).map((_, i) =>
    format(addDays(weekStart, i), 'yyyy-MM-dd')
  )

  const logSet = useMemo(() => {
    return new Set(logs.map((log) => `${log.habit_id}-${log.logged_date}`))
  }, [logs])

  const createHabit = async () => {
    if (!form.title.trim()) return
    setCreating(true)

    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          frequency: form.frequency,
          target_count: Number(form.target_count) || 1,
          category: form.category,
          color: form.color,
          icon: form.icon,
        }),
      })

      if (!res.ok) throw new Error('Failed to create habit')

      const data = await res.json()
      setHabits((prev) => [data.habit, ...prev])
      setForm({
        title: '',
        description: '',
        frequency: 'daily',
        target_count: '1',
        category: 'health',
        color: '#6366f1',
        icon: '⭐',
      })
      toast.success('Habit created')
    } catch {
      toast.error('Failed to create habit')
    } finally {
      setCreating(false)
    }
  }

  const toggleHabitLog = async (habit: Habit) => {
    if (togglingId) return
    setTogglingId(habit.id)

    const exists = logs.some((log) => log.habit_id === habit.id && log.logged_date === today)

    if (exists) {
      const previousLogs = logs
      setLogs((prev) => prev.filter((log) => !(log.habit_id === habit.id && log.logged_date === today)))

      try {
        const res = await fetch('/api/habits/log', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habit_id: habit.id,
            logged_date: today,
          }),
        })

        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habit.id
              ? {
                  ...h,
                  streak_count: data.currentStreak,
                  longest_streak: data.longestStreak,
                }
              : h
          )
        )
      toast.success('Habit unlogged')
      } catch {
        setLogs(previousLogs)
        toast.error('Failed to update habit')
      } finally {
        setTogglingId(null)
      }

      return
    }

    const optimisticLog: HabitLog = {
      id: `temp-${habit.id}`,
      habit_id: habit.id,
      user_id: habit.user_id,
      logged_date: today,
      count: 1,
      notes: null,
      created_at: new Date().toISOString(),
    }

    const previousLogs = logs
    setLogs((prev) => [optimisticLog, ...prev])

    try {
      const res = await fetch('/api/habits/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_id: habit.id,
          logged_date: today,
          count: 1,
        }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()

      setLogs((prev) => [
        data.log,
        ...prev.filter((log) => !(log.habit_id === habit.id && log.logged_date === today && log.id.startsWith('temp-'))),
      ])

      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id
            ? {
                ...h,
                streak_count: data.currentStreak,
                longest_streak: data.longestStreak,
              }
            : h
        )
      )
      
      toast.success(`${habit.icon} ${habit.title} logged`)
    } catch {
      setLogs(previousLogs)
      toast.error('Failed to log habit')
    } finally {
      setTogglingId(null)
    }
  }

  const deleteHabit = async (habitId: string) => {
    setDeletingId(habitId)
    const previousHabits = habits

    setHabits((prev) => prev.filter((h) => h.id !== habitId))

    try {
      const res = await fetch('/api/habits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: habitId }),
      })

      if (!res.ok) throw new Error('Failed')
      toast.success('Habit deleted')
    } catch {
      setHabits(previousHabits)
      toast.error('Failed to delete habit')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleHabitActive = async (habit: Habit, isActive: boolean) => {
    const previousHabits = habits
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, is_active: isActive } : h))
    )

    try {
      const res = await fetch('/api/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: habit.id, is_active: isActive }),
      })

      if (!res.ok) throw new Error('Failed')
    } catch {
      setHabits(previousHabits)
      toast.error('Failed to update habit')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Habits" value={activeHabits.length} icon={<Activity className="w-4 h-4 text-orange-400" />} />
        <StatCard label="Done Today" value={completedToday} icon={<CalendarCheck className="w-4 h-4 text-green-400" />} />
        <StatCard
          label="Completion Rate"
          value={activeHabits.length ? `${Math.round((completedToday / activeHabits.length) * 100)}%` : '0%'}
          icon={<Target className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          label="Best Streak"
          value={habits.length ? Math.max(...habits.map((h) => h.longest_streak || 0)) : 0}
          icon={<Flame className="w-4 h-4 text-red-400" />}
        />
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-400" />
            Create Habit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Drink 2L water"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <Input
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="Category"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <Textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description..."
            className="bg-slate-800 border-slate-700 text-white resize-none"
            rows={3}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Select
              value={form.frequency}
              onValueChange={(v) => setForm((prev) => ({ ...prev, frequency: v }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-slate-800 border-slate-700">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="weekdays">Weekdays</SelectItem>
                <SelectItem value="weekends">Weekends</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={form.target_count}
              onChange={(e) => setForm((prev) => ({ ...prev, target_count: e.target.value }))}
              placeholder="Target"
              className="bg-slate-800 border-slate-700 text-white"
            />

            <Select
              value={form.icon}
              onValueChange={(v) => setForm((prev) => ({ ...prev, icon: v }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-slate-800 border-slate-700">
                {icons.map((icon) => (
                  <SelectItem key={icon} value={icon}>
                    {icon}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={form.color}
              onValueChange={(v) => setForm((prev) => ({ ...prev, color: v }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent 
                position="popper"
                className="bg-slate-800 border-slate-700"
              >
                {colors.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={createHabit}
            disabled={creating || !form.title.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {creating ? 'Creating...' : 'Create Habit'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Your Habits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {habits.length === 0 ? (
            <p className="text-slate-500 text-sm">No habits yet. Create your first one above.</p>
          ) : (
            habits.map((habit) => {
              const doneToday = logs.some(
                (log) => log.habit_id === habit.id && log.logged_date === today
              )

              return (
                <div
                  key={habit.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => toggleHabitLog(habit)}
                        disabled={togglingId === habit.id || !habit.is_active}
                        className={cn(
                          'w-11 h-11 rounded-xl border flex items-center justify-center text-lg transition-all',
                          doneToday
                            ? 'bg-green-500/20 border-green-500/30'
                            : 'bg-slate-800 border-slate-700'
                        )}
                        style={{ boxShadow: doneToday ? `0 0 0 1px ${habit.color}` : 'none' }}
                      >
                        {habit.icon}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium">{habit.title}</p>
                          <Badge
                            className="border text-xs"
                            style={{
                              color: habit.color,
                              borderColor: `${habit.color}40`,
                              backgroundColor: `${habit.color}10`,
                            }}
                          >
                            {habit.frequency}
                          </Badge>
                          {!habit.is_active && (
                            <Badge className="border border-slate-700 bg-slate-800 text-slate-400">
                              paused
                            </Badge>
                          )}
                        </div>

                        {habit.description && (
                          <p className="text-slate-400 text-sm mt-1">{habit.description}</p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 flex-wrap">
                          <span>Target: {habit.target_count}</span>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            {habit.streak_count} streak
                          </span>
                          <span>Longest: {habit.longest_streak}</span>
                          <span>Category: {habit.category}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {weeklyRange.map((date) => {
                            const checked = logSet.has(`${habit.id}-${date}`)
                            const isToday = date === today
                            const dayLabel = format(new Date(date + 'T00:00:00'), 'EEE')
                            return (
                              <div key={date} className="flex flex-col items-center gap-1">
                                <div
                                  className={cn(
                                    'w-7 h-7 rounded-md border',
                                    isToday && !checked ? 'border-slate-400 bg-slate-800' : '',
                                    checked ? 'border-transparent' : 'border-slate-700 bg-slate-800'
                                  )}
                                  style={{
                                    backgroundColor: checked ? habit.color : undefined,
                                    opacity: checked ? 1 : 0.6,
                                  }}
                                  title={date}
                                />
                                <span className={cn(
                                  'text-[10px]',
                                  isToday ? 'text-white font-bold' : 'text-slate-600'
                                )}>
                                  {dayLabel}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {habit.is_active ? 'Active' : 'Paused'}
                        </span>
                        <Switch
                          checked={habit.is_active}
                          onCheckedChange={(checked) => toggleHabitActive(habit, checked)}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteHabit(habit.id)}
                        disabled={deletingId === habit.id}
                        className="text-slate-500 hover:text-red-400 hover:bg-red-950/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {icon}
        </div>
        <p className="text-white text-xl font-semibold">{value}</p>
        <p className="text-slate-400 text-xs mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}
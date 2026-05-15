'use client'

import { useState } from 'react'
import { Habit } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface HabitsCardProps {
  habits: (Habit & { habit_logs?: { logged_date: string }[] })[]
}

export function HabitsCard({ habits }: HabitsCardProps) {
  const [loggedHabits, setLoggedHabits] = useState<Set<string>>(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const logged = new Set<string>()
    habits.forEach(h => {
      if (h.habit_logs?.some(l => l.logged_date === today)) {
        logged.add(h.id)
      }
    })
    return logged
  })

  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const toggleHabit = async (habit: Habit) => {
    const isLogged = loggedHabits.has(habit.id)

    // Optimistic update
    setLoggedHabits(prev => {
      const next = new Set(prev)
      if (isLogged) next.delete(habit.id)
      else next.add(habit.id)
      return next
    })

    if (!isLogged) {
      const { error } = await supabase.from('habit_logs').upsert({
        habit_id: habit.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        logged_date: today,
        count: 1,
      })
      if (error) {
        toast.error('Failed to log habit')
        setLoggedHabits(prev => {
          const next = new Set(prev)
          next.delete(habit.id)
          return next
        })
      } else {
        toast.success(`${habit.icon} ${habit.title} logged!`)
      }
    } else {
      await supabase.from('habit_logs')
        .delete()
        .eq('habit_id', habit.id)
        .eq('logged_date', today)
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Activity className="w-4 h-4 text-orange-400" />
          Habits Today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {habits.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-2">
            No habits yet. Add some!
          </p>
        ) : (
          habits.slice(0, 5).map((habit) => {
            const isLogged = loggedHabits.has(habit.id)
            return (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left",
                  isLogged
                    ? "bg-green-950/30 border-green-500/30"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                )}
              >
                <span className="text-lg">{habit.icon}</span>
                <div className="flex-1">
                  <p className={cn(
                    "text-sm font-medium",
                    isLogged ? "text-green-400" : "text-white"
                  )}>
                    {habit.title}
                  </p>
                  {habit.streak_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span className="text-orange-400 text-xs">{habit.streak_count} day streak</span>
                    </div>
                  )}
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  isLogged ? "bg-green-500 border-green-500" : "border-slate-500"
                )}>
                  {isLogged && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
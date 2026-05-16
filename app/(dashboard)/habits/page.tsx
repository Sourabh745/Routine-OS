import { createClient } from '@/lib/supabase/server'
import { Activity } from 'lucide-react'
import { HabitsPageClient } from '@/components/habits/HabitsPageClient'

export default async function HabitsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user!.id)
      .order('logged_date', { ascending: false }),
  ])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-orange-400" />
          Habits
        </h1>
        <p className="text-slate-400 mt-1">
          Track the routines that make your goals easier to achieve.
        </p>
      </div>

      <HabitsPageClient initialHabits={habits || []} initialLogs={logs || []} />
    </div>
  )
}
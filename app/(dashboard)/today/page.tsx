import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { CheckSquare } from 'lucide-react'
import { TodayPageClient } from '@/components/today/TodayPageClient'

export default async function TodayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ data: todaysTasks }, { data: overdueTasks }, { data: goals }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, goals(title, category, id)')
      .eq('user_id', user!.id)
      .eq('scheduled_date', today)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true }),

    supabase
      .from('tasks')
      .select('*, goals(title, category, id)')
      .eq('user_id', user!.id)
      .lt('scheduled_date', today)
      .neq('status', 'completed')
      .order('scheduled_date', { ascending: true }),

    supabase
      .from('goals')
      .select('id, title')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-green-400" />
          Today
        </h1>
        <p className="text-slate-400 mt-1">
          Focus on what matters today and clear overdue items.
        </p>
      </div>

      <TodayPageClient
        initialTasks={todaysTasks || []}
        initialOverdueTasks={overdueTasks || []}
        goals={goals || []}
      />
    </div>
  )
}
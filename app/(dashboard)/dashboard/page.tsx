import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from './DashboardHeader'
import { MorningBriefingCard } from './MorningBriefingCard'
import { TodaysTasksCard } from './TodaysTasksCard'
import { GoalsProgressCard } from './GoalsProgressCard'
import { HabitsCard } from './HabitsCard'
import { QuickStats } from './QuickStats'
import { format } from 'date-fns'
import { EveningCheckinModal } from '@/components/dashboard/EveningCheckinModal'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = format(new Date(), 'yyyy-MM-dd')

  const [
    { data: profile },
    { data: goals },
    { data: todaysTasks },
    { data: habits },
    { data: todayBriefing }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('goals').select('*').eq('user_id', user!.id).eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('tasks').select('*, goals(title, category)').eq('user_id', user!.id).eq('scheduled_date', today),
    supabase.from('habits').select('*, habit_logs(logged_date)').eq('user_id', user!.id).eq('is_active', true),
    supabase.from('briefings').select('*').eq('user_id', user!.id).eq('briefing_date', today).single(),
  ])

  const completedTasks = todaysTasks?.filter(t => t.status === 'completed').length || 0
  const totalTasks = todaysTasks?.length || 0

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <DashboardHeader
        profile={profile}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
      />

      <div className="flex justify-end">
        <EveningCheckinModal />
      </div>

      <QuickStats
        totalGoals={goals?.length || 0}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        activeHabits={habits?.length || 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MorningBriefingCard
            existingBriefing={todayBriefing?.content || null}
          />
          <TodaysTasksCard
            initialTasks={todaysTasks || []}
          />
        </div>

        <div className="space-y-6">
          <GoalsProgressCard goals={goals || []} />
          <HabitsCard habits={habits || []} />
        </div>
      </div>
    </div>
  )
}
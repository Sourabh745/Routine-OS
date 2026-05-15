import { createClient } from '@/lib/supabase/server'
import { GoalsList } from './GoalsList'
import { AddGoalDialog } from './AddGoalDialog'
import { Target } from 'lucide-react'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: goals } = await supabase
    .from('goals')
    .select('*, milestones(count), tasks(count)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" />
            Goals
          </h1>
          <p className="text-slate-400 mt-1">
            Your AI will break each goal into daily actions
          </p>
        </div>
        <AddGoalDialog />
      </div>

      <GoalsList goals={goals || []} />
    </div>
  )
}
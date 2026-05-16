import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('today')
    .select('*, goals(title, category, id)')
    .eq('user_id', user.id)
    .eq('scheduled_date', date)
    .order('priority', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, notes } = await request.json()

  const updateData: Record<string, unknown> = { status }
  if (status === 'completed') updateData.completed_at = new Date().toISOString()
  if (notes) updateData.notes = notes

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if(task?.goal_id) {
      await reCalculateGoalProgress(supabase, task.goal_id, user.id)
    }
  return NextResponse.json({ task })
}

async function reCalculateGoalProgress(
    supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    goalId: string,
    userId: string
  ) {
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
    
      if(!allTasks || allTasks.length === 0) return

      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.status === 'completed').length

      const progressPercentage = Math.round(completedTasks / totalTasks * 100);

      await supabase.from('goals').update({ progress_percentage: progressPercentage, updated_at: new Date().toISOString() }).eq('id', goalId).eq('user_id', userId)
  }
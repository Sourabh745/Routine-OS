import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: body.title,
      goal_id: body.goal_id,
      priority: body.priority || 'medium',
      duration_minutes: body.duration_minutes || 30,
      scheduled_date: body.scheduled_date,
      status: 'pending',
      is_ai_generated: false,
    })
    .select('*, goals(title, category, id)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}
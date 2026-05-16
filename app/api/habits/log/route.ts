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

  const { habit_id, logged_date, count } = await request.json()

  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(
      {
        habit_id,
        user_id: user.id,
        logged_date,
        count: count || 1,
      },
      { onConflict: 'habit_id,logged_date' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: allLogs } = await supabase
    .from('habit_logs')
    .select('logged_date')
    .eq('habit_id', habit_id)
    .eq('user_id', user.id)
    .order('logged_date', { ascending: false })

  let streak = 0
  let longest = 0

  if (allLogs && allLogs.length > 0) {
    const dates = new Set(allLogs.map((l) => l.logged_date))
    const now = new Date(logged_date)

    for (let i = 0; i < 365; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().split('T')[0]
      if (dates.has(key)) streak++
      else break
    }

    let currentRun = 0
    const sorted = [...allLogs].map((l) => l.logged_date).sort()
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) {
        currentRun = 1
        longest = 1
      } else {
        const prev = new Date(sorted[i - 1])
        const curr = new Date(sorted[i])
        const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
        if (diff === 1) currentRun++
        else currentRun = 1
        if (currentRun > longest) longest = currentRun
      }
    }
  }

  await supabase
    .from('habits')
    .update({
      streak_count: streak,
      longest_streak: longest,
    })
    .eq('id', habit_id)
    .eq('user_id', user.id)

  return NextResponse.json({ log: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { habit_id, logged_date } = await request.json()

  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habit_id)
    .eq('user_id', user.id)
    .eq('logged_date', logged_date)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
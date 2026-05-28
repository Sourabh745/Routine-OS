import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recalculateHabitStreaks } from '@/lib/utils'

// export async function POST(request: Request) {
//   const supabase = await createClient()
//   const {
//     data: { user },
//   } = await supabase.auth.getUser()

//   if (!user) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   const { habit_id, logged_date, count } = await request.json()

//   const { data, error } = await supabase
//     .from('habit_logs')
//     .upsert(
//       {
//         habit_id,
//         user_id: user.id,
//         logged_date,
//         count: count || 1,
//       },
//       { onConflict: 'habit_id,logged_date' }
//     )
//     .select()
//     .single()

//   if (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }

//   const { data: allLogs } = await supabase
//     .from('habit_logs')
//     .select('logged_date')
//     .eq('habit_id', habit_id)
//     .eq('user_id', user.id)
//     .order('logged_date', { ascending: false })

//   let currentStreak = 0
//   let longestStreak = 0
//   console.log('All logs for habit', habit_id, allLogs)
//   if (allLogs && allLogs.length > 0) {
//     const uniqueDates = [...new Set(allLogs.map(l => l.logged_date))].sort()

//     const todayStr = logged_date
//     const today = new Date(todayStr)

//     let streak = 0

//     const sortedDates = [...uniqueDates].sort(
//       (a, b) => new Date(b).getTime() - new Date(a).getTime()
//     )

//     for (let i = 0; i < sortedDates.length - 1; i++) {
//       const current = new Date(sortedDates[i])
//       const previous = new Date(sortedDates[i + 1])

//       const diffDays =
//         (current.getTime() - previous.getTime()) /
//         (1000 * 60 * 60 * 24)
//       console.log('Comparing', current.toDateString(), previous.toDateString(), 'Diff days:', diffDays)
//       if (diffDays === 1) {
//         streak++
//       } else {
//         break
//       }
//     }

//     currentStreak = streak
//     console.log('Current streak before checking today:', currentStreak)

//     let longest = 0
//     let currentRun = 0

//     for (let i = 0; i < uniqueDates.length; i++) {
//       if (i === 0) {
//         currentRun = 1
//       } else {
//         const prev = new Date(uniqueDates[i - 1])
//         const curr = new Date(uniqueDates[i])
//         const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))

//         if (diffDays === 1) {
//           currentRun++
//         } else {
//           currentRun = 1
//         }
//       }
//       if (currentRun > longest) longest = currentRun
//     }

//     longestStreak = longest
//   }

//   await supabase
//     .from('habits')
//     .update({
//       streak_count: currentStreak,
//       longest_streak: longestStreak,
//       updated_at: new Date().toISOString()
//     })
//     .eq('id', habit_id)
//     .eq('user_id', user.id)

//   return NextResponse.json({ log: data })
// }

// export async function DELETE(request: Request) {
//   const supabase = await createClient()
//   const {
//     data: { user },
//   } = await supabase.auth.getUser()

//   if (!user) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   const { habit_id, logged_date } = await request.json()

//   const { error } = await supabase
//     .from('habit_logs')
//     .delete()
//     .eq('habit_id', habit_id)
//     .eq('user_id', user.id)
//     .eq('logged_date', logged_date)

//   if (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }

//   return NextResponse.json({ success: true })
// }


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

  const streaks = await recalculateHabitStreaks(supabase, habit_id, user.id)

  return NextResponse.json({ log: data, ...streaks })
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

  const streaks = await recalculateHabitStreaks(supabase, habit_id, user.id)

  return NextResponse.json({ success: true, ...streaks })
}
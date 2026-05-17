import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { format, subDays } from 'date-fns'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const weekStart = subDays(today, 6)

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(today, 'yyyy-MM-dd')

  const [
    { data: tasks },
    { data: goals },
    { data: habits },
    { data: habitLogs },
    { data: journalEntries },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, goals(title)')
      .eq('user_id', user.id)
      .gte('scheduled_date', weekStartStr)
      .lte('scheduled_date', weekEndStr),

    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active'),

    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true),

    supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_date', weekStartStr)
      .lte('logged_date', weekEndStr),

    supabase
      .from('journal_entries')
      .select('content, mood, energy_level, entry_date')
      .eq('user_id', user.id)
      .gte('entry_date', weekStartStr)
      .lte('entry_date', weekEndStr),
  ])

  const totalTasks = tasks?.length || 0
  const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  const journalCount = journalEntries?.length || 0
  const bestStreak = habits?.length
    ? Math.max(...habits.map((h) => h.longest_streak || 0))
    : 0

  const goalsContext = (goals || [])
    .map((g) => `- ${g.title} (${g.progress_percentage}% done, ${g.priority} priority)`)
    .join('\n') || 'No active goals.'

  const tasksContext = (tasks || [])
    .map((t) => `- [${t.status}] ${t.title} (${t.scheduled_date})`)
    .join('\n') || 'No tasks this week.'

  const habitsContext = (habits || [])
    .map((h) => {
      const logsForHabit = (habitLogs || []).filter((l) => l.habit_id === h.id)
      return `- ${h.title}: ${logsForHabit.length}/7 days, streak ${h.streak_count}`
    })
    .join('\n') || 'No habits tracked.'

  const journalContext = (journalEntries || [])
    .map(
      (j) =>
        `Date: ${j.entry_date}, Mood: ${j.mood || 'unknown'}, Energy: ${j.energy_level || 'n/a'}\n${j.content.substring(0, 200)}`
    )
    .join('\n\n') || 'No journal entries this week.'

  const { object } = await generateObject({
    model: groq('openai/gpt-oss-20b'),
    schema: z.object({
      title: z.string().describe('Short title for this weekly report'),
      content: z
        .string()
        .describe(
          'Full executive summary in 4-6 paragraphs covering overall performance, goal-by-goal progress, habit consistency, wins, challenges, and recommendations for next week. Use plain text, no markdown headers.'
        ),
      top_win: z.string().describe('The single biggest win of the week'),
      main_challenge: z.string().describe('The main challenge or blocker'),
      goals_progressed: z
        .number()
        .describe('Number of goals that showed measurable progress'),
    }),
    prompt: `
Generate a weekly executive summary for the user's Life OS.

Week: ${weekStartStr} to ${weekEndStr}

Tasks (${completedTasks}/${totalTasks} completed, ${completionRate}% rate):
${tasksContext}

Active Goals:
${goalsContext}

Habits:
${habitsContext}

Journal Entries (${journalCount} entries):
${journalContext}

Be honest, specific, warm but direct. Identify real patterns.
Avoid generic advice. Reference real items from their week.
    `,
  })

  const metrics = {
    tasks_completed: completedTasks,
    tasks_total: totalTasks,
    completion_rate: completionRate,
    goals_progressed: object.goals_progressed,
    habits_streak: bestStreak,
    journal_entries: journalCount,
    top_win: object.top_win,
    main_challenge: object.main_challenge,
  }

  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      report_type: 'weekly',
      title: object.title,
      content: object.content,
      metrics,
      week_start: weekStartStr,
      week_end: weekEndStr,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ report })
}
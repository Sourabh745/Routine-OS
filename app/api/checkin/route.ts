import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('scheduled_date', today)

  const total = tasks?.length || 0
  const completed = tasks?.filter((t) => t.status === 'completed').length || 0
  const skipped = tasks?.filter((t) => t.status === 'skipped').length || 0

  const completionRate = total
    ? Math.round((completed / total) * 100)
    : 0

  const taskSummary =
    tasks?.map((t) => `- [${t.status}] ${t.title}`).join('\n') ||
    'No tasks today.'

  const { text } = await generateText({
    model: groq('openai/gpt-oss-20b'),
    system: `
        You are a supportive but honest productivity coach.
        Keep it short (under 150 words).
        Acknowledge wins.
        Encourage growth.
        Avoid generic motivational quotes.
            `,
    prompt: `
        Evening check-in summary.

        Tasks today:
        ${taskSummary}

        Total: ${total}
        Completed: ${completed}
        Skipped: ${skipped}
        Completion rate: ${completionRate}%

        Provide:
        1. A short reflection
        2. Recognition of wins
        3. Suggestion for tomorrow
    `,
  })

  return NextResponse.json({
    summary: text,
    stats: { total, completed, skipped, completionRate },
  })
}
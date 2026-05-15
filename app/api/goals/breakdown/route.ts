import { generateObject } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { goalId, title, description, targetDate } = await request.json()

  const today = new Date()
  const target = new Date(targetDate)
  const daysAvailable = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const { object } = await generateObject({
    model: groq('openai/gpt-oss-20b'),
    schema: z.object({
      summary: z.string().describe('2-3 sentence overview of the plan'),
      quarterly_milestones: z.array(z.string()).describe('3-4 major milestones'),
      monthly_focus: z.string().describe('What to focus on this month'),
      weekly_tasks: z.array(z.string()).describe('5-7 tasks for this week'),
      daily_habits: z.array(z.string()).describe('2-3 daily habits to support this goal'),
      estimated_hours_per_week: z.number().describe('Realistic hours needed per week'),
      key_risks: z.array(z.string()).describe('2-3 potential blockers'),
    }),
    prompt: `
      Break down this goal into an actionable plan:
      Goal: "${title}"
      Description: "${description}"
      Target Date: ${targetDate} (${daysAvailable} days from today)
      
      Be realistic. Most people have 1-2 hours per day for side goals.
      Make tasks specific and actionable.
    `,
  })

  // Save the breakdown to the goal
  await supabase
    .from('goals')
    .update({ ai_breakdown: object })
    .eq('id', goalId)
    .eq('user_id', user.id)

  // Create first week's tasks in the database
  const weekTasks = object.weekly_tasks.map((task, index) => {
    const taskDate = new Date()
    taskDate.setDate(taskDate.getDate() + index)
    return {
      user_id: user.id,
      goal_id: goalId,
      title: task,
      scheduled_date: taskDate.toISOString().split('T')[0],
      priority: index < 2 ? 'high' : 'medium',
      is_ai_generated: true,
      duration_minutes: 45,
      status: 'pending' as const,
    }
  })

  await supabase.from('tasks').insert(weekTasks)

  return Response.json({ breakdown: object, tasksCreated: weekTasks.length })
}
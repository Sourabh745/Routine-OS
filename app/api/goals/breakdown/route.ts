import { generateObject } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { addDays } from 'date-fns'

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

    await supabase
    .from('goals')
    .update({ ai_breakdown: object })
    .eq('id', goalId)


  const milestoneRecords = object.quarterly_milestones.map((milestoneTitle, index) => ({
    goal_id: goalId,
    user_id: user.id,
    title: milestoneTitle,
    description: `Milestone ${index + 1} of ${object.quarterly_milestones.length}`,
    due_date: addDays(today, Math.floor(daysAvailable * (index + 1) / object.quarterly_milestones.length)),
    order_index: index,
    status: 'pending' as const,
  }))

  const { data: createdMilestones } = await supabase
    .from('milestones')
    .insert(milestoneRecords)
    .select()

  const tasksToCreate: any[] = []

  object.weekly_tasks.forEach((taskTitle, index) => {
    const taskDate = addDays(today, index % daysAvailable)

    tasksToCreate.push({
      user_id: user.id,
      goal_id: goalId,
      milestone_id: createdMilestones?.[index % createdMilestones.length]?.id || null,
      title: taskTitle,
      scheduled_date: taskDate.toISOString().split('T')[0],
      duration_minutes: 45,
      priority: index < 3 ? 'high' : 'medium',
      is_ai_generated: true,
      status: 'pending' as const,
    })
  })

  object.daily_habits.forEach((habit) => {
    for (let i = 0; i < Math.min(10, daysAvailable); i++) {
      const habitDate = addDays(today, i)
      tasksToCreate.push({
        user_id: user.id,
        goal_id: goalId,
        milestone_id: createdMilestones?.[0]?.id || null,
        title: habit,
        scheduled_date: habitDate.toISOString().split('T')[0],
        duration_minutes: 30,
        priority: 'medium',
        is_ai_generated: true,
        status: 'pending' as const,
      })
    }
  })

  await supabase.from('tasks').insert(tasksToCreate)

  return Response.json({
    success: true,
    milestonesCreated: createdMilestones?.length || 0,
    tasksCreated: tasksToCreate.length,
    message: `Goal broken down into ${createdMilestones?.length} milestones and ${tasksToCreate.length} tasks.`
  })
}

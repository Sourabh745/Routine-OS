import { createClient } from '@/lib/supabase/server'
import { tool } from 'ai'
import { z } from 'zod'


export const agentTools = {
  
  getUserGoals: tool({
    description: 'Fetch all active goals for the user to understand their priorities',
    parameters: z.object({
      status: z.enum(['active', 'paused', 'completed', 'all']).optional().default('active'),
    }),
    execute: async ({ status }: { status?: string }) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      let query = supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return { goals: data, count: data?.length || 0 }
    }
  }),

  // Tool 2: Get today's tasks
  getTodaysTasks: tool({
    description: 'Get all tasks scheduled for today to show current workload',
    parameters: z.object({
      date: z.string().optional().describe('Date in YYYY-MM-DD format, defaults to today'),
    }),
    execute: async ({ date }: { date?: string }) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const targetDate = date || new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('tasks')
        .select('*, goals(title, category)')
        .eq('user_id', user.id)
        .eq('scheduled_date', targetDate)
        .order('priority', { ascending: false })

      if (error) throw error
      return { 
        tasks: data, 
        count: data?.length || 0,
        completed: data?.filter(t => t.status === 'completed').length || 0,
        pending: data?.filter(t => t.status === 'pending').length || 0
      }
    }
  }),

  // Tool 3: Create tasks
  createTasks: tool({
    description: 'Create one or multiple tasks for the user based on their goals',
    parameters: z.object({
      tasks: z.array(z.object({
        title: z.string().describe('Clear, actionable task title'),
        description: z.string().optional(),
        goal_id: z.string().optional(),
        scheduled_date: z.string().describe('YYYY-MM-DD format'),
        duration_minutes: z.number().default(30),
        priority: z.enum(['high', 'medium', 'low']).default('medium'),
      }))
    }),
    execute: async ({ tasks }: { tasks: any[] }) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const tasksWithUser = tasks.map(task => ({
        ...task,
        user_id: user.id,
        is_ai_generated: true,
        status: 'pending' as const,
      }))

      const { data, error } = await supabase
        .from('tasks')
        .insert(tasksWithUser)
        .select()

      if (error) throw error
      return { created: data, count: data?.length || 0 }
    }
  }),

  // Tool 4: Update goal progress
  updateGoalProgress: tool({
    description: 'Update the progress percentage of a goal based on completed tasks',
    parameters: z.object({
      goal_id: z.string(),
      progress_percentage: z.number().min(0).max(100),
      reason: z.string().describe('Why this progress update is being made'),
    }),
    execute: async ({ goal_id, progress_percentage, reason }: { goal_id: string, progress_percentage: number, reason: string }) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { data, error } = await supabase
        .from('goals')
        .update({ progress_percentage, updated_at: new Date().toISOString() })
        .eq('id', goal_id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return { updated: data, reason }
    }
  }),

  getHabitData: tool({
    description: 'Get user habits and their completion status for the past week',
    parameters: z.object({
      days: z.number().default(7).describe('Number of past days to check'),
    }),
    execute: async ({ days }: { days?: number }) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (days || 7))

      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_date', startDate.toISOString().split('T')[0])

      return { habits, logs, days_checked: days }
    }
  }),

  // Tool 6: Store agent insight/memory
  storeAgentMemory: tool({
    description: 'Store a pattern or insight discovered about the user for future reference',
    parameters: z.object({
      memory_type: z.enum(['pattern', 'preference', 'insight', 'context']),
      key: z.string().describe('Short identifier for this memory'),
      value: z.string().describe('The actual insight or pattern'),
      confidence_score: z.number().min(0).max(1).default(0.7),
    }),
    execute: async ({ memory_type, key, value, confidence_score }: { memory_type: string, key: string, value: string, confidence_score?: number }) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      // Upsert - update if exists, create if not
      const { data, error } = await supabase
        .from('agent_memory')
        .upsert({
          user_id: user.id,
          memory_type,
          key,
          value,
          confidence_score,
          last_reinforced: new Date().toISOString(),
        }, { onConflict: 'user_id,key' })
        .select()

      if (error) throw error
      return { stored: data }
    }
  }),

  // Tool 7: Get agent memories
  getAgentMemory: tool({
    description: 'Retrieve stored patterns and insights about the user',
    parameters: z.object({
      memory_type: z.enum(['pattern', 'preference', 'insight', 'context', 'all']).optional().default('all'),
    }),
    execute: async ({ memory_type }: { memory_type?: string }) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      let query = supabase
        .from('agent_memory')
        .select('*')
        .eq('user_id', user.id)
        .order('confidence_score', { ascending: false })

      if (memory_type !== 'all') {
        query = query.eq('memory_type', memory_type)
      }

      const { data, error } = await query
      if (error) throw error
      return { memories: data }
    }
  }),

  // Tool 8: Get journal entries
  getJournalEntries: tool({
    description: 'Get recent journal entries to understand user mood and patterns',
    parameters: z.object({
      limit: z.number().default(5).describe('Number of recent entries to fetch'),
    }),
    execute: async ({ limit }: { limit?: any }) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { entries: data }
    }
  }),

  // Tool 9: Calculate date math
  calculateDates: tool({
    description: 'Calculate dates, deadlines, and time remaining for scheduling',
    parameters: z.object({
      operation: z.enum(['days_until', 'days_since', 'add_days', 'week_range']),
      date: z.string().describe('Reference date in YYYY-MM-DD format'),
      days: z.number().optional(),
    }),
    execute: async ({ operation, date, days }: { operation: string, date?: any, days?: number }) => {
      const refDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      switch (operation) {
        case 'days_until':
          const daysUntil = Math.ceil((refDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          return { result: daysUntil, interpretation: daysUntil > 0 ? `${daysUntil} days remaining` : `${Math.abs(daysUntil)} days overdue` }
        
        case 'days_since':
          const daysSince = Math.ceil((today.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))
          return { result: daysSince, interpretation: `${daysSince} days ago` }
        
        case 'add_days':
          const newDate = new Date(refDate)
          newDate.setDate(newDate.getDate() + (days || 0))
          return { result: newDate.toISOString().split('T')[0] }
        
        case 'week_range':
          const startOfWeek = new Date(today)
          startOfWeek.setDate(today.getDate() - today.getDay())
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 6)
          return { 
            start: startOfWeek.toISOString().split('T')[0],
            end: endOfWeek.toISOString().split('T')[0]
          }
        
        default:
          return { error: 'Unknown operation' }
      }
    }
  }),

  // Tool 10: Save report
  saveReport: tool({
    description: 'Save a generated report (weekly summary, daily briefing, etc.)',
    parameters: z.object({
      report_type: z.enum(['daily', 'weekly', 'monthly']),
      title: z.string(),
      content: z.string(),
      metrics: z.object({
        tasks_completed: z.number(),
        tasks_total: z.number(),
        completion_rate: z.number(),
        goals_progressed: z.number(),
        habits_streak: z.number(),
        journal_entries: z.number(),
        top_win: z.string(),
        main_challenge: z.string(),
      }).optional(),
    }),
    execute: async ({ report_type, title, content, metrics }: { report_type: string, title: string, content: string, metrics?: any }) => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const { data, error } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          report_type,
          title,
          content,
          metrics,
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) throw error
      return { saved: data }
    }
  }),
}
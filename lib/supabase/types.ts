export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  morning_briefing_time: string
  evening_checkin_time: string
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  category: 'health' | 'career' | 'learning' | 'finance' | 'relationships' | 'personal' | 'other'
  status: 'active' | 'paused' | 'completed' | 'archived'
  priority: 'high' | 'medium' | 'low'
  target_date: string | null
  progress_percentage: number
  ai_breakdown: AIBreakdown | null
  created_at: string
  updated_at: string
}

export interface AIBreakdown {
  summary: string
  quarterly_milestones: string[]
  monthly_focus: string
  weekly_tasks: string[]
  daily_habits: string[]
  estimated_hours_per_week: number
  key_risks: string[]
}

export interface Milestone {
  id: string
  goal_id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  status: 'pending' | 'in_progress' | 'completed'
  order_index: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  milestone_id: string | null
  goal_id: string | null
  user_id: string
  title: string
  description: string | null
  scheduled_date: string
  scheduled_time: string | null
  duration_minutes: number
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  priority: 'high' | 'medium' | 'low'
  is_ai_generated: boolean
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  goals?: Goal
}

export interface Habit {
  id: string
  user_id: string
  title: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'weekdays' | 'weekends'
  target_count: number
  category: string
  color: string
  icon: string
  is_active: boolean
  streak_count: number
  longest_streak: number
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  logged_date: string
  count: number
  notes: string | null
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  title: string | null
  content: string
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible' | null
  energy_level: number | null
  ai_insights: string | null
  tags: string[]
  entry_date: string
  created_at: string
  updated_at: string
}

export interface AgentMemory {
  id: string
  user_id: string
  memory_type: 'pattern' | 'preference' | 'insight' | 'context'
  key: string
  value: string
  confidence_score: number
  last_reinforced: string
  created_at: string
}

export interface Report {
  id: string
  user_id: string
  report_type: 'daily' | 'weekly' | 'monthly'
  title: string
  content: string
  metrics: ReportMetrics | null
  week_start: string | null
  week_end: string | null
  created_at: string
}

export interface ReportMetrics {
  tasks_completed: number
  tasks_total: number
  completion_rate: number
  goals_progressed: number
  habits_streak: number
  journal_entries: number
  top_win: string
  main_challenge: string
}

export interface Briefing {
  id: string
  user_id: string
  content: string
  briefing_date: string
  tasks_suggested: Task[] | null
  created_at: string
}

export interface AgentContext {
  userId: string
  todaysTasks: Task[]
  activeGoals: Goal[]
  recentJournal: JournalEntry[]
  habits: Habit[]
  agentMemory: AgentMemory[]
  currentDate: string
}

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}
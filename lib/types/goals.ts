/**
 * Goal Planning & Task Generation Types
 * Production-grade types for scalable rolling task generation
 */

/**
 * Frequency type for task templates
 */
export type TaskFrequency = 'daily' | 'weekly' | 'custom';

/**
 * Priority levels for tasks
 */
export type TaskPriority = 'low' | 'medium' | 'high';

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/**
 * Template for generating recurring tasks
 */
export interface TaskTemplate {
  id: string;
  goal_id: string;
  user_id: string;
  
  title: string;
  description?: string;
  
  // Frequency configuration
  frequency: TaskFrequency;
  preferred_days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // Task details
  estimated_minutes: number;
  priority: TaskPriority;
  
  // Milestone mapping
  milestone_index: number;
  
  // Tracking
  last_generated_date?: string;
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

/**
 * Generated task from a template
 */
export interface GeneratedTask {
  user_id: string;
  goal_id: string;
  milestone_id: string | null;
  
  title: string;
  description?: string;
  
  scheduled_date: string; // YYYY-MM-DD format
  scheduled_time?: string;
  duration_minutes: number;
  priority: TaskPriority;
  status: TaskStatus;
  
  is_ai_generated: true;
  
  created_at?: string;
  updated_at?: string;
}

/**
 * AI-generated goal breakdown with templates
 */
export interface GoalBreakdown {
  summary: string;
  quarterly_milestones: string[];
  monthly_focus: string;
  weekly_tasks: string[];
  daily_habits: string[];
  estimated_hours_per_week: number;
  key_risks: string[];
  
  // Templates derived from the breakdown
  task_templates?: TaskTemplate[];
}

/**
 * Milestone record
 */
export interface Milestone {
  id: string;
  goal_id: string;
  user_id: string;
  
  title: string;
  description?: string;
  due_date: string; // YYYY-MM-DD format
  status: 'pending' | 'in_progress' | 'completed';
  order_index: number;
  
  created_at: string;
  updated_at: string;
}

/**
 * Goal record with all related data
 */
export interface Goal {
  id: string;
  user_id: string;
  
  title: string;
  description?: string;
  category: string;
  
  status: 'active' | 'paused' | 'completed' | 'archived';
  priority: TaskPriority;
  
  target_date: string; // YYYY-MM-DD format
  progress_percentage: number;
  
  // AI breakdown stored as JSON
  ai_breakdown: GoalBreakdown;
  
  // Rolling generation tracking
  templates_generated: boolean;
  last_task_generated_at?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * Task generation options
 */
export interface TaskGenerationOptions {
  goalId: string;
  userId: string;
  targetDate: Date;
  milestones: Milestone[];
  templates: TaskTemplate[];
}

/**
 * Result of task generation
 */
export interface TaskGenerationResult {
  tasksCreated: number;
  tasksSkipped: number;
  generatedTasks: GeneratedTask[];
  logEntries: TaskGenerationLogEntry[];
}

/**
 * Log entry for tracking generated tasks (prevents duplicates)
 */
export interface TaskGenerationLogEntry {
  goal_id: string;
  template_id: string;
  generated_date: string; // YYYY-MM-DD format
  task_id: string;
}

/**
 * Cron job payload
 */
export interface CronJobPayload {
  timestamp: string;
  batchSize?: number;
}

/**
 * Cron job result
 */
export interface CronJobResult {
  goalsProcessed: number;
  totalTasksCreated: number;
  errors: {
    goalId: string;
    error: string;
  }[];
  duration_ms: number;
}

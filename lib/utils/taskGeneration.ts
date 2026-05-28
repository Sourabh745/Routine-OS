/**
 * Task Generation Utility
 * Handles progressive task generation from templates with duplicate prevention
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TaskTemplate,
  GeneratedTask,
  Milestone,
  TaskGenerationResult,
  TaskGenerationLogEntry,
  TaskFrequency,
  TaskPriority,
} from '@/lib/types/goals';
import { addDays, isAfter, isBefore, isSameDay, startOfDay, format } from 'date-fns';

/**
 * Generate tasks for a specific date range based on templates
 *
 * @param supabase - Supabase client
 * @param goalId - Goal ID
 * @param userId - User ID
 * @param startDate - Start date for generation (inclusive)
 * @param endDate - End date for generation (inclusive)
 * @param targetDate - Goal's target date (stop generating after this)
 * @param templates - Task templates to generate from
 * @param milestones - Milestones for task mapping
 * @returns Result with generated tasks and log entries
 */
export async function generateTasksForDateRange(
  supabase: SupabaseClient,
  goalId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
  targetDate: Date,
  templates: TaskTemplate[],
  milestones: Milestone[]
): Promise<TaskGenerationResult> {
  const tasksToCreate: GeneratedTask[] = [];
  const logEntries: TaskGenerationLogEntry[] = [];
  let tasksSkipped = 0;

  // Normalize dates to start of day
  const normalizedStart = startOfDay(startDate);
  const normalizedEnd = startOfDay(endDate);
  const normalizedTarget = startOfDay(targetDate);

  // Get existing generation log for this goal to prevent duplicates
  const { data: existingLog, error: logError } = await supabase
    .from('task_generation_log')
    .select('template_id, generated_date')
    .eq('goal_id', goalId)
    .gte('generated_date', format(normalizedStart, 'yyyy-MM-dd'))
    .lte('generated_date', format(normalizedEnd, 'yyyy-MM-dd'));

  if (logError) {
    console.error('Error fetching task generation log:', logError);
  }

  // Create a set for quick duplicate lookup
  const generatedSet = new Set(
    (existingLog || []).map((log) => `${log.template_id}:${log.generated_date}`)
  );

  // Iterate through each day in the range
  let currentDate = new Date(normalizedStart);
  while (isBefore(currentDate, addDays(normalizedEnd, 1))) {
    // Stop if we've reached or passed the target date
    if (isAfter(currentDate, normalizedTarget)) {
      break;
    }

    const dayOfWeek = currentDate.getDay();
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    // Process each template
    for (const template of templates) {
      // Check if this template should generate a task for this day
      if (!shouldGenerateTaskForDay(template.frequency, dayOfWeek, template.preferred_days)) {
        continue;
      }

      // Check for duplicates
      const duplicateKey = `${template.id}:${dateStr}`;
      if (generatedSet.has(duplicateKey)) {
        tasksSkipped++;
        continue;
      }

      // Get the milestone for this template
      const milestone = milestones.find((m) => m.order_index === template.milestone_index);

      // Create task
      const task: GeneratedTask = {
        user_id: userId,
        goal_id: goalId,
        milestone_id: milestone?.id || null,
        title: template.title,
        description: template.description,
        scheduled_date: dateStr,
        duration_minutes: template.estimated_minutes,
        priority: template.priority as TaskPriority,
        status: 'pending',
        is_ai_generated: true,
      };

      tasksToCreate.push(task);

      // Track generation to prevent duplicates
      const logEntry: TaskGenerationLogEntry = {
        goal_id: goalId,
        template_id: template.id,
        generated_date: dateStr,
        task_id: '', // Will be filled after insertion
      };
      logEntries.push(logEntry);

      // Mark as generated in our local set
      generatedSet.add(duplicateKey);
    }

    // Move to next day
    currentDate = addDays(currentDate, 1);
  }

  return {
    tasksCreated: tasksToCreate.length,
    tasksSkipped,
    generatedTasks: tasksToCreate,
    logEntries,
  };
}

/**
 * Determine if a task should be generated for a specific day
 * based on template frequency and preferred days
 */
function shouldGenerateTaskForDay(
  frequency: TaskFrequency,
  dayOfWeek: number,
  preferredDays: number[]
): boolean {
  switch (frequency) {
    case 'daily':
      return true;

    case 'weekly':
      return preferredDays.includes(dayOfWeek);

    case 'custom':
      // Custom frequency - check if day is in preferred_days
      return preferredDays.includes(dayOfWeek);

    default:
      return false;
  }
}

/**
 * Insert generated tasks with batch optimization
 * Uses a batch size to avoid overwhelming the database
 */
export async function insertTasksWithBatching(
  supabase: SupabaseClient,
  tasks: GeneratedTask[],
  batchSize: number = 100
): Promise<{ inserted: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    const { data, error } = await supabase.from('tasks').insert(batch).select('id');

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      continue;
    }

    inserted += data?.length || 0;
  }

  return {
    inserted,
    failed: tasks.length - inserted,
    errors,
  };
}

/**
 * Insert generation log entries with batch optimization
 * Tracks which template generated which task on which date
 */
export async function insertGenerationLog(
  supabase: SupabaseClient,
  goalId: string,
  logEntries: TaskGenerationLogEntry[],
  taskIds: string[],
  batchSize: number = 100
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  // Map logEntries to actual task IDs
  const enrichedLogs = logEntries.map((log, index) => ({
    ...log,
    task_id: taskIds[index] || '',
  }));

  for (let i = 0; i < enrichedLogs.length; i += batchSize) {
    const batch = enrichedLogs.slice(i, i + batchSize);

    const { data, error } = await supabase.from('task_generation_log').insert(batch);

    if (error) {
      // Ignore unique constraint violations (means task was already logged)
      if (!error.message.includes('duplicate key')) {
        errors.push(`Log batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      }
      continue;
    }

    inserted += 1;
  }

  return {
    inserted,
    errors,
  };
}

/**
 * Create task templates from AI-generated breakdown
 * Called immediately after AI generates a plan
 */
export async function createTemplatesFromBreakdown(
  supabase: SupabaseClient,
  goalId: string,
  userId: string,
  weeklyTasks: string[],
  dailyHabits: string[],
  milestonesCount: number
): Promise<TaskTemplate[]> {
  const templates: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>[] = [];

  // Create templates for weekly tasks
  weeklyTasks.forEach((task, index) => {
    templates.push({
      goal_id: goalId,
      user_id: userId,
      title: task,
      frequency: 'weekly',
      preferred_days: [1, 3, 5], // Monday, Wednesday, Friday for distribution
      estimated_minutes: 45,
      priority: index < 3 ? 'high' : 'medium',
      milestone_index: Math.floor(index / Math.ceil(weeklyTasks.length / milestonesCount)),
      is_active: true,
    });
  });

  // Create templates for daily habits
  dailyHabits.forEach((habit) => {
    templates.push({
      goal_id: goalId,
      user_id: userId,
      title: habit,
      frequency: 'daily',
      preferred_days: [0, 1, 2, 3, 4, 5, 6], // Every day
      estimated_minutes: 15,
      priority: 'medium',
      milestone_index: 0,
      is_active: true,
    });
  });

  // Insert templates
  const { data, error } = await supabase
    .from('task_templates')
    .insert(templates)
    .select();

  if (error) {
    console.error('Error creating task templates:', error);
    return [];
  }

  return data as TaskTemplate[];
}

/**
 * Get active templates for a goal
 */
export async function getActiveTemplates(
  supabase: SupabaseClient,
  goalId: string
): Promise<TaskTemplate[]> {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('goal_id', goalId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching task templates:', error);
    return [];
  }

  return data as TaskTemplate[];
}

/**
 * Get goals that need task generation
 * Returns active goals with target_date in the future
 */
export async function getGoalsNeedingGeneration(
  supabase: SupabaseClient,
  userId: string
): Promise<any[]> {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('templates_generated', true)
    .gt('target_date', today);

  if (error) {
    console.error('Error fetching goals for generation:', error);
    return [];
  }

  return data;
}

/**
 * Update goal's last_task_generated_at timestamp
 */
export async function updateGoalGenerationTimestamp(
  supabase: SupabaseClient,
  goalId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('goals')
    .update({ last_task_generated_at: new Date().toISOString() })
    .eq('id', goalId);

  if (error) {
    console.error('Error updating goal generation timestamp:', error);
    return false;
  }

  return true;
}

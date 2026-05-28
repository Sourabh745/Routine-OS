/**
 * Production Utilities for Rolling Task Generation
 * Error handling, validation, monitoring, and optimization helpers
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Goal, TaskTemplate } from '@/lib/types/goals';

/**
 * Custom error for task generation issues
 */
export class TaskGenerationError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'TaskGenerationError';
  }
}

/**
 * Validate goal before processing
 */
export function validateGoalForGeneration(goal: Goal): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!goal.id) errors.push('Goal ID is missing');
  if (!goal.user_id) errors.push('User ID is missing');
  if (!goal.target_date) errors.push('Target date is missing');
  if (goal.status !== 'active') errors.push(`Goal status is ${goal.status}, not active`);
  if (!goal.templates_generated) errors.push('Templates not generated for goal');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate task template
 */
export function validateTaskTemplate(template: TaskTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.id) errors.push('Template ID is missing');
  if (!template.goal_id) errors.push('Goal ID is missing');
  if (!template.title) errors.push('Title is missing');
  if (!['daily', 'weekly', 'custom'].includes(template.frequency)) {
    errors.push(`Invalid frequency: ${template.frequency}`);
  }
  if (!template.preferred_days || template.preferred_days.length === 0) {
    errors.push('Preferred days must not be empty');
  }
  if (template.estimated_minutes < 1) errors.push('Estimated minutes must be positive');
  if (!['low', 'medium', 'high'].includes(template.priority)) {
    errors.push(`Invalid priority: ${template.priority}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get generation statistics for a goal
 */
export async function getGenerationStats(
  supabase: SupabaseClient,
  goalId: string
): Promise<{
  templatesCount: number;
  tasksCreated: number;
  daysGenerated: number;
  lastGeneratedAt?: string;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Count templates
    const { data: templates, error: templatesError } = await supabase
      .from('task_templates')
      .select('id')
      .eq('goal_id', goalId)
      .eq('is_active', true);

    if (templatesError) errors.push(`Templates error: ${templatesError.message}`);

    // Count tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, scheduled_date')
      .eq('goal_id', goalId)
      .is('completed_at', null); // Only pending/in-progress

    if (tasksError) errors.push(`Tasks error: ${tasksError.message}`);

    // Get unique dates
    const daysGenerated = tasks
      ? new Set(tasks.map((t) => t.scheduled_date)).size
      : 0;

    // Get last generation
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('last_task_generated_at')
      .eq('id', goalId)
      .single();

    if (goalError && goalError.code !== 'PGRST116') {
      errors.push(`Goal error: ${goalError.message}`);
    }

    return {
      templatesCount: templates?.length || 0,
      tasksCreated: tasks?.length || 0,
      daysGenerated,
      lastGeneratedAt: goal?.last_task_generated_at,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      templatesCount: 0,
      tasksCreated: 0,
      daysGenerated: 0,
      errors,
    };
  }
}

/**
 * Detect and report generation anomalies
 */
export async function detectAnomalies(
  supabase: SupabaseClient,
  goalId: string
): Promise<{
  anomalies: string[];
  warnings: string[];
}> {
  const anomalies: string[] = [];
  const warnings: string[] = [];

  try {
    // Check for orphaned templates (no goal)
    const { data: orphaned } = await supabase
      .from('task_templates')
      .select('id')
      .eq('goal_id', goalId)
      .is('goal_id', null);

    if ((orphaned?.length || 0) > 0) {
      anomalies.push(`Found ${orphaned?.length} orphaned templates`);
    }

    // Check for duplicate tasks on same day
    const { data: duplicates, error: dupError } = await supabase
      .rpc('check_duplicate_tasks', { p_goal_id: goalId });

    if (dupError) {
      warnings.push(`Could not check for duplicates: ${dupError.message}`);
    } else if ((duplicates?.length || 0) > 0) {
      anomalies.push(`Found ${duplicates?.length} potential duplicate tasks`);
    }

    // Check for tasks beyond target date
    const { data: goal } = await supabase
      .from('goals')
      .select('target_date')
      .eq('id', goalId)
      .single();

    if (goal?.target_date) {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('goal_id', goalId)
        .gt('scheduled_date', goal.target_date);

      if ((count || 0) > 0) {
        warnings.push(`${count} tasks scheduled after target date`);
      }
    }

    return { anomalies, warnings };
  } catch (error) {
    anomalies.push(error instanceof Error ? error.message : String(error));
    return { anomalies, warnings };
  }
}

/**
 * Clean up old generation log entries (maintenance)
 */
export async function cleanupOldGenerationLogs(
  supabase: SupabaseClient,
  daysToKeep: number = 180 // Keep 6 months
): Promise<{ deletedRows: number; error?: string }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const { data, error } = await supabase
    .from('task_generation_log')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    return { deletedRows: 0, error: error.message };
  }

  return { deletedRows: data?.length || 0 };
}

/**
 * Deactivate templates for completed goals
 */
export async function deactivateCompletedGoalTemplates(
  supabase: SupabaseClient,
  goalId: string
): Promise<{ deactivated: number; error?: string }> {
  const { data, error } = await supabase
    .from('task_templates')
    .update({ is_active: false })
    .eq('goal_id', goalId)
    .select('id');

  if (error) {
    return { deactivated: 0, error: error.message };
  }

  return { deactivated: data?.length || 0 };
}

/**
 * Estimate next generation window for a goal
 * Returns when the next 7 days will be generated
 */
export function estimateNextGenerationWindow(
  lastGeneratedAt?: string
): {
  nextGenerationDate: Date;
  daysUntilGeneration: number;
  currentWindow: [Date, Date];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find next Sunday (cron job runs Sunday midnight)
  const nextSunday = new Date(today);
  const currentDay = nextSunday.getDay();
  const daysUntilSunday = (7 - currentDay) % 7 || 7;
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);

  // Current window extends 7 days from today
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 7);

  return {
    nextGenerationDate: nextSunday,
    daysUntilGeneration: daysUntilSunday,
    currentWindow: [today, windowEnd],
  };
}

/**
 * Estimate storage usage for rolling tasks
 * Helps with capacity planning
 */
export function estimateStorageUsage(options: {
  usersCount: number;
  avgGoalsPerUser: number;
  avgTemplatesPerGoal: number;
  daysLookAhead: number;
  avgTasksPerTemplate: number;
}): {
  estimatedRows: number;
  estimatedSizeMB: number;
  retentionMonths: number;
} {
  const {
    usersCount,
    avgGoalsPerUser,
    avgTemplatesPerGoal,
    daysLookAhead,
    avgTasksPerTemplate,
  } = options;

  // Calculate task rows
  const totalGoals = usersCount * avgGoalsPerUser;
  const totalTemplates = totalGoals * avgTemplatesPerGoal;
  const tasksPerDay = totalTemplates * avgTasksPerTemplate;
  const totalTaskRows = tasksPerDay * daysLookAhead;

  // Add overhead for templates and logs
  const overheadRows = totalTemplates + totalTaskRows * 0.1; // 10% for generation log

  const totalRows = totalTaskRows + overheadRows;

  // Rough size estimation: ~1KB per row in Postgres
  const estimatedSizeMB = (totalRows * 1) / 1024;

  // Default retention: 6 months
  const retentionMonths = 6;

  return {
    estimatedRows: Math.round(totalRows),
    estimatedSizeMB: Math.round(estimatedSizeMB),
    retentionMonths,
  };
}


export function validateCronSecret(secret?: string): {
  valid: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  if (!secret) {
    recommendations.push('CRON_SECRET is not set');
    return { valid: false, recommendations };
  }

  if (secret.length < 32) {
    recommendations.push('CRON_SECRET should be at least 32 characters long');
  }

  if (!/[A-Z]/.test(secret)) {
    recommendations.push('CRON_SECRET should include uppercase letters');
  }

  if (!/[a-z]/.test(secret)) {
    recommendations.push('CRON_SECRET should include lowercase letters');
  }

  if (!/[0-9]/.test(secret)) {
    recommendations.push('CRON_SECRET should include numbers');
  }

  if (!/[^A-Za-z0-9]/.test(secret)) {
    recommendations.push('CRON_SECRET should include special characters');
  }

  return {
    valid: recommendations.length === 0,
    recommendations,
  };
}

/**
 * Format generation stats for logging/monitoring
 */
export function formatGenerationStats(stats: {
  goalsProcessed: number;
  tasksCreated: number;
  duration_ms: number;
  errors: Array<{ goalId: string; error: string }>;
}): string {
  const avgTimePerGoal = stats.goalsProcessed > 0
    ? Math.round(stats.duration_ms / stats.goalsProcessed)
    : 0;

  return `
Generation Summary:
  - Goals processed: ${stats.goalsProcessed}
  - Tasks created: ${stats.tasksCreated}
  - Avg per goal: ${stats.tasksCreated / Math.max(1, stats.goalsProcessed)} tasks
  - Duration: ${stats.duration_ms}ms (${avgTimePerGoal}ms/goal)
  - Errors: ${stats.errors.length}
  ${stats.errors.length > 0
    ? `- Error details: ${stats.errors.map((e) => `${e.goalId}: ${e.error}`).join('; ')}`
    : ''
  }
  `.trim();
}

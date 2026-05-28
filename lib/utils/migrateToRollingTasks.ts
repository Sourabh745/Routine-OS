/**
 * Migration Helper Script
 * Converts existing bulk-generated goals to use the new rolling task generation
 *
 * Usage:
 * node scripts/migrate-rolling-tasks.js
 *
 * Or use as utility functions directly in your code
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createTemplatesFromBreakdown } from '@/lib/utils/taskGeneration';
import type { Goal } from '@/lib/types/goals';

/**
 * Analyze current state of goals
 */
export async function analyzeExistingGoals(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  totalGoals: number;
  bulkGeneratedGoals: number;
  migratable: number;
  alreadyMigrated: number;
  completedGoals: number;
}> {
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId);

  if (!goals) {
    return {
      totalGoals: 0,
      bulkGeneratedGoals: 0,
      migratable: 0,
      alreadyMigrated: 0,
      completedGoals: 0,
    };
  }

  let bulkGeneratedGoals = 0;
  let migratable = 0;
  let alreadyMigrated = 0;
  let completedGoals = 0;

  for (const goal of goals) {
    if (goal.status === 'completed') {
      completedGoals++;
      continue;
    }

    if (goal.templates_generated) {
      alreadyMigrated++;
    } else if (goal.ai_breakdown) {
      // Has AI breakdown but no templates = candidates for migration
      bulkGeneratedGoals++;
      migratable++;
    } else {
      bulkGeneratedGoals++;
    }
  }

  return {
    totalGoals: goals.length,
    bulkGeneratedGoals,
    migratable,
    alreadyMigrated,
    completedGoals,
  };
}

/**
 * Migrate a single goal from bulk to rolling generation
 *
 * This:
 * 1. Checks if goal has AI breakdown
 * 2. Creates templates from the breakdown
 * 3. Preserves existing tasks (doesn't delete them)
 * 4. Marks goal as templates_generated
 */
export async function migrateGoal(
  supabase: SupabaseClient,
  goalId: string
): Promise<{
  success: boolean;
  error?: string;
  details?: {
    templatesCreated: number;
    existingTasks: number;
  };
}> {
  try {
    // Get goal with breakdown
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      return {
        success: false,
        error: `Could not fetch goal: ${goalError?.message}`,
      };
    }

    // Check if already migrated
    if (goal.templates_generated) {
      return {
        success: false,
        error: 'Goal already has templates generated',
        details: { templatesCreated: 0, existingTasks: 0 },
      };
    }

    // Check if has AI breakdown
    if (!goal.ai_breakdown) {
      return {
        success: false,
        error: 'Goal has no AI breakdown to migrate from',
      };
    }

    const breakdown = goal.ai_breakdown;

    // Get existing tasks count
    const { count: existingTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', goalId);

    // Get milestone count
    const { data: milestones } = await supabase
      .from('milestones')
      .select('*')
      .eq('goal_id', goalId);

    // Create templates
    const templates = await createTemplatesFromBreakdown(
      supabase,
      goalId,
      goal.user_id,
      breakdown.weekly_tasks || [],
      breakdown.daily_habits || [],
      milestones?.length || 3
    );

    if (templates.length === 0) {
      return {
        success: false,
        error: 'Failed to create templates from breakdown',
      };
    }

    // Mark goal as migrated
    const { error: updateError } = await supabase
      .from('goals')
      .update({
        templates_generated: true,
        last_task_generated_at: new Date().toISOString(),
      })
      .eq('id', goalId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to mark goal as migrated: ${updateError.message}`,
      };
    }

    return {
      success: true,
      details: {
        templatesCreated: templates.length,
        existingTasks: existingTasks || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Migrate all eligible goals for a user
 */
export async function migrateAllGoals(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    goalId: string;
    title: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const { data: goals } = await supabase
    .from('goals')
    .select('id, title, status, templates_generated, ai_breakdown')
    .eq('user_id', userId)
    .neq('status', 'completed');

  if (!goals) {
    return {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      results: [],
    };
  }

  const results: Array<{
    goalId: string;
    title: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const goal of goals) {
    // Skip already migrated
    if (goal.templates_generated) {
      results.push({
        goalId: goal.id,
        title: goal.title,
        success: true,
        error: 'Already migrated',
      });
      continue;
    }

    // Skip without breakdown
    if (!goal.ai_breakdown) {
      results.push({
        goalId: goal.id,
        title: goal.title,
        success: false,
        error: 'No AI breakdown available',
      });
      continue;
    }

    // Migrate
    const result = await migrateGoal(supabase, goal.id);

    results.push({
      goalId: goal.id,
      title: goal.title,
      success: result.success,
      error: result.error,
    });
  }

  const successful = results.filter((r) => r.success).length;

  return {
    totalProcessed: results.length,
    successful,
    failed: results.length - successful,
    results,
  };
}

/**
 * Batch delete old tasks from a goal
 * Useful for cleaning up bulk-generated tasks
 *
 * WARNING: Only use if you want to remove existing tasks!
 */
export async function deleteOldTasks(
  supabase: SupabaseClient,
  goalId: string,
  beforeDate: string // YYYY-MM-DD format
): Promise<{
  deleted: number;
  error?: string;
}> {
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('goal_id', goalId)
    .lt('scheduled_date', beforeDate)
    .eq('status', 'pending') // Only delete pending tasks
    .select('id');

  if (error) {
    return { deleted: 0, error: error.message };
  }

  return { deleted: data?.length || 0 };
}

/**
 * Export migration summary
 */
export function generateMigrationReport(options: {
  totalGoals: number;
  bulkGeneratedGoals: number;
  migratable: number;
  successfulMigrations: number;
  failedMigrations: number;
  completedGoals: number;
  alreadyMigrated: number;
}): string {
  return `
=================================================
ROLLING TASK GENERATION MIGRATION REPORT
=================================================

Total Goals Analyzed:        ${options.totalGoals}
Completed (no action):       ${options.completedGoals}
Already Migrated:            ${options.alreadyMigrated}

Bulk-Generated Goals:        ${options.bulkGeneratedGoals}
├─ Migratable (with plan):  ${options.migratable}
├─ Successfully Migrated:    ${options.successfulMigrations}
└─ Failed Migrations:        ${options.failedMigrations}

=================================================
NEXT STEPS:
1. Run weekly cron job to generate remaining tasks
2. Monitor new task generation
3. Archive old bulk-generated goals after completion
=================================================
`.trim();
}

/**
 * CLI Helper for running migration
 * Can be called from a Next.js API route or script
 */
export async function runMigrationCLI(
  supabase: SupabaseClient,
  userId: string,
  options: {
    dryRun?: boolean;
    verbose?: boolean;
  } = {}
) {
  console.log('Starting migration...\n');

  // Analyze
  const analysis = await analyzeExistingGoals(supabase, userId);
  console.log('Current state:', analysis);

  if (analysis.migratable === 0) {
    console.log('No goals to migrate!');
    return;
  }

  console.log(`\nMigrating ${analysis.migratable} goals...`);

  if (options.dryRun) {
    console.log('(DRY RUN - no changes will be made)\n');
  }

  if (!options.dryRun) {
    const results = await migrateAllGoals(supabase, userId);

    console.log('\nMigration Results:');
    for (const result of results.results) {
      const status = result.success ? '✓' : '✗';
      console.log(`${status} ${result.title}: ${result.error || 'Success'}`);
    }

    console.log(
      '\n' +
        generateMigrationReport({
        totalGoals: analysis.totalGoals,
        bulkGeneratedGoals: analysis.bulkGeneratedGoals,
        migratable: analysis.migratable,
        successfulMigrations: results.successful,
        failedMigrations: results.failed,
        completedGoals: analysis.completedGoals,
        alreadyMigrated: analysis.alreadyMigrated,
      })
    );
  }
}

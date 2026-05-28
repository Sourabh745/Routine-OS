/**
 * Weekly Task Generation Cron Job
 * Runs every Sunday midnight
 * Generates next 7 days of tasks for all active goals with pending generation
 *
 * Environment setup:
 * - Use Vercel Cron Jobs: https://vercel.com/docs/crons
 * - Or use an external service like: EasyCron, Healthchecks.io, or AWS Lambda
 * - Call this endpoint: https://yourdomain.com/api/cron/generate-weekly-tasks
 * - Pass authorization header: Authorization: Bearer YOUR_CRON_SECRET
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getGoalsNeedingGeneration,
  getActiveTemplates,
  generateTasksForDateRange,
  insertTasksWithBatching,
  insertGenerationLog,
  updateGoalGenerationTimestamp,
} from '@/lib/utils/taskGeneration';
import { addDays, format } from 'date-fns';
import type { Milestone, CronJobResult } from '@/lib/types/goals';

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return false;
  }

  return true;
}

export async function GET(request: Request) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    console.log('[Cron] Starting weekly task generation job');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .not('id', 'is', null)
      .limit(100);

    if (userError) {
      console.error('[Cron] Error fetching users:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    let totalGoalsProcessed = 0;
    let totalTasksCreated = 0;
    const errors: { goalId: string; error: string }[] = [];

    for (const user of users || []) {
      try {
        const result = await processUserGoals(supabase, user.id);
        totalGoalsProcessed += result.goalsProcessed;
        totalTasksCreated += result.tasksCreated;
        errors.push(...result.errors);
      } catch (error) {
        console.error(`[Cron] Error processing user ${user.id}:`, error);
        errors.push({
          goalId: `user_${user.id}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const duration = Date.now() - startTime;

    const result: CronJobResult = {
      goalsProcessed: totalGoalsProcessed,
      totalTasksCreated: totalTasksCreated,
      errors,
      duration_ms: duration,
    };

    console.log('[Cron] Task generation complete:', result);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Processed ${totalGoalsProcessed} goals, created ${totalTasksCreated} tasks in ${duration}ms`,
    });
  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function processUserGoals(
  supabase: any,
  userId: string
): Promise<{
  goalsProcessed: number;
  tasksCreated: number;
  errors: { goalId: string; error: string }[];
}> {
  const goals = await getGoalsNeedingGeneration(supabase, userId);
  let goalsProcessed = 0;
  let tasksCreated = 0;
  const errors: { goalId: string; error: string }[] = [];

  console.log(`[Cron] Processing ${goals.length} goals for user ${userId}`);

  for (const goal of goals) {
    try {
      const result = await processGoal(supabase, goal);
      goalsProcessed += 1;
      tasksCreated += result.tasksCreated;
    } catch (error) {
      console.error(`[Cron] Error processing goal ${goal.id}:`, error);
      errors.push({
        goalId: goal.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    goalsProcessed,
    tasksCreated,
    errors,
  };
}

/**
 * Process a single goal
 * Generates tasks for next 7 days
 */
async function processGoal(
  supabase: ReturnType<typeof createClient>,
  goal: any
): Promise<{ tasksCreated: number }> {
  console.log(`[Cron] Processing goal: ${goal.id} (${goal.title})`);

  // Skip if not templates_generated yet
  if (!goal.templates_generated) {
    console.log(`[Cron] Goal ${goal.id} doesn't have templates yet, skipping`);
    return { tasksCreated: 0 };
  }

  // Skip if target date is in the past
  const today = new Date();
  const targetDate = new Date(goal.target_date);

  if (targetDate < today) {
    console.log(`[Cron] Goal ${goal.id} target date is in the past, skipping`);
    return { tasksCreated: 0 };
  }

  // Get templates for this goal
  const templates = await getActiveTemplates(supabase, goal.id);

  if (templates.length === 0) {
    console.log(`[Cron] No active templates for goal ${goal.id}`);
    return { tasksCreated: 0 };
  }

  // Get milestones
  const { data: milestones, error: milestoneError } = await supabase
    .from('milestones')
    .select('*')
    .eq('goal_id', goal.id)
    .order('order_index', { ascending: true });

  if (milestoneError) {
    throw new Error(`Failed to fetch milestones: ${milestoneError.message}`);
  }

  // Generate tasks for next 7 days
  const nextWeekStart = addDays(today, 1);
  const nextWeekEnd = addDays(today, 7);

  console.log(`[Cron] Generating tasks for ${goal.id} from ${format(nextWeekStart, 'yyyy-MM-dd')} to ${format(nextWeekEnd, 'yyyy-MM-dd')}`);

  const generationResult = await generateTasksForDateRange(
    supabase,
    goal.id,
    goal.user_id,
    nextWeekStart,
    nextWeekEnd,
    targetDate,
    templates,
    milestones as Milestone[]
  );

  if (generationResult.generatedTasks.length === 0) {
    console.log(`[Cron] No new tasks to generate for goal ${goal.id}`);
    return { tasksCreated: 0 };
  }

  // Insert tasks
  console.log(`[Cron] Inserting ${generationResult.generatedTasks.length} tasks for goal ${goal.id}`);
  const insertResult = await insertTasksWithBatching(
    supabase,
    generationResult.generatedTasks,
    100
  );

  if (insertResult.errors.length > 0) {
    console.warn(`[Cron] Task insertion had errors for goal ${goal.id}:`, insertResult.errors);
  }

  // Update last_task_generated_at
  await updateGoalGenerationTimestamp(supabase, goal.id);

  console.log(`[Cron] Goal ${goal.id} complete: ${insertResult.inserted} tasks inserted`);

  return { tasksCreated: insertResult.inserted };
}

/**
 * POST handler for manual triggering
 * Useful for testing
 */
export async function POST(request: Request) {
  // For manual trigger, could require more strict auth
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Just delegate to GET
  return GET(request);
}

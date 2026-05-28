/**
 * Goal Breakdown API Route
 * Generates AI plan, creates templates, and seeds first 7 days of tasks
 * Rolling task generation continues via cron job
 */

import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { addDays, format } from 'date-fns';
import {
  createTemplatesFromBreakdown,
  generateTasksForDateRange,
  insertTasksWithBatching,
  insertGenerationLog,
  updateGoalGenerationTimestamp,
} from '@/lib/utils/taskGeneration';
import { NextResponse } from 'next/server';
import type { GoalBreakdown, Milestone } from '@/lib/types/goals';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });

const BREAKDOWN_SCHEMA = z.object({
  summary: z.string().describe('2-3 sentence overview of the plan'),
  quarterly_milestones: z.array(z.string()).describe('3-4 major milestones'),
  monthly_focus: z.string().describe('What to focus on this month'),
  weekly_tasks: z.array(z.string()).describe('5-7 tasks for this week'),
  daily_habits: z.array(z.string()).describe('1-2 daily habits to support this goal'),
  estimated_hours_per_week: z.number().describe('Realistic hours needed per week'),
  key_risks: z.array(z.string()).describe('2-3 potential blockers'),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { goalId, title, description, targetDate } = await request.json();

    if (!goalId || !title || !targetDate) {
      return NextResponse.json(
        { error: 'Missing required fields: goalId, title, targetDate' },
        { status: 400 }
      );
    }

    // Calculate available days
    const today = new Date();
    const target = new Date(targetDate);
    const daysAvailable = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysAvailable < 1) {
      return NextResponse.json(
        { error: 'Target date must be in the future' },
        { status: 400 }
      );
    }

    // Generate AI breakdown
    console.log(`[Breakdown] Generating plan for goal: ${goalId}`);
    const { object: aiBreakdown } = await generateObject({
      model: groq('openai/gpt-oss-20b'),
      schema: BREAKDOWN_SCHEMA,
      prompt: `
        Break down this goal into an actionable plan:
        Goal: "${title}"
        Description: "${description || ''}"
        Target Date: ${targetDate} (${daysAvailable} days from today)
        
        Be realistic. Most people have 1-2 hours per day for side goals.
        Make tasks specific and actionable.
      `,
    });

    // Store AI breakdown in goal
    const { error: updateError } = await supabase
      .from('goals')
      .update({
        ai_breakdown: aiBreakdown as GoalBreakdown,
      })
      .eq('id', goalId);

    if (updateError) {
      console.error('Error updating goal with breakdown:', updateError);
      return NextResponse.json(
        { error: 'Failed to save goal breakdown' },
        { status: 500 }
      );
    }

    // Create milestones
    console.log(`[Breakdown] Creating ${aiBreakdown.quarterly_milestones.length} milestones`);
    const milestoneRecords = aiBreakdown.quarterly_milestones.map((title, index) => ({
      goal_id: goalId,
      user_id: user.id,
      title,
      description: `Milestone ${index + 1} of ${aiBreakdown.quarterly_milestones.length}`,
      due_date: addDays(
        today,
        Math.floor((daysAvailable * (index + 1)) / aiBreakdown.quarterly_milestones.length)
      ).toISOString().split('T')[0],
      order_index: index,
      status: 'pending' as const,
    }));

    const { data: createdMilestones, error: milestoneError } = await supabase
      .from('milestones')
      .insert(milestoneRecords)
      .select();

    if (milestoneError || !createdMilestones) {
      console.error('Error creating milestones:', milestoneError);
      return NextResponse.json(
        { error: 'Failed to create milestones' },
        { status: 500 }
      );
    }

    // Create task templates from AI breakdown
    console.log(`[Breakdown] Creating ${aiBreakdown.weekly_tasks.length} task templates`);
    const templates = await createTemplatesFromBreakdown(
      supabase,
      goalId,
      user.id,
      aiBreakdown.weekly_tasks,
      aiBreakdown.daily_habits,
      aiBreakdown.quarterly_milestones.length
    );

    if (templates.length === 0) {
      console.error('Failed to create task templates');
      return NextResponse.json(
        { error: 'Failed to create task templates' },
        { status: 500 }
      );
    }

    // Generate ONLY first 7 days of tasks
    console.log('[Breakdown] Generating first 7 days of tasks');
    const firstDayStart = today;
    const firstWeekEnd = addDays(today, 7);

    const generationResult = await generateTasksForDateRange(
      supabase,
      goalId,
      user.id,
      firstDayStart,
      firstWeekEnd,
      target,
      templates,
      createdMilestones as Milestone[]
    );

    // Insert generated tasks
    if (generationResult.generatedTasks.length > 0) {
      console.log(`[Breakdown] Inserting ${generationResult.generatedTasks.length} tasks`);
      const insertResult = await insertTasksWithBatching(
        supabase,
        generationResult.generatedTasks,
        100
      );

      if (insertResult.failed > 0) {
        console.warn(
          `[Breakdown] ${insertResult.failed} tasks failed to insert`,
          insertResult.errors
        );
      }

      // Log generation for duplicate prevention
      if (insertResult.inserted > 0) {
        const taskIds = Array(insertResult.inserted)
          .fill('')
          .map((_, i) => `task_${i}`);

        await insertGenerationLog(
          supabase,
          goalId,
          generationResult.logEntries,
          taskIds
        );
      }
    }

    // Mark that templates have been generated
    await updateGoalGenerationTimestamp(supabase, goalId);

    const { error: templateError } = await supabase
      .from('goals')
      .update({ templates_generated: true })
      .eq('id', goalId);

    if (templateError) {
      console.warn('Warning: Failed to mark templates_generated flag:', templateError);
    }

    console.log(`[Breakdown] Goal ${goalId} breakdown complete`);

    return NextResponse.json({
      success: true,
      goalId,
      breakdown: aiBreakdown,
      milestonesCreated: createdMilestones.length,
      templatesCreated: templates.length,
      initialTasksCreated: generationResult.tasksCreated,
      message: `Plan created with ${createdMilestones.length} milestones, ${templates.length} templates, and ${generationResult.tasksCreated} initial tasks. Remaining tasks will be generated weekly.`,
    });
  } catch (error) {
    console.error('Error in goal breakdown:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate goal breakdown',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

//   return Response.json({
//     success: true,
//     milestonesCreated: createdMilestones?.length || 0,
//     tasksCreated: tasksToCreate.length,
//     message: `Goal broken down into ${createdMilestones?.length} milestones and ${tasksToCreate.length} tasks.`
//   })
// }

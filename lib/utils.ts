import { clsx, type ClassValue } from "clsx"
import { format, subDays } from "date-fns"
import { twMerge } from "tailwind-merge"
import { HabitLog } from "./supabase/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateStreaks(uniqueDates: string[]): {
  currentStreak: number
  longestStreak: number
} {
  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }
  console.log("Unique log dates for streak calculation:", uniqueDates)
  const sortedAsc = [...uniqueDates].sort()

  const sortedDesc = [...uniqueDates].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const mostRecent = new Date(sortedDesc[0])
  mostRecent.setHours(0, 0, 0, 0)

  let currentStreak = 0

  if (
    mostRecent.getTime() === today.getTime() ||
    mostRecent.getTime() === yesterday.getTime()
  ) {
    currentStreak = 0
    for (let i = 0; i < sortedDesc.length - 1; i++) {
      const current = new Date(sortedDesc[i])
      const previous = new Date(sortedDesc[i + 1])
      console.log(`Comparing ${current.toDateString()} and ${previous.toDateString()} for current streak calculation`)
      const diffDays = Math.round(
        (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }

  let longestStreak = 0
  let currentRun = 0

  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i - 1])
    const curr = new Date(sortedAsc[i])
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays === 1) {
      currentRun++
    } else {
      currentRun = 0
    }
    if (currentRun > longestStreak) longestStreak = currentRun
  }

  return { currentStreak, longestStreak }
}

export async function recalculateHabitStreaks(
  supabase: any,
  habitId: string,
  userId: string
) {
  const { data: allLogs } = await supabase
    .from('habit_logs')
    .select('logged_date')
    .eq('habit_id', habitId)
    .eq('user_id', userId)

  const uniqueDates: any[] = allLogs
    ? [...new Set(allLogs.map((l: any) => l.logged_date))]
    : []
  console.log('All logs for habit', habitId, allLogs)
  const { currentStreak, longestStreak } = calculateStreaks(uniqueDates)

  await supabase
    .from('habits')
    .update({
      streak_count: currentStreak,
      longest_streak: longestStreak,
      updated_at: new Date().toISOString(),
    })
    .eq('id', habitId)
    .eq('user_id', userId)

  return { currentStreak, longestStreak }
}
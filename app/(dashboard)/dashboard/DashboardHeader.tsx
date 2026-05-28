'use client'

import { Profile } from '@/lib/supabase/types'
import { format } from 'date-fns'
import { Sun, Moon, Sunset, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

interface DashboardHeaderProps {
  profile: Profile | null
  completedTasks: number
  totalTasks: number
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', Icon: Sun }
  if (hour < 17) return { text: 'Good afternoon', Icon: Sunset }
  return { text: 'Good evening', Icon: Moon }
}

export function DashboardHeader({ profile, completedTasks, totalTasks }: DashboardHeaderProps) {
  const { text, Icon } = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const timeString = now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
      setCurrentTime(timeString)
    }

    updateClock()
    const interval = setInterval(updateClock, 1000)

    return () => clearInterval(interval)
  }, [timezone])

  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-5 h-5 text-yellow-400" />
          <h1 className="text-2xl font-bold text-white">
            {text}, {firstName}
          </h1>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span>{today}</span>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5 font-mono text-sm">
            <Clock className="w-4 h-4" />
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {totalTasks > 0 && (
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {completedTasks}/{totalTasks}
          </div>
          <div className="text-slate-400 text-sm">tasks done today</div>
        </div>
      )}
    </div>
  )
}
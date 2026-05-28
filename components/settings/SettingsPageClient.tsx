'use client'

import { useState } from 'react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Profile } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, User, Clock, Globe } from 'lucide-react'

type Props = {
  profile: Profile
}

export function SettingsPageClient({ profile }: Props) {
  const [saving, setSaving] = useState(false)
  const timezones = Intl.supportedValuesOf('timeZone')

  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    morning_briefing_time: profile.morning_briefing_time || '08:00',
    evening_checkin_time: profile.evening_checkin_time || '21:00',
  })

  const saveSettings = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success('Settings updated')
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={form.full_name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, full_name: e.target.value }))
            }
            placeholder="Full Name"
            className="bg-slate-800 border-slate-700 text-white"
          />
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            AI Schedule Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm">
              Morning Briefing Time
            </label>
            <Input
              type="time"
              value={form.morning_briefing_time}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  morning_briefing_time: e.target.value,
                }))
              }
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm">
              Evening Check-in Time
            </label>
            <Input
              type="time"
              value={form.evening_checkin_time}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  evening_checkin_time: e.target.value,
                }))
              }
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-400" />
            Timezone
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* <Input
            value={form.timezone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, timezone: e.target.value }))
            }
            placeholder="e.g. Asia/Kolkata"
            className="bg-slate-800 border-slate-700 text-white"
          /> */}
          <Select
  value={form.timezone}
  onValueChange={(v) =>
    setForm((prev) => ({ ...prev, timezone: v }))
  }
>
  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
    <SelectValue placeholder="Select timezone" />
  </SelectTrigger>

  <SelectContent className="bg-slate-800 border-slate-700 max-h-72 overflow-y-auto">
    {timezones.map((tz) => (
      <SelectItem key={tz} value={tz}>
        {tz}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
        </CardContent>
      </Card>

      <Button
        onClick={saveSettings}
        disabled={saving}
        className="bg-purple-600 hover:bg-purple-700"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </div>
  )
}
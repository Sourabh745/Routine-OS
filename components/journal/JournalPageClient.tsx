'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { JournalEntry } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { BookOpen, Sparkles, Trash2, Calendar, Loader2, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

type JournalPageClientProps = {
  initialEntries: JournalEntry[]
}

const moods = [
  { value: 'great', emoji: '😄', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  { value: 'good', emoji: '🙂', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { value: 'okay', emoji: '😐', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  { value: 'bad', emoji: '😕', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { value: 'terrible', emoji: '😞', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
] as const

export function JournalPageClient({ initialEntries }: JournalPageClientProps) {
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries)
  const [saving, setSaving] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    content: '',
    mood: '' as JournalEntry['mood'] | '',
    energy_level: 5,
    tags: '',
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  const saveEntry = async () => {
    if (!form.content.trim()) {
      toast.error('Write something before saving')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title || null,
          content: form.content,
          mood: form.mood || null,
          energy_level: form.energy_level,
          tags: form.tags
            ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
            : [],
          entry_date: today,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      setEntries((prev) => [data.entry, ...prev])

      setForm({
        title: '',
        content: '',
        mood: '',
        energy_level: 5,
        tags: '',
      })

      toast.success('Journal entry saved')
    } catch {
      toast.error('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const generateInsights = async (entry: JournalEntry) => {
    setAnalyzingId(entry.id)

    try {
      const res = await fetch('/api/journal/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, ai_insights: data.insights } : e))
      )
      toast.success('Insights generated')
    } catch {
      toast.error('Failed to generate insights')
    } finally {
      setAnalyzingId(null)
    }
  }

  const deleteEntry = async (entryId: string) => {
    setDeletingId(entryId)

    const previousEntries = entries
    setEntries((prev) => prev.filter((e) => e.id !== entryId))

    try {
      const res = await fetch('/api/journal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId }),
      })

      if (!res.ok) throw new Error('Failed')
      toast.success('Entry deleted')
    } catch {
      setEntries(previousEntries)
      toast.error('Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-yellow-400" />
            New Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Title (optional)"
            className="bg-slate-800 border-slate-700 text-white"
          />

          <Textarea
            value={form.content}
            onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="What happened today? What did you learn? How are you feeling?"
            className="bg-slate-800 border-slate-700 text-white resize-none min-h-40"
          />

          <div className="space-y-2">
            <p className="text-slate-300 text-sm">Mood</p>
            <div className="flex flex-wrap gap-2">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setForm((prev) => ({ ...prev, mood: mood.value }))}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2',
                    form.mood === mood.value
                      ? `${mood.bg} ${mood.border} ${mood.color}`
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  )}
                >
                  <span className="text-lg">{mood.emoji}</span>
                  <span className="capitalize">{mood.value}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-300 text-sm">Energy Level</p>
              <p className="text-white font-medium">{form.energy_level}/10</p>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={form.energy_level}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, energy_level: Number(e.target.value) }))
              }
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>Drained</span>
              <span>Energized</span>
            </div>
          </div>

          <Input
            value={form.tags}
            onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
            placeholder="Tags (comma separated) e.g. work, family, exercise"
            className="bg-slate-800 border-slate-700 text-white"
          />

          <Button
            onClick={saveEntry}
            disabled={saving || !form.content.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Entry'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Past Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.length === 0 ? (
            <p className="text-slate-500 text-sm">No entries yet. Start writing above.</p>
          ) : (
            entries.map((entry) => {
              const moodConfig = moods.find((m) => m.value === entry.mood)

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {entry.title && (
                        <h3 className="text-white font-medium">{entry.title}</h3>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {entry.entry_date}
                        </span>
                        {moodConfig && (
                          <Badge
                            className={cn('border text-xs', moodConfig.bg, moodConfig.border, moodConfig.color)}
                          >
                            {moodConfig.emoji} {entry.mood}
                          </Badge>
                        )}
                        {entry.energy_level && (
                          <Badge className="border border-slate-700 bg-slate-800 text-slate-300">
                            Energy: {entry.energy_level}/10
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateInsights(entry)}
                        disabled={analyzingId === entry.id}
                        className="border-slate-700 text-white hover:bg-slate-800"
                      >
                        {analyzingId === entry.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3 mr-1 text-purple-400" />
                        )}
                        {entry.ai_insights ? 'Regenerate' : 'Insights'}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteEntry(entry.id)}
                        disabled={deletingId === entry.id}
                        className="text-slate-500 hover:text-red-400 hover:bg-red-950/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag) => (
                        <Badge
                          key={tag}
                          className="border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {entry.ai_insights && (
                    <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <p className="text-purple-300 text-xs font-medium uppercase tracking-wider">
                          AI Insights
                        </p>
                      </div>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {entry.ai_insights}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
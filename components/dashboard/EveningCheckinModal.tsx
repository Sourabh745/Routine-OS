'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Moon, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function EveningCheckinModal() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const generateCheckin = async () => {
    setLoading(true)
    setSummary(null)

    try {
      const res = await fetch('/api/checkin', { method: 'POST' })
      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      setSummary(data.summary)
    } catch {
      toast.error('Failed to generate check-in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-700 text-white">
          <Moon className="w-4 h-4 mr-2 text-indigo-400" />
          Evening Check-in
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Evening Reflection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!summary && (
            <Button
              onClick={generateCheckin}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reflecting...
                </>
              ) : (
                'Generate Reflection'
              )}
            </Button>
          )}

          {summary && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-4">
              <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                {summary}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
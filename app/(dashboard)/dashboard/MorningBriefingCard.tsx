'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface MorningBriefingCardProps {
  existingBriefing: string | null
}

export function MorningBriefingCard({ existingBriefing }: MorningBriefingCardProps) {
  const [briefing, setBriefing] = useState(existingBriefing)
  const [loading, setLoading] = useState(false)

  const generateBriefing = async (force = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      setBriefing(data.briefing)
      if (!data.cached) toast.success('Morning briefing generated!')
    } catch {
      toast.error('Failed to generate briefing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          Morning Briefing
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => generateBriefing(true)}
          disabled={loading}
          className="text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {briefing ? (
          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
            {briefing}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">Your AI Chief of Staff is ready to brief you</p>
            <Button
              onClick={() => generateBriefing()}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing your data...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Morning Briefing
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
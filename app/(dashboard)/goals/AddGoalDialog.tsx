'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Brain, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const categories = [
  { value: 'health', label: '💪 Health & Fitness' },
  { value: 'career', label: '💼 Career & Business' },
  { value: 'learning', label: '📚 Learning & Skills' },
  { value: 'finance', label: '💰 Finance & Money' },
  { value: 'relationships', label: '❤️ Relationships' },
  { value: 'personal', label: '🌟 Personal Growth' },
  { value: 'other', label: '🎯 Other' },
]

export function AddGoalDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'planning'>('form')
  const router = useRouter()

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    target_date: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStep('planning')

    try {
      // Step 1: Create goal
      const goalRes = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const { goal } = await goalRes.json()

      // Step 2: AI breaks it down
      toast.info('AI is planning your goal...')
      const breakdownRes = await fetch('/api/goals/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: goal.id,
          title: form.title,
          description: form.description,
          targetDate: form.target_date,
        }),
      })
      
      if (!breakdownRes.ok) throw new Error('Breakdown failed')
      
      const { tasksCreated } = await breakdownRes.json()
      
      toast.success(`Goal created! AI planned ${tasksCreated} tasks for you 🎯`)
      setOpen(false)
      setForm({ title: '', description: '', category: 'personal', priority: 'medium', target_date: '' })
      setStep('form')
      router.refresh()
    } catch {
      toast.error('Failed to create goal')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md" aria-describedby="dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            {step === 'planning' ? 'AI is planning your goal...' : 'Add New Goal'}
          </DialogTitle>
        </DialogHeader>

        {step === 'planning' ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
            </div>
            <div>
              <p className="text-white font-medium">Breaking down your goal</p>
              <p className="text-slate-400 text-sm mt-1">
                AI is creating milestones and scheduling your first week of tasks...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">What&apos;s your goal?</Label>
              <Input
                placeholder="e.g., Launch my SaaS product, Learn Spanish, Run a 5K..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">More details (optional)</Label>
              <Textarea
                placeholder="Give AI more context to create a better plan..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-white">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="high" className="text-white">🔴 High</SelectItem>
                    <SelectItem value="medium" className="text-white">🟡 Medium</SelectItem>
                    <SelectItem value="low" className="text-white">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Target Date</Label>
              <Input
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="flex-1 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <Brain className="w-4 h-4 mr-2" />
                Create & Plan with AI
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
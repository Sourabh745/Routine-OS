import { createClient } from '@/lib/supabase/server'
import { BookOpen } from 'lucide-react'
import { JournalPageClient } from '@/components/journal/JournalPageClient'

export default async function JournalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: entries } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', user!.id)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-yellow-400" />
          Journal
        </h1>
        <p className="text-slate-400 mt-1">
          Reflect on your day. AI will surface patterns and insights over time.
        </p>
      </div>

      <JournalPageClient initialEntries={entries || []} />
    </div>
  )
}
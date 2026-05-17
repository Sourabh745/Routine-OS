import { createClient } from '@/lib/supabase/server'
import { Settings } from 'lucide-react'
import { SettingsPageClient } from '@/components/settings/SettingsPageClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-400" />
          Settings
        </h1>
        <p className="text-slate-400 mt-1">
          Manage your account and AI scheduling preferences.
        </p>
      </div>

      <SettingsPageClient profile={profile} />
    </div>
  )
}
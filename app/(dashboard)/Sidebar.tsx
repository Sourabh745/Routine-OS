'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '../../lib/supabase/types'
import { cn } from '@/lib/utils'
import { 
  Brain, 
  LayoutDashboard, 
  Target, 
  CheckSquare, 
  BookOpen, 
  Activity, 
  FileText, 
  Settings,
  LogOut,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/today', icon: CheckSquare, label: "Today's Tasks" },
  { href: '/habits', icon: Activity, label: 'Habits' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/agent', icon: Zap, label: 'AI Agent' },
]

interface SidebarProps {
  profile: Profile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U'

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-600 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-lg">Life OS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}>
                <item.icon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )} />
                <span className="text-sm font-medium">{item.label}</span>
                {item.href === '/agent' && (
                  <span className="ml-auto text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded-full">
                    AI
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-slate-800">
        <Link href="/settings">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors mb-1">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-purple-700 text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-slate-400 text-xs truncate">
                {profile?.email}
              </p>
            </div>
            <Settings className="w-4 h-4 text-slate-500 flex-shrink-0" />
          </div>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-950/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
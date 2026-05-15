import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Brain, CheckCircle, Zap, Target, BookOpen, Activity } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI Chief of Staff',
    description: 'Your agent reads your data, plans your day, and adjusts when life happens.',
  },
  {
    icon: Target,
    title: 'Goal Breakdown',
    description: 'Input any goal. AI creates a realistic plan with daily micro-tasks.',
  },
  {
    icon: Zap,
    title: 'Morning Briefings',
    description: 'Start each day knowing exactly what matters and why.',
  },
  {
    icon: BookOpen,
    title: 'Weekly Reports',
    description: 'Executive summaries that show real progress and honest insights.',
  },
  {
    icon: Activity,
    title: 'Habit Intelligence',
    description: 'Track habits with streak detection and pattern recognition.',
  },
  {
    icon: CheckCircle,
    title: 'Smart Scheduling',
    description: 'Agent detects conflicts and reschedules tasks automatically.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-600 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Life OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-purple-950/50 border border-purple-500/20 rounded-full px-4 py-2 mb-8">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm">Powered by AI Agent Architecture</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Your AI
            <span className="text-purple-400"> Chief of Staff</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Not another todo app. An intelligent system that actively manages your goals, 
            plans your days, and learns your patterns.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-lg px-8">
                Start for free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-800 text-lg px-8">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-4">
          Everything you need to achieve your goals
        </h2>
        <p className="text-slate-400 text-center mb-12">
          An AI that plans, tracks, and adapts — so you can focus on execution.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="p-6 bg-slate-900 rounded-xl border border-slate-800">
              <div className="p-2 bg-purple-950/50 rounded-lg w-fit mb-4">
                <feature.icon className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to take control of your life?
          </h2>
          <p className="text-slate-400 mb-8">
            Free forever. No credit card. Your AI Chief of Staff is waiting.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-lg px-12">
              Get started free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const features = [
  'AI breaks your goals into daily actions',
  'Morning briefings personalized to you',
  'Weekly executive summaries',
  'Agent that learns your patterns',
]

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    try {

      e.preventDefault()
      setLoading(true)
  
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      })
  
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
  
      toast.success('Account created! Welcome to Life OS.')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.')
      console.error('Signup error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-purple-950 to-slate-900 p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left side - Features */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-purple-600 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Life OS</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Your AI Chief of Staff
          </h1>
          <p className="text-slate-400 mb-8 text-lg">
            Not another todo app. An intelligent system that actively manages your goals, habits, and daily priorities.
          </p>
          <div className="space-y-3">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-purple-400 shrink-0" />
                <span className="text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Form */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-6 lg:hidden">
            <div className="p-2 bg-purple-600 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Life OS</span>
          </div>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Create your account</CardTitle>
              <CardDescription className="text-slate-400">
                Free forever. No credit card required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Alex Johnson"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    minLength={8}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Start for free'
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <p className="text-slate-400 text-sm text-center w-full">
                Already have an account?{' '}
                <Link href="/login" className="text-purple-400 hover:text-purple-300">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
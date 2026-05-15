'use client'

import { useChat } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Brain, Send, User, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const quickPrompts = [
  { label: '🌅 Morning Briefing', prompt: 'Give me my morning briefing for today' },
  { label: '📊 Weekly Summary', prompt: 'Generate my weekly executive summary' },
  { label: '🎯 Check Progress', prompt: 'How am I doing on my goals? What should I focus on?' },
  { label: '⚡ Reschedule', prompt: 'I have an hour free right now. What should I work on?' },
  { label: '📝 Plan My Week', prompt: 'Help me plan the rest of this week based on my goals' },
  { label: '🔍 Find Conflicts', prompt: 'Do I have any scheduling conflicts or overdue tasks?' },
]

export default function AgentPage() {
  const { messages, input, handleInputChange, handleSubmit, status, setInput } = useChat({
    api: '/api/agent',
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  return (
    <div className="flex flex-col h-screen p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-purple-400" />
          AI Agent
        </h1>
        <p className="text-slate-400 mt-1">
          Your personal Chief of Staff. Ask anything — it reads your data and takes action.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="mb-6">
          <p className="text-slate-500 text-sm mb-3 uppercase tracking-wider">Quick actions</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quickPrompts.map((qp) => (
              <button
                key={qp.label}
                onClick={() => setInput(qp.prompt)}
                className="text-left p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg transition-all"
              >
                <span className="text-sm text-white">{qp.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Card className="flex-1 bg-slate-900 border-slate-800 overflow-hidden mb-4">
        <ScrollArea className="h-full p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="p-4 bg-purple-950/30 rounded-full mb-4">
                <Brain className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-white font-medium mb-2">Your AI Chief of Staff is ready</h3>
              <p className="text-slate-400 text-sm max-w-sm">
                I can read your goals, tasks, habits, and journal — then take action.
                Try asking for your morning briefing or weekly summary.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                    message.role === 'user'
                      ? "bg-purple-600 text-white rounded-tr-sm"
                      : "bg-slate-800 text-slate-100 rounded-tl-sm"
                  )}>
                    {message.role === 'assistant' ? (
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {message.parts?.map((part, i) => {
                          if (part.type === 'text') return <span key={i}>{part.text}</span>
                          if (part.type === 'tool-invocation') return (
                            <div key={i} className="mt-2 pt-2 border-t border-slate-700">
                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-purple-400" />
                                Used: {part.toolInvocation.toolName}
                              </div>
                            </div>
                          )
                          return null
                        }) ?? message.content}
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </Card>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask your AI Chief of Staff anything..."
          className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { agentTools } from '@/lib/agent/tools'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent/prompts'
import { createClient } from '@/lib/supabase/server'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages, mode } = await request.json()

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: AGENT_SYSTEM_PROMPT,
    messages,
    tools: agentTools,
    // maxSteps: 10,
    temperature: 0.7,
  })

  return result.toTextStreamResponse();
}
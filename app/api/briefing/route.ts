import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { MORNING_BRIEFING_PROMPT, AGENT_SYSTEM_PROMPT } from '@/lib/agent/prompts'
import { createClient } from '@/lib/supabase/server'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('briefings')
    .select('*')
    .eq('user_id', user.id)
    .eq('briefing_date', today)
    .single()

  if (existing) {
    return Response.json({ briefing: existing.content, cached: true })
  }

  const { text } = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    system: AGENT_SYSTEM_PROMPT,
    prompt: MORNING_BRIEFING_PROMPT,
  })

  await supabase.from('briefings').insert({
    user_id: user.id,
    content: text,
    briefing_date: today,
  })

  return Response.json({ briefing: text, cached: false })
}
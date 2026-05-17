import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json()

  const { data: entry, error: fetchError } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const { data: recentEntries } = await supabase
    .from('journal_entries')
    .select('content, mood, energy_level, entry_date')
    .eq('user_id', user.id)
    .neq('id', id)
    .order('entry_date', { ascending: false })
    .limit(5)

  const recentContext = (recentEntries || [])
    .map(
      (e) =>
        `Date: ${e.entry_date}, Mood: ${e.mood || 'unknown'}, Energy: ${e.energy_level || 'n/a'}\n${e.content}`
    )
    .join('\n\n---\n\n')

  const { text } = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    system: `You are a thoughtful coach analyzing a user's journal entry. 
Be warm, direct, and insightful. Avoid generic advice.
Look for patterns, emotional cues, and meaningful observations.
Keep your response under 150 words.`,
    prompt: `
Analyze this journal entry and give the user:
1. A short observation about their state today (1-2 sentences)
2. One pattern you notice (if any, comparing to recent entries below)
3. One specific, actionable suggestion

Today's entry:
Date: ${entry.entry_date}
Mood: ${entry.mood || 'not specified'}
Energy: ${entry.energy_level || 'not specified'}/10
Content: ${entry.content}

Recent entries for context:
${recentContext || 'No previous entries.'}

Respond in plain text, no markdown headers.
    `,
  })

  await supabase
    .from('journal_entries')
    .update({ ai_insights: text })
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ insights: text })
}
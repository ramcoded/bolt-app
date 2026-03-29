import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

const postSchema = z.object({
  online: z.boolean(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 30 presence updates per minute per user
  if (!await rateLimit(`presence:${user.id}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const raw = await request.json()
  const result = postSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ online: result.data.online, last_seen: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    logError('presence/POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

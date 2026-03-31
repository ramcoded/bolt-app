import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError, logInfo } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const putSchema = z.object({ content: z.string().max(10_000) })

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('user-notes/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabase
    .from('user_notes')
    .select('content, updated_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ content: data?.content ?? '' })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('user-notes/PUT 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.json()
  const result = putSchema.safeParse(raw)
  if (!result.success) return NextResponse.json({ error: 'Invalid content', details: result.error.flatten() }, { status: 400 })
  const { content } = result.data

  const { error } = await supabase
    .from('user_notes')
    .upsert({ user_id: user.id, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) {
    logError('user-notes/PUT', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logError, logInfo } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('profile/avatar/POST 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 10 uploads per hour per user
  if (!await rateLimit(`avatar:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validate MIME type
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 })
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 5 MB.' }, { status: 400 })
  }

  const path  = `${user.id}/avatar.${ext}`
  const bytes = await file.arrayBuffer()

  const admin = getAdmin()

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) {
    logError('profile/avatar/POST', uploadError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)

  // Append cache-buster so the new upload shows immediately
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await admin
    .from('profiles')
    .update({ avatar: avatarUrl })
    .eq('id', user.id)

  if (updateError) {
    logError('profile/avatar/POST', updateError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ avatarUrl })
}

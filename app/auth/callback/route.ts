import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') === 'manager' ? 'manager' : 'employee'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // Ensure profile row exists (needed for Google OAuth users)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let destination: string

  if (!profile) {
    const name = (user.user_metadata?.full_name as string | undefined)
      ?? (user.user_metadata?.name as string | undefined)
      ?? user.email
      ?? 'User'

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let teamId: string | null = null

    if (role === 'manager') {
      // Each new manager gets their own team
      const teamName = `${name.split(' ')[0]}'s Team`
      const { data: team } = await admin
        .from('teams')
        .insert({ name: teamName })
        .select('id')
        .single()
      teamId = team?.id ?? null

      // Set created_by after we know the team id (profile doesn't exist yet so we
      // update created_by after profile creation below)
    }

    await admin.from('profiles').upsert({
      id:      user.id,
      name,
      role,
      avatar:  name.slice(0, 2).toUpperCase(),
      online:  true,
      team_id: teamId,
    })

    // Back-fill created_by now that profile exists
    if (teamId) {
      await admin.from('teams').update({ created_by: user.id }).eq('id', teamId)
    }

    destination = role === 'manager' ? '/manager/dashboard' : '/'
  } else {
    destination = profile.role === 'manager' ? '/manager/dashboard' : '/'
  }

  // Redirect via popup-complete so popup windows can signal the parent and close
  return NextResponse.redirect(
    `${origin}/auth/popup-complete?redirect=${encodeURIComponent(destination)}`
  )
}

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify manager role
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (me?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service role to bypass RLS so offline employees are visible too
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    : supabase

  // All employees
  const { data: employees } = await db
    .from('profiles')
    .select('id, name, avatar, role, department, online, last_seen')
    .eq('role', 'employee')
    .order('name', { ascending: true })

  // Today's time records for all employees
  const today = new Date().toISOString().slice(0, 10)
  const { data: todayRecords } = await supabase
    .from('time_records')
    .select('id, user_id, time_in, time_out, duration')
    .eq('date', today)
    .order('time_in', { ascending: true })

  // All time records (for weekly summary)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: weekRecords } = await supabase
    .from('time_records')
    .select('user_id, duration, date')
    .gte('date', sevenDaysAgo)
    .not('duration', 'is', null)

  const employeeList = (employees ?? []).map((e) => {
    const todayEntry = (todayRecords ?? []).find((r) => r.user_id === e.id)
    const isClockedIn = todayEntry ? todayEntry.time_out === null : false
    const todayMins   = todayEntry?.duration ?? null

    const weekMins = (weekRecords ?? [])
      .filter((r) => r.user_id === e.id)
      .reduce((sum, r) => sum + (r.duration ?? 0), 0)

    return {
      id:          e.id,
      name:        e.name,
      avatar:      e.avatar ?? e.name?.slice(0, 2).toUpperCase() ?? '??',
      department:  e.department ?? null,
      online:      e.online ?? false,
      lastSeen:    e.last_seen ?? null,
      isClockedIn,
      timeIn:      todayEntry?.time_in ?? null,
      timeOut:     todayEntry?.time_out ?? null,
      todayMins,
      weekMins,
    }
  })

  const totalOnline    = employeeList.filter((e) => e.online).length
  const totalClockedIn = employeeList.filter((e) => e.isClockedIn).length
  const totalTodayMins = (todayRecords ?? [])
    .filter((r) => r.duration !== null)
    .reduce((sum, r) => sum + (r.duration ?? 0), 0)
  const totalWeekMins = (weekRecords ?? []).reduce((sum, r) => sum + (r.duration ?? 0), 0)

  return NextResponse.json({
    summary: {
      totalEmployees: employeeList.length,
      totalOnline,
      totalClockedIn,
      totalTodayMins,
      totalWeekMins,
    },
    employees: employeeList,
  })
}

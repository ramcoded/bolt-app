import { format, parse, differenceInMinutes, isToday, isYesterday } from 'date-fns'

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function formatDate(dateStr: string): string {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date())
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, MMM d yyyy')
}

export function formatTime24(date: Date): string {
  return format(date, 'HH:mm:ss')
}

export function minutesUntil(timeStr: string): number {
  const now = new Date()
  const [h, m] = timeStr.split(':').map(Number)
  const target = new Date(now)
  target.setHours(h, m, 0, 0)
  return differenceInMinutes(target, now)
}

export function isWithin30Min(timeStr: string): boolean {
  const mins = minutesUntil(timeStr)
  return mins >= 0 && mins <= 30
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export function getDayName(dateStr: string): string {
  return format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'EEEE')
}

export function getCurrentMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}

export function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// Simple sliding window rate limiter using in-memory Map
// Suitable for single-instance deployments (Vercel serverless: use per-invocation limits)
const requests = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const timestamps = (requests.get(key) ?? []).filter(t => t > windowStart)
  if (timestamps.length >= limit) return false
  timestamps.push(now)
  requests.set(key, timestamps)
  return true
}

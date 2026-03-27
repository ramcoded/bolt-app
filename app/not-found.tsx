import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-white/10 mb-4">404</h1>
      <h2 className="text-xl font-semibold text-white mb-2">Page not found</h2>
      <p className="text-white/40 text-sm mb-6">The page you're looking for doesn't exist.</p>
      <Link href="/" className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--bolt-accent)' }}>
        Go home
      </Link>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="h-8 w-48 rounded-xl bg-white/5 animate-pulse" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 rounded-2xl bg-white/3 animate-pulse" />
      ))}
    </div>
  )
}

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="h-8 w-32 rounded-xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 h-96 rounded-2xl bg-white/3 animate-pulse" />
        <div className="xl:col-span-1 h-96 rounded-2xl bg-white/3 animate-pulse" />
      </div>
    </div>
  )
}

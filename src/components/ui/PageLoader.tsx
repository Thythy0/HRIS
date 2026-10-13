export default function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4" role="status" aria-label="Loading page">
      <div className="w-10 h-10 rounded-xl bg-[#408A71] motion-safe:animate-pulse" aria-hidden />
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );
}

type TopStatusProps = {
  title: string
  subtitle: string
}

const TopStatus = ({ title, subtitle }: TopStatusProps) => (
  <div className="absolute left-6 top-6 z-10 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur">
    <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">{title}</p>
    <p className="mt-1 text-sm text-slate-200">{subtitle}</p>
  </div>
)

export default TopStatus

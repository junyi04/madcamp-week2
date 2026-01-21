type OnboardingOverlayProps = {
  loading: boolean
  onContinue: () => void
}

const OnboardingOverlay = ({ loading, onContinue }: OnboardingOverlayProps) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 text-slate-100 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/70 p-6 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.7)]">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
        Welcome
      </p>
      <h2 className="mt-3 text-2xl font-semibold">Syncing your universe</h2>
      <p className="mt-3 text-sm text-slate-300">
        We are pulling your repositories and building the galaxy in the
        background. You can jump in now or wait until the sync finishes.
      </p>
      <div className="mt-5 flex items-center gap-2 text-xs text-slate-200/80">
        <span
          className={`h-3 w-3 rounded-full border border-cyan-200/30 ${
            loading ? 'animate-spin border-t-cyan-200' : 'bg-cyan-200/80'
          }`}
        />
        {loading ? 'Loading data...' : 'Ready to explore.'}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-6 w-full rounded-xl border border-white/10 bg-gradient-to-r from-cyan-300/90 via-sky-300/90 to-emerald-300/90 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:brightness-110"
      >
        Enter the Galaxy
      </button>
    </div>
  </div>
)

export default OnboardingOverlay

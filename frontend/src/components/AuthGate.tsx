type AuthGateProps = {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  onLogin: () => void
}

const AuthGate = ({ status, message, onLogin }: AuthGateProps) => (
  <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_80%_0%,_rgba(16,185,129,0.18),_transparent_45%),radial-gradient(circle_at_50%_85%,_rgba(250,204,21,0.12),_transparent_50%),linear-gradient(180deg,_#04060d,_#0b1220_60%,_#030508)] px-6 py-16 text-slate-100">
    <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.7)] backdrop-blur">
      <h1 className="text-3xl font-semibold tracking-tight">Galaxy Sync</h1>
      <p className="mt-3 text-sm text-slate-300">
        Connect GitHub to forge your constellation.
      </p>
      <button
        type="button"
        onClick={onLogin}
        className="mt-8 w-full rounded-xl border border-white/10 bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:brightness-110"
      >
        Connect GitHub
      </button>
      <div className="mt-4 text-xs text-slate-400">
        Status: {status}
        {message ? ` - ${message}` : ''}
      </div>
    </div>
  </main>
)

export default AuthGate

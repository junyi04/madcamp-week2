import loginBackground from '../assets/login.png'

type AuthGateProps = {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  onLogin: () => void
}

const AuthGate = ({ status, message, onLogin }: AuthGateProps) => (
  <main
    className="relative min-h-screen overflow-hidden bg-cover bg-center px-6 py-12 text-slate-100"
    style={{ backgroundImage: `url(${loginBackground})` }}
  >
    {/* <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black/80" /> */}

    <div className="absolute bottom-68 left-[63%] z-10 w-full -translate-x-1/2 px-6">
      <div className="mx-auto flex max-w-sm justify-center">
        <button
          type="button"
          onClick={onLogin}
          className="mt-8 w-full rounded-xl border border-white/10 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_-15px_rgba(125,211,252,0.9)] transition hover:brightness-110 hover:bg-white hover:-translate-y-1 hover:scale-[1.03]"
        >
          Connect GitHub
        </button>
      </div>
      <div className="sr-only">
        Status: {status}
        {message ? ` - ${message}` : ''}
      </div>
    </div>
  </main>
)

export default AuthGate

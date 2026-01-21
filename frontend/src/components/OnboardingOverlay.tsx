import mainPreview from '../assets/main.png'
import galaxyPreview from '../assets/galaxy.png'
import friendPreview from '../assets/friend.png'

type OnboardingOverlayProps = {
  loading: boolean
  onContinue: () => void
}

const OnboardingOverlay = ({ loading, onContinue }: OnboardingOverlayProps) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 text-slate-100 backdrop-blur-sm">
    <div className="w-full max-w-6xl rounded-3xl border border-white/10 bg-black/70 p-8 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.7)] md:p-10">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
        Welcome
      </p>
      <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
        Your GitHub Universe
      </h2>
      <p className="mt-3 text-base text-slate-300 md:text-lg">
        Welcome! Here is what you will see when you step in.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <img
            src={mainPreview}
            alt="Main page preview"
            className="aspect-[16/9] w-full rounded-lg border border-white/10 object-cover"
          />
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mt-3">
            Main Page
          </p>
          <h3 className="mt-2 text-xl font-semibold">Universe Overview</h3>
          <p className="mt-3 text-sm text-slate-300 md:text-base">
            See all repos as galaxies, zoom in, and watch activity light up as
            stars.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <img
            src={galaxyPreview}
            alt="Repo galaxy preview"
            className="aspect-[16/9] w-full rounded-lg border border-white/10 object-cover"
          />
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mt-3">
            Repo Galaxy
          </p>
          <h3 className="mt-2 text-xl font-semibold">Commit Stars</h3>
          <p className="mt-3 text-sm text-slate-300 md:text-base">
            Dive into a single repo to explore commits and PRs as a galaxy with color-coded stars.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <img
            src={friendPreview}
            alt="Friends panel preview"
            className="aspect-[16/9] w-full rounded-lg border border-white/10 object-cover"
          />
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mt-3">
            Friends
          </p>
          <h3 className="mt-2 text-xl font-semibold">Shared Skies</h3>
          <p className="mt-3 text-sm text-slate-300 md:text-base">
            Add friends and go explore their galaxies together.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-8 w-full rounded-xl border border-white/10 bg-gradient-to-r from-cyan-300/90 via-sky-300/90 to-emerald-300/90 px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:brightness-110"
      >
        Enter the Galaxy
      </button>
    </div>
  </div>
)

export default OnboardingOverlay

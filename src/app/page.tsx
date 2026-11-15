import { RiskCockpit } from "./risk-cockpit";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col justify-between gap-5 border-b border-slate-800 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
            LocalSentinel / Infrastructure observability
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Infrastructure risk cockpit
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Local-first vulnerability and cloud-health radar. Inventory stays in
            this browser; every alert keeps its official source.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          Static browser runtime
        </div>
      </header>
      <RiskCockpit />
    </main>
  );
}

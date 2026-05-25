export const metadata = {
  title: "Cascais Wingfoil Experiment | Waterman",
  description: "Experimental bay kick-in forecast and condition reporting for Marina de Cascais.",
};

export default function ExperimentLayout({ children }) {
  return (
    <div className="min-h-screen bg-newsprint text-ink">
      <header className="border-b border-ink/15 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50">Experimental</p>
            <h1 className="text-lg font-semibold">Cascais Bay Wingfoil Forecast</h1>
          </div>
          <nav className="flex gap-3 text-sm">
            <a href="/experiment" className="text-ink/70 hover:text-ink">Dashboard</a>
            <a href="/experiment/backtest" className="text-ink/70 hover:text-ink">Backtest</a>
            <a href="/experiment/model-analysis" className="text-ink/70 hover:text-ink">Model skill</a>
            <a href="/experiment/model-analysis-nortada" className="text-ink/70 hover:text-ink">Nortada skill</a>
            <a href="/experiment/admin" className="text-ink/70 hover:text-ink">Admin</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}

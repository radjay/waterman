import Link from "next/link";

const LINKS = [
  { href: "/experiment/backtest", label: "Season backtest" },
  { href: "/experiment/prediction-models", label: "Kick-in models" },
  { href: "/experiment/nowcast-verification", label: "Nowcast check" },
  { href: "/experiment/model-analysis", label: "Forecast skill" },
  { href: "/experiment/model-analysis-nortada", label: "Nortada analysis" },
  { href: "/experiment/wind-model-backtest", label: "Wind backtest" },
  { href: "/experiment/admin", label: "Admin" },
];

export default function ExperimentResearchPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Research</h1>
        <p className="mt-1 text-sm text-ink/50">
          Validation on 2024–2025 summers · ~98% precision on nortada days · 2–3 false alarms per season
        </p>
      </div>

      <ul className="divide-y divide-ink/10 rounded-xl bg-white ring-1 ring-ink/10">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block px-5 py-3.5 text-sm text-ink hover:bg-ink/[0.03]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

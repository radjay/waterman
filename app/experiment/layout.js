import { ExperimentNav } from "../../components/experiment/ExperimentNav.js";

export const metadata = {
  title: "Cascais Bay | Waterman",
  description: "Wingfoil forecast for Marina de Cascais.",
};

export default function ExperimentLayout({ children }) {
  return (
    <div className="min-h-screen bg-newsprint text-ink">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <p className="font-semibold text-ink">Cascais Bay</p>
          <ExperimentNav />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}

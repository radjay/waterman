import { ExperimentShell } from "../../components/experiment/ExperimentShell.js";

export const metadata = {
  title: "Cascais Bay | Waterman",
  description: "Wingfoil forecast for Marina de Cascais.",
};

export default function ExperimentLayout({ children }) {
  return <ExperimentShell>{children}</ExperimentShell>;
}

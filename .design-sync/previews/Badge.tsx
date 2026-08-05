import { Badge } from 'waterman';

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="default">Offshore</Badge>
    <Badge variant="epic">Epic</Badge>
  </div>
);

export const InContext = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="epic">Best of the week</Badge>
    <Badge variant="default">Low tide</Badge>
    <Badge variant="default">Gusty</Badge>
    <Badge variant="default">Cross-onshore</Badge>
  </div>
);

import { Tooltip, Button, Text, ScorePill } from 'waterman';
import { Info, Star, Wind } from 'lucide-react';

// The bubble only appears on hover, which a static capture can never trigger.
// This rule pins the component's own bubble open so the hovered state is
// visible; it changes nothing about how the bubble is styled or positioned.
const ShowTooltips = () => (
  <style>{`.ds-tip-open [role="tooltip"] { opacity: 1; --tw-translate-y: 0px; }`}</style>
);

export const Default = () => (
  <div className="ds-tip-open" style={{ padding: '48px 150px 8px' }}>
    <ShowTooltips />
    <Tooltip content="Measured at the Windguru station on the pier">
      <Button variant="icon" aria-label="About this reading">
        <Info size={16} />
      </Button>
    </Tooltip>
  </div>
);

export const Positions = () => (
  <div
    className="ds-tip-open flex flex-col items-center"
    style={{ padding: '48px 140px', rowGap: '64px' }}
  >
    <ShowTooltips />
    <Tooltip content="High 06:40 · Low 12:55" position="top">
      <Button variant="secondary" size="sm">Top</Button>
    </Tooltip>
    <Tooltip content="Gusting 26 kt" position="bottom">
      <Button variant="secondary" size="sm">Bottom</Button>
    </Tooltip>
    <Tooltip content="Water 17°C" position="left">
      <Button variant="secondary" size="sm">Left</Button>
    </Tooltip>
    <Tooltip content="0.8 m at 6 s" position="right">
      <Button variant="secondary" size="sm">Right</Button>
    </Tooltip>
  </div>
);

export const InToolbar = () => (
  <div className="max-w-xl" style={{ padding: '52px 8px 8px' }}>
    <ShowTooltips />
    <div className="flex items-center gap-3 border border-ink/15 rounded-card bg-newsprint px-4 py-3">
      <Text variant="label">Scheveningen Noord</Text>
      <div className="flex-1" />
      <Tooltip content="Live wind · updated 06:12" className="ds-tip-open">
        <Button variant="icon" aria-label="Live wind">
          <Wind size={16} />
        </Button>
      </Tooltip>
      <Tooltip content="Save to favourites">
        <Button variant="icon" aria-label="Favourite">
          <Star size={16} />
        </Button>
      </Tooltip>
      <ScorePill score={87} sport="wingfoil" size="sm" />
    </div>
  </div>
);

export const Resting = () => (
  <div className="flex items-center gap-3 py-2">
    <Tooltip content="Measured at the Windguru station on the pier">
      <Button variant="icon" aria-label="About this reading">
        <Info size={16} />
      </Button>
    </Tooltip>
    <Text variant="caption">Resting — the bubble stays hidden until the trigger is hovered.</Text>
  </div>
);

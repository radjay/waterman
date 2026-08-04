import { FilterBar, FilterGroup, PillToggle, Button, Heading, Text } from 'waterman';
import { Plus } from 'lucide-react';

const noop = () => {};

// FilterBar restores its collapsed/expanded state from localStorage on mount,
// so each story pins the state it wants to show before the bar mounts.
const pinExpanded = (expanded: boolean) => {
  try {
    window.localStorage.setItem('waterman_filters_expanded', String(expanded));
  } catch {
    /* storage unavailable */
  }
};

// The expanded filter row fades in with a framer-motion enter animation
// (opacity 0 -> 1, 80ms delay). A static capture can fire before that settles
// and catch the row at opacity 0, so the stories pin it to its resting value.
const SettleEnterAnimation = () => (
  <style>{`.ds-filterbar [class~="border-t"] { opacity: 1 !important; }`}</style>
);

const SPORTS = [
  { id: '', label: 'All' },
  { id: 'wingfoil', label: 'Wing' },
  { id: 'kitesurfing', label: 'Kite' },
  { id: 'surfing', label: 'Surf' },
];

const SHOW = [
  { id: 'best', label: 'Best' },
  { id: 'all', label: 'All' },
];

export const Expanded = () => {
  pinExpanded(true);
  return (
    <div className="ds-filterbar w-full max-w-3xl">
      <SettleEnterAnimation />
      <FilterBar activeFilters={['Wing', 'Best']}>
        <FilterGroup label="Sport">
          <PillToggle name="fb-sport" options={SPORTS} value="wingfoil" onChange={noop} />
        </FilterGroup>
        <FilterGroup label="Show">
          <PillToggle name="fb-show" options={SHOW} value="best" onChange={noop} />
        </FilterGroup>
      </FilterBar>
    </div>
  );
};

export const WithActions = () => {
  pinExpanded(true);
  return (
    <div className="ds-filterbar w-full max-w-3xl">
      <SettleEnterAnimation />
      <FilterBar
        activeFilters={['Kite']}
        actions={
          <Button variant="primary" size="sm" icon={Plus}>
            New session
          </Button>
        }
      >
        <FilterGroup label="Sport">
          <PillToggle name="fb-actions-sport" options={SPORTS} value="kitesurfing" onChange={noop} />
        </FilterGroup>
      </FilterBar>
    </div>
  );
};

export const CollapsedOverForecast = () => {
  pinExpanded(false);
  return (
    <div className="ds-filterbar w-full max-w-3xl">
      <SettleEnterAnimation />
      <FilterBar activeFilters={['Surf', 'Best']}>
        <FilterGroup label="Sport">
          <PillToggle name="fb-collapsed-sport" options={SPORTS} value="surfing" onChange={noop} />
        </FilterGroup>
      </FilterBar>
      <div className="pt-2 flex flex-col gap-3">
        <Heading level={3}>Saturday 18 May</Heading>
        <Text variant="muted">Scheveningen Noord · 19 kt NW · 0.8 m · High 06:40 · Low 12:55</Text>
        <Text variant="muted">Wijk aan Zee · 24 kt WSW · 1.1 m · High 07:05 · Low 13:20</Text>
      </div>
    </div>
  );
};

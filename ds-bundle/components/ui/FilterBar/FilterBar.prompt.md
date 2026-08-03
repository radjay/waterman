FilterBar from waterman. Use via `window.Waterman.FilterBar` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

FilterBar — morphing filter container.

Collapsed: a sticky pill that sits inline with date headers
(right-aligned, zero net vertical space via negative margin).
Expanded: morphs into a full-width container with filters inside.
Desktop defaults to expanded; mobile defaults to collapsed.
State is persisted in localStorage across sessions.

Uses layoutId to morph between collapsed/expanded in a single
smooth animation (no two-step jank).

@param {string[]} activeFilters - labels to show when collapsed (e.g. ["Wing", "Best"])

## Props

```ts
interface FilterBarProps {
children?: React.ReactNode; actions: unknown;  /** labels to show when collapsed (e.g. ["Wing", "Best"]) */ activeFilters?: string[]; className?: string;
}
```

## Examples

### Expanded

```jsx
() => {
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
}
```

### WithActions

```jsx
() => {
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
}
```

### CollapsedOverForecast

```jsx
() => {
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
}
```

FilterGroup from waterman. Use via `window.Waterman.FilterGroup` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

FilterGroup — inline label + PillToggle on the same row.
Used for "Sport", "Conditions", etc.

## Props

```ts
interface FilterGroupProps {
label: string; children?: React.ReactNode; className?: string;
}
```

## Examples

### Default

```jsx
() => (
  <FilterGroup label="Sport">
    <PillToggle name="fg-sport" options={SPORTS} value="wingfoil" onChange={noop} />
  </FilterGroup>
)
```

### Stacked

```jsx
() => (
  <div className="flex flex-col gap-3 items-start rounded-xl bg-ink/[0.04] px-4 py-3">
    <FilterGroup label="Sport">
      <PillToggle name="fg-stack-sport" options={SPORTS} value="kitesurfing" onChange={noop} />
    </FilterGroup>
    <FilterGroup label="Conditions">
      <PillToggle name="fg-stack-show" options={SHOW} value="best" onChange={noop} />
    </FilterGroup>
  </div>
)
```

### Inline

```jsx
() => (
  <div className="flex flex-wrap items-center gap-4">
    <FilterGroup label="Sport">
      <PillToggle name="fg-inline-sport" options={SPORTS} value="surfing" onChange={noop} />
    </FilterGroup>
    <div className="w-px h-4 bg-ink/20" />
    <FilterGroup label="Show">
      <Select
        options={[
          { id: 'best', label: 'Best times' },
          { id: 'all', label: 'All times' },
        ]}
        value="best"
        onChange={noop}
      />
    </FilterGroup>
  </div>
)
```

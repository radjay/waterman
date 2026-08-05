ScoreCard from waterman. Use via `window.Waterman.ScoreCard` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

ScoreCard component - card with score-based background tinting and left border.

@param {number} score - Condition score (0-100)
@param {React.ReactNode} children
@param {Function} onClick
@param {string} className - Additional CSS classes

## Props

```ts
interface ScoreCardProps {
 /** Condition score (0-100) */ score: number; children?: React.ReactNode; onClick?: (...args: any[]) => void;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### ScoreTinting

```jsx
() => (
  <div className="flex w-full max-w-md flex-col gap-3">
    <ScoreCard score={94}>
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-ink">Scheveningen Noord</span>
        <ScoreDisplay score={94} size="lg" />
      </div>
      <ConditionLine speed={19} gust={26} direction={315} waveHeight={0.8} wavePeriod={6} sport="wingfoil" />
    </ScoreCard>
    <ScoreCard score={81}>
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-ink">Brouwersdam</span>
        <ScoreDisplay score={81} size="lg" />
      </div>
      <ConditionLine speed={24} gust={31} direction={247} waveHeight={0.5} wavePeriod={5} sport="kitesurfing" />
    </ScoreCard>
    <ScoreCard score={66}>
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-ink">Zandvoort</span>
        <ScoreDisplay score={66} size="lg" />
      </div>
      <ConditionLine speed={15} gust={20} direction={280} waveHeight={0.6} wavePeriod={5} sport="wingfoil" />
    </ScoreCard>
    <ScoreCard score={43}>
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-faded-ink">Ijmuiden</span>
        <span className="font-data text-sm text-ink/40">43</span>
      </div>
      <ConditionLine speed={8} gust={11} direction={160} waveHeight={0.3} wavePeriod={4} sport="wingfoil" />
    </ScoreCard>
  </div>
)
```

### Clickable

```jsx
() => (
  <div className="flex w-full max-w-md flex-col gap-3">
    <ScoreCard score={92} onClick={() => {}}>
      <div className="flex items-center gap-3">
        <SportBadge sport="wingfoil" size={18} className="text-ink/60" />
        <div className="flex-1">
          <div className="font-body text-sm text-ink">Scheveningen Noord</div>
          <ConditionLine speed={21} gust={28} direction={315} waveHeight={0.8} wavePeriod={6} sport="wingfoil" />
        </div>
        <ScoreDisplay score={92} size="lg" />
      </div>
    </ScoreCard>
    <ScoreCard score={77} onClick={() => {}}>
      <div className="flex items-center gap-3">
        <SportBadge sport="kitesurfing" size={18} className="text-ink/60" />
        <div className="flex-1">
          <div className="font-body text-sm text-ink">Brouwersdam</div>
          <ConditionLine speed={24} gust={31} direction={247} waveHeight={0.5} wavePeriod={5} sport="kitesurfing" />
        </div>
        <ScoreDisplay score={77} size="lg" />
      </div>
    </ScoreCard>
  </div>
)
```

### ComingUp

```jsx
() => (
  <div className="flex w-full max-w-md flex-col gap-3">
    <div className="font-headline text-lg text-ink">Coming up</div>
    <ScoreCard score={95} onClick={() => {}}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-body text-sm text-ink">Sat morning · Scheveningen Noord</div>
          <div className="font-data text-xs text-faded-ink">08:00–11:00 · High 06:40 · Low 12:55</div>
        </div>
        <ScoreDisplay score={95} size="lg" />
      </div>
    </ScoreCard>
    <ScoreCard score={72} onClick={() => {}}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-body text-sm text-ink">Sat afternoon · Wijk aan Zee</div>
          <div className="font-data text-xs text-faded-ink">14:00–17:00 · Water 17°C</div>
        </div>
        <ScoreDisplay score={72} size="lg" />
      </div>
    </ScoreCard>
  </div>
)
```

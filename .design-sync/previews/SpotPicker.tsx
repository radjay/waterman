import { SpotPicker } from 'waterman';

// Lives inside a title rather than beside it: dotted underline and a chevron,
// so the heading itself is the control. Sitting outside, it read as a filter
// applied to the page rather than as part of the sentence.
const SPOTS = [
  { _id: 'guincho', name: 'Praia do Guincho' },
  { _id: 'lagoa', name: 'Lagoa da Albufeira' },
  { _id: 'marina', name: 'Marina de Cascais' },
  { _id: 'fonte', name: 'Fonte da Telha' },
];

const noop = () => {};

const Title = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink">
    Next windows
    <span className="text-faded-ink font-normal mx-[0.28em]">at</span>
    {children}
  </h2>
);

export const InATitle = () => (
  <Title>
    <SpotPicker spots={SPOTS} value="__favorites__" onChange={noop} hasFavorites />
  </Title>
);

export const OneSpotSelected = () => (
  <Title>
    <SpotPicker spots={SPOTS} value="marina" onChange={noop} hasFavorites />
  </Title>
);

// Without favourites the default cannot be "my favourites" — it has to ask.
export const NoFavouritesYet = () => (
  <Title>
    <SpotPicker spots={SPOTS} value="__favorites__" onChange={noop} hasFavorites={false} />
  </Title>
);

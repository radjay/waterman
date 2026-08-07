import { Header, Text } from 'waterman';

// Header is a deliberate no-op. The card documents that so the design agent
// does not compose a masthead that no longer exists.
export const Retired = () => (
  <div className="w-full max-w-[520px] rounded-card border border-card bg-surface p-5">
    <Header />
    <Text variant="caption">
      Header returns null. Use TopNav / BottomNav for chrome, PageHeader for
      in-page titles.
    </Text>
  </div>
);

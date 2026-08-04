import { Section, Text, Button, Card } from 'waterman';

export const WithTitle = () => (
  <div className="max-w-lg">
    <Section title="Coming up">
      <Text variant="muted">The next three days that score above your threshold.</Text>
    </Section>
  </div>
);

export const WithAction = () => (
  <div className="max-w-lg">
    <Section title="Session journal" action={<Button variant="ghost" size="sm">See all</Button>}>
      <Card>
        <Text variant="body">2h 15m at Scheveningen Noord</Text>
      </Card>
    </Section>
  </div>
);

export const Divided = () => (
  <div className="max-w-lg">
    <Section title="Tide" divided>
      <Text variant="muted">High 06:40 · Low 12:55 · High 19:10</Text>
    </Section>
  </div>
);

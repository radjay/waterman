import { Button } from 'waterman';
import { Plus, Share2, Trash2, Wind } from 'lucide-react';

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary">Log a session</Button>
    <Button variant="secondary">View forecast</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="danger">Delete spot</Button>
    <Button variant="icon" icon={Share2} />
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary" size="sm">Small</Button>
    <Button variant="primary" size="md">Medium</Button>
    <Button variant="primary" size="lg">Large</Button>
  </div>
);

export const WithIcons = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary" icon={Plus}>Add spot</Button>
    <Button variant="secondary" icon={Wind}>Live wind</Button>
    <Button variant="danger" icon={Trash2}>Remove</Button>
  </div>
);

export const States = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary" loading>Saving</Button>
    <Button variant="primary" disabled>Unavailable</Button>
    <Button variant="secondary" disabled>Disabled</Button>
  </div>
);

export const FullWidth = () => (
  <div className="max-w-sm">
    <Button variant="primary" fullWidth>Continue</Button>
  </div>
);

import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';

// `reason` is required at the type level (SYNTHESIS.md §2.5): an empty state
// that does not say what is missing, why, and when it changes is how a broken
// surface goes on looking healthy. The @ts-expect-error below is the test — it
// fails to compile if the prop ever becomes optional again.
describe('<EmptyState />', () => {
  it('requires a reason at the type level', () => {
    // @ts-expect-error reason is required
    const missing = <EmptyState icon={null} title="No rows" description="Nothing here." />;
    expect(missing).toBeTruthy();
  });

  it('renders the reason under the description', () => {
    render(
      <EmptyState
        icon={<span>icon</span>}
        title="No launches found"
        description="No launches match your filters."
        reason="The launch table is loaded in full; your filters exclude every row. Clearing them restores the list."
      />
    );
    expect(screen.getByText('No launches found')).toBeInTheDocument();
    expect(screen.getByText(/Clearing them restores the list/)).toBeInTheDocument();
  });
});

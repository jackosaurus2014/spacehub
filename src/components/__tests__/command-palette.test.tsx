/**
 * CommandPalette — jsdom behavioral tests.
 *
 * Covers: opening on Ctrl+K, the editable-target guard, directory filtering,
 * Escape/backdrop close, Enter navigation (next/navigation mocked), and the
 * debounced company search.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import CommandPalette from '../CommandPalette';
import { fuzzyScore } from '../CommandPalette';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    push.mockClear();
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ companies: [] }) })
    ) as unknown as typeof fetch;
  });

  function openPalette() {
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    return screen.getByRole('combobox');
  }

  it('renders nothing until the shortcut fires, then opens as a modal dialog with the input focused', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const input = openPalette();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(input).toHaveFocus();
    // Default view shows the hardcoded actions.
    expect(screen.getByText('Next launch')).toBeInTheDocument();
    expect(screen.getByText('Open Space Tycoon')).toBeInTheDocument();
    expect(screen.getByText('M/Th Digest signup')).toBeInTheDocument();
  });

  it('opens on meta+k too (Mac)', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not open when the shortcut fires from an editable element', () => {
    render(
      <div>
        <input aria-label="page field" />
        <CommandPalette />
      </div>
    );
    const field = screen.getByLabelText('page field');
    field.focus();
    fireEvent.keyDown(field, { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters directory entries by query', () => {
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.change(input, { target: { value: 'glossary' } });

    expect(screen.getByText('Glossary')).toBeInTheDocument();
    // A directory entry that does not match the query is filtered out.
    expect(screen.queryByText('Mission Control')).not.toBeInTheDocument();
  });

  it('closes on Escape and restores focus to the previously focused element', () => {
    render(
      <div>
        <button>anchor</button>
        <CommandPalette />
      </div>
    );
    const anchor = screen.getByText('anchor');
    anchor.focus();

    const input = openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(anchor).toHaveFocus();
  });

  it('navigates with Enter to the top match and closes', () => {
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.change(input, { target: { value: 'glossary' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith('/glossary');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('arrow keys move the highlight (aria-activedescendant follows)', () => {
    render(<CommandPalette />);
    const input = openPalette();

    expect(input).toHaveAttribute('aria-activedescendant', 'command-palette-option-0');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', 'command-palette-option-1');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveAttribute('aria-activedescendant', 'command-palette-option-0');
  });

  it('debounces the company search and lists results under a Companies header', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ companies: [{ slug: 'spacex', name: 'SpaceX', ticker: null, sector: 'Launch' }] }),
    });
    render(<CommandPalette />);
    const input = openPalette();

    fireEvent.change(input, { target: { value: 'spacex' } });
    // Debounced: nothing fired synchronously.
    expect(global.fetch).not.toHaveBeenCalled();

    expect(await screen.findByText('SpaceX')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/company-profiles?search=spacex&limit=5'),
      expect.anything()
    );
    expect(screen.getByText('Companies')).toBeInTheDocument();
  });

  it('does not query the company API for single-character queries', () => {
    render(<CommandPalette />);
    const input = openPalette();
    fireEvent.change(input, { target: { value: 'g' } });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('fuzzyScore', () => {
  it('ranks prefix > word start > substring > subsequence > none', () => {
    const prefix = fuzzyScore('glo', 'Glossary');
    const wordStart = fuzzyScore('cost', 'Launch Cost Calculator');
    const substring = fuzzyScore('loss', 'Glossary');
    const subsequence = fuzzyScore('lcc', 'Launch Cost Calculator');
    const none = fuzzyScore('xyz', 'Glossary');
    expect(prefix).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(subsequence);
    expect(subsequence).toBeGreaterThan(none);
    expect(none).toBe(0);
  });
});

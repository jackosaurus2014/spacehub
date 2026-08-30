import { fireEvent, render, screen, within } from '@testing-library/react';
import DataTable, { compareRows, type DataTableColumn } from '../DataTable';

interface Rocket {
  id: string;
  name: string;
  cost: number | null;
}

const rows: Rocket[] = [
  { id: 'f9', name: 'Falcon 9', cost: 67 },
  { id: 'av', name: 'Atlas V', cost: 110 },
  { id: 'el', name: 'Electron', cost: 7 },
  { id: 'xx', name: 'Unpriced', cost: null },
];

const columns: DataTableColumn<Rocket>[] = [
  { key: 'name', header: 'Vehicle' },
  { key: 'cost', header: 'Cost', numeric: true },
];

/** Data rows only — the header row is excluded. */
function bodyRowNames() {
  const table = screen.getByRole('table');
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.querySelectorAll('td')[0]?.textContent);
}

describe('compareRows', () => {
  it('sinks nulls to the bottom in either direction of comparison', () => {
    expect(compareRows(null, 5, true)).toBeGreaterThan(0);
    expect(compareRows(5, null, true)).toBeLessThan(0);
    expect(compareRows(null, null, true)).toBe(0);
  });
  it('compares numerics numerically, not lexically', () => {
    expect(compareRows(9, 100, true)).toBeLessThan(0);
  });
});

describe('<DataTable /> sorting', () => {
  it('renders every row unsorted by default', () => {
    render(<DataTable caption="Rockets" columns={columns} rows={rows} />);
    expect(bodyRowNames()).toEqual(['Falcon 9', 'Atlas V', 'Electron', 'Unpriced']);
  });

  it('sorts ascending on first header click and descending on the second', () => {
    render(<DataTable caption="Rockets" columns={columns} rows={rows} />);
    const header = screen.getByRole('button', { name: /Vehicle/ });

    fireEvent.click(header);
    expect(bodyRowNames()).toEqual(['Atlas V', 'Electron', 'Falcon 9', 'Unpriced']);

    fireEvent.click(header);
    expect(bodyRowNames()).toEqual(['Unpriced', 'Falcon 9', 'Electron', 'Atlas V']);
  });

  it('sorts numeric columns numerically and reports aria-sort', () => {
    render(<DataTable caption="Rockets" columns={columns} rows={rows} />);
    fireEvent.click(screen.getByRole('button', { name: /Cost/ }));
    expect(bodyRowNames()).toEqual(['Electron', 'Falcon 9', 'Atlas V', 'Unpriced']);
    const th = screen.getAllByRole('columnheader')[1];
    expect(th).toHaveAttribute('aria-sort', 'ascending');
  });

  it('honours initialSort', () => {
    render(
      <DataTable caption="Rockets" columns={columns} rows={rows} initialSort={{ key: 'cost', dir: 'desc' }} />
    );
    expect(bodyRowNames()[0]).toBe('Unpriced');
  });
});

describe('<DataTable /> filtering', () => {
  it('filters across every column and shows a reason-bearing empty label', () => {
    render(<DataTable caption="Rockets" columns={columns} rows={rows} filterable emptyLabel="Nothing matches." />);
    const input = screen.getByLabelText('Filter Rockets');
    fireEvent.change(input, { target: { value: 'falcon' } });
    expect(bodyRowNames()).toEqual(['Falcon 9']);

    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getAllByText('Nothing matches.').length).toBeGreaterThan(0);
  });

  it('focuses the filter when "/" is pressed outside a text field', () => {
    render(<DataTable caption="Rockets" columns={columns} rows={rows} filterable />);
    const input = screen.getByLabelText('Filter Rockets');
    expect(document.activeElement).not.toBe(input);
    fireEvent.keyDown(document, { key: '/' });
    expect(document.activeElement).toBe(input);
  });
});

describe('<DataTable /> rowHref keyboard behaviour', () => {
  const renderLinked = () =>
    render(
      <DataTable caption="Rockets" columns={columns} rows={rows} rowHref={(r) => `/rockets/${r.id}`} />
    );

  it('puts a real anchor in the first cell of every row', () => {
    renderLinked();
    const table = screen.getByRole('table');
    const link = within(table).getByRole('link', { name: 'Falcon 9' });
    expect(link).toHaveAttribute('href', '/rockets/f9');
  });

  it('makes rows focusable and moves focus with the arrow keys', () => {
    renderLinked();
    const table = screen.getByRole('table');
    const dataRows = within(table).getAllByRole('row').slice(1);
    dataRows.forEach((r) => expect(r).toHaveAttribute('tabindex', '0'));

    dataRows[0].focus();
    fireEvent.keyDown(dataRows[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(dataRows[1]);

    fireEvent.keyDown(dataRows[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(dataRows[0]);
  });

  it('stops at the ends instead of wrapping', () => {
    renderLinked();
    const table = screen.getByRole('table');
    const dataRows = within(table).getAllByRole('row').slice(1);
    dataRows[0].focus();
    fireEvent.keyDown(dataRows[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(dataRows[0]);
  });

  it('opens the row link on Enter', () => {
    renderLinked();
    const table = screen.getByRole('table');
    const dataRows = within(table).getAllByRole('row').slice(1);
    const anchor = dataRows[1].querySelector('a[data-row-link]') as HTMLAnchorElement;
    const click = jest.spyOn(anchor, 'click').mockImplementation(() => {});

    fireEvent.keyDown(dataRows[1], { key: 'Enter' });
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('opens the row link when the row itself is clicked', () => {
    renderLinked();
    const table = screen.getByRole('table');
    const dataRows = within(table).getAllByRole('row').slice(1);
    const anchor = dataRows[0].querySelector('a[data-row-link]') as HTMLAnchorElement;
    const click = jest.spyOn(anchor, 'click').mockImplementation(() => {});

    fireEvent.click(dataRows[0].querySelectorAll('td')[1]);
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('does not make rows focusable without rowHref', () => {
    render(<DataTable caption="Rockets" columns={columns} rows={rows} />);
    const table = screen.getByRole('table');
    within(table)
      .getAllByRole('row')
      .slice(1)
      .forEach((r) => expect(r).not.toHaveAttribute('tabindex'));
  });
});

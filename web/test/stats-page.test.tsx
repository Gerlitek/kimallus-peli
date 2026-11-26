// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_SUMMARY } from '../src/stats/demo';
import { StatsPage } from '../src/stats/StatsPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StatsPage', () => {
  it('draws the nightly summary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(DEMO_SUMMARY))));
    render(<StatsPage demo={false} />);

    expect(await screen.findByText('pelikertaa')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Suosituimmat klipsit' })).toBeTruthy();
    expect(screen.queryByText(/Esimerkkidataa/)).toBeNull();
  });

  it('says the numbers are on their way when there is no stats.json yet', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })));
    render(<StatsPage demo={false} />);

    expect(await screen.findByText(/Tilastot tulevat näkyviin/)).toBeTruthy();
  });

  it('says the same when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    render(<StatsPage demo={false} />);

    expect(await screen.findByText(/Tilastot tulevat näkyviin/)).toBeTruthy();
  });

  it('marks demo numbers clearly and does not touch the network', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<StatsPage demo />);

    expect(await screen.findByText(/Esimerkkidataa/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
});

import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';

import Perks from '../src/pages/Perks.jsx';
import { renderWithRouter } from './utils/renderWithRouter.js';

describe('Perks page (My Perks)', () => {
  test('shows the perks created by the logged in user', async () => {
    // The global setup seeds one deterministic perk so we can assert against a
    // stable title instead of hoping for whatever happens to be in the live DB.
    const seededPerkTitle = global.__TEST_CONTEXT__.seededPerk.title;

    // Render the page at the /perks route exactly as the router would in the
    // real application. No mocking means we rely on the live HTTP calls.
    renderWithRouter(
      <Routes>
        <Route path="/perks" element={<Perks />} />
      </Routes>,
      { initialEntries: ['/perks'] }
    );

    // The component fetches data on mount, so wait for the expected perk to be
    // painted before asserting to avoid race conditions in CI.
    await waitFor(() => {
      expect(screen.getByText(seededPerkTitle)).toBeInTheDocument();
    });

    // The empty-state message should not appear so long as at least one perk is
    // tied to this user.
    expect(screen.queryByText('No perks found.')).not.toBeInTheDocument();
  });
});

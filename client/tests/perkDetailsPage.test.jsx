import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';

import PerkDetails from '../src/pages/PerkDetails.jsx';
import { renderWithRouter } from './utils/renderWithRouter.js';

describe('PerkDetails page', () => {
  test('renders the full perk details for a valid id', async () => {
    // Create a dedicated perk solely for this assertion so the route has a
    // predictable record to fetch.
    const response = await global.__TEST_CONTEXT__.api.post('/perks', {
      title: `Detail Page Perk ${Date.now()}`,
      description: 'Detail page integration test perk.',
      category: 'fitness',
      merchant: 'Detail Merchant',
      discountPercent: 12
    });

    const perk = response.data.perk;

    if (perk?._id) {
      global.__TEST_CONTEXT__.createdPerkIds.add(perk._id);
    }

    // Drive the component through the same route structure used in the real
    // app (perks/:perkId/view) without any stubbing.
    renderWithRouter(
      <Routes>
        <Route path="/perks/:perkId/view" element={<PerkDetails />} />
      </Routes>,
      { initialEntries: [`/perks/${perk._id}/view`] }
    );

    // Wait for the asynchronous fetch to complete and render the dynamic data.
    await waitFor(() => {
      expect(screen.getByText(perk.title)).toBeInTheDocument();
    });

    // Verify multiple fields to ensure the payload shape is honoured.
    expect(screen.getByText(`Discount: ${perk.discountPercent}%`)).toBeInTheDocument();
    expect(screen.getByText(/fitness/i)).toBeInTheDocument();
  });
});

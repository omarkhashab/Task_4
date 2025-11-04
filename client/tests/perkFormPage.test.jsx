import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';

import PerkForm from '../src/pages/PerkForm.jsx';
import { renderWithRouter } from './utils/renderWithRouter.js';

describe('PerkForm page (Create Perk)', () => {
  test('submits a brand new perk and redirects back to the list', async () => {
    // Timestamped label keeps this test isolated from previous executions in the
    // shared live database.
    const uniqueLabel = `Created Via Form ${Date.now()}`;

    // Supply the real route configuration so useNavigate performs a genuine
    // redirect rather than being mocked.
    renderWithRouter(
      <Routes>
        <Route path="/perks/create" element={<PerkForm />} />
        <Route path="/perks" element={<div data-testid="perks-landing">Redirected</div>} />
      </Routes>,
      { initialEntries: ['/perks/create'] }
    );

    // Fill out every required field of the form exactly as a user would in the
    // browser to ensure the controller receives a realistic payload.
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: uniqueLabel } });
    fireEvent.change(screen.getByPlaceholderText('Merchant'), { target: { value: 'Form Merchant' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tech' } });
    fireEvent.change(screen.getByPlaceholderText('Discount %'), { target: { value: '30' } });
    fireEvent.change(screen.getByPlaceholderText('Description'), { target: { value: 'Created from the create perk page test.' } });

    // Submitting should call the live API and then navigate back to /perks on
    // success.
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId('perks-landing')).toBeInTheDocument();
    });

    // Confirm the record genuinely exists in the backend by querying through
    // the shared axios instance.
    const perksResponse = await global.__TEST_CONTEXT__.api.get('/perks');
    const createdPerk = perksResponse.data.perks.find((perk) => perk.title === uniqueLabel);

    expect(createdPerk).toBeTruthy();

    if (createdPerk?._id) {
      global.__TEST_CONTEXT__.createdPerkIds.add(createdPerk._id);
    }
  });
});

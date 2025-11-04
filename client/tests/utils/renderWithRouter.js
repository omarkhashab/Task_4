import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Thin wrapper to keep the test bodies focused on assertions rather than the
// mechanics of wiring up MemoryRouter over and over again.
export function renderWithRouter(children, { initialEntries = ['/'] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );
}

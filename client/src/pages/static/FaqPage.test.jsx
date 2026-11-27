import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import FaqPage from './FaqPage';
import { HelmetProvider } from 'react-helmet-async';

const renderFaq = (path = '/faq') => render(
  <HelmetProvider>
    <MemoryRouter initialEntries={[path]}><FaqPage /></MemoryRouter>
  </HelmetProvider>
);
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

describe('FAQ page', () => {
  test('shows collapsible questions closed by default', () => {
    const { container } = renderFaq();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const details = container.querySelectorAll('details');
    expect(details.length).toBeGreaterThan(0);
    details.forEach((d) => expect(d.open).toBe(false));
  });
  test('question link opens and scrolls', async () => {
    const { container } = renderFaq('/faq#delivery-time');
    await waitFor(() => expect(container.querySelector('#delivery-time').open).toBe(true));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});

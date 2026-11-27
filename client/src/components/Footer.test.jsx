import { afterEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import Footer from './Footer';
import { STORE } from '../config/store';

const renderFooter = () => render(<MemoryRouter><Footer /></MemoryRouter>);
afterEach(cleanup);

describe('Footer', () => {
  test.each([['FAQ', '/faq'], ['Shipping and delivery', '/shipping'], ['About us', '/about'], ['All products', '/products']])('links %s to %s', (name, href) => {
    renderFooter();
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
  });
  test('shows store contact details', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: STORE.email })).toHaveAttribute('href', `mailto:${STORE.email}`);
  });
  test('groups links into labelled areas', () => {
    renderFooter();
    for (const name of ['Shop', 'Help', 'Company']) expect(screen.getByRole('navigation', { name })).toBeInTheDocument();
  });
  test('the year is current', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2031-06-15T00:00:00Z'));
    renderFooter();
    expect(screen.getByText(/© 2031/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});

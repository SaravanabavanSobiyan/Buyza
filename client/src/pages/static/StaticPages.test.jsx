import { afterEach, describe, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import StaticPage from './StaticPage';
import { PAGES } from '../../config/pages';
import { STORE } from '../../config/store';
import { HelmetProvider } from 'react-helmet-async';
import { waitFor } from '@testing-library/react';

const renderPage = (key) => render(
  <HelmetProvider>
    <MemoryRouter><StaticPage pageKey={key} /></MemoryRouter>
  </HelmetProvider>
);
afterEach(cleanup);

describe.each(Object.entries(PAGES))('%s page', (key, page) => {
  test('has one h1 and one h2 per section', () => {
    renderPage(key);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(page.sections.length);
  });
  test('sets title and has no placeholders', async () => {
    const { container } = renderPage(key);
    await waitFor(() => expect(document.title).toContain(STORE.name));
    expect(container.textContent).not.toMatch(/\{\{|\*\*|\]\(/);
  });
  test('links every section by id', () => {
    const { container } = renderPage(key);
    for (const section of page.sections) {
      expect(container.querySelector(`#${section.id}`)).not.toBeNull();
    }
  });
});

describe('unknown pages', () => {
  test.each(['nope', 'constructor', '__proto__', undefined])('%s shows 404', (key) => {
    renderPage(key);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });
});

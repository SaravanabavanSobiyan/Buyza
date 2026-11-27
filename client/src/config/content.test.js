import { describe, expect, test } from 'vitest';
import { PAGES } from './pages';
import { FAQ } from './faq';
import { CONTENT_VARS } from './contentVars';
import { SHIPPING_ZONES } from './policies';
import { fill } from '../utils/inline';
import { PROVINCES } from '../utils/provinces';

const strings = (value) => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
const ALL = [...strings(PAGES), ...strings(FAQ)];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KNOWN_PATHS = new Set(['/', '/products', '/cart', '/checkout', '/contact', '/login', '/register', '/forgot-password', '/orders', '/wishlist', '/faq', ...Object.values(PAGES).map((p) => p.path)]);
const ANCHORS = {
  '/faq': new Set(FAQ.groups.flatMap((g) => [g.id, ...g.items.map((i) => i.id)])),
  ...Object.fromEntries(Object.values(PAGES).map((p) => [p.path, new Set(p.sections.map((s) => s.id))]))
};

describe('content', () => {
  test('every placeholder has a value and content has no raw HTML', () => {
    for (const text of ALL) {
      expect(fill(text, CONTENT_VARS), text).not.toMatch(/\{\{/);
      expect(text).not.toMatch(/<[a-z!/]/i);
    }
  });
  test('page ids, descriptions and links are valid', () => {
    for (const [key, page] of Object.entries(PAGES)) {
      expect(page.path).toBe(`/${key}`);
      expect(page.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const description = fill(page.description, CONTENT_VARS);
      expect(description.length).toBeGreaterThanOrEqual(50);
      expect(description.length).toBeLessThanOrEqual(160);
      const ids = page.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id) => expect(id).toMatch(ID));
    }
  });
  test('all internal links point to known pages and anchors', () => {
    const pattern = /\]\((\/[^)\s#]*)(#[^)\s]*)?\)/g;
    for (const text of ALL) for (const [, path, hash] of text.matchAll(pattern)) {
      expect(KNOWN_PATHS.has(path), `Unknown page "${path}" in: ${text}`).toBe(true);
      if (hash) expect(ANCHORS[path]?.has(hash.slice(1)), `Unknown section "${path}${hash}"`).toBe(true);
    }
  });
  test('shipping zones cover every province exactly once', () => {
    const listed = SHIPPING_ZONES.flatMap((z) => z.provinces.split(',').map((p) => p.trim()));
    expect([...listed].sort()).toEqual([...PROVINCES].sort());
  });
});

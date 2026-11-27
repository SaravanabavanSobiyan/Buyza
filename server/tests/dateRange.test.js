import { addDays, dayCount, eachDay, isRealDate, resolveRange, todayColombo } from '../src/utils/dateRange.js';

test('addDays crosses months, years and leap days', () => {
  expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
});

test('isRealDate rejects impossible days and wrong shapes', () => {
  expect(isRealDate('2024-02-29')).toBe(true);
  expect(isRealDate('2026-02-29')).toBe(false);
  expect(isRealDate('2026-02-31')).toBe(false);
  expect(isRealDate('2026-13-01')).toBe(false);
  expect(isRealDate('yesterday')).toBe(false);
  expect(isRealDate('2026-1-5')).toBe(false);
});

test('dayCount and eachDay are inclusive', () => {
  expect(dayCount('2026-01-01', '2026-01-10')).toBe(10);
  expect(dayCount('2026-01-05', '2026-01-05')).toBe(1);
  expect(eachDay('2025-12-30', '2026-01-02')).toEqual(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
});

test('resolveRange builds the range and previous period in Sri Lanka time', () => {
  const r = resolveRange({ from: '2026-01-01', to: '2026-01-10' });
  expect(r).toMatchObject({ from: '2026-01-01', to: '2026-01-10', days: 10 });
  expect(r.prev).toMatchObject({ from: '2025-12-22', to: '2025-12-31' });
  expect(r.start.toISOString()).toBe('2025-12-31T18:30:00.000Z');
  expect(r.end.toISOString()).toBe('2026-01-10T18:29:59.999Z');
});

test('with no dates it is the last 30 days ending today', () => {
  const r = resolveRange();
  expect(r.to).toBe(todayColombo());
  expect(r.days).toBe(30);
  expect(r.prev.to).toBe(addDays(r.from, -1));
});

test('rejects reversed ranges and ranges longer than 366 days', () => {
  expect(() => resolveRange({ from: '2026-02-01', to: '2026-01-01' })).toThrow(/before/);
  expect(() => resolveRange({ from: '2025-01-01', to: '2026-01-10' })).toThrow(/366/);
  expect(resolveRange({ from: '2025-01-10', to: '2026-01-10' }).days).toBe(366);
});

import { ApiError } from './ApiError.js';

export const COLOMBO_OFFSET = '+05:30';
const COLOMBO_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_RANGE_DAYS = 366;

const toUtc = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const todayColombo = () => new Date(Date.now() + COLOMBO_MS).toISOString().slice(0, 10);
export const addDays = (ymd, n) => new Date(toUtc(ymd) + n * DAY_MS).toISOString().slice(0, 10);
export const isRealDate = (ymd) => /^\d{4}-\d{2}-\d{2}$/.test(ymd) && addDays(ymd, 0) === ymd;
export const dayCount = (from, to) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1;
export const eachDay = (from, to) => Array.from({ length: dayCount(from, to) }, (_, i) => addDays(from, i));
export const startOfDay = (ymd) => new Date(`${ymd}T00:00:00.000${COLOMBO_OFFSET}`);
export const endOfDay = (ymd) => new Date(`${ymd}T23:59:59.999${COLOMBO_OFFSET}`);

export const resolveRange = ({ from, to } = {}) => {
  const end = to || todayColombo();
  const start = from || addDays(end, -29);

  if (!isRealDate(start) || !isRealDate(end)) throw new ApiError(400, 'Invalid date');
  if (start > end) throw new ApiError(400, '"From" date must be before "To" date');
  const days = dayCount(start, end);
  if (days > MAX_RANGE_DAYS) throw new ApiError(400, `Date range can be at most ${MAX_RANGE_DAYS} days`);

  const prevTo = addDays(start, -1);
  const prevFrom = addDays(prevTo, -(days - 1));

  return {
    from: start,
    to: end,
    days,
    start: startOfDay(start),
    end: endOfDay(end),
    prev: { from: prevFrom, to: prevTo, start: startOfDay(prevFrom), end: endOfDay(prevTo) },
  };
};

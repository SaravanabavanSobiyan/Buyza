const COLOMBO_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const toUtc = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const todayColombo = () => new Date(Date.now() + COLOMBO_MS).toISOString().slice(0, 10);
export const addDays = (ymd, n) => new Date(toUtc(ymd) + n * DAY_MS).toISOString().slice(0, 10);
export const isYmd = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && addDays(v, 0) === v;
export const daysInRange = (from, to) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1;

const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const long = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const formatDay = (ymd) => short.format(new Date(`${ymd}T00:00:00Z`));
export const formatDayLong = (ymd) => long.format(new Date(`${ymd}T00:00:00Z`));

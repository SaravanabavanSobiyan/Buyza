const fmt = new Intl.NumberFormat('en-LK', { notation: 'compact', maximumFractionDigits: 1 });
export const formatCompact = (n) => fmt.format(n ?? 0);

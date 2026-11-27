import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addDays, daysInRange, isYmd, todayColombo } from '../utils/dates';

export default function useDashboardRange() {
  const [params, setParams] = useSearchParams();
  const today = todayColombo();
  let to = params.get('to');
  let from = params.get('from');
  const valid = isYmd(from) && isYmd(to) && from <= to && daysInRange(from, to) <= 366;
  if (!valid) {
    to = today;
    from = addDays(today, -29);
  }
  const setRange = useCallback(
    (nextFrom, nextTo) => setParams({ from: nextFrom, to: nextTo }, { replace: true }),
    [setParams]
  );
  return { from, to, days: daysInRange(from, to), setRange };
}

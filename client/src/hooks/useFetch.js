import { useEffect, useState } from 'react';

export default function useFetch(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' })); // eslint-disable-line react-hooks/set-state-in-effect
    fn()
      .then((data) => alive && setState({ data, loading: false, error: '' }))
      .catch((e) =>
        alive &&
        setState({ data: null, loading: false, error: e.response?.data?.message || 'Could not load this section' })
      );
    return () => { alive = false; };
  }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, retry: () => setTick((t) => t + 1) };
}

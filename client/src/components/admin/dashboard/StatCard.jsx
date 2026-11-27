import { Link } from 'react-router-dom';

function Delta({ pct, value }) {
  if (pct == null) return value > 0 ? <span className="text-xs text-gray-500">New</span> : <span className="text-xs text-gray-400">-</span>;
  const color = pct === 0 ? 'text-gray-500' : pct > 0 ? 'text-green-600' : 'text-red-600';
  const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '';
  return <span className={`text-xs font-medium ${color}`}>{arrow} {Math.abs(pct)}%</span>;
}

export default function StatCard({ label, state, pick, format, caption, hint, to = null }) {
  const { data, error, retry } = state;
  const body = data && pick(data);
  const inner = (
    <>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      {error ? (
        <p className="mt-2 text-sm text-red-600">Failed. <button onClick={retry} className="underline">Retry</button></p>
      ) : !data ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
      ) : (
        <>
          <p className="mt-1 break-words text-xl font-semibold leading-tight sm:text-2xl">{format(body.value)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            {body.changePct !== undefined && <Delta pct={body.changePct} value={body.value} />}
            {caption && <span className="text-xs text-gray-400">{caption(data)}</span>}
          </p>
          {hint && <p className="mt-1 text-xs text-gray-500">{hint(data)}</p>}
        </>
      )}
    </>
  );
  const cls = 'block min-w-0 overflow-hidden rounded-xl border bg-white p-3 sm:p-4';
  return to && data ? <Link to={to} className={`${cls} hover:shadow-md`}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

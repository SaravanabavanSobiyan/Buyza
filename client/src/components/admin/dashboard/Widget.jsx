export default function Widget({ title, action = null, state, isEmpty = () => false, emptyText = 'Nothing to show yet.', skeleton = 'h-48', className = '', children }) {
  const { data, loading, error, retry } = state;
  return (
    <section className={`min-w-0 overflow-hidden rounded-xl border bg-white p-3 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{title}</h2>{action}</div>
      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error} <button onClick={retry} className="font-medium underline">Try again</button>
        </div>
      ) : !data ? (
        <div className={`${skeleton} animate-pulse rounded bg-gray-200`} />
      ) : isEmpty(data) ? (
        <p className="py-10 text-center text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className={loading ? 'opacity-60' : ''}>{children(data)}</div>
      )}
    </section>
  );
}

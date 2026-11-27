export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-gray-200 motion-reduce:animate-none ${className}`}
    />
  );
}

export function TextSkeleton({ lines = 3, className = "" }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border bg-white">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 8,
  className = "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading products...</span>
      <div className={className}>
        {Array.from({ length: count }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="overflow-hidden rounded-xl border bg-white">
      <span className="sr-only">Loading...</span>
      <div aria-hidden="true" className="divide-y">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="mx-auto max-w-6xl px-4 py-10">
      <span className="sr-only">Loading page...</span>
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

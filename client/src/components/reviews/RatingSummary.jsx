import StarRating from "./StarRating";

export default function RatingSummary({ summary }) {
  const { average = 0, count = 0, breakdown = {} } = summary || {};

  if (count === 0) {
    return <p className="text-gray-500">No reviews yet. Be the first to share your thoughts.</p>;
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="text-center sm:min-w-36">
        <p className="text-5xl font-semibold">{Number(average).toFixed(1)}</p>
        <StarRating value={average} size={20} className="mt-1" />
        <p className="mt-1 text-sm text-gray-500">
          {count} review{count === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = breakdown[star] || 0;
          const pct = count ? Math.round((n / count) * 100) : 0;
          return (
            <li key={star} className="flex items-center gap-2 text-sm">
              <span className="w-10 text-gray-600">{star} ★</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200" role="img" aria-label={`${pct}% gave ${star} stars`}>
                <div className="h-full bg-yellow-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-gray-500">{n}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

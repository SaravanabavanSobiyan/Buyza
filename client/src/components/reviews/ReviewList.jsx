import Pagination from "../Pagination";
import ReviewCard from "./ReviewCard";

export default function ReviewList({ data, loading, error, sort, onSortChange, onPageChange, onRetry }) {
  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}{" "}
        <button onClick={onRetry} className="font-medium underline">
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-28 rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (data.total === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Customer reviews ({data.total})</h3>
        <label className="text-sm">
          <span className="mr-2 text-gray-600">Sort by</span>
          <select value={sort} onChange={(e) => onSortChange(e.target.value)} className="rounded-lg border px-2 py-1">
            <option value="newest">Newest</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </label>
      </div>

      <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
        {data.reviews.map((r) => (
          <ReviewCard key={r._id} review={r} />
        ))}
      </div>

      <Pagination page={data.page} pages={data.totalPages} onChange={onPageChange} />
    </div>
  );
}

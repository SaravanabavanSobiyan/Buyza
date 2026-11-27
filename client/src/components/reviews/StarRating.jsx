import { StarSvg } from "./StarInput";

export default function StarRating({ value = 0, count, size = 18, className = "" }) {
  const rating = Math.min(5, Math.max(0, Number(value) || 0));

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="inline-flex" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.min(1, Math.max(0, rating - star + 1));
          return (
            <span key={star} className="relative inline-flex">
              <StarSvg size={size} className="text-gray-300" />
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <StarSvg size={size} className="text-yellow-400" />
              </span>
            </span>
          );
        })}
      </span>
      {count !== undefined && (
        <span className="text-sm text-gray-600">
          {rating.toFixed(1)} ({count})
        </span>
      )}
    </span>
  );
}

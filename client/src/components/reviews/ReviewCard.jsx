import { useEffect, useState } from "react";
import { formatDate } from "../../utils/format";
import StarRating from "./StarRating";

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <button onClick={onClose} aria-label="Close photo" className="absolute right-4 top-4 text-4xl leading-none text-white">
        &times;
      </button>
      <img src={src} alt="Review photo" className="max-h-full max-w-full rounded" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

export default function ReviewCard({ review, actions = null }) {
  const [photo, setPhoto] = useState(null);

  return (
    <article className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <StarRating value={review.rating} />
        <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
      </div>

      {review.title && <h3 className="mt-2 font-semibold">{review.title}</h3>}
      <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{review.body}</p>

      {review.photos?.length > 0 && (
        <div className="mt-3 flex gap-2">
          {review.photos.map((p) => (
            <button key={p.url} type="button" onClick={() => setPhoto(p.url)} aria-label="View photo">
              <img src={p.url} alt="Review" className="h-16 w-16 rounded object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          {review.author}
          {review.verified && <span className="ml-2 rounded bg-green-100 px-2 py-0.5 font-medium text-green-700">Verified purchase</span>}
        </span>
        {actions}
      </div>

      {photo && <Lightbox src={photo} onClose={() => setPhoto(null)} />}
    </article>
  );
}

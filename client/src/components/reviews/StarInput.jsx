import { useRef, useState } from "react";

export const StarSvg = ({ size = 18, className = "" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`} fill="currentColor" aria-hidden="true">
    <path d="M12 2.5l2.94 6.1 6.56.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6-4.8-4.6 6.56-.9L12 2.5z" />
  </svg>
);

export default function StarInput({ value = 0, onChange, disabled = false, size = 18 }) {
  const [hover, setHover] = useState(0);
  const refs = useRef([]);
  const shown = hover || value;

  const move = (rating) => {
    if (disabled) return;
    onChange(rating);
    refs.current[rating - 1]?.focus();
  };

  const onKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      move(Math.min(5, (value || 0) + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      move(Math.max(1, (value || 2) - 1));
    }
  };

  return (
    <div role="radiogroup" aria-label="Your rating" className="inline-flex gap-1" onKeyDown={onKeyDown} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          ref={(element) => (refs.current[rating - 1] = element)}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${rating} star${rating > 1 ? "s" : ""}`}
          tabIndex={value === rating || (!value && rating === 1) ? 0 : -1}
          disabled={disabled}
          onClick={() => move(rating)}
          onMouseEnter={() => setHover(rating)}
          className="rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
        >
          <StarSvg size={size} className={rating <= shown ? "text-yellow-400" : "text-gray-300"} />
        </button>
      ))}
    </div>
  );
}

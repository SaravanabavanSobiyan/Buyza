import { useRef, useState } from "react";
import ResponsiveImage from "./common/ResponsiveImage";

export default function ImageGallery({ images, alt }) {
  const [index, setIndex] = useState(0);
  const galleryRef = useRef(null);
  const touchStart = useRef(null);
  const normalizedImages = (images || []).map((image) =>
    typeof image === "string" ? image : image?.url || image?.src || ""
  ).filter(Boolean);

  if (normalizedImages.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-400">
        No image
      </div>
    );
  }

  const active = Math.min(index, normalizedImages.length - 1);

  const moveTo = (nextIndex) => {
    const next = (nextIndex + normalizedImages.length) % normalizedImages.length;
    setIndex(next);
    if (typeof galleryRef.current?.scrollTo === "function") {
      galleryRef.current.scrollTo({ left: galleryRef.current.clientWidth * next, behavior: "smooth" });
    }
  };

  return (
    <div>
      <div
        ref={galleryRef}
        role="region"
        aria-label="Product images"
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") moveTo(active + 1);
          if (event.key === "ArrowLeft") moveTo(active - 1);
        }}
        onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
        onTouchEnd={(event) => {
          if (touchStart.current == null) return;
          const distance = event.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(distance) > 40) moveTo(active + (distance < 0 ? 1 : -1));
          touchStart.current = null;
        }}
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth;
          if (width > 0) setIndex(Math.round(event.currentTarget.scrollLeft / width));
        }}
        className="product-image-track flex aspect-square snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-xl border border-gray-200 bg-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        style={{ scrollbarWidth: "none", touchAction: "pan-y" }}
      >
        {normalizedImages.map((url, imageIndex) => (
          <div key={`${imageIndex}-${url}`} className="h-full w-full shrink-0 snap-center">
            <ResponsiveImage
              src={url}
              alt={imageIndex === active ? alt : ""}
              className="h-full w-full object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
              width={960}
              height={960}
              loading={imageIndex === 0 ? "eager" : "lazy"}
              fetchPriority={imageIndex === 0 ? "high" : "auto"}
            />
          </div>
        ))}
      </div>
      {normalizedImages.length > 1 && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 sm:hidden">
          <button type="button" onClick={() => moveTo(active - 1)} className="tap inline-flex items-center justify-center rounded-lg border px-3" aria-label="Previous product image">
            Previous
          </button>
          <span aria-live="polite">Image {active + 1} of {normalizedImages.length}</span>
          <button type="button" onClick={() => moveTo(active + 1)} className="tap inline-flex items-center justify-center rounded-lg border px-3" aria-label="Next product image">
            Next
          </button>
        </div>
      )}
      {normalizedImages.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {normalizedImages.map((url, imageIndex) => (
            <button
              key={`${imageIndex}-${url}`}
              type="button"
              onClick={() => moveTo(imageIndex)}
              aria-label={`Show image ${imageIndex + 1}`}
              aria-current={imageIndex === active}
              className={`h-16 w-16 overflow-hidden rounded-lg border bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                imageIndex === active ? "border-gray-900" : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <ResponsiveImage src={url} alt="" className="h-full w-full object-cover" sizes="64px" width={64} height={64} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

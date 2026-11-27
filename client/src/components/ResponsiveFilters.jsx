import { useEffect, useState } from "react";
import useMediaQuery from "../hooks/useMediaQuery";
import Sheet from "./common/Sheet";

export default function ResponsiveFilters({ activeFilterCount, resultCount, children }) {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const content = (mobile) =>
    typeof children === "function" ? children({ mobile }) : children;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event) => {
      if (event.matches) setOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  if (desktop) {
    return <aside aria-label="Product filters">{content(false)}</aside>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="tap inline-flex items-center justify-center justify-self-start rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 lg:hidden"
      >
        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        side="bottom"
        className="lg:hidden"
        footer={
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 w-full rounded-lg bg-[#46382f] px-4 font-medium text-white">
            {Number.isFinite(resultCount)
              ? `Show ${resultCount} ${resultCount === 1 ? "result" : "results"}`
              : "Done"}
          </button>
        }
      >
        {content(true)}
      </Sheet>
    </>
  );
}

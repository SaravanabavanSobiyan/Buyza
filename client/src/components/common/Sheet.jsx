import { useEffect, useId, useRef } from "react";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function Sheet({
  open,
  onClose,
  title,
  side = "right",
  children,
  footer,
  className = "",
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previousFocus = useRef(null);
  const onCloseRef = useRef(onClose);
  useLockBodyScroll(open);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    panelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const position = side === "bottom"
    ? "inset-x-0 bottom-0 max-h-[90dvh] w-full rounded-t-2xl sheet-bottom"
    : `inset-y-0 ${side === "left" ? "left-0 sheet-left" : "right-0 sheet-right"} h-full w-full max-w-md`;

  return (
    <div className="fixed inset-0 z-50" data-testid="sheet">
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="sheet-overlay absolute inset-0 h-full w-full bg-black/40"
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute flex flex-col overflow-hidden bg-white shadow-xl outline-none ${position} ${side === "bottom" ? "pb-[env(safe-area-inset-bottom)]" : "pt-[env(safe-area-inset-top)]"} ${className}`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="tap inline-flex items-center justify-center rounded-full text-2xl leading-none text-gray-600 hover:bg-gray-100">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">{children}</div>
        {footer && <footer className="shrink-0 border-t border-gray-200 p-4">{footer}</footer>}
      </section>
    </div>
  );
}

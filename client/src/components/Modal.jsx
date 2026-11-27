import { useEffect } from "react";

export default function Modal({ title, onClose, wide = false, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-lg ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <h3 className="text-lg font-medium">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

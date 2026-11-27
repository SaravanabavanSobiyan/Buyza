import { useEffect, useRef, useState } from "react";

export default function OrderActionDialog({
  title,
  description,
  confirmLabel,
  danger = false,
  noteLabel,
  noteRequired = false,
  onConfirm,
  onClose,
}) {
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const noteRef = useRef(null);

  useEffect(() => {
    noteRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && !working && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, working]);

  const tooShort = noteRequired && note.trim().length < 3;
  const submit = async (event) => {
    event.preventDefault();
    if (working || tooShort) return;
    setWorking(true);
    try {
      await onConfirm(note.trim() || undefined);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="absolute inset-0 bg-black/40" onClick={() => !working && onClose()} />
      <form onSubmit={submit} className="relative w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h2 id="dialog-title" className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-gray-600">{description}</p>}
        {noteLabel && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              {noteLabel} {!noteRequired && <span className="font-normal text-gray-400">(optional)</span>}
            </span>
            <textarea
              ref={noteRef}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              rows={3}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={working} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Go back</button>
          <button
            type="submit"
            disabled={working || tooShort}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            {working ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

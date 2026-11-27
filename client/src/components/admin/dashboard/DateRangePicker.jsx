import { useEffect, useState } from 'react';
import { addDays, daysInRange, todayColombo } from '../../../utils/dates';

const PRESETS = [7, 30, 90];

export default function DateRangePicker({ from, to, onChange }) {
  const today = todayColombo();
  const days = daysInRange(from, to);
  const activePreset = PRESETS.find((n) => to === today && days === n);
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState({ from, to });
  const [error, setError] = useState('');

  useEffect(() => {
    // Sync the custom form with URL range changes.
    setDraft({ from, to }); // eslint-disable-line react-hooks/set-state-in-effect
  }, [from, to]);

  const pickPreset = (n) => {
    setCustom(false);
    setError('');
    onChange(addDays(today, -(n - 1)), today);
  };
  const apply = () => {
    if (!draft.from || !draft.to) return setError('Pick both dates');
    if (draft.from > draft.to) return setError('"From" must be before "To"');
    if (daysInRange(draft.from, draft.to) > 366) return setError('Choose a range of 366 days or less');
    setError('');
    onChange(draft.from, draft.to);
  };
  const showCustom = custom || !activePreset;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="inline-flex overflow-hidden rounded-lg border bg-white text-sm" role="group" aria-label="Date range">
        {PRESETS.map((n) => (
          <button key={n} onClick={() => pickPreset(n)} aria-pressed={activePreset === n && !custom}
            className={`px-3 py-1.5 ${activePreset === n && !custom ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}>{n} days</button>
        ))}
        <button onClick={() => setCustom(true)} aria-pressed={showCustom}
          className={`border-l px-3 py-1.5 ${showCustom ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}>Custom</button>
      </div>
      {showCustom && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs"><span className="mb-0.5 block text-gray-500">From</span>
            <input type="date" value={draft.from} max={draft.to || today} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} className="max-w-full rounded-lg border px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs"><span className="mb-0.5 block text-gray-500">To</span>
            <input type="date" value={draft.to} min={draft.from || undefined} max={today} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} className="max-w-full rounded-lg border px-2 py-1.5 text-sm" />
          </label>
          <button onClick={apply} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Apply</button>
        </div>
      )}
      {error && <p role="alert" className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}

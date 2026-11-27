import { useState } from "react";
import { inputClass } from "./FormField";

export default function SearchBox({ value, onSearch, className = "" }) {
  const [draft, setDraft] = useState(value || "");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(draft.trim());
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`.trim()}>
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => setDraft(value || "")}
        placeholder="Search products"
        aria-label="Search products"
        className={inputClass()}
      />
      <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700">
        Search
      </button>
    </form>
  );
}

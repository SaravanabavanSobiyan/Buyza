import { useEffect, useRef, useState } from "react";
import StarInput from "./StarInput";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTOS = 3;

export default function ReviewForm({ initial = null, submitting = false, onSubmit, onCancel }) {
  const [rating, setRating] = useState(initial?.rating || 0);
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [kept, setKept] = useState(initial?.photos || []);
  const [added, setAdded] = useState([]);
  const [errors, setErrors] = useState({});
  const [photoError, setPhotoError] = useState("");
  const inputRef = useRef(null);

  const addedRef = useRef(added);
  useEffect(() => {
    addedRef.current = added;
  }, [added]);
  useEffect(() => () => addedRef.current.forEach((a) => URL.revokeObjectURL(a.preview)), []);

  const photoCount = kept.length + added.length;

  const removeKept = (publicId) => setKept((current) => current.filter((p) => p.publicId !== publicId));
  const removeAdded = (index) => {
    const item = added[index];
    if (item) URL.revokeObjectURL(item.preview);
    setAdded((current) => current.filter((_, i) => i !== index));
  };

  const pickFiles = (event) => {
    const files = [...event.target.files];
    event.target.value = "";

    const room = MAX_PHOTOS - kept.length - added.length;
    const issues = [];
    const accepted = [];

    if (files.length > room) issues.push(`You can upload up to ${MAX_PHOTOS} photos.`);
    for (const file of files) {
      if (accepted.length >= room) break;
      if (!ACCEPT.includes(file.type)) {
        issues.push(`${file.name} is not a JPG, PNG or WebP image.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        issues.push(`${file.name} must be under 5 MB.`);
        continue;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }

    if (issues.length) setPhotoError(issues.join(" "));
    else setPhotoError("");

    if (accepted.length) setAdded((current) => [...current, ...accepted]);
  };

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!rating) nextErrors.rating = "Choose a rating";
    if (!body.trim()) nextErrors.body = "Write a short review";
    if (body.trim().length < 10) nextErrors.body = "Review must be at least 10 characters";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const formData = new FormData();
    formData.append("rating", String(rating));
    formData.append("title", title.trim());
    formData.append("body", body.trim());

    if (initial?.photos?.length) {
      const keptIds = kept.map((p) => p.publicId);
      formData.append("keepPhotoIds", JSON.stringify(keptIds));
    }

    for (const item of added) formData.append("photos", item.file);
    await onSubmit(formData);
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Your rating</label>
        <StarInput value={rating} onChange={setRating} />
        {errors.rating && <p className="mt-1 text-xs text-red-600">{errors.rating}</p>}
      </div>

      <div>
        <label htmlFor="review-title" className="mb-1 block text-sm font-medium">Title (optional)</label>
        <input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A quick summary"
          maxLength={100}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="mb-1 block text-sm font-medium">Review</label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Tell future customers what you liked and whether it matched your expectations"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <p className="mt-1 text-right text-xs text-gray-500">{body.length}/2000</p>
        {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body}</p>}
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">Photos (optional, up to {MAX_PHOTOS})</span>
        <div className="flex flex-wrap gap-2">
          {kept.map((p) => (
            <div key={p.publicId} className="relative">
              <img src={p.url} alt="Your photo" className="h-20 w-20 rounded object-cover" />
              <button type="button" onClick={() => removeKept(p.publicId)} aria-label="Remove photo" className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-800 text-sm text-white">
                &times;
              </button>
            </div>
          ))}
          {added.map((a, i) => (
            <div key={a.preview} className="relative">
              <img src={a.preview} alt="New photo preview" className="h-20 w-20 rounded object-cover" />
              <button type="button" onClick={() => removeAdded(i)} aria-label="Remove photo" className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-800 text-sm text-white">
                &times;
              </button>
            </div>
          ))}
          {photoCount < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={submitting}
              className="flex h-20 w-20 items-center justify-center rounded border-2 border-dashed text-2xl text-gray-400 hover:border-indigo-400 hover:text-indigo-500"
              aria-label="Add photos"
            >
              +
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT.join(",")} multiple hidden onChange={pickFiles} />
        {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={submitting} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {submitting ? "Saving..." : initial ? "Save changes" : "Submit review"}
        </button>
      </div>
    </form>
  );
}

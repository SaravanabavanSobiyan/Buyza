import { useState } from "react";

export const inputClass = (error) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 ${
    error ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
  }`;

export default function FormField({ label, name, error, hint, type = "text", children, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && show ? "text" : type}
          aria-invalid={Boolean(error)}
          className={`buyza-auth-input ${inputClass(error)} ${isPassword ? "pr-14" : ""}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

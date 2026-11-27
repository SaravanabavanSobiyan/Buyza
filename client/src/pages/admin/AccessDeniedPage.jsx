import { Link } from "react-router-dom";

export default function AccessDeniedPage({ message }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mb-4 text-5xl" aria-hidden="true">🔒</div>
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="mt-2 text-gray-600">
        {message || "You don't have permission to view this page. If you think this is a mistake, ask an admin."}
      </p>
      <Link to="/" className="mt-6 inline-block text-indigo-600 underline">Back to the store</Link>
    </div>
  );
}

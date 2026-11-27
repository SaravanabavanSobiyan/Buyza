import { isChunkError } from "../../utils/lazyWithRetry";

export default function ErrorFallback({ error, reset, fullScreen = false }) {
  const stale = isChunkError(error);
  const offlineChunk = error?.isOfflineChunkError;
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center px-4 text-center ${
        fullScreen ? "min-h-screen" : "py-24"
      }`}
    >
      <div className="mb-4 text-5xl" aria-hidden="true">{stale ? "🔄" : "⚠️"}</div>
      <h1 className="text-2xl font-semibold">
        {stale
          ? "A new version is available"
          : offlineChunk
            ? "This page couldn't load"
            : "Something went wrong"}
      </h1>
      <p className="mt-2 max-w-md text-gray-600">
        {stale
          ? "The site was updated while this page was open. Reload to get the latest version."
          : offlineChunk
            ? "You're offline. Reconnect, then reload the page to try again."
            : "An unexpected error happened. You can try again, or reload the page. If it keeps happening, please contact us."}
      </p>
      {import.meta.env.DEV && error && (
        <pre className="mt-4 max-w-full overflow-x-auto rounded bg-gray-100 p-3 text-left text-xs text-red-700">
          {String(error.message || error)}
        </pre>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {!stale && !offlineChunk && reset && (
          <button onClick={reset} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700">
            Try again
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className={`rounded-lg px-5 py-2.5 font-medium ${
            stale ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Reload page
        </button>
        <a href="/" className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-50">
          Back to home
        </a>
      </div>
    </div>
  );
}

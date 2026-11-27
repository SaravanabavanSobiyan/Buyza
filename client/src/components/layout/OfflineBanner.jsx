import useOnlineStatus from "../../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className={`sticky top-0 z-[60] px-4 py-2 text-center text-sm font-medium text-white ${
        "bg-gray-900"
      }`}
    >
      You're offline. Some things may not work until your connection returns.
    </div>
  );
}

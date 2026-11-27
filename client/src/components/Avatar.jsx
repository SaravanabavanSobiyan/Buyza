export default function Avatar({ user, size = 40, src }) {
  const url = src || user?.avatar?.url;
  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return url ? (
    <img src={url} alt={user?.name || "Avatar"} style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="flex items-center justify-center rounded-full bg-[#f3df9b] font-medium text-[#76570b]"
      aria-label={user?.name}
    >
      {initials}
    </div>
  );
}

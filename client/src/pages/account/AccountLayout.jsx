import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/account", label: "Profile", end: true },
  { to: "/account/password", label: "Change password" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/wishlist", label: "Wishlist" },
];

export default function AccountLayout() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">My account</h1>
      <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="flex gap-2 md:flex-col">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-[#46382f] text-white" : "text-gray-700 hover:bg-gray-100"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </aside>
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Outlet />
        </section>
      </div>
    </main>
  );
}

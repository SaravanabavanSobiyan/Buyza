import { Link } from "react-router-dom";
import { STORE } from "../config/store";

const COLUMNS = [
  { title: "Shop", links: [["All products", "/products"], ["Wishlist", "/wishlist"], ["Cart", "/cart"], ["My orders", "/orders"]] },
  { title: "Help", links: [["FAQ", "/faq"], ["Shipping and delivery", "/shipping"], ["Returns and refunds", "/returns"], ["Contact us", "/contact"]] },
  { title: "Company", links: [["About us", "/about"], ["Terms of service", "/terms"], ["Privacy policy", "/privacy"]] },
];

const linkClass = "inline-flex min-h-11 items-center text-sm text-[#d8cfc5] transition hover:translate-x-1 hover:text-white";

const Feature = ({ icon, title, children }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c9a96e] text-[#46382f]" aria-hidden="true">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs leading-5 text-[#d8cfc5]">{children}</p>
    </div>
  </div>
);

export default function Footer() {
  return (
    <footer className="mt-16 bg-[#46382f] text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-3 py-6 md:grid-cols-3">
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>}
            title="Island-wide delivery"
          >
            Fast, reliable courier service
          </Feature>
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v7H4v-7" /><path d="M2 7h20v5H2z" /><path d="M12 7v12" /><path d="M12 7H7.5a2.5 2.5 0 1 1 2.1-3.8L12 7Z" /><path d="M12 7h4.5a2.5 2.5 0 1 0-2.1-3.8L12 7Z" /></svg>}
            title="Cash on delivery"
          >
            Pay securely when it arrives
          </Feature>
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 0 1-8 8H5l-3 2 1.5-5A8 8 0 1 1 20 12Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></svg>}
            title="Friendly support"
          >
            We are here to help
          </Feature>
        </div>

        <div className="grid gap-9 border-t border-white/10 py-10 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 text-white" aria-label="Buyza home">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#c9a96e] text-sm font-black text-[#46382f]">B</span>
              <span className="text-2xl font-black tracking-[0.16em]">{STORE.name}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#d8cfc5]">{STORE.description}</p>
            <address className="mt-5 space-y-1 text-sm not-italic text-[#d8cfc5]">
              {STORE.address.map((line) => <span key={line} className="block">{line}</span>)}
            </address>
            <div className="mt-5 flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:gap-x-5">
              <a href={`tel:${STORE.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-[#f0d7a8] hover:text-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L9 10.9a16 16 0 0 0 4.1 4.1l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 1.9Z" /></svg>
                {STORE.phone}
              </a>
              <a href={`mailto:${STORE.email}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-[#f0d7a8] hover:text-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                {STORE.email}
              </a>
            </div>
            {STORE.social.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {STORE.social.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex h-11 min-w-11 items-center justify-center rounded-full border border-white/15 px-3 text-sm text-[#d8cfc5] transition hover:border-[#c9a96e] hover:bg-[#c9a96e] hover:text-[#46382f]">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#c9a96e]">{col.title}</h2>
              <ul>
                {col.links.map(([label, to]) => (
                  <li key={to}><Link to={to} className={linkClass}><span className="mr-2 text-[#c9a96e]" aria-hidden="true">›</span>{label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-xs text-[#bfb4a8] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {STORE.name}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Secure shopping</span>
            <span>Prices in Sri Lankan rupees</span>
            <span>Cash on delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

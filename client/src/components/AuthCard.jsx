import { Link } from "react-router-dom";

export default function AuthCard({ title, subtitle, adminOnly = false, children }) {
  return (
    <main className={`buyza-auth-page ${adminOnly ? "buyza-admin-auth-page" : ""} flex items-center justify-center px-4 py-8 sm:px-8 sm:py-12`}>
      <div className={`buyza-auth-shell ${adminOnly ? "buyza-admin-auth-shell" : ""} mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] lg:grid-cols-[0.9fr_1.1fr]`}>
        <aside className={`buyza-auth-visual ${adminOnly ? "buyza-admin-auth-visual" : ""} relative min-h-[300px] overflow-hidden p-7 sm:p-10 lg:min-h-[620px]`}>
          <div className="buyza-auth-orb buyza-auth-orb-one" />
          <div className="buyza-auth-orb buyza-auth-orb-two" />
          <Link to={adminOnly ? "/admin/login" : "/"} className="buyza-auth-logo">
            BUYZA<span>.</span>{adminOnly && <small className="buyza-auth-logo-admin">ADMIN</small>}
          </Link>
          {adminOnly && <span className="buyza-admin-badge">SECURE ADMIN PORTAL</span>}
          <div className="buyza-shopping-art" aria-hidden="true">
            <div className="buyza-art-card buyza-art-card-left">NEW<br /><strong>DROP</strong></div>
            <div className="buyza-shopper">
              <div className="buyza-shopper-hair" />
              <div className="buyza-shopper-head" />
              <div className="buyza-shopper-body" />
              <div className="buyza-shopper-arm buyza-shopper-arm-left" />
              <div className="buyza-shopper-arm buyza-shopper-arm-right" />
              <div className="buyza-shopper-phone"><span /></div>
              <div className="buyza-shopper-bag"><span>BUYZA</span></div>
            </div>
            <div className="buyza-art-card buyza-art-card-right">TOP<br /><strong>PICK</strong></div>
            <div className="buyza-cart-bubble">+</div>
          </div>
        </aside>
        <section className={`buyza-auth-card ${adminOnly ? "buyza-admin-auth-card" : ""} bg-white p-6 sm:p-10 lg:p-14`}>
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-[#17191c]">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-6 text-[#73777d]">{subtitle}</p>}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

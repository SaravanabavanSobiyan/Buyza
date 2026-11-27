import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import ReCAPTCHA from "react-google-recaptcha";
import { sendContactMessage } from "../api/contact";
import { STORE } from "../config/store";
import Seo from "../components/seo/Seo";

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const EMPTY = { name: "", email: "", subject: "", message: "", website: "" };

const validate = (form, needCaptcha, token) => {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = "Enter your name";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email address";
  if (form.subject.trim().length < 3) errors.subject = "Enter a subject";
  if (form.message.trim().length < 10) errors.message = "Your message must be at least 10 characters";
  if (needCaptcha && !token) errors.captcha = "Please confirm you are not a robot";
  return errors;
};

const fieldClass = (error) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#46382f] outline-none transition placeholder:text-[#aaa198] focus:border-[#c9a96e] focus:ring-4 focus:ring-[#c9a96e]/15 ${
    error ? "border-red-400" : "border-[#e8e1d7]"
  }`;

export default function ContactPage() {
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    name: user?.name || "",
    email: user?.email || "",
  }));
  const [errors, setErrors] = useState({});
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [sent, setSent] = useState(false);
  const captchaRef = useRef(null);


  const setValue = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");

    const nextErrors = validate(form, Boolean(SITE_KEY), token);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSending(true);
    try {
      await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        website: form.website,
        captchaToken: token || undefined,
      });

      setSent(true);
      setForm(EMPTY);
    } catch (error) {
      setServerError(
        error.response?.data?.message ||
          (error.response?.status === 429
            ? "Too many messages. Please try again later."
            : "Could not send your message. Please try again.")
      );
    } finally {
      captchaRef.current?.reset();
      setToken("");
      setSending(false);
    }
  };

  return (
    <>
      <Seo
        title="Contact us"
        description="Questions about an order or a product? Send us a message and we'll reply within 1 to 2 business days."
        path="/contact"
      />
      <main className="min-h-[calc(100vh-65px)] bg-[radial-gradient(ellipse_at_top_left,_rgba(201,169,110,0.12),_transparent_34rem)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a7946]">Buyza customer care</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[#241b3b] sm:text-5xl">We&apos;re here to help.</h1>
          <p className="mt-4 text-base leading-7 text-[#6b665f]">
            Questions about an order, delivery, return, or product? Send our team a message and we&apos;ll get back to you.
          </p>
        </div>

        <div className="mt-9 grid items-start gap-6 lg:grid-cols-[0.85fr_1.35fr] lg:gap-8">
          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#e8e1d7] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#241b3b]">Talk to our team</h2>
              <p className="mt-1 text-sm leading-6 text-[#6b665f]">Choose the way that works best for you.</p>
              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#faf7f2] text-[#9a7946]" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#46382f]">Call us</p>
                    <a href={`tel:${STORE.phone.replace(/\s/g, "")}`} className="mt-0.5 block text-sm text-[#6b665f] hover:text-[#9a7946]">
                      {STORE.phone}
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#faf7f2] text-[#9a7946]" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#46382f]">Email us</p>
                    <a href={`mailto:${STORE.email}`} className="mt-0.5 block break-all text-sm text-[#6b665f] hover:text-[#9a7946]">
                      {STORE.email}
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-5 border-t border-[#eee9e1] pt-4">
                <h3 className="text-sm font-semibold text-[#46382f]">Opening hours</h3>
                <dl className="mt-2 space-y-2 text-sm">
                  {STORE.hours.map(([days, time]) => (
                    <div key={days} className="flex justify-between gap-4">
                      <dt className="text-[#6b665f]">{days}</dt>
                      <dd className="text-right text-[#46382f]">{time}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            <section className="rounded-2xl bg-[#46382f] p-6 text-white shadow-sm">
              <h2 className="text-lg font-bold">Need an order update?</h2>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Check your order details and delivery progress from your account.
              </p>
              <Link
                to={user ? "/orders" : "/login"}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#f0d7a8] hover:text-white"
              >
                {user ? "View my orders" : "Sign in to view orders"}
                <span aria-hidden="true">→</span>
              </Link>
            </section>

            {STORE.address.length > 0 && (
              <section className="rounded-2xl border border-[#e8e1d7] bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#241b3b]">Visit us</h2>
                <address className="mt-2 text-sm not-italic leading-6 text-[#6b665f]">
                  {STORE.address.map((line) => (
                    <span key={line} className="block">{line}</span>
                  ))}
                </address>
                <a href={STORE.mapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#9a7946] hover:underline">
                  Open in maps <span aria-hidden="true">↗</span>
                </a>
              </section>
            )}
          </aside>

          <section className="rounded-2xl border border-[#e8e1d7] bg-white p-5 shadow-sm sm:p-8">
            {sent ? (
              <div role="status" className="py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl text-green-700" aria-hidden="true">✓</div>
                <h2 className="mt-4 text-xl font-bold text-[#241b3b]">Message received</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b665f]">
                  Thanks for reaching out. We&apos;ve emailed you a copy of your message and will reply as soon as we can.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="buyza-primary mt-6 rounded-full px-5 py-2.5 text-sm font-semibold"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#241b3b]">Send us a message</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6b665f]">
                    Share a few details so we can point you in the right direction.
                  </p>
                </div>
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold text-[#46382f]">Your name</span>
                      <input
                        value={form.name}
                        onChange={setValue("name")}
                        autoComplete="name"
                        disabled={sending}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? "contact-name-error" : undefined}
                        className={fieldClass(errors.name)}
                      />
                      {errors.name && <span id="contact-name-error" className="mt-1.5 block text-xs text-red-600">{errors.name}</span>}
                    </label>

                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold text-[#46382f]">Email address</span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={setValue("email")}
                        autoComplete="email"
                        disabled={sending}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "contact-email-error" : undefined}
                        className={fieldClass(errors.email)}
                      />
                      {errors.email && <span id="contact-email-error" className="mt-1.5 block text-xs text-red-600">{errors.email}</span>}
                    </label>
                  </div>

                  <label className="block text-sm">
                    <span className="mb-2 block font-semibold text-[#46382f]">Subject</span>
                    <input
                      value={form.subject}
                      onChange={setValue("subject")}
                      maxLength={150}
                      disabled={sending}
                      placeholder="For example, help with an order"
                      aria-invalid={Boolean(errors.subject)}
                      aria-describedby={errors.subject ? "contact-subject-error" : undefined}
                      className={fieldClass(errors.subject)}
                    />
                    {errors.subject && <span id="contact-subject-error" className="mt-1.5 block text-xs text-red-600">{errors.subject}</span>}
                  </label>

                  <label className="block text-sm">
                    <span className="mb-2 block font-semibold text-[#46382f]">How can we help?</span>
                    <textarea
                      value={form.message}
                      onChange={setValue("message")}
                      rows={6}
                      maxLength={2000}
                      disabled={sending}
                      placeholder="Include your order number if your question is about a purchase."
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? "contact-message-error" : "contact-message-count"}
                      className={`${fieldClass(errors.message)} resize-y`}
                    />
                    <span className="mt-1.5 flex justify-between gap-3 text-xs">
                      <span id="contact-message-error" className="text-red-600">{errors.message || ""}</span>
                      <span id="contact-message-count" className="shrink-0 text-[#8c817b]">{form.message.length}/2000</span>
                    </span>
                  </label>

                  <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}>
                    <label>
                      Website
                      <input tabIndex={-1} autoComplete="off" value={form.website} onChange={setValue("website")} />
                    </label>
                  </div>

                  {SITE_KEY && (
                    <div>
                      <ReCAPTCHA ref={captchaRef} sitekey={SITE_KEY} onChange={(value) => setToken(value || "")} onExpired={() => setToken("")} />
                      {errors.captcha && <p className="mt-1 text-xs text-red-600">{errors.captcha}</p>}
                    </div>
                  )}

                  {serverError && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{serverError}</div>
                  )}

                  <div className="flex flex-col gap-3 border-t border-[#eee9e1] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-[#8c817b]">
                      We use your details only to reply to you. See our <Link to="/privacy" className="underline">Privacy policy</Link>.
                    </p>
                    <button
                      type="submit"
                      disabled={sending}
                      className="buyza-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? "Sending…" : "Send message"}
                      {!sending && <span aria-hidden="true">→</span>}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
      </main>
    </>
  );
}

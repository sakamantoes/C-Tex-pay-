import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sun,
  Moon,
  Menu,
  X,
  Key,
  Webhook,
  ShieldCheck,
  RefreshCw,
  Users,
  Receipt,
  Wallet,
  ArrowDownToLine,
  ArrowRight,
  ChevronDown,
  Lock,
  ScrollText,
  UserCheck,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
} from "lucide-react";
import { ImageLogo } from "../utils/image";

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("ctex-theme");
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("ctex-theme", theme);
  }, [theme]);

  return [theme, setTheme];
}

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

function Reveal({ children, delay = 0, className = "" }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }) {
  return (
    <p className="font-mono text-[12px] sm:text-[13px] text-ctex-blue dark:text-ctex-blue-light">
      {children}
    </p>
  );
}

function SectionHeading({ eyebrow, title, sub, align = "left" }) {
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-2 sm:mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[var(--ctex-text)]">
        {title}
      </h2>
      {sub && (
        <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed text-[var(--ctex-text-muted)]">
          {sub}
        </p>
      )}
    </div>
  );
}

function Button({ as = "button", variant = "primary", children, className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctex-blue";
  const variants = {
    primary:
      "bg-ctex-blue text-white hover:bg-ctex-blue-light",
    secondary:
      "border border-[var(--ctex-border)] text-[var(--ctex-text)] hover:border-ctex-blue hover:text-ctex-blue",
    ghost:
      "text-[var(--ctex-text)] hover:text-ctex-blue",
  };
  const Comp = as;
  return (
    <Comp className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </Comp>
  );
}

/* A code panel: sharp corners, monospace, terminal-like — deliberately
   distinct from the soft rounded content cards used elsewhere, so the
   eye learns "this square-edged, mono-typeset block is real system output."
   Shadow kept small (no large blur radius) — big soft shadows are a real
   compositing cost on low-end Android GPUs. */
function CodeWindow({ label = "request.js", lines, accent = false }) {
  return (
    <div
      className={`relative w-full max-w-full overflow-hidden rounded-none border bg-[var(--ctex-elevated)] ${
        accent
          ? "border-ctex-blue/30 shadow-[0_8px_24px_-8px_rgba(11,104,173,0.3)]"
          : "border-[var(--ctex-border)] shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[var(--ctex-border)] px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[var(--ctex-border)]" />
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[var(--ctex-border)]" />
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[var(--ctex-border)]" />
        </div>
        <span className="font-mono text-[10px] sm:text-xs text-[var(--ctex-text-muted)]">{label}</span>
      </div>
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words px-3 sm:px-5 py-3 sm:py-5 font-mono text-[11px] sm:text-[13px] leading-relaxed text-[var(--ctex-text)]">
        <code className="block min-w-0 whitespace-pre-wrap break-words">{lines}</code>
      </pre>
    </div>
  );
}

/* Lightweight hero accent badges — transform/opacity only, entrance-only
   (no looping animation), no images, no filters. Communicates "verified,
   real-time" without the GPU cost of 3D renders or large raster assets. */
function HeroStatusBadge({ icon: Icon, label, tone = "success", delay = 0, className = "" }) {
  const reduceMotion = useReducedMotion();
  const toneClasses =
    tone === "success"
      ? "text-emerald-500 border-emerald-500/25"
      : "text-ctex-blue dark:text-ctex-blue-light border-ctex-blue/25";
  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.97 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-none flex items-center gap-1.5 rounded-md border bg-[var(--ctex-elevated)] px-2.5 py-1.5 font-mono text-[10px] sm:text-[11px] shadow-sm ${toneClasses} ${className}`}
    >
      <Icon size={12} className="shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </motion.div>
  );
}

/* Reusable flow diagram — the product's core mental model is a linear
   sequence (account → key → integrate → webhook), so one component
   renders it consistently instead of four bespoke diagrams. */
function FlowSteps({ steps, orientation = "vertical" }) {
  const isRow = orientation === "horizontal";
  return (
    <div className={isRow ? "flex flex-col sm:flex-row" : "flex flex-col"}>
      {steps.map((step, i) => (
        <div
          key={step.title}
          className={isRow ? "flex flex-1 items-start gap-3" : "flex gap-3 sm:gap-4"}
        >
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-ctex-blue/40 bg-ctex-blue/5 font-mono text-[10px] sm:text-xs text-ctex-blue dark:text-ctex-blue-light">
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <span
                className={
                  isRow
                    ? "hidden sm:block mt-4 h-px flex-1 w-full bg-[var(--ctex-border)]"
                    : "my-1 w-px flex-1 bg-[var(--ctex-border)]"
                }
              />
            )}
          </div>
          <div className={isRow ? "pb-8" : "pb-6 sm:pb-8"}>
            <p className="font-medium text-sm sm:text-base text-[var(--ctex-text)]">{step.title}</p>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-[var(--ctex-text-muted)]">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navbar                                                              */
/* ------------------------------------------------------------------ */

function Navbar({ theme, setTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Product", href: "#features" },
    { label: "Developers", href: "#developers" },
    { label: "Solutions", href: "#merchant-flow" },
    { label: "Pricing", href: "#pricing" },
    { label: "Documentation", href: "#docs" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? "border-b border-[var(--ctex-border)] bg-[var(--ctex-bg)]"
          : "border-b border-transparent bg-[var(--ctex-bg)]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <Link to="/" className="font-display text-base sm:text-lg font-semibold tracking-tight text-[var(--ctex-text)]">
        <img src={ImageLogo.Logo} alt="C-TEX PAY" className="h-[100px] sm:h-[100px] w-[100px]" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex lg:gap-8">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-[var(--ctex-text-muted)] transition-colors hover:text-ctex-blue"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border border-[var(--ctex-border)] text-[var(--ctex-text-muted)] transition-colors hover:text-ctex-blue"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--ctex-text)] hover:text-ctex-blue"
          >
            Log in
          </Link>
          <Button as={Link} to="/signup">
            Get Started
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--ctex-border)] text-[var(--ctex-text-muted)]"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--ctex-border)] text-[var(--ctex-text)]"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-[var(--ctex-border)] bg-[var(--ctex-bg)] md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 sm:px-6 pb-5 pt-1">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 text-sm text-[var(--ctex-text-muted)] hover:text-ctex-blue"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                <Button as={Link} to="/login" variant="secondary">
                  Log in
                </Button>
                <Button as={Link} to="/signup">
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

function Hero() {
  const reduceMotion = useReducedMotion();
  const codeLines = `const res = await fetch(
  "https://api.ctexpay.com/v1/payments",
  {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${CTEX_SECRET_KEY}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: 500000,
      currency: "NGN",
      customer: "cus_8fh29a",
      reference: "order_10234"
    })
  }
);

const payment = await res.json();`;

  // Two animated groups instead of six — one orchestrated load moment,
  // not a per-element stagger chain. Cheaper to composite on low-end GPUs.
  const textBlock = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };
  const codeBlock = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative overflow-hidden">
      {/* Cheap flat gradient wash instead of a large filter:blur() glow —
          blur() forces an expensive offscreen render pass on mobile GPUs;
          a gradient is composited for free. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[380px] w-full max-w-[900px] -translate-x-1/2 bg-[radial-gradient(closest-side,hsl(205.56deg_88.04%_36.08%_/_0.16),transparent)] dark:bg-[radial-gradient(closest-side,hsl(205.56deg_88.04%_46%_/_0.22),transparent)]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:gap-14 px-4 sm:px-6 pb-16 sm:pb-24 pt-12 sm:pt-24 lg:grid-cols-2 lg:items-center lg:pb-32">
        <motion.div
          initial={reduceMotion ? undefined : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          variants={reduceMotion ? undefined : textBlock}
        >
          <p className="font-mono text-[12px] sm:text-[13px] text-ctex-blue dark:text-ctex-blue-light">
            Payment infrastructure for developers
          </p>
          <h1 className="mt-3 sm:mt-4 font-display text-5xl sm:text-7xl md:text-7xl font-semibold leading-[1.08] tracking-tight text-[var(--ctex-text)]">
            Accept payments. Build faster.
          </h1>
          <p className="mt-4 sm:mt-6 max-w-md text-sm sm:text-base leading-relaxed text-[var(--ctex-text-muted)]">
            Accept payments, verify transactions, and automate payment
            confirmation with a simple API built for modern businesses.
          </p>
          <div className="mt-6 sm:mt-9 flex flex-wrap gap-2 sm:gap-3">
            <Button as={Link} to="/signup">
              Get Started
              <ArrowRight size={15} />
            </Button>
            <Button as="a" href="#docs" variant="secondary">
              Read the Docs
            </Button>
          </div>
          <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-[var(--ctex-text-muted)]">
            No SDK to install. Your API key is the integration.
          </p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? undefined : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          variants={reduceMotion ? undefined : codeBlock}
          className="relative"
        >
          <CodeWindow label="payments.js" lines={codeLines} accent />

          {/* Entrance-only status badges — no continuous loop/float animation,
              so there's nothing running on the compositor after ~0.6s. */}
          <div className="mt-3 flex flex-wrap gap-2 sm:absolute sm:-bottom-4 sm:right-4 sm:mt-0">
            <HeroStatusBadge icon={CheckCircle2} label="Payment verified" tone="success" delay={0.4} />
            <HeroStatusBadge icon={Webhook} label="Webhook delivered" tone="info" delay={0.5} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trust strip                                                         */
/* ------------------------------------------------------------------ */

function TrustBar() {
  const points = [
    { icon: Key, label: "API-first" },
    { icon: ShieldCheck, label: "Secure by default" },
    { icon: Users, label: "Developer-friendly" },
    { icon: Webhook, label: "Webhook powered" },
  ];
  return (
    <div className="border-y border-[var(--ctex-border)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 sm:gap-6 px-4 sm:px-6 py-6 sm:py-8 sm:grid-cols-4">
        {points.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs sm:text-sm text-[var(--ctex-text-muted)]">
            <Icon size={14} className="shrink-0 text-ctex-blue dark:text-ctex-blue-light" />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Problem → Solution                                                  */
/* ------------------------------------------------------------------ */

function ProblemSolution() {
  const rows = [
    { problem: "Complex integrations", solution: "One documented API" },
    { problem: "Manual verification", solution: "Automatic verification + webhooks" },
    { problem: "Unclear transaction status", solution: "Real-time transaction state" },
    { problem: "Difficult API management", solution: "Simple key generation and rotation" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Why C-TEX PAY"
          title="Payment integration shouldn't slow your product down."
          sub="Most delays come from the same handful of problems. C-TEX PAY removes them one by one."
        />
      </Reveal>

      <div className="mt-8 sm:mt-12 divide-y divide-[var(--ctex-border)] border-y border-[var(--ctex-border)]">
        {rows.map((row, i) => (
          <Reveal key={row.problem} delay={i * 0.05}>
            <div className="grid grid-cols-1 items-center gap-2 sm:gap-3 py-4 sm:py-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-6">
              <p className="text-xs sm:text-base text-[var(--ctex-text-muted)]">{row.problem}</p>
              <ArrowRight size={14} className="hidden text-ctex-blue sm:block" />
              <p className="text-sm sm:text-base font-medium text-[var(--ctex-text)]">{row.solution}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Core features                                                       */
/* ------------------------------------------------------------------ */

function Features() {
  const features = [
    { icon: Key, title: "API-First Payments", desc: "Integrate directly with the C-TEX PAY API without installing an SDK." },
    { icon: Lock, title: "API Keys", desc: "Generate, rotate, and revoke API keys directly from your dashboard." },
    { icon: Webhook, title: "Webhooks", desc: "Receive secure payment notifications directly on your server." },
    { icon: CheckCircle2, title: "Automatic Verification", desc: "C-TEX PAY verifies transactions before reporting successful payments." },
    { icon: ShieldCheck, title: "Idempotency", desc: "Protect payment requests from accidental duplicate processing." },
    { icon: RefreshCw, title: "Automatic Retries", desc: "Transient failures can be retried safely, without manual intervention." },
    { icon: Users, title: "Customer Management", desc: "Create and manage customers directly from your API." },
    { icon: Receipt, title: "Transaction Management", desc: "Track payment status and transaction history in one place." },
    { icon: Wallet, title: "Merchant Wallet", desc: "Monitor available funds and balances as payments settle." },
    { icon: ArrowDownToLine, title: "Payouts", desc: "Withdraw eligible funds to your supported bank accounts." },
  ];

  return (
    <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Everything included"
          title="One platform for your entire payment operation."
        />
      </Reveal>

      <div className="mt-8 sm:mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[var(--ctex-border)] bg-[var(--ctex-border)] sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.04} className="bg-[var(--ctex-bg)]">
            <div className="h-full p-5 sm:p-7">
              <f.icon size={18} className="text-ctex-blue dark:text-ctex-blue-light" />
              <p className="mt-3 sm:mt-4 font-medium text-sm sm:text-base text-[var(--ctex-text)]">{f.title}</p>
              <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--ctex-text-muted)]">
                {f.desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Developer section — tabbed code examples                            */
/* ------------------------------------------------------------------ */

function DeveloperSection() {
  const tabs = {
    "Node.js": `const res = await fetch("https://api.ctexpay.com/v1/payments", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.CTEX_SECRET_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 500000,
    currency: "NGN",
    customer: "cus_8fh29a",
    reference: "order_10234",
  }),
});

const payment = await res.json();`,
    cURL: `curl https://api.ctexpay.com/v1/payments \\
  -H "Authorization: Bearer $CTEX_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 500000,
    "currency": "NGN",
    "customer": "cus_8fh29a",
    "reference": "order_10234"
  }'`,
    Python: `import requests

response = requests.post(
    "https://api.ctexpay.com/v1/payments",
    headers={
        "Authorization": f"Bearer {CTEX_SECRET_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "amount": 500000,
        "currency": "NGN",
        "customer": "cus_8fh29a",
        "reference": "order_10234",
    },
)

payment = response.json()`,
    PHP: `$ch = curl_init("https://api.ctexpay.com/v1/payments");

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . getenv("CTEX_SECRET_KEY"),
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "amount" => 500000,
        "currency" => "NGN",
        "customer" => "cus_8fh29a",
        "reference" => "order_10234",
    ]),
]);

$payment = json_decode(curl_exec($ch), true);`,
    JavaScript: `const res = await fetch("https://api.ctexpay.com/v1/payments", {
  method: "POST",
  headers: {
    Authorization: "Bearer CTEX_SECRET_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 500000,
    currency: "NGN",
    customer: "cus_8fh29a",
    reference: "order_10234",
  }),
});

const { checkout_url } = await res.json();
window.location.href = checkout_url;`,
  };

  const [active, setActive] = useState("Node.js");

  const steps = [
    { title: "Create account", desc: "Sign up for C-TEX PAY in a few minutes." },
    { title: "Create merchant", desc: "Register the business you're collecting payments for." },
    { title: "Generate API key", desc: "Create a key from your dashboard — no approval wait." },
    { title: "Add API to your application", desc: "Call the API directly. No SDK required." },
    { title: "Receive webhook", desc: "C-TEX PAY notifies your server the moment status changes." },
    { title: "Verify payment", desc: "Confirm the signature, then mark the order paid." },
  ];

  return (
    <section id="developers" className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="For developers"
          title="One API. Everything your payment flow needs."
        />
      </Reveal>

      <div className="mt-10 sm:mt-14 grid gap-10 lg:gap-12 lg:grid-cols-2 lg:items-start">
        <Reveal>
          <FlowSteps steps={steps} />
        </Reveal>

        <Reveal delay={0.08}>
          <div className="flex flex-wrap gap-0.5 border-b border-[var(--ctex-border)] overflow-x-auto">
            {Object.keys(tabs).map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`px-3 sm:px-3.5 py-2 sm:py-2.5 font-mono text-[10px] sm:text-xs whitespace-nowrap transition-colors ${
                  active === tab
                    ? "border-b-2 border-ctex-blue text-ctex-blue dark:text-ctex-blue-light"
                    : "border-b-2 border-transparent text-[var(--ctex-text-muted)] hover:text-[var(--ctex-text)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="mt-3 sm:mt-4">
            <CodeWindow label={`payments.${active === "Python" ? "py" : active === "PHP" ? "php" : active === "cURL" ? "sh" : "js"}`} lines={tabs[active]} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Webhook section                                                     */
/* ------------------------------------------------------------------ */

function WebhookSection() {
  const flow = [
    { title: "Customer pays", desc: "Your customer completes payment at checkout." },
    { title: "C-TEX PAY verifies transaction", desc: "The payment is confirmed with the provider, not assumed." },
    { title: "C-TEX PAY signs webhook", desc: "A signed event is generated for your endpoint." },
    { title: "Merchant receives webhook", desc: "Your server gets a POST request with the event payload." },
    { title: "Merchant verifies signature", desc: "Confirm the request actually came from C-TEX PAY." },
    { title: "Merchant updates order", desc: "Mark the order paid and continue your flow." },
  ];

  const webhookCode = `import crypto from "crypto";

app.post("/webhooks/ctexpay", (req, res) => {
  const signature = req.headers["x-ctex-signature"];
  const expected = crypto
    .createHmac("sha256", process.env.CTEX_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (signature !== expected) return res.sendStatus(401);

  if (req.body.event === "payment.success") {
    markOrderPaid(req.body.data.reference);
  }

  res.sendStatus(200);
});`;

  return (
    <section className="border-t border-[var(--ctex-border)] bg-[var(--ctex-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Webhooks"
            title="Know when a payment is complete."
            sub="Set your webhook URL from the dashboard, and C-TEX PAY will notify your server the moment a transaction's status changes — signed, so you can trust what you receive."
          />
        </Reveal>

        <div className="mt-8 sm:mt-12 grid gap-10 lg:gap-12 lg:grid-cols-2 lg:items-start">
          <Reveal>
            <FlowSteps steps={flow} />
          </Reveal>
          <Reveal delay={0.08}>
            <CodeWindow label="webhooks.js" lines={webhookCode} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Security section                                                    */
/* ------------------------------------------------------------------ */

function SecuritySection() {
  const items = [
    { icon: Key, title: "API key security", desc: "Keys are hashed at rest and scoped to permissions you set." },
    { icon: Webhook, title: "Webhook signatures", desc: "Every webhook is signed so you can confirm its origin." },
    { icon: CheckCircle2, title: "Transaction verification", desc: "Payments are confirmed with the provider before they're reported as successful." },
    { icon: ShieldCheck, title: "Idempotency", desc: "Duplicate requests are detected and safely ignored." },
    { icon: RefreshCw, title: "Automatic retries", desc: "Transient failures are retried without duplicating charges." },
    { icon: UserCheck, title: "Permission-based access", desc: "API access is scoped to what each key is allowed to do." },
    { icon: Lock, title: "Merchant isolation", desc: "Each merchant's data and keys are kept fully separate." },
    { icon: ScrollText, title: "Audit logs", desc: "Key actions on your account are recorded for review." },
  ];

  const pipeline = [
    "Merchant",
    "C-TEX PAY",
    "Payment Provider",
    "Verification",
    "Signed Webhook",
    "Merchant Server",
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Security"
          title="Payments should be verified, not assumed."
          sub="A successful payment response should never be trusted blindly. C-TEX PAY verifies transactions before treating them as successful."
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto rounded-lg border border-[var(--ctex-border)] bg-[var(--ctex-surface)] px-3 sm:px-5 py-3 sm:py-4 font-mono text-[10px] sm:text-xs text-[var(--ctex-text-muted)]">
          {pipeline.map((step, i) => (
            <React.Fragment key={step}>
              <span className={`whitespace-nowrap ${i === 4 ? "text-ctex-blue dark:text-ctex-blue-light" : ""}`}>{step}</span>
              {i < pipeline.length - 1 && <ArrowRight size={10} className="shrink-0 opacity-50" />}
            </React.Fragment>
          ))}
        </div>
      </Reveal>

      <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[var(--ctex-border)] bg-[var(--ctex-border)] sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={(i % 4) * 0.04} className="bg-[var(--ctex-bg)]">
            <div className="h-full p-4 sm:p-6">
              <it.icon size={16} className="text-ctex-blue dark:text-ctex-blue-light" />
              <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm font-medium text-[var(--ctex-text)]">{it.title}</p>
              <p className="mt-1 sm:mt-1.5 text-[11px] sm:text-xs leading-relaxed text-[var(--ctex-text-muted)]">{it.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard preview                                                   */
/* ------------------------------------------------------------------ */

function DashboardPreview() {
  const stats = [
    { label: "Available balance", value: "₦482,300.00" },
    { label: "Total transactions", value: "1,204" },
    { label: "Successful payments", value: "1,148" },
    { label: "Pending payments", value: "12" },
    { label: "Failed payments", value: "44" },
  ];

  const transactions = [
    { ref: "order_10234", customer: "cus_8fh29a", amount: "₦5,000.00", status: "success" },
    { ref: "order_10233", customer: "cus_2ka91c", amount: "₦12,500.00", status: "success" },
    { ref: "order_10232", customer: "cus_9jd03f", amount: "₦2,000.00", status: "pending" },
    { ref: "order_10231", customer: "cus_71la5v", amount: "₦8,750.00", status: "failed" },
  ];

  const statusMeta = {
    success: { icon: CheckCircle2, color: "text-emerald-500", label: "Success" },
    pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
    failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Your dashboard"
          title="Every transaction, key, and webhook in one view."
          sub="Interface example with demo values — this is what your dashboard looks like once you're set up."
        />
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mt-8 sm:mt-12 rounded-none border border-[var(--ctex-border)] bg-[var(--ctex-elevated)]">
          <div className="grid grid-cols-2 divide-x divide-y divide-[var(--ctex-border)] border-b border-[var(--ctex-border)] sm:grid-cols-5 sm:divide-y-0">
            {stats.map((s) => (
              <div key={s.label} className="px-3 sm:px-5 py-3 sm:py-5">
                <p className="text-[10px] sm:text-xs text-[var(--ctex-text-muted)]">{s.label}</p>
                <p className="mt-1 sm:mt-1.5 font-mono text-sm sm:text-lg text-[var(--ctex-text)]">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr]">
            <div className="border-b border-[var(--ctex-border)] lg:border-b-0 lg:border-r p-4 sm:p-5">
              <p className="text-xs sm:text-sm font-medium text-[var(--ctex-text)]">Recent transactions</p>
              <div className="mt-3 sm:mt-4 divide-y divide-[var(--ctex-border)]">
                {transactions.map((t) => {
                  const meta = statusMeta[t.status];
                  return (
                    <div key={t.ref} className="flex items-center justify-between py-2.5 sm:py-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] sm:text-xs text-[var(--ctex-text)] truncate">{t.ref}</p>
                        <p className="mt-0.5 font-mono text-[9px] sm:text-[11px] text-[var(--ctex-text-muted)] truncate">{t.customer}</p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <span className="font-mono text-[10px] sm:text-xs text-[var(--ctex-text)]">{t.amount}</span>
                        <span className={`flex items-center gap-1 text-[10px] sm:text-xs ${meta.color}`}>
                          <meta.icon size={11} />
                          <span className="hidden xs:inline">{meta.label}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs sm:text-sm font-medium text-[var(--ctex-text)]">API keys</p>
              <div className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs gap-2">
                  <span className="text-[var(--ctex-text)] truncate">ctex_live_saka_••••••••8f21</span>
                  <span className="text-emerald-500 shrink-0">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs gap-2">
                  <span className="text-[var(--ctex-text)] truncate">ctex_test_saka_••••••••1a09</span>
                  <span className="text-[var(--ctex-text-muted)] shrink-0">Test mode</span>
                </div>
              </div>

              <p className="mt-5 sm:mt-6 text-xs sm:text-sm font-medium text-[var(--ctex-text)]">Webhook status</p>
              <div className="mt-2.5 sm:mt-3 flex items-center gap-2 font-mono text-[10px] sm:text-xs">
                <Circle size={7} className="shrink-0 fill-emerald-500 text-emerald-500" />
                <span className="text-[var(--ctex-text)] truncate">api.yourapp.com/webhooks/ctexpay</span>
              </div>
              <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--ctex-text-muted)]">Last delivery succeeded</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Merchant + customer experience                                      */
/* ------------------------------------------------------------------ */

function MerchantFlow() {
  const steps = [
    { title: "Create account", desc: "Sign up as a merchant on C-TEX PAY." },
    { title: "Create business", desc: "Register the business you're collecting payments for." },
    { title: "Generate API key", desc: "Create keys scoped to what your app needs." },
    { title: "Configure webhook", desc: "Point C-TEX PAY at your server's webhook endpoint." },
    { title: "Integrate API", desc: "Call the payments API directly from your application." },
    { title: "Accept payments", desc: "Customers pay; you get notified automatically." },
    { title: "Monitor transactions", desc: "Track status and history from your dashboard." },
    { title: "Withdraw funds", desc: "Move eligible balance to your bank account." },
  ];

  return (
    <section id="merchant-flow" className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
      <Reveal>
        <SectionHeading eyebrow="Merchant experience" title="From account to payout, in one flow." />
      </Reveal>
      <Reveal delay={0.06}>
        <div className="mt-8 sm:mt-12 grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-6 sm:gap-y-10 sm:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title}>
              <span className="font-mono text-[10px] sm:text-xs text-ctex-blue dark:text-ctex-blue-light">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-1.5 sm:mt-2 font-medium text-xs sm:text-base text-[var(--ctex-text)]">{s.title}</p>
              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-[var(--ctex-text-muted)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function CustomerFlow() {
  const steps = ["Merchant website", "Checkout", "Customer payment", "C-TEX PAY", "Payment provider", "Verification", "Merchant webhook"];
  return (
    <section className="border-t border-[var(--ctex-border)] bg-[var(--ctex-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Customer experience"
            title="Simple for the person paying, too."
            sub="C-TEX PAY sits between your checkout and the payment provider, so your customer only ever sees a single, consistent payment experience."
          />
        </Reveal>
        <Reveal delay={0.06}>
          <div className="mt-8 sm:mt-12 flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-2 sm:gap-y-4 font-mono text-[10px] sm:text-xs text-[var(--ctex-text-muted)] md:text-sm">
            {steps.map((step, i) => (
              <React.Fragment key={step}>
                <span className="rounded-none border border-[var(--ctex-border)] bg-[var(--ctex-elevated)] px-2 sm:px-3 py-1.5 sm:py-2 text-[var(--ctex-text)] whitespace-nowrap">
                  {step}
                </span>
                {i < steps.length - 1 && <ArrowRight size={12} className="shrink-0 opacity-50" />}
              </React.Fragment>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
      <Reveal>
        <SectionHeading eyebrow="Pricing" title="Simple, transparent transaction pricing." />
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mt-8 sm:mt-12 max-w-lg rounded-lg border border-[var(--ctex-border)] p-6 sm:p-8">
          <p className="font-display text-xl sm:text-2xl font-semibold text-[var(--ctex-text)]">Transaction fee</p>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[var(--ctex-text-muted)]">
            Configured by C-TEX PAY per merchant. No setup fees, no monthly minimums.
          </p>
          <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-[var(--ctex-text-muted)]">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-ctex-blue dark:text-ctex-blue-light" />
              Pay only for successful transactions
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-ctex-blue dark:text-ctex-blue-light" />
              No hidden integration costs
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-ctex-blue dark:text-ctex-blue-light" />
              Full access to the dashboard and API
            </li>
          </ul>
          <Button as={Link} to="/signup" className="mt-6 sm:mt-8 w-full">
            Get Started
          </Button>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Docs CTA                                                            */
/* ------------------------------------------------------------------ */

function DocsCTA() {
  return (
    <section id="docs" className="border-t border-[var(--ctex-border)] bg-[var(--ctex-surface)]">
      <div className="mx-auto grid max-w-7xl gap-8 sm:gap-10 px-4 sm:px-6 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="font-mono text-[12px] sm:text-[13px] text-ctex-blue dark:text-ctex-blue-light">Documentation</p>
          <h2 className="mt-2 sm:mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[var(--ctex-text)]">
            Ready to integrate?
          </h2>
          <div className="mt-6 sm:mt-8 flex flex-wrap gap-2 sm:gap-3">
            <Button as="a" href="/docs">
              Read Documentation
              <ArrowRight size={15} />
            </Button>
            <Button as={Link} to="/signup" variant="secondary">
              Create Account
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <CodeWindow
            label="quickstart.sh"
            lines={`curl https://api.ctexpay.com/v1/payments \\
  -H "Authorization: Bearer $CTEX_SECRET_KEY" \\
  -d amount=500000 -d currency=NGN`}
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

function FAQ() {
  const faqs = [
    { q: "Do I need an SDK?", a: "No. C-TEX PAY is designed around direct API integration." },
    { q: "How do I authenticate API requests?", a: "Using your C-TEX PAY API key, passed as a bearer token." },
    { q: "Can I configure webhooks?", a: "Yes. Merchants can configure their webhook endpoint from their dashboard." },
    { q: "How are payments verified?", a: "C-TEX PAY verifies payment information before treating a transaction as successful." },
    { q: "Can I withdraw my funds?", a: "Yes, eligible merchant funds can be withdrawn to supported bank accounts." },
    { q: "Can I rotate my API keys?", a: "Yes, keys can be rotated at any time from your dashboard." },
    { q: "Can I revoke an API key?", a: "Yes, revoked keys stop working immediately." },
    { q: "Is C-TEX PAY suitable for developers?", a: "Yes. The platform is designed with API-first integration in mind." },
  ];
  const [open, setOpen] = useState(0);

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24">
      <Reveal>
        <SectionHeading eyebrow="FAQ" title="Common questions." />
      </Reveal>

      <div className="mt-8 sm:mt-10 divide-y divide-[var(--ctex-border)] border-y border-[var(--ctex-border)]">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 sm:gap-4 py-4 sm:py-5 text-left"
              >
                <span className="text-sm sm:text-base font-medium text-[var(--ctex-text)]">{f.q}</span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-[var(--ctex-text-muted)] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <p className="pb-4 sm:pb-5 text-xs sm:text-sm leading-relaxed text-[var(--ctex-text-muted)]">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                           */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  return (
    <section className="border-t border-[var(--ctex-border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-2xl font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[var(--ctex-text)]">
            Your payments. Your API. Your business.
          </h2>
          <p className="mx-auto mt-3 sm:mt-4 max-w-xl text-sm sm:text-base text-[var(--ctex-text-muted)]">
            Build your payment flow with infrastructure designed around developers.
          </p>
          <div className="mt-7 sm:mt-9 flex flex-wrap justify-center gap-2 sm:gap-3">
            <Button as={Link} to="/signup">
              Get Started
              <ArrowRight size={15} />
            </Button>
            <Button as="a" href="#docs" variant="secondary">
              Explore Documentation
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                               */
/* ------------------------------------------------------------------ */

function Footer() {
  const columns = [
    { title: "Product", links: ["Payments", "Transactions", "Customers", "Webhooks", "API Keys", "Payouts"] },
    { title: "Developers", links: ["Documentation", "API Reference", "Integration Guide", "Webhooks", "Security"] },
    { title: "Company", links: ["About", "Contact", "Support"] },
    { title: "Legal", links: ["Privacy", "Terms"] },
  ];

  return (
    <footer className="border-t border-[var(--ctex-border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 gap-8 sm:gap-10 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs sm:text-sm font-medium text-[var(--ctex-text)]">{col.title}</p>
              <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs sm:text-sm text-[var(--ctex-text-muted)] hover:text-ctex-blue">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 sm:mt-14 flex flex-col items-start justify-between gap-3 sm:gap-4 border-t border-[var(--ctex-border)] pt-6 sm:pt-8 sm:flex-row sm:items-center">
          <span className="font-display text-xs sm:text-sm font-semibold text-[var(--ctex-text)]">
           <img src={ImageLogo.Logo} alt="C-TEX PAY" className="h-5 sm:h-20" />
          </span>
          <p className="text-[10px] sm:text-xs text-[var(--ctex-text-muted)]">© 2026 C-TEX PAY. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [theme, setTheme] = useTheme();

  return (
    <div className="min-h-screen bg-[var(--ctex-bg)] font-body text-[var(--ctex-text)]">
      <Navbar theme={theme} setTheme={setTheme} />
      <main>
        <Hero />
        <TrustBar />
        <ProblemSolution />
        <Features />
        <DeveloperSection />
        <WebhookSection />
        <SecuritySection />
        <DashboardPreview />
        <MerchantFlow />
        <CustomerFlow />
        <Pricing />
        <DocsCTA />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
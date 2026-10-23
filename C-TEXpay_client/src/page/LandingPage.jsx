import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  Key,
  Webhook,
  ShieldCheck,
  RefreshCw,
  Users,
  Receipt,
  Wallet,
  ArrowDownToLine,
  ArrowRight,
  Lock,
  ScrollText,
  UserCheck,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Calculator,
  Info,
} from "lucide-react";
import { ImageLogo } from "../utils/image";

/* ------------------------------------------------------------------ */
/* Global styles (all landing tokens are scoped to .lp / .lp-dark)     */
/* ------------------------------------------------------------------ */

function GlobalStyles() {
  return (
    <style>{`
      .lp{
        --bg:#faf9f7;--card:#ffffff;--soft:#f2efea;--ink:#121214;--ink-fg:#ffffff;
        --text:#17171b;--muted:#6f6f78;--line:rgba(24,24,32,.08);
        --accent:#0B68AD;--accent-2:#2f95de;--accent-fg:#ffffff;--tint:rgba(11,104,173,.1);
        --shadow:0 30px 60px -32px rgba(20,24,40,.3);
        --c-str:#0E7A4F;--c-kw:#6D3FD1;--c-num:#B45309;
      }
      .dark .lp{
        --bg:#0a0a0c;--card:#131316;--soft:#1a1a1e;--ink:#f4f4f6;--ink-fg:#111114;
        --text:#f4f4f6;--muted:#9b9ba5;--line:rgba(255,255,255,.1);
        --accent:#4DA6E8;--accent-2:#7cc0f2;--accent-fg:#04121F;--tint:rgba(77,166,232,.16);
        --shadow:0 30px 60px -30px rgba(0,0,0,.75);
      }
      .lp-dark{
        --bg:#111114;--card:#18181c;--soft:#1e1e23;--ink:#ffffff;--ink-fg:#111114;
        --text:#f4f4f6;--muted:#9b9ba5;--line:rgba(255,255,255,.1);
        --accent:#4DA6E8;--accent-2:#7cc0f2;--accent-fg:#04121F;--tint:rgba(77,166,232,.16);
        --c-str:#7DD3A8;--c-kw:#C4A7FF;--c-num:#F5B461;
      }
      .lp,.lp-dark{background:var(--bg);color:var(--text)}

      .t-text{color:var(--text)}
      .t-muted{color:var(--muted)}
      .t-accent{color:var(--accent)}
      .c-str{color:var(--c-str)}.c-kw{color:var(--c-kw)}.c-num{color:var(--c-num)}
      .c-cm{color:var(--muted);font-style:italic}

      .lp-wrap{width:100%;max-width:1200px;margin-inline:auto;padding-inline:16px}
      @media(min-width:640px){.lp-wrap{padding-inline:24px}}

      .lp-card{background:var(--card);border:1px solid var(--line);border-radius:28px}
      .lp-soft{background:var(--soft);border-radius:28px}
      .lp-r40{border-radius:clamp(28px,5vw,40px)}
      .lp-shadow{box-shadow:var(--shadow)}
      .lp-mock{background:var(--soft);border:1px solid var(--line);border-radius:18px}
      .lp-bt{border-top:1px solid var(--line)}
      .lp-bb{border-bottom:1px solid var(--line)}
      .lp-divide>*+*{border-top:1px solid var(--line)}
      .lp-glow{background:radial-gradient(closest-side,var(--tint),transparent)}

      .lp-chip{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;background:var(--ink);color:var(--ink-fg);flex-shrink:0}
      .lp-eyebrow{font-size:11px;font-weight:500;letter-spacing:.3em;text-transform:uppercase;color:var(--accent)}
      .lp-h2{font-family:var(--font-display);font-size:clamp(1.9rem,4vw,2.75rem);line-height:1.12;font-weight:500;letter-spacing:-.02em;color:var(--text)}
      .lp-hchip{display:inline-flex;align-items:center;justify-content:center;width:.95em;height:.95em;border-radius:.28em;background:linear-gradient(135deg,var(--accent-2),var(--accent));color:#fff;vertical-align:-.1em;margin-inline:.1em;box-shadow:0 10px 22px -10px var(--accent);transform:rotate(-6deg)}
      .lp-hchip svg{width:55%;height:55%}

      .lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;padding:12px 24px;font-size:14px;font-weight:500;line-height:1.2;white-space:nowrap;cursor:pointer;transition:transform .15s,opacity .15s,background .15s}
      .lp-btn:hover{transform:translateY(-1px)}
      .lp-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
      .lp-btn-dark{background:var(--ink);color:var(--ink-fg)}
      .lp-btn-dark:hover{opacity:.88}
      .lp-btn-light{background:#fff;color:#111114;border:1px solid var(--line)}
      .lp-btn-line{background:var(--card);color:var(--text);border:1px solid var(--line)}
      .lp-btn-link{color:var(--accent);padding-inline:10px}
      .lp-accent{background:var(--accent);color:var(--accent-fg)}
      .lp-nav-link{border-radius:999px;padding:8px 14px;font-size:14px;color:var(--muted);transition:color .15s,background .15s}
      .lp-nav-link:hover{color:var(--text);background:var(--soft)}
      .lp-nav-blur{background:color-mix(in srgb,var(--bg) 80%,transparent);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
      .lp-icon-btn{display:flex;height:38px;width:38px;align-items:center;justify-content:center;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--muted)}

      .lp-bento{display:flex;flex-direction:column;height:100%;overflow:hidden;border-radius:28px}
      .lp-tone-white{background:var(--card);border:1px solid var(--line)}
      .lp-tone-soft{background:var(--soft)}
      .lp-tone-soft .lp-mock{background:var(--card)}
      .lp-tone-accent{background:linear-gradient(160deg,#2f95de,#0B68AD);--text:#fff;--muted:rgba(255,255,255,.78);--line:rgba(255,255,255,.22);--accent:#fff;color:#fff}
      .lp-tone-accent .lp-chip{background:rgba(255,255,255,.2);color:#fff}
      .lp-tone-accent .lp-mock{background:rgba(255,255,255,.14)}

      .lp-input{display:flex;align-items:center;border-radius:16px;border:1px solid var(--line);background:var(--soft);padding-left:14px}
      .lp-input:focus-within{border-color:var(--accent)}
      .lp-calc input[type=number]::-webkit-outer-spin-button,.lp-calc input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      .lp-calc input[type=number]{-moz-appearance:textfield;appearance:textfield}

      .lp-faq{background:var(--soft);border-radius:28px;padding:8px 8px 8px 24px;transition:background .2s}
      .lp-faq.is-open{background:var(--card);border:1px solid var(--line);padding:12px 12px 8px 24px}
      .lp-plus{display:grid;place-items:center;width:44px;height:44px;border-radius:999px;background:var(--card);border:1px solid var(--line);color:var(--text);flex-shrink:0}
      .lp-faq.is-open .lp-plus{background:transparent;border-color:transparent;color:var(--accent)}

      @keyframes lp-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      @keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      @keyframes lp-ping{0%{transform:scale(1);opacity:.6}80%,100%{transform:scale(2.4);opacity:0}}
      @keyframes lp-spin{to{transform:rotate(360deg)}}
      @keyframes lp-check{0%{stroke-dashoffset:48}100%{stroke-dashoffset:0}}
      @keyframes lp-pulse{0%{transform:scale(.8);opacity:.8}100%{transform:scale(1.6);opacity:0}}
      @keyframes lp-bar{0%{width:0%}100%{width:100%}}
      .lp-marquee{animation:lp-marquee 38s linear infinite}
      .lp-anim-float{animation:lp-float 6s ease-in-out infinite}
      .lp-ping{animation:lp-ping 2s cubic-bezier(0,0,.2,1) infinite}
      .lp-pulse{animation:lp-pulse 1.5s ease-out infinite}
      .lp-bar{animation:lp-bar 1.2s ease forwards}
      .lp-check{stroke-dasharray:48;stroke-dashoffset:48;animation:lp-check .5s ease forwards}
      .lp-spin,.lp-spin-w{display:inline-block;border-radius:999px;animation:lp-spin .9s linear infinite}
      .lp-spin{border:2px solid var(--tint);border-top-color:var(--accent)}
      .lp-spin-w{border:2px solid rgba(255,255,255,.35);border-top-color:#fff}
      @media (prefers-reduced-motion:reduce){.lp-marquee,.lp-anim-float,.lp-ping,.lp-pulse,.lp-bar,.lp-check,.lp-spin,.lp-spin-w{animation:none}}
    `}</style>
  );
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("Ctex-theme");
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("Ctex-theme", theme);
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
  return <p className="lp-eyebrow">{children}</p>;
}

function SectionHeading({ eyebrow, title, sub, align = "left" }) {
  return (
    <div
      className={
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"
      }
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="lp-h2 mt-3">{title}</h2>
      {sub && (
        <p className="t-muted mt-4 text-sm leading-relaxed sm:text-base">
          {sub}
        </p>
      )}
    </div>
  );
}

function Button({
  as = "button",
  variant = "primary",
  children,
  className = "",
  ...props
}) {
  const variants = {
    primary: "lp-btn-dark",
    light: "lp-btn-light",
    secondary: "lp-btn-line",
    ghost: "lp-btn-link",
  };
  const Comp = as;
  return (
    <Comp className={`lp-btn ${variants[variant]} ${className}`} {...props}>
      {children}
    </Comp>
  );
}

/*
  IconChip — accepts a `tone` prop.
  Supported tones: "accent" (default blue), "green", "orange", "oxblood".
  Uses inline style so it overrides the .lp-hchip gradient background
  without needing new CSS tokens.
*/
const CHIP_TONES = {
  accent: {
    background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
    boxShadow: "0 10px 22px -10px var(--accent)",
  },
  green: {
    background: "linear-gradient(135deg,#22C55E,#15803D)",
    boxShadow: "0 10px 22px -10px #15803D",
  },
  orange: {
    background: "linear-gradient(135deg,#FBBF24,#EA580C)",
    boxShadow: "0 10px 22px -10px #EA580C",
  },
  oxblood: {
    background: "linear-gradient(135deg,#9F1239,#4C0519)",
    boxShadow: "0 10px 22px -10px #7F1D1D",
  },
};

function IconChip({ icon: Icon, tone = "accent" }) {
  const palette = CHIP_TONES[tone] || CHIP_TONES.accent;
  return (
    <span
      className="lp-hchip"
      aria-hidden
      style={{
        background: palette.background,
        boxShadow: palette.boxShadow,
      }}
    >
      <Icon strokeWidth={2.2} />
    </span>
  );
}

const TOKEN =
  /("(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|'[^']*'|\/\/[^\n]*|\b(?:const|await|import|from|if|return|async|def)\b|\b\d+\b)/g;

function highlight(code) {
  return code.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return part;
    let cls = "c-str";
    if (part.startsWith("//")) cls = "c-cm";
    else if (/^\d+$/.test(part)) cls = "c-num";
    else if (/^[a-z]+$/.test(part)) cls = "c-kw";
    return (
      <span key={i} className={cls}>
        {part}
      </span>
    );
  });
}

function CodeWindow({ label = "request.js", lines }) {
  return (
    <div
      className="lp-dark relative w-full max-w-full overflow-hidden rounded-2xl"
      style={{ background: "var(--card)", border: "1px solid var(--line)" }}
    >
      <div className="lp-bb flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="t-muted font-mono text-[10px] sm:text-xs">{label}</span>
      </div>
      <pre className="t-text max-w-full overflow-x-auto whitespace-pre-wrap break-words px-4 py-4 font-mono text-[11px] leading-relaxed sm:px-6 sm:py-6 sm:text-[13px]">
        <code className="block min-w-0 whitespace-pre-wrap break-words">
          {highlight(lines)}
        </code>
      </pre>
    </div>
  );
}

function HeroStatusBadge({
  icon: Icon,
  label,
  tone = "success",
  delay = 0,
  className = "",
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.97 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`lp-card lp-shadow pointer-events-none flex items-center gap-2 !rounded-full px-3.5 py-2 text-[11px] font-medium ${className}`}
    >
      <Icon
        size={13}
        className={`shrink-0 ${tone === "success" ? "text-emerald-500" : "t-accent"}`}
      />
      <span className="t-text whitespace-nowrap">{label}</span>
    </motion.div>
  );
}

function FlowSteps({ steps }) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => (
        <div key={step.title} className="flex gap-3 sm:gap-4">
          <div className="flex flex-col items-center">
            <div
              className="t-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs"
              style={{ background: "var(--tint)", border: "1px solid var(--accent)" }}
            >
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <span
                className="my-1 w-px flex-1"
                style={{ background: "var(--line)" }}
              />
            )}
          </div>
          <div className="pb-6 sm:pb-8">
            <p className="t-text text-sm font-medium sm:text-base">{step.title}</p>
            <p className="t-muted mt-0.5 text-xs sm:mt-1 sm:text-sm">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const statusMeta = {
  success: { icon: CheckCircle2, color: "text-emerald-500", label: "Success" },
  pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
};

/* ------------------------------------------------------------------ */
/* Animated "Order Completed" card                                     */
/* ------------------------------------------------------------------ */

const ORDER_STAGES = [
  { title: "Complete your order" },
  {
    title: "Verifying payment",
    bar: "accent",
    steps: [
      ["Payment received", "dim"],
      ["Verifying with provider…", "spin"],
      ["Signed webhook", "todo"],
    ],
  },
  {
    title: "Payment verified",
    bar: "ok",
    steps: [
      ["Payment received", "done"],
      ["Verified with provider", "done"],
      ["Webhook delivered", "pulse"],
    ],
  },
  {
    title: "Finalizing",
    bar: "full",
    steps: [
      ["Payment received", "done"],
      ["Verified with provider", "done"],
      ["Webhook delivered", "done"],
    ],
  },
];

function OrderRow({ label, state }) {
  const dot = {
    dim: <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />,
    spin: <span className="lp-spin h-3 w-3" />,
    todo: (
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--line)" }}
      />
    ),
    done: <CheckCircle2 size={13} className="text-emerald-500" />,
    pulse: (
      <span className="relative flex h-2 w-2">
        <span
          className="lp-pulse absolute inline-flex h-full w-full rounded-full"
          style={{ background: "var(--accent)", opacity: 0.6 }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: "var(--accent)" }}
        />
      </span>
    ),
  }[state];
  const muted = state === "dim" || state === "todo";
  return (
    <div
      className={`flex items-center gap-2 ${muted ? "t-muted" : "t-text"} ${
        state === "todo" ? "opacity-50" : ""
      }`}
    >
      {dot}
      <span>{label}</span>
    </div>
  );
}

function SecuredLine() {
  return (
    <p className="t-muted mt-3 flex items-center justify-center gap-1 text-[10px]">
      <Lock size={10} /> Secured by Ctex PAY
    </p>
  );
}

function AnimatedOrderCard() {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setStage(4);
      return;
    }
    const ts = [800, 1800, 2600, 3400].map((ms, i) =>
      setTimeout(() => setStage(i + 1), ms),
    );
    return () => ts.forEach(clearTimeout);
  }, [reduceMotion]);

  const s = ORDER_STAGES[stage];

  return (
    <div className="lp-card lp-shadow lp-anim-float overflow-hidden p-5">
      <AnimatePresence mode="wait">
        {stage < 4 ? (
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            <p className="t-muted text-[11px] sm:text-xs">{s.title}</p>
            <p className="t-text mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
              ₦5,000.00
            </p>
            <p className="t-muted mt-0.5 font-mono text-[10px] sm:text-[11px]">
              order_10234
            </p>

            <div className="lp-bt mt-4 space-y-2.5 pt-3 text-[11px] sm:text-xs">
              {stage === 0 ? (
                <>
                  <div className="t-muted flex justify-between">
                    <span>Customer</span>
                    <span className="t-text font-mono">cus_8fh29a</span>
                  </div>
                  <div className="t-muted flex justify-between">
                    <span>Currency</span>
                    <span className="t-text font-mono">NGN</span>
                  </div>
                </>
              ) : (
                s.steps.map(([label, st]) => (
                  <OrderRow key={label} label={label} state={st} />
                ))
              )}
            </div>

            {stage === 0 ? (
              <div className="lp-accent mt-4 flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium sm:text-sm">
                <span className="lp-spin-w h-3.5 w-3.5" />
                Processing…
              </div>
            ) : (
              <div
                className="mt-4 h-1.5 w-full overflow-hidden rounded-full"
                style={{
                  background:
                    s.bar === "full" ? "rgba(16,185,129,.2)" : "var(--line)",
                }}
              >
                <div
                  className={`h-full rounded-full ${s.bar === "accent" ? "lp-bar" : ""}`}
                  style={{
                    width: "100%",
                    background: s.bar === "accent" ? "var(--accent)" : "#10b981",
                  }}
                />
              </div>
            )}
            <SecuredLine />
          </motion.div>
        ) : (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col items-center py-1 text-center">
              <div className="relative mb-3">
                {!reduceMotion && (
                  <span className="lp-pulse absolute inset-0 rounded-full bg-emerald-500/30" />
                )}
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-500"
                  >
                    <path
                      d="M4 12.5L9.5 18L20 6"
                      className={reduceMotion ? "" : "lp-check"}
                    />
                  </svg>
                </span>
              </div>
              <p className="t-text font-display text-lg font-medium sm:text-xl">
                Order Completed
              </p>
              <p className="t-muted mt-0.5 font-mono text-[10px] sm:text-[11px]">
                order_10234
              </p>

              <div className="lp-bt mt-4 w-full space-y-2 pt-3 text-left text-[11px] sm:text-xs">
                <div className="t-muted flex justify-between">
                  <span>Amount</span>
                  <span className="t-text font-mono font-medium">₦5,000.00</span>
                </div>
                <div className="t-muted flex justify-between">
                  <span>Customer</span>
                  <span className="t-text font-mono">cus_8fh29a</span>
                </div>
                <div className="t-muted flex justify-between">
                  <span>Status</span>
                  <span className="flex items-center gap-1 font-mono text-emerald-500">
                    <CheckCircle2 size={11} /> Paid
                  </span>
                </div>
              </div>

              <div className="mt-4 w-full rounded-full border border-emerald-500/30 bg-emerald-500/10 py-2 text-center text-xs font-medium text-emerald-500 sm:text-sm">
                Payment confirmed
              </div>
              <SecuredLine />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const links = [
    { label: "Product", href: "#features" },
    { label: "Developers", href: "#developers" },
    { label: "Solutions", href: "#merchant-flow" },
    { label: "Pricing", href: "#pricing" },
    { label: "Documentation", href: "#docs" },
  ];

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "lp-nav-blur" : ""
      }`}
    >
      <div className="lp-wrap flex items-center justify-between py-2 sm:py-3">
        <div className="flex items-center gap-6 lg:gap-10">
          <Link to="/" className="flex items-center">
            <img
              src={ImageLogo.Logo2}
              alt="Ctex PAY"
              className="h-14 w-[120px] object-contain sm:h-12 sm:w-[150px] lg:w-[170px]"
            />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="lp-nav-link">
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="lp-icon-btn"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link to="/login" className="lp-nav-link t-text">
            Log in
          </Link>
          <Link to="/signup" className="lp-btn lp-btn-dark">
            Get Started
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="lp-icon-btn"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="lp-icon-btn t-text"
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
            className="lp-bb overflow-hidden md:hidden"
            style={{ background: "var(--bg)" }}
          >
            <div className="lp-wrap flex flex-col gap-1 pb-5 pt-1">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="t-muted py-2.5 text-sm"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                <Button as={Link} to="/login" variant="secondary">
                  Log in
                </Button>
                <Link to="/signup" className="lp-btn lp-btn-dark">
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const TRANSACTION_POOL = [
  { ref: "order_10234", amount: "₦5,000.00", status: "success" },
  { ref: "order_10233", amount: "₦12,500.00", status: "success" },
  { ref: "order_10232", amount: "₦2,000.00", status: "pending" },
  { ref: "order_10231", amount: "₦8,750.00", status: "failed" },
  { ref: "order_10235", amount: "₦24,000.00", status: "success" },
  { ref: "order_10236", amount: "₦1,500.00", status: "success" },
  { ref: "order_10237", amount: "₦45,000.00", status: "pending" },
  { ref: "order_10238", amount: "₦7,250.00", status: "success" },
  { ref: "order_10239", amount: "₦18,900.00", status: "failed" },
  { ref: "order_10240", amount: "₦3,300.00", status: "success" },
  { ref: "order_10241", amount: "₦62,000.00", status: "success" },
  { ref: "order_10242", amount: "₦9,999.00", status: "pending" },
];

function LiveTransactionFeed() {
  const reduceMotion = useReducedMotion();
  const [feed, setFeed] = useState(() => TRANSACTION_POOL.slice(0, 4));
  const nextIndexRef = React.useRef(4);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setFeed((prev) => {
        const nextItem =
          TRANSACTION_POOL[nextIndexRef.current % TRANSACTION_POOL.length];
        nextIndexRef.current += 1;
        return [nextItem, ...prev].slice(0, 4);
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <div className="lp-divide px-5 pb-1">
      <AnimatePresence initial={false} mode="popLayout">
        {feed.map((r, i) => {
          const meta = statusMeta[r.status];
          return (
            <motion.div
              key={`${r.ref}-${i}-${r.amount}`}
              layout
              initial={
                reduceMotion ? undefined : { opacity: 0, y: -14, scale: 0.97 }
              }
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between gap-3 py-3"
            >
              <p className="t-text truncate font-mono text-[11px] sm:text-xs">
                {r.ref}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <span className="t-text font-mono text-[11px] sm:text-xs">
                  {r.amount}
                </span>
                <meta.icon size={14} className={meta.color} />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function HeroVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto h-[480px] w-full max-w-[560px] sm:h-[540px]">
      <div aria-hidden className="lp-glow absolute inset-[-8%]" />

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="lp-card lp-shadow absolute right-0 top-0 w-[92%] overflow-hidden sm:w-[86%]"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <p className="t-muted flex items-center gap-2 text-xs">
            <Receipt size={14} className="t-accent" />
            Transactions
          </p>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="lp-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>
        <LiveTransactionFeed />
      </motion.div>

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 left-0 w-[74%] sm:w-[62%]"
      >
        <AnimatedOrderCard />
      </motion.div>

      <HeroStatusBadge
        icon={Webhook}
        label="Webhook delivered"
        tone="info"
        delay={0.6}
        className="absolute left-0 top-[170px] sm:top-[190px]"
      />
      <HeroStatusBadge
        icon={CheckCircle2}
        label="Payment verified"
        tone="success"
        delay={0.75}
        className="absolute bottom-4 right-0 sm:bottom-8"
      />
    </div>
  );
}

function Hero() {
  const reduceMotion = useReducedMotion();
  const textBlock = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative overflow-hidden">
      <div className="lp-wrap grid gap-14 pb-16 pt-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10">
        <motion.div
          initial={reduceMotion ? undefined : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          variants={reduceMotion ? undefined : textBlock}
        >
          <div className="lp-card inline-flex items-center gap-2 !rounded-full px-3 py-1.5 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="lp-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="t-accent font-medium">
              Payment infrastructure for developers
            </span>
          </div>
          <h1 className="t-text mt-5 font-display text-[2.7rem] font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
            Accept <IconChip icon={Wallet} tone="green" /> payments.
            <span className="t-muted block">
              Build <IconChip icon={Webhook} tone="orange" /> faster.
            </span>
          </h1>
          <p className="t-text mt-5 max-w-md text-sm leading-relaxed sm:mt-6 sm:text-[15px]">
            Accept payments, verify transactions, and automate payment
            confirmation with a simple API built for modern businesses.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2 sm:mt-9 sm:gap-3">
            <Button as={Link} to="/signup">
              Get Started
            </Button>
            <Button as="a" href="#docs" variant="ghost">
              Read the Docs
              <ArrowRight size={15} />
            </Button>
          </div>
          <ul className="t-muted mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs sm:mt-9 sm:text-sm">
            {[
              "No SDK to install",
              "Your API key is the integration",
              "Signed webhooks",
            ].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="t-accent" />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <HeroVisual />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Capability marquee                                                  */
/* ------------------------------------------------------------------ */

function TrustBar() {
  const points = [
    { icon: Key, label: "API-first" },
    { icon: ShieldCheck, label: "Secure by default" },
    { icon: Users, label: "Developer-friendly" },
    { icon: Webhook, label: "Webhook powered" },
    { icon: RefreshCw, label: "Automatic retries" },
    { icon: Wallet, label: "Merchant wallet" },
    { icon: ArrowDownToLine, label: "Bank payouts" },
    { icon: ScrollText, label: "Audit logs" },
  ];
  const loop = [...points, ...points];
  return (
    <div
      className="overflow-hidden py-4"
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        maskImage:
          "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}
    >
      <div className="lp-marquee flex w-max items-center gap-3">
        {loop.map(({ icon: Icon, label }, i) => (
          <span
            key={`${label}-${i}`}
            className="lp-card t-muted flex items-center gap-2 whitespace-nowrap !rounded-full px-4 py-2 text-xs sm:text-sm"
          >
            <Icon size={15} className="t-accent shrink-0" />
            {label}
          </span>
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
    {
      problem: "Manual verification",
      solution: "Automatic verification + webhooks",
    },
    {
      problem: "Unclear transaction status",
      solution: "Real-time transaction state",
    },
    {
      problem: "Difficult API management",
      solution: "Simple key generation and rotation",
    },
  ];
  return (
    <section className="lp-wrap py-14 sm:py-24">
      <Reveal>
        <SectionHeading
          align="center"
          title="Payment integration shouldn't slow your product down."
          sub="Most delays come from the same handful of problems. Ctex PAY removes them one by one."
        />
      </Reveal>

      <div className="mt-10 grid gap-4 sm:mt-14 lg:grid-cols-2">
        <Reveal delay={0.08} className="lg:order-2">
          <div className="lp-bento lp-tone-accent lp-r40 p-6 sm:p-9">
            <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              With Ctex PAY
            </p>
            <ul className="mt-5 space-y-4">
              {rows.map((r) => (
                <li
                  key={r.solution}
                  className="flex items-center gap-3 text-sm font-medium sm:text-base"
                >
                  <CheckCircle2 size={18} className="shrink-0 text-white" />
                  {r.solution}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal className="lg:order-1">
          <div className="lp-soft lp-r40 h-full p-6 sm:p-9">
            <p className="t-muted text-sm font-medium">Without Ctex PAY</p>
            <ul className="mt-5 space-y-4">
              {rows.map((r) => (
                <li
                  key={r.problem}
                  className="t-muted flex items-center gap-3 text-sm sm:text-base"
                >
                  <XCircle size={18} className="shrink-0 text-red-500/80" />
                  {r.problem}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Core features (bento)                                               */
/* ------------------------------------------------------------------ */

function BentoCell({ icon: Icon, title, desc, children, tone = "white" }) {
  return (
    <div className={`lp-bento lp-tone-${tone} p-6 sm:p-7`}>
      <span className="lp-chip">
        <Icon size={17} />
      </span>
      <p className="t-text mt-5 text-base font-medium sm:text-lg">{title}</p>
      <p className="t-muted mt-1.5 text-xs leading-relaxed sm:text-sm">{desc}</p>
      <div className="mt-6 flex flex-1 flex-col justify-end">{children}</div>
    </div>
  );
}

function Features() {
  const compact = [
    {
      icon: Key,
      title: "API-First Payments",
      desc: "Integrate directly with the Ctex PAY API without installing an SDK.",
    },
    {
      icon: Users,
      title: "Customer Management",
      desc: "Create and manage customers directly from your API.",
    },
    {
      icon: Receipt,
      title: "Transaction Management",
      desc: "Track payment status and transaction history in one place.",
    },
    {
      icon: ArrowDownToLine,
      title: "Payouts",
      desc: "Withdraw eligible funds to your supported bank accounts.",
    },
  ];

  const chain = ["Customer pays", "Provider", "Verified", "Signed webhook"];

  return (
    <section id="features" className="lp-wrap py-14 sm:py-24">
      <Reveal>
        <SectionHeading
          align="center"
          title="One platform for your entire payment operation."
        />
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 md:grid-cols-2 lg:grid-cols-12">
        <Reveal className="md:col-span-2 lg:col-span-7">
          <BentoCell
            icon={CheckCircle2}
            title="Automatic Verification"
            desc="Ctex PAY verifies transactions before reporting successful payments."
          >
            <div className="lp-mock flex flex-wrap items-center gap-2 p-4 font-mono text-[10px] sm:text-xs">
              {chain.map((c, i) => (
                <React.Fragment key={c}>
                  <span
                    className={`rounded-full px-3 py-1.5 ${
                      i === 2
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                        : "t-text"
                    }`}
                    style={
                      i === 2
                        ? undefined
                        : { border: "1px solid var(--line)", background: "var(--soft)" }
                    }
                  >
                    {c}
                  </span>
                  {i < chain.length - 1 && (
                    <ArrowRight size={11} className="t-muted shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </BentoCell>
        </Reveal>

        <Reveal delay={0.04} className="md:col-span-2 lg:col-span-5">
          <BentoCell
            icon={Lock}
            title="API Keys"
            desc="Generate, rotate, and revoke API keys directly from your dashboard."
            tone="soft"
          >
            <div className="lp-mock space-y-2.5 p-4 font-mono text-[10px] sm:text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="t-text truncate">Ctex_live_••••8f21</span>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-500">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="t-text truncate">Ctex_test_••••1a09</span>
                <span
                  className="t-accent shrink-0 rounded-full px-2 py-0.5"
                  style={{ background: "var(--tint)" }}
                >
                  Test
                </span>
              </div>
            </div>
          </BentoCell>
        </Reveal>

        <Reveal className="lg:col-span-4">
          <BentoCell
            icon={Webhook}
            title="Webhooks"
            desc="Receive secure payment notifications directly on your server."
            tone="soft"
          >
            <div className="lp-mock space-y-2 p-4 font-mono text-[10px] sm:text-xs">
              {["payment.success", "payment.success", "payment.pending"].map(
                (e, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="t-text">{e}</span>
                    <span className="text-emerald-500">200 OK</span>
                  </div>
                ),
              )}
            </div>
          </BentoCell>
        </Reveal>

        <Reveal delay={0.04} className="lg:col-span-4">
          <BentoCell
            icon={Wallet}
            title="Merchant Wallet"
            desc="Monitor available funds and balances as payments settle."
            tone="accent"
          >
            <div className="lp-mock p-4">
              <p className="t-muted text-[10px] sm:text-xs">Available balance</p>
              <p className="t-text mt-1 font-mono text-lg sm:text-xl">
                ₦482,300.00
              </p>
            </div>
          </BentoCell>
        </Reveal>

        <Reveal delay={0.08} className="md:col-span-2 lg:col-span-4">
          <BentoCell
            icon={ShieldCheck}
            title="Idempotency & Retries"
            desc="Duplicate requests are ignored; transient failures retry safely."
          >
            <div className="lp-mock space-y-1.5 p-4 font-mono text-[10px] sm:text-xs">
              <p className="t-muted">Idempotency-Key: order_10234</p>
              <p className="t-text flex items-center gap-1.5">
                <RefreshCw size={11} className="t-accent" /> Retried after timeout
              </p>
              <p className="text-emerald-500">Charged once</p>
            </div>
          </BentoCell>
        </Reveal>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {compact.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.04}>
            <div className="lp-soft h-full p-6">
              <span className="lp-chip">
                <f.icon size={16} />
              </span>
              <p className="t-text mt-4 text-sm font-medium sm:text-base">
                {f.title}
              </p>
              <p className="t-muted mt-1.5 text-xs leading-relaxed sm:text-sm">
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
/* Developers + Webhooks                                               */
/* ------------------------------------------------------------------ */

function DeveloperSection() {
  const tabs = {
    "Node.js": `const res = await fetch("https://api.Ctexpay.online/v1/payments", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.Ctex_SECRET_KEY}\`,
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
    cURL: `curl https://api.Ctexpay.com/v1/payments \\
  -H "Authorization: Bearer $Ctex_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 500000,
    "currency": "NGN",
    "customer": "cus_8fh29a",
    "reference": "order_10234"
  }'`,
    Python: `import requests

response = requests.post(
    "https://api.Ctexpay.online/v1/payments",
    headers={
        "Authorization": f"Bearer {Ctex_SECRET_KEY}",
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
    PHP: `$ch = curl_init("https://api.Ctexpay.online/v1/payments");

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . getenv("Ctex_SECRET_KEY"),
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
    JavaScript: `const res = await fetch("https://api.Ctexpay.online/v1/payments", {
  method: "POST",
  headers: {
    Authorization: "Bearer Ctex_SECRET_KEY",
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
    { title: "Create account", desc: "Sign up for Ctex PAY in a few minutes." },
    {
      title: "Create merchant",
      desc: "Register the business you're collecting payments for.",
    },
    {
      title: "Generate API key",
      desc: "Create a key from your dashboard — no approval wait.",
    },
    {
      title: "Add API to your application",
      desc: "Call the API directly. No SDK required.",
    },
    {
      title: "Receive webhook",
      desc: "Ctex PAY notifies your server the moment status changes.",
    },
    {
      title: "Verify payment",
      desc: "Confirm the signature, then mark the order paid.",
    },
  ];

  const flow = [
    {
      title: "Customer pays",
      desc: "Your customer completes payment at checkout.",
    },
    {
      title: "Ctex PAY verifies transaction",
      desc: "The payment is confirmed with the provider, not assumed.",
    },
    {
      title: "Ctex PAY signs webhook",
      desc: "A signed event is generated for your endpoint.",
    },
    {
      title: "Merchant receives webhook",
      desc: "Your server gets a POST request with the event payload.",
    },
    {
      title: "Merchant verifies signature",
      desc: "Confirm the request actually came from Ctex PAY.",
    },
    {
      title: "Merchant updates order",
      desc: "Mark the order paid and continue your flow.",
    },
  ];

  const webhookCode = `import crypto from "crypto";

app.post("/webhooks/Ctexpay", (req, res) => {
  const signature = req.headers["x-Ctex-signature"];
  const expected = crypto
    .createHmac("sha256", process.env.Ctex_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (signature !== expected) return res.sendStatus(401);

  if (req.body.event === "payment.success") {
    markOrderPaid(req.body.data.reference);
  }

  res.sendStatus(200);
});`;

  const ext =
    active === "Python"
      ? "py"
      : active === "PHP"
        ? "php"
        : active === "cURL"
          ? "sh"
          : "js";

  return (
    <section id="developers" className="lp-wrap py-6 sm:py-10">
      <div className="lp-dark lp-r40 relative overflow-hidden p-6 sm:p-10 lg:p-14">
        <div
          aria-hidden
          className="lp-glow pointer-events-none absolute -right-32 -top-24 h-[460px] w-[620px]"
        />

        <div className="relative">
          <Reveal>
            <SectionHeading
              eyebrow="For developers"
              title="One API. Everything your payment flow needs."
            />
          </Reveal>

          <div className="mt-10 grid gap-10 sm:mt-14 lg:grid-cols-2 lg:items-start lg:gap-12">
            <Reveal>
              <FlowSteps steps={steps} />
            </Reveal>

            <Reveal delay={0.08}>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(tabs).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActive(tab)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 font-mono text-[10px] transition-colors sm:text-xs ${
                      active === tab ? "t-accent" : "t-muted"
                    }`}
                    style={{
                      border: `1px solid ${active === tab ? "var(--accent)" : "var(--line)"}`,
                      background: active === tab ? "var(--tint)" : "transparent",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-3 sm:mt-4">
                <CodeWindow label={`payments.${ext}`} lines={tabs[active]} />
              </div>
            </Reveal>
          </div>

          <div className="lp-bt mt-16 pt-14 sm:mt-24 sm:pt-20">
            <Reveal>
              <SectionHeading
                eyebrow="Webhooks"
                title="Know when a payment is complete."
                sub="Set your webhook URL from the dashboard, and Ctex PAY will notify your server the moment a transaction's status changes — signed, so you can trust what you receive."
              />
            </Reveal>

            <div className="mt-10 grid gap-10 sm:mt-14 lg:grid-cols-2 lg:items-start lg:gap-12">
              <Reveal>
                <FlowSteps steps={flow} />
              </Reveal>
              <Reveal delay={0.08}>
                <CodeWindow label="webhooks.js" lines={webhookCode} />
              </Reveal>
            </div>
          </div>
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
    {
      icon: Key,
      title: "API key security",
      desc: "Keys are hashed at rest and scoped to permissions you set.",
    },
    {
      icon: Webhook,
      title: "Webhook signatures",
      desc: "Every webhook is signed so you can confirm its origin.",
    },
    {
      icon: CheckCircle2,
      title: "Transaction verification",
      desc: "Payments are confirmed with the provider before they're reported as successful.",
    },
    {
      icon: ShieldCheck,
      title: "Idempotency",
      desc: "Duplicate requests are detected and safely ignored.",
    },
    {
      icon: RefreshCw,
      title: "Automatic retries",
      desc: "Transient failures are retried without duplicating charges.",
    },
    {
      icon: UserCheck,
      title: "Permission-based access",
      desc: "API access is scoped to what each key is allowed to do.",
    },
    {
      icon: Lock,
      title: "Merchant isolation",
      desc: "Each merchant's data and keys are kept fully separate.",
    },
    {
      icon: ScrollText,
      title: "Audit logs",
      desc: "Key actions on your account are recorded for review.",
    },
  ];

  const pipeline = [
    "Merchant",
    "Ctex PAY",
    "Payment Provider",
    "Verification",
    "Signed Webhook",
    "Merchant Server",
  ];

  return (
    <section id="security" className="lp-wrap py-14 sm:py-24">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Security"
          title="Payments should be verified, not assumed."
          sub="A successful payment response should never be trusted blindly. Ctex PAY verifies transactions before treating them as successful."
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="lp-card mt-8 flex flex-wrap items-center justify-center gap-2 p-4 font-mono text-[10px] sm:mt-12 sm:p-6 sm:text-xs">
          {pipeline.map((step, i) => (
            <React.Fragment key={step}>
              <span
                className={`whitespace-nowrap rounded-full px-3 py-1.5 ${
                  i === 4 ? "t-accent" : "t-muted"
                }`}
                style={{
                  border: `1px solid ${i === 4 ? "var(--accent)" : "var(--line)"}`,
                  background: i === 4 ? "var(--tint)" : "var(--soft)",
                }}
              >
                {step}
              </span>
              {i < pipeline.length - 1 && (
                <ArrowRight size={11} className="t-muted shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </Reveal>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={(i % 4) * 0.04}>
            <div className={`${i % 2 === 0 ? "lp-soft" : "lp-card"} h-full p-6`}>
              <span className="lp-chip">
                <it.icon size={16} />
              </span>
              <p className="t-text mt-4 text-sm font-medium sm:text-base">
                {it.title}
              </p>
              <p className="t-muted mt-1.5 text-xs leading-relaxed sm:text-sm">
                {it.desc}
              </p>
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
    {
      ref: "order_10234",
      customer: "cus_8fh29a",
      amount: "₦5,000.00",
      status: "success",
    },
    {
      ref: "order_10233",
      customer: "cus_2ka91c",
      amount: "₦12,500.00",
      status: "success",
    },
    {
      ref: "order_10232",
      customer: "cus_9jd03f",
      amount: "₦2,000.00",
      status: "pending",
    },
    {
      ref: "order_10231",
      customer: "cus_71la5v",
      amount: "₦8,750.00",
      status: "failed",
    },
  ];

  return (
    <section className="lp-wrap pb-14 pt-4 sm:pb-24">
      <Reveal>
        <SectionHeading
          align="center"
          title="Every transaction, key, and webhook in one view."
          sub="Interface example with demo values — this is what your dashboard looks like once you're set up."
        />
      </Reveal>

      <Reveal delay={0.08}>
        <div className="relative mt-8 sm:mt-12">
          <div aria-hidden className="lp-glow absolute -inset-x-6 -inset-y-8 -z-10" />
          <div className="lp-card lp-r40 lp-shadow overflow-hidden">
            <div className="lp-bb flex items-center gap-1.5 px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="t-muted ml-3 font-mono text-[10px] sm:text-xs">
                Dashboard
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5 sm:p-5">
              {stats.map((s) => (
                <div key={s.label} className="lp-soft !rounded-2xl px-4 py-4">
                  <p className="t-muted text-[10px] sm:text-xs">{s.label}</p>
                  <p className="t-text mt-1 font-mono text-sm sm:mt-1.5 sm:text-lg">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="lp-bt grid lg:grid-cols-[1.4fr_1fr]">
              <div className="lp-bb p-5 sm:p-6 lg:border-b-0 lg:border-r lg:[border-right:1px_solid_var(--line)]">
                <p className="t-text text-xs font-medium sm:text-sm">
                  Recent transactions
                </p>
                <div className="lp-divide mt-3 sm:mt-4">
                  {transactions.map((t) => {
                    const meta = statusMeta[t.status];
                    return (
                      <div
                        key={t.ref}
                        className="flex items-center justify-between gap-2 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="t-text truncate font-mono text-[10px] sm:text-xs">
                            {t.ref}
                          </p>
                          <p className="t-muted mt-0.5 truncate font-mono text-[9px] sm:text-[11px]">
                            {t.customer}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                          <span className="t-text font-mono text-[10px] sm:text-xs">
                            {t.amount}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-[10px] sm:text-xs ${meta.color}`}
                          >
                            <meta.icon size={11} />
                            <span className="hidden sm:inline">{meta.label}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <p className="t-text text-xs font-medium sm:text-sm">API keys</p>
                <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] sm:text-xs">
                    <span className="t-text truncate">
                      Ctex_live_saka_••••••••8f21
                    </span>
                    <span className="shrink-0 text-emerald-500">Active</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] sm:text-xs">
                    <span className="t-text truncate">
                      Ctex_test_saka_••••••••1a09
                    </span>
                    <span className="t-muted shrink-0">Test mode</span>
                  </div>
                </div>

                <p className="t-text mt-5 text-xs font-medium sm:mt-6 sm:text-sm">
                  Webhook status
                </p>
                <div className="mt-2.5 flex items-center gap-2 font-mono text-[10px] sm:mt-3 sm:text-xs">
                  <Circle
                    size={7}
                    className="shrink-0 fill-emerald-500 text-emerald-500"
                  />
                  <span className="t-text truncate">
                    api.yourapp.com/webhooks/Ctexpay
                  </span>
                </div>
                <p className="t-muted mt-1 text-[10px] sm:text-[11px]">
                  Last delivery succeeded
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Merchant + customer experience                                     */
/* ------------------------------------------------------------------ */

function MerchantFlow() {
  const steps = [
    { title: "Create account", desc: "Sign up as a merchant on Ctex PAY." },
    {
      title: "Create business",
      desc: "Register the business you're collecting payments for.",
    },
    {
      title: "Generate API key",
      desc: "Create keys scoped to what your app needs.",
    },
    {
      title: "Configure webhook",
      desc: "Point Ctex PAY at your server's webhook endpoint.",
    },
    {
      title: "Integrate API",
      desc: "Call the payments API directly from your application.",
    },
    {
      title: "Accept payments",
      desc: "Customers pay; you get notified automatically.",
    },
    {
      title: "Monitor transactions",
      desc: "Track status and history from your dashboard.",
    },
    {
      title: "Withdraw funds",
      desc: "Move eligible balance to your bank account.",
    },
  ];

  return (
    <section id="merchant-flow" className="lp-wrap py-14 sm:py-24">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Merchant experience"
          title="From account to payout, in one flow."
        />
      </Reveal>
      <Reveal delay={0.06}>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={`${i % 2 === 0 ? "lp-soft" : "lp-card"} p-4 sm:p-6`}
            >
              <span className="lp-chip font-mono text-xs">{i + 1}</span>
              <p className="t-text mt-4 text-xs font-medium sm:text-base">
                {s.title}
              </p>
              <p className="t-muted mt-1 text-[11px] leading-relaxed sm:text-sm">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function CustomerFlow() {
  const steps = [
    "Merchant website",
    "Checkout",
    "Customer payment",
    "Ctex PAY",
    "Payment provider",
    "Verification",
    "Merchant webhook",
  ];
  return (
    <section className="lp-wrap py-6 sm:py-10">
      <div className="lp-soft lp-r40 p-6 sm:p-12">
        <Reveal>
          <SectionHeading
            eyebrow="Customer experience"
            title="Simple for the person paying, too."
            sub="Ctex PAY sits between your checkout and the payment provider, so your customer only ever sees a single, consistent payment experience."
          />
        </Reveal>
        <Reveal delay={0.06}>
          <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3 font-mono text-[10px] sm:mt-12 sm:text-xs md:text-sm">
            {steps.map((step, i) => (
              <React.Fragment key={step}>
                <span
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 sm:px-4 sm:py-2 ${
                    step === "Ctex PAY" ? "lp-accent" : "lp-card t-text !rounded-full"
                  }`}
                >
                  {step}
                </span>
                {i < steps.length - 1 && (
                  <ArrowRight size={12} className="t-muted shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing + Calculator                                                */
/* ------------------------------------------------------------------ */

/* All money math in kobo to avoid float drift. Rates in basis points. */

const BPS_ONE_HUNDRED_PERCENT = 10_000;
const PAYIN_MIN_KOBO = 5_000; // ₦50
const PAYIN_MAX_KOBO = 100_000_000_000; // ₦1,000,000,000
const PAYOUT_MIN_KOBO = 10_000; // ₦100
const PAYOUT_MAX_KOBO = 500_000_000; // ₦5,000,000

/* Payout tier mirror of the C-TEX backend withdrawal fee tiers. */
const PAYOUT_TIERS = [
  { key: "UNDER_10000", min: 1, maxExclusive: 1_000_000, feeKobo: 2_000 }, // ₦0.01–₦9,999.99 → ₦20 fee
  {
    key: "FROM_10000_TO_50000",
    min: 1_000_000,
    maxExclusive: 5_000_000,
    feeKobo: 4_000,
  }, // ₦10,000–₦49,999.99 → ₦40 fee
  { key: "FROM_50000", min: 5_000_000, maxExclusive: null, feeKobo: 8_000 }, // ₦50,000+ → ₦80 fee
];

/* Default payin pricing for the calculator — these are illustrative
 * and configurable from your C-TEX dashboard per merchant. */
const DEFAULT_PAYIN_PRICING = {
  percentageRateBps: 160, // 1.60%
  fixedAmount: 0, // ₦0
  minimumFee: 0,
  maximumFee: 210_000, // ₦2,100 cap
};

function formatNairaFromKobo(kobo) {
  if (!Number.isFinite(Number(kobo))) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(kobo) / 100);
}

function pickPayoutTier(amountKobo) {
  if (!Number.isFinite(amountKobo) || amountKobo <= 0) return null;
  return (
    PAYOUT_TIERS.find(
      (t) =>
        amountKobo >= t.min &&
        (t.maxExclusive == null || amountKobo < t.maxExclusive),
    ) || null
  );
}

/* Pure payin calculation: returns serviceFee, merchantNet, errors */
function computePayinBreakdown({ grossKobo, pricing = DEFAULT_PAYIN_PRICING }) {
  const errors = [];
  if (!Number.isInteger(grossKobo)) {
    errors.push("Enter a valid amount");
    return { serviceFee: 0, merchantNet: 0, errors };
  }
  if (grossKobo < PAYIN_MIN_KOBO)
    errors.push(`Minimum payment is ${formatNairaFromKobo(PAYIN_MIN_KOBO)}`);
  if (grossKobo > PAYIN_MAX_KOBO)
    errors.push(`Maximum payment is ${formatNairaFromKobo(PAYIN_MAX_KOBO)}`);
  if (errors.length) return { serviceFee: 0, merchantNet: 0, errors };

  const percentage = Math.round(
    (grossKobo * Number(pricing.percentageRateBps || 0)) /
      BPS_ONE_HUNDRED_PERCENT,
  );
  let fee = percentage + Number(pricing.fixedAmount || 0);

  const minFee = Number(pricing.minimumFee || 0);
  if (fee < minFee) fee = minFee;

  if (pricing.maximumFee != null) {
    const maxFee = Number(pricing.maximumFee);
    if (fee > maxFee) fee = maxFee;
  }
  if (fee > grossKobo) fee = grossKobo;

  return {
    serviceFee: fee,
    merchantNet: grossKobo - fee,
    errors: [],
  };
}

/* Pure payout calculation using fixed tiers */
function computePayoutBreakdown({ amountKobo, feeMode }) {
  const errors = [];
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    errors.push("Enter a valid amount");
    return { feeAmount: 0, walletDebit: 0, beneficiary: 0, tier: null, errors };
  }
  if (amountKobo < PAYOUT_MIN_KOBO)
    errors.push(
      `Minimum withdrawal is ${formatNairaFromKobo(PAYOUT_MIN_KOBO)}`,
    );
  if (amountKobo > PAYOUT_MAX_KOBO)
    errors.push(
      `Maximum withdrawal is ${formatNairaFromKobo(PAYOUT_MAX_KOBO)}`,
    );
  if (errors.length)
    return { feeAmount: 0, walletDebit: 0, beneficiary: 0, tier: null, errors };

  const tier = pickPayoutTier(amountKobo);
  if (!tier) {
    errors.push("No fee tier covers this amount");
    return { feeAmount: 0, walletDebit: 0, beneficiary: 0, tier: null, errors };
  }

  const feeAmount = tier.feeKobo;
  const walletDebit =
    feeMode === "FEE_ON_TOP" ? amountKobo + feeAmount : amountKobo;
  const beneficiary =
    feeMode === "FEE_ON_TOP" ? amountKobo : amountKobo - feeAmount;

  if (beneficiary <= 0) {
    errors.push("Amount is too small after the applicable charge");
    return { feeAmount, walletDebit, beneficiary: 0, tier, errors };
  }
  if (walletDebit > PAYOUT_MAX_KOBO)
    errors.push(`Total debit exceeds ${formatNairaFromKobo(PAYOUT_MAX_KOBO)}`);

  return { feeAmount, walletDebit, beneficiary, tier, errors };
}

function TabButton({ active, onClick, children, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
        active ? "" : "t-muted"
      }`}
      style={active ? { background: "var(--ink)", color: "var(--ink-fg)" } : undefined}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function PricingCalculator() {
  const [tab, setTab] = useState("payin");
  const [payinInput, setPayinInput] = useState("25000");
  const [payoutInput, setPayoutInput] = useState("25000");
  const [feeMode, setFeeMode] = useState("FEE_ON_TOP");

  const payinKobo = useMemo(() => {
    const n = Number(payinInput);
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  }, [payinInput]);

  const payoutKobo = useMemo(() => {
    const n = Number(payoutInput);
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  }, [payoutInput]);

  const payin = useMemo(
    () => computePayinBreakdown({ grossKobo: payinKobo }),
    [payinKobo],
  );

  const payout = useMemo(
    () => computePayoutBreakdown({ amountKobo: payoutKobo, feeMode }),
    [payoutKobo, feeMode],
  );

  const activeError = tab === "payin" ? payin.errors[0] : payout.errors[0];
  const showError = Boolean(activeError);

  const modeBtn = (mode, label) => (
    <button
      type="button"
      onClick={() => setFeeMode(mode)}
      aria-pressed={feeMode === mode}
      className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
        feeMode === mode ? "" : "t-muted"
      }`}
      style={
        feeMode === mode
          ? { background: "var(--ink)", color: "var(--ink-fg)" }
          : undefined
      }
    >
      {label}
    </button>
  );

  return (
    <div className="lp-calc lp-card lp-r40 lp-shadow relative overflow-hidden">
      <div className="lp-bb flex items-center gap-2 px-5 py-4 sm:px-7">
        <Calculator size={16} className="t-accent" />
        <p className="t-text text-sm font-medium">Pricing calculator</p>
      </div>

      <div className="lp-soft mx-5 mt-5 flex !rounded-full p-1 sm:mx-7">
        <TabButton
          active={tab === "payin"}
          onClick={() => setTab("payin")}
          icon={Receipt}
        >
          Payin
        </TabButton>
        <TabButton
          active={tab === "payout"}
          onClick={() => setTab("payout")}
          icon={ArrowDownToLine}
        >
          Payout
        </TabButton>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        <AnimatePresence mode="wait">
          {tab === "payin" ? (
            <motion.div
              key="payin"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <label className="block">
                <span className="t-muted text-xs font-medium">
                  Customer pays (NGN)
                </span>
                <div className="lp-input mt-1.5">
                  <span className="t-muted pr-2 font-mono text-sm">₦</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={payinInput}
                    onChange={(e) => setPayinInput(e.target.value)}
                    className="t-text h-11 w-full bg-transparent pr-3 text-sm outline-none"
                    placeholder="25000"
                    aria-label="Payin amount in naira"
                  />
                </div>
              </label>

              <div className="lp-soft !rounded-2xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="t-muted">C-TEX service fee</span>
                    <span className="t-text font-mono">
                      {showError ? "—" : formatNairaFromKobo(payin.serviceFee)}
                    </span>
                  </div>
                  <div className="lp-bt flex items-center justify-between gap-3 pt-2">
                    <span className="t-text font-medium">You receive</span>
                    <span className="font-mono font-semibold text-emerald-500">
                      {showError ? "—" : formatNairaFromKobo(payin.merchantNet)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="t-muted flex items-start gap-2 text-[11px] leading-relaxed">
                <Info size={13} className="mt-0.5 shrink-0" />
                Based on {DEFAULT_PAYIN_PRICING.percentageRateBps / 100}% +{" "}
                {formatNairaFromKobo(DEFAULT_PAYIN_PRICING.fixedAmount)} per
                successful payment, capped at{" "}
                {formatNairaFromKobo(DEFAULT_PAYIN_PRICING.maximumFee)}. Actual
                pricing is set per merchant in the dashboard.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="payout"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <label className="block">
                <span className="t-muted text-xs font-medium">
                  Withdrawal amount (NGN)
                </span>
                <div className="lp-input mt-1.5">
                  <span className="t-muted pr-2 font-mono text-sm">₦</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={payoutInput}
                    onChange={(e) => setPayoutInput(e.target.value)}
                    className="t-text h-11 w-full bg-transparent pr-3 text-sm outline-none"
                    placeholder="25000"
                    aria-label="Payout amount in naira"
                  />
                </div>
              </label>

              <div>
                <span className="t-muted text-xs font-medium">Charge mode</span>
                <div className="lp-soft mt-1.5 flex !rounded-full p-1">
                  {modeBtn("FEE_ON_TOP", "Fee on top")}
                  {modeBtn("DEDUCT_FROM_AMOUNT", "Deduct from amount")}
                </div>
              </div>

              <div className="lp-soft !rounded-2xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="t-muted">Withdrawal charge</span>
                    <span className="t-text font-mono">
                      {showError ? "—" : formatNairaFromKobo(payout.feeAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="t-muted">Wallet debit</span>
                    <span className="t-text font-mono">
                      {showError ? "—" : formatNairaFromKobo(payout.walletDebit)}
                    </span>
                  </div>
                  <div className="lp-bt flex items-center justify-between gap-3 pt-2">
                    <span className="t-text font-medium">Beneficiary receives</span>
                    <span className="font-mono font-semibold text-emerald-500">
                      {showError ? "—" : formatNairaFromKobo(payout.beneficiary)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="t-muted flex items-start gap-2 text-[11px] leading-relaxed">
                <Info size={13} className="mt-0.5 shrink-0" />
                Fixed tier charges:{" "}
                {PAYOUT_TIERS.map((t, i) => (
                  <React.Fragment key={t.key}>
                    {i > 0 ? " · " : ""}
                    {formatNairaFromKobo(t.feeKobo)} under{" "}
                    {t.maxExclusive == null
                      ? "any amount"
                      : formatNairaFromKobo(t.maxExclusive)}
                  </React.Fragment>
                ))}
                . Actual rates are configured in the dashboard.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {showError && (
          <p
            role="alert"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400"
          >
            {activeError}
          </p>
        )}
      </div>
    </div>
  );
}

function Pricing() {
  const features = [
    "Pay only for successful transactions",
    "No hidden integration costs",
    "Full access to the dashboard and API",
    "Transparent fee breakdown on every transaction",
  ];

  return (
    <section id="pricing" className="lp-wrap py-14 sm:py-24">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Pricing"
          title="Simple, transparent transaction pricing."
          sub="Estimate exactly what you'll earn on a payin, or what a payout will cost — before you build."
        />
      </Reveal>

      <div className="mt-8 grid gap-4 sm:mt-12 lg:grid-cols-[1fr_minmax(0,480px)] lg:items-stretch">
        <Reveal delay={0.05}>
          <div className="lp-bento lp-tone-accent lp-r40 p-6 sm:p-10">
            <p className="font-display text-xl font-medium sm:text-2xl">
              Transaction fee
            </p>
            <p className="t-muted mt-1.5 text-xs sm:mt-2 sm:text-sm">
              Configured by C-TEX PAY per merchant. No setup fees, no monthly
              minimums.
            </p>
            <ul className="mt-5 flex-1 space-y-2.5 text-xs sm:mt-6 sm:space-y-3 sm:text-sm">
              {features.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 text-white" />
                  {t}
                </li>
              ))}
            </ul>
            <Button as={Link} to="/signup" variant="light" className="mt-6 w-full sm:mt-8">
              Get Started
              <ArrowRight size={15} />
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <PricingCalculator />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Docs CTA                                                            */
/* ------------------------------------------------------------------ */

function DocsCTA() {
  return (
    <section id="docs" className="lp-wrap py-6 sm:py-10">
      <div className="lp-soft lp-r40 grid gap-8 p-6 sm:gap-10 sm:p-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <Eyebrow>Documentation</Eyebrow>
          <h2 className="lp-h2 mt-3">Ready to integrate?</h2>
          <div className="mt-6 flex flex-wrap items-center gap-2 sm:mt-8 sm:gap-3">
            <Button as="a" href="/docs">
              Read Documentation
            </Button>
            <Button as={Link} to="/signup" variant="ghost">
              Create Account
              <ArrowRight size={15} />
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <CodeWindow
            label="quickstart.sh"
            lines={`curl https://api.Ctexpay.com/v1/payments \\
  -H "Authorization: Bearer $Ctex_API_KEY" \\
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
    {
      q: "Do I need an SDK?",
      a: "No. Ctex PAY is designed around direct API integration.",
    },
    {
      q: "How do I authenticate API requests?",
      a: "Using your Ctex PAY API key, passed as a bearer token.",
    },
    {
      q: "Can I configure webhooks?",
      a: "Yes. Merchants can configure their webhook endpoint from their dashboard.",
    },
    {
      q: "How are payments verified?",
      a: "Ctex PAY verifies payment information before treating a transaction as successful.",
    },
    {
      q: "Can I withdraw my funds?",
      a: "Yes, eligible merchant funds can be withdrawn to supported bank accounts.",
    },
    {
      q: "Can I rotate my API keys?",
      a: "Yes, keys can be rotated at any time from your dashboard.",
    },
    {
      q: "Can I revoke an API key?",
      a: "Yes, revoked keys stop working immediately.",
    },
    {
      q: "Is Ctex PAY suitable for developers?",
      a: "Yes. The platform is designed with API-first integration in mind.",
    },
  ];
  const [open, setOpen] = useState(0);

  return (
    <section className="lp-wrap py-14 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Common questions." />
        </Reveal>

        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className={`lp-faq ${isOpen ? "is-open" : ""}`}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 py-1 text-left sm:gap-4"
                >
                  <span className="t-text text-sm font-medium sm:text-base">
                    {f.q}
                  </span>
                  <span className="lp-plus">
                    {isOpen ? <X size={16} /> : <Plus size={16} />}
                  </span>
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
                      <p className="t-muted pb-4 pr-12 pt-1 text-xs leading-relaxed sm:text-sm">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                           */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  return (
    <section className="lp-wrap py-3 sm:py-6">
      <div className="lp-card lp-r40 relative px-6 py-7 sm:px-12 sm:py-8 lg:py-7">
        {/* Decorative glow — clipped inside the banner */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <div className="lp-glow absolute -right-24 top-0 h-[420px] w-[620px]" />
        </div>

        <div className="relative grid min-h-[260px] items-stretch gap-4 overflow-visible md:min-h-[250px] lg:min-h-[280px] lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div className="relative z-10 flex max-w-xl flex-col justify-center py-2 md:py-4">
              <h2 className="lp-h2 max-w-xl !text-[clamp(2rem,3.5vw,2.75rem)] !leading-tight">
                The future of payments
                <br />
                is <span className="text-blue-500">borderless</span>
              </h2>

              <p className="t-muted mt-2 max-w-md text-sm leading-snug sm:text-base">
                Your business deserves to be world-class. Join thousands of
                merchants and businesses already scaling with C-TEX PAY.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
                <Button as={Link} to="/signup">
                  Get started now
                </Button>

                <Button as="a" href="#docs" variant="ghost">
                  View documentation
                  <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          </Reveal>

          <div className="relative hidden md:block">
            <img
              src={ImageLogo.Women}
              alt="Businesswoman using C-TEX PAY"
              draggable="false"
              className="
                pointer-events-none
                absolute
                bottom-0
                right-[-1.5rem]
                h-[360px]
                w-auto
                max-w-none
                select-none
                object-contain
                object-bottom
                md:h-[390px]
                lg:right-[-2rem]
                lg:h-[440px]
              "
              style={{
                maskImage: `
                  linear-gradient(to bottom,
                    black 0%,
                    black 65%,
                    rgba(0,0,0,0.85) 75%,
                    rgba(0,0,0,0.4) 88%,
                    transparent 100%
                  ),
                  linear-gradient(to right,
                    transparent 0%,
                    black 8%,
                    black 92%,
                    transparent 100%
                  )
                `,
                WebkitMaskImage: `
                  linear-gradient(to bottom,
                    black 0%,
                    black 65%,
                    rgba(0,0,0,0.85) 75%,
                    rgba(0,0,0,0.4) 88%,
                    transparent 100%
                  ),
                  linear-gradient(to right,
                    transparent 0%,
                    black 8%,
                    black 92%,
                    transparent 100%
                  )
                `,
                maskComposite: "intersect",
                WebkitMaskComposite: "source-in",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  const columns = [
    {
      title: "Product",
      links: [
        "Payments",
        "Transactions",
        "Customers",
        "Webhooks",
        "API Keys",
        "Payouts",
      ],
    },
    {
      title: "Developers",
      links: [
        "Documentation",
        "API Reference",
        "Integration Guide",
        "Webhooks",
        "Security",
      ],
    },
    { title: "Company", links: ["About", "Contact", "Support"] },
    { title: "Legal", links: ["Privacy", "Terms"] },
  ];

  return (
    <footer className="relative mt-10 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, var(--tint), transparent)",
        }}
      />
      <div className="lp-wrap relative py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <img
            src={ImageLogo.Logo}
            alt="Ctex PAY"
            className="h-9 w-[130px] object-contain object-left"
          />
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-10">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="t-text text-xs font-medium sm:text-sm">
                  {col.title}
                </p>
                <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="t-muted text-xs hover:opacity-70 sm:text-sm"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-bt mt-12 pt-6 sm:mt-16 sm:pt-8">
          <p className="t-muted text-[10px] sm:text-xs">
            © 2026 Ctex PAY. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [theme, setTheme] = useTheme();

  return (
    <div className="lp min-h-screen font-body">
      <GlobalStyles />
      <Navbar theme={theme} setTheme={setTheme} />
      <main>
        <Hero />
        <TrustBar />
        <ProblemSolution />
        <Features />
        <DeveloperSection />
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
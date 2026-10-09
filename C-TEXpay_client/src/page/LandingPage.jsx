import React, { useEffect, useState } from "react";
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
/* Global styles — accent + code colours as CSS vars, three cheap      */
/* transform-only animations (all disabled for reduced-motion users)   */
/* ------------------------------------------------------------------ */

function GlobalStyles() {
  return (
    <style>{`
      :root{--Ctex-accent:#0B68AD;--Ctex-code-str:#0E7A4F;--Ctex-code-kw:#6D3FD1;--Ctex-code-num:#B45309}
      .dark{--Ctex-accent:#4DA6E8;--Ctex-code-str:#7DD3A8;--Ctex-code-kw:#C4A7FF;--Ctex-code-num:#F5B461}
      @keyframes Ctex-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      @keyframes Ctex-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      @keyframes Ctex-ping{0%{transform:scale(1);opacity:.6}80%,100%{transform:scale(2.4);opacity:0}}
      @keyframes Ctex-spin{to{transform:rotate(360deg)}}
      @keyframes Ctex-check-draw{0%{stroke-dashoffset:48}100%{stroke-dashoffset:0}}
      @keyframes Ctex-fade-up{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes Ctex-pulse-ring{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(1.6);opacity:0}}
      @keyframes Ctex-bar-fill{0%{width:0%}100%{width:100%}}
      @keyframes Ctex-count{0%{opacity:0}100%{opacity:1}}
      @keyframes Ctex-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes Ctex-slide-in{0%{opacity:0;transform:translateY(-10px);max-height:0}100%{opacity:1;transform:translateY(0);max-height:60px}}
      @keyframes Ctex-slide-out{0%{opacity:1;transform:translateY(0);max-height:60px}100%{opacity:0;transform:translateY(10px);max-height:0}}
      .Ctex-marquee{animation:Ctex-marquee 38s linear infinite}
      .Ctex-float{animation:Ctex-float 6s ease-in-out infinite}
      .Ctex-ping{animation:Ctex-ping 2s cubic-bezier(0,0,.2,1) infinite}
      .Ctex-spin{animation:Ctex-spin 0.9s linear infinite}
      .Ctex-check-draw{stroke-dasharray:48;stroke-dashoffset:48;animation:Ctex-check-draw 0.5s ease forwards}
      .Ctex-fade-up{animation:Ctex-fade-up 0.4s ease forwards}
      .Ctex-pulse-ring{animation:Ctex-pulse-ring 1.5s ease-out infinite}
      .Ctex-bar-fill{animation:Ctex-bar-fill 1.2s ease forwards}
      .Ctex-count{animation:Ctex-count 0.3s ease forwards}
      .Ctex-shimmer{background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 50%,transparent 100%);background-size:200% 100%;animation:Ctex-shimmer 1.8s ease infinite}
      @media (prefers-reduced-motion:reduce){.Ctex-marquee,.Ctex-float,.Ctex-ping,.Ctex-spin,.Ctex-check-draw,.Ctex-fade-up,.Ctex-pulse-ring,.Ctex-bar-fill,.Ctex-count,.Ctex-shimmer{animation:none}}
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

const ACCENT = "text-[var(--Ctex-accent)]";

const darkVars = {
  "--Ctex-bg": "#050B14",
  "--Ctex-surface": "#0A1422",
  "--Ctex-elevated": "#0D1A2B",
  "--Ctex-border": "rgba(255,255,255,0.1)",
  "--Ctex-text": "#F3F7FB",
  "--Ctex-text-muted": "#8FA3B8",
  "--Ctex-accent": "#5CB3F0",
  "--Ctex-code-str": "#7DD3A8",
  "--Ctex-code-kw": "#C4A7FF",
  "--Ctex-code-num": "#F5B461",
};

function DarkBand({ children, className = "", id }) {
  return (
    <section
      id={id}
      data-dark-band
      style={darkVars}
      className={`relative overflow-hidden bg-[var(--Ctex-bg)] text-[var(--Ctex-text)] ${className}`}
    >
      {children}
    </section>
  );
}

const dotGrid = {
  backgroundImage:
    "radial-gradient(var(--Ctex-border) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
  WebkitMaskImage:
    "radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)",
  maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)",
};

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
    <p className={`font-mono text-[12px] sm:text-[13px] ${ACCENT}`}>{children}</p>
  );
}

function SectionHeading({ eyebrow, title, sub, align = "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-2 sm:mt-3 font-display text-3xl sm:text-4xl md:text-[2.75rem] md:leading-[1.1] font-semibold tracking-tight text-[var(--Ctex-text)]">
        {title}
      </h2>
      {sub && (
        <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed text-[var(--Ctex-text-muted)]">
          {sub}
        </p>
      )}
    </div>
  );
}

function Button({ as = "button", variant = "primary", children, className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-Ctex-blue";
  const variants = {
    primary:
      "bg-[#0B68AD] text-white shadow-[0_6px_20px_-6px_rgba(11,104,173,0.7)] hover:bg-[#0A5C9A] hover:-translate-y-px dark:bg-[var(--Ctex-accent)] dark:text-[#04121F] dark:shadow-[0_6px_20px_-6px_rgba(92,179,240,0.6)] dark:hover:bg-[var(--Ctex-accent)] dark:hover:opacity-90",
    light: "bg-white text-[#06101C] hover:bg-white/90 hover:-translate-y-px",
    secondary:
      "border border-[var(--Ctex-border)] text-[var(--Ctex-text)] hover:border-Ctex-blue hover:text-[var(--Ctex-accent)]",
    ghost: "text-[var(--Ctex-text)] hover:text-[var(--Ctex-accent)]",
  };
  const Comp = as;
  return (
    <Comp className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </Comp>
  );
}

const TOKEN =
  /("(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|'[^']*'|\/\/[^\n]*|\b(?:const|await|import|from|if|return|async|def)\b|\b\d+\b)/g;

function highlight(code) {
  return code.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return part;
    let cls = "text-[var(--Ctex-code-str)]";
    if (part.startsWith("//")) cls = "italic text-[var(--Ctex-text-muted)]";
    else if (/^\d+$/.test(part)) cls = "text-[var(--Ctex-code-num)]";
    else if (/^[a-z]+$/.test(part)) cls = "text-[var(--Ctex-code-kw)]";
    return (
      <span key={i} className={cls}>
        {part}
      </span>
    );
  });
}

function CodeWindow({ label = "request.js", lines, accent = false }) {
  return (
    <div
      className={`relative w-full max-w-full overflow-hidden rounded-xl border bg-[var(--Ctex-elevated)] ${
        accent
          ? "border-Ctex-blue/40 shadow-[0_12px_32px_-12px_rgba(11,104,173,0.45)]"
          : "border-[var(--Ctex-border)] shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[var(--Ctex-border)] px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <span className="font-mono text-[10px] sm:text-xs text-[var(--Ctex-text-muted)]">{label}</span>
      </div>
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words px-3 sm:px-5 py-3 sm:py-5 font-mono text-[11px] sm:text-[13px] leading-relaxed text-[var(--Ctex-text)]">
        <code className="block min-w-0 whitespace-pre-wrap break-words">{highlight(lines)}</code>
      </pre>
    </div>
  );
}

function HeroStatusBadge({ icon: Icon, label, tone = "success", delay = 0, className = "" }) {
  const reduceMotion = useReducedMotion();
  const toneClasses =
    tone === "success"
      ? "text-emerald-500 border-emerald-500/30"
      : `${ACCENT} border-Ctex-blue/30`;
  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.97 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-none flex items-center gap-1.5 rounded-full border bg-[var(--Ctex-elevated)] px-3 py-1.5 font-mono text-[10px] sm:text-[11px] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)] ${toneClasses} ${className}`}
    >
      <Icon size={12} className="shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </motion.div>
  );
}

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
            <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-Ctex-blue/50 bg-Ctex-blue/10 font-mono text-[10px] sm:text-xs ${ACCENT}`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <span
                className={
                  isRow
                    ? "hidden sm:block mt-4 h-px flex-1 w-full bg-[var(--Ctex-border)]"
                    : "my-1 w-px flex-1 bg-gradient-to-b from-Ctex-blue/40 to-[var(--Ctex-border)]"
                }
              />
            )}
          </div>
          <div className={isRow ? "pb-8" : "pb-6 sm:pb-8"}>
            <p className="font-medium text-sm sm:text-base text-[var(--Ctex-text)]">{step.title}</p>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-[var(--Ctex-text-muted)]">{step.desc}</p>
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
/* Animated "Order Completed" Video Mockup                            */
/* ------------------------------------------------------------------ */

function AnimatedOrderCard() {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setStage(4);
      return;
    }
    const t1 = setTimeout(() => setStage(1), 800);
    const t2 = setTimeout(() => setStage(2), 1800);
    const t3 = setTimeout(() => setStage(3), 2600);
    const t4 = setTimeout(() => setStage(4), 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [reduceMotion]);

  return (
    <div className="Ctex-float relative overflow-hidden rounded-2xl border border-Ctex-blue/30 bg-[var(--Ctex-bg)] p-4 shadow-[0_28px_56px_-20px_rgba(11,104,173,0.55)] sm:p-5">
      {/* Animated shimmer overlay */}
      {!reduceMotion && stage < 4 && (
        <div
          aria-hidden
          className="Ctex-shimmer pointer-events-none absolute inset-0 z-10 rounded-2xl"
        />
      )}

      <div className="relative z-20">
        {/* Stage 0: Pending */}
        <AnimatePresence mode="wait">
          {stage === 0 && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-[11px] text-[var(--Ctex-text-muted)] sm:text-xs">Complete your order</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--Ctex-text)] sm:text-3xl">
                ₦5,000.00
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[var(--Ctex-text-muted)] sm:text-[11px]">order_10234</p>

              <div className="mt-4 space-y-2 border-t border-[var(--Ctex-border)] pt-3 text-[11px] sm:text-xs">
                <div className="flex justify-between text-[var(--Ctex-text-muted)]">
                  <span>Customer</span>
                  <span className="font-mono text-[var(--Ctex-text)]">cus_8fh29a</span>
                </div>
                <div className="flex justify-between text-[var(--Ctex-text-muted)]">
                  <span>Currency</span>
                  <span className="font-mono text-[var(--Ctex-text)]">NGN</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-Ctex-blue py-2 text-center text-xs font-medium text-white sm:text-sm">
                <span className="Ctex-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white" />
                Processing…
              </div>

              <p className="mt-2.5 flex items-center justify-center gap-1 text-[10px] text-[var(--Ctex-text-muted)]">
                <Lock size={10} /> Secured by Ctex PAY
              </p>
            </motion.div>
          )}

          {/* Stage 1: Processing / verifying */}
          {stage === 1 && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-[11px] text-[var(--Ctex-text-muted)] sm:text-xs">Verifying payment</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--Ctex-text)] sm:text-3xl">
                ₦5,000.00
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[var(--Ctex-text-muted)] sm:text-[11px]">order_10234</p>

              <div className="mt-4 space-y-2.5 border-t border-[var(--Ctex-border)] pt-3 text-[11px] sm:text-xs">
                <div className="flex items-center gap-2 text-[var(--Ctex-text-muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Payment received</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--Ctex-text)]">
                  <span className="Ctex-spin h-3 w-3 rounded-full border-2 border-Ctex-blue/30 border-t-Ctex-blue" />
                  <span>Verifying with provider…</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--Ctex-text-muted)] opacity-50">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--Ctex-border)]" />
                  <span>Signed webhook</span>
                </div>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--Ctex-border)]">
                <div
                  className="Ctex-bar-fill h-full rounded-full bg-gradient-to-r from-Ctex-blue to-sky-400"
                  style={{ width: "100%" }}
                />
              </div>

              <p className="mt-2.5 flex items-center justify-center gap-1 text-[10px] text-[var(--Ctex-text-muted)]">
                <Lock size={10} /> Secured by Ctex PAY
              </p>
            </motion.div>
          )}

          {/* Stage 2: Webhook delivered */}
          {stage === 2 && (
            <motion.div
              key="webhook"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-[11px] text-[var(--Ctex-text-muted)] sm:text-xs">Payment verified</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--Ctex-text)] sm:text-3xl">
                ₦5,000.00
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[var(--Ctex-text-muted)] sm:text-[11px]">order_10234</p>

              <div className="mt-4 space-y-2.5 border-t border-[var(--Ctex-border)] pt-3 text-[11px] sm:text-xs">
                <div className="flex items-center gap-2 text-[var(--Ctex-text)]">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Payment received</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--Ctex-text)]">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Verified with provider</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--Ctex-text)]">
                  <span className="relative flex h-2 w-2">
                    <span className="Ctex-pulse-ring absolute inline-flex h-full w-full rounded-full bg-Ctex-blue/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-Ctex-blue" />
                  </span>
                  <span>Webhook delivered</span>
                </div>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--Ctex-border)]">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
              </div>

              <p className="mt-2.5 flex items-center justify-center gap-1 text-[10px] text-[var(--Ctex-text-muted)]">
                <Lock size={10} /> Secured by Ctex PAY
              </p>
            </motion.div>
          )}

          {/* Stage 3: Almost done */}
          {stage === 3 && (
            <motion.div
              key="almost"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-[11px] text-[var(--Ctex-text-muted)] sm:text-xs">Finalizing</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--Ctex-text)] sm:text-3xl">
                ₦5,000.00
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[var(--Ctex-text-muted)] sm:text-[11px]">order_10234</p>

              <div className="mt-4 space-y-2.5 border-t border-[var(--Ctex-border)] pt-3 text-[11px] sm:text-xs">
                <div className="flex items-center gap-2 text-[var(--Ctex-text)]">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Payment received</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--Ctex-text)]">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Verified with provider</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--Ctex-text)]">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Webhook delivered</span>
                </div>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/20">
                <div className="h-full w-full rounded-full bg-emerald-500" />
              </div>

              <p className="mt-2.5 flex items-center justify-center gap-1 text-[10px] text-[var(--Ctex-text-muted)]">
                <Lock size={10} /> Secured by Ctex PAY
              </p>
            </motion.div>
          )}

          {/* Stage 4: Order Completed */}
          {stage === 4 && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="Ctex-count"
            >
              <div className="flex flex-col items-center py-2 text-center">
                <div className="relative mb-3">
                  {!reduceMotion && (
                    <span className="Ctex-pulse-ring absolute inset-0 rounded-full bg-emerald-500/30" />
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
                        className={reduceMotion ? "" : "Ctex-check-draw"}
                      />
                    </svg>
                  </span>
                </div>
                <p className="font-display text-lg font-semibold text-[var(--Ctex-text)] sm:text-xl">
                  Order Completed
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-[var(--Ctex-text-muted)] sm:text-[11px]">
                  order_10234
                </p>

                <div className="mt-4 w-full space-y-2 border-t border-[var(--Ctex-border)] pt-3 text-left text-[11px] sm:text-xs">
                  <div className="flex justify-between text-[var(--Ctex-text-muted)]">
                    <span>Amount</span>
                    <span className="font-mono font-medium text-[var(--Ctex-text)]">₦5,000.00</span>
                  </div>
                  <div className="flex justify-between text-[var(--Ctex-text-muted)]">
                    <span>Customer</span>
                    <span className="font-mono text-[var(--Ctex-text)]">cus_8fh29a</span>
                  </div>
                  <div className="flex justify-between text-[var(--Ctex-text-muted)]">
                    <span>Status</span>
                    <span className="flex items-center gap-1 font-mono text-emerald-500">
                      <CheckCircle2 size={11} /> Paid
                    </span>
                  </div>
                </div>

                <div className="mt-4 w-full rounded-full border border-emerald-500/30 bg-emerald-500/10 py-2 text-center text-xs font-medium text-emerald-500 sm:text-sm">
                  Payment confirmed
                </div>

                <p className="mt-2.5 flex items-center justify-center gap-1 text-[10px] text-[var(--Ctex-text-muted)]">
                  <Lock size={10} /> Secured by Ctex PAY
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navbar — adapts to whichever section is currently underneath it     */
/* ------------------------------------------------------------------ */

function Navbar({ theme, setTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [overDark, setOverDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = React.useRef(null);

  useEffect(() => {
    let raf = 0;

    const check = () => {
      raf = 0;
      setScrolled(window.scrollY > 8);

      // Probe the vertical middle of the header and see if a dark band is under it
      const header = headerRef.current;
      const probeY = header ? header.offsetHeight / 2 : 40;
      const bands = document.querySelectorAll("[data-dark-band]");
      let over = false;
      bands.forEach((b) => {
        const r = b.getBoundingClientRect();
        if (r.top <= probeY && r.bottom >= probeY) over = true;
      });
      setOverDark(over);
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(check);
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // True when the nav is visually on a dark surface (dark theme OR over a dark section)
  const isDarkUI = theme === "dark" || overDark;

  const links = [
    { label: "Product", href: "#features" },
    { label: "Developers", href: "#developers" },
    { label: "Solutions", href: "#merchant-flow" },
    { label: "Pricing", href: "#pricing" },
    { label: "Documentation", href: "#docs" },
  ];

  // When over a dark section, force the dark palette + an explicit dark translucent background
  const headerStyle = overDark
    ? {
        ...darkVars,
        background: scrolled ? "rgba(5,11,20,0.82)" : "#050B14",
      }
    : undefined;

  return (
    <header
      ref={headerRef}
      style={headerStyle}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[var(--Ctex-border)]/60 bg-[var(--Ctex-bg)]/70 backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_32px_-12px_rgba(5,20,40,0.18)] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]"
          : "border-b border-transparent bg-[var(--Ctex-bg)]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2 sm:py-3">
        <div className=" w-[400px]">
  <Link to="/" className="flex items-center">
          <img
            src={ImageLogo.Logo2}
            alt="Ctex PAY"
            className="h-20 w-auto sm:h-30 md:h-30 lg:h-2"
          />
        </Link>
        </div>
      

        <nav className="hidden items-center gap-1 rounded-full border border-[var(--Ctex-border)] px-2 py-1 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-sm text-[var(--Ctex-text-muted)] transition-colors hover:bg-Ctex-blue/10 hover:text-[var(--Ctex-accent)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--Ctex-border)] text-[var(--Ctex-text-muted)] transition-colors hover:text-[var(--Ctex-accent)]"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--Ctex-text)] hover:text-[var(--Ctex-accent)]"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className={`inline-flex items-center justify-center gap-2 rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-Ctex-blue ${
              isDarkUI
                ? "bg-[var(--Ctex-accent)] text-[#04121F] shadow-[0_6px_20px_-6px_rgba(92,179,240,0.6)] hover:opacity-90 hover:-translate-y-px"
                : "bg-[#0B68AD] text-white shadow-[0_6px_20px_-6px_rgba(11,104,173,0.7)] hover:bg-[#0A5C9A] hover:-translate-y-px"
            }`}
          >
            Get Started
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--Ctex-border)] text-[var(--Ctex-text-muted)]"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--Ctex-border)] text-[var(--Ctex-text)]"
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
            style={overDark ? { background: "rgba(5,11,20,0.96)" } : undefined}
            className="overflow-hidden border-b border-[var(--Ctex-border)] bg-[var(--Ctex-bg)]/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 sm:px-6 pb-5 pt-1">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 text-sm text-[var(--Ctex-text-muted)] hover:text-[var(--Ctex-accent)]"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                <Button as={Link} to="/login" variant="secondary">
                  Log in
                </Button>
                <Link
                  to="/signup"
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-Ctex-blue ${
                    isDarkUI
                      ? "bg-[var(--Ctex-accent)] text-[#04121F] shadow-[0_6px_20px_-6px_rgba(92,179,240,0.6)] hover:opacity-90"
                      : "bg-[#0B68AD] text-white shadow-[0_6px_20px_-6px_rgba(11,104,173,0.7)] hover:bg-[#0A5C9A]"
                  }`}
                >
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
/* Hero — the one memorable element is the product composition:        */
/* a live checkout card floating over a transaction feed.              */
/* ------------------------------------------------------------------ */

/* Pool of mock transactions that will rotate through the live feed */
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
        const nextItem = TRANSACTION_POOL[nextIndexRef.current % TRANSACTION_POOL.length];
        nextIndexRef.current += 1;
        // Push new item to top, drop the last one
        return [nextItem, ...prev].slice(0, 4);
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <div className="divide-y divide-[var(--Ctex-border)] px-4">
      <AnimatePresence initial={false} mode="popLayout">
        {feed.map((r, i) => {
          const meta = statusMeta[r.status];
          return (
            <motion.div
              key={`${r.ref}-${i}-${r.amount}`}
              layout
              initial={reduceMotion ? undefined : { opacity: 0, y: -14, scale: 0.97 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between gap-3 py-2.5 sm:py-3"
            >
              <p className="truncate font-mono text-[11px] text-[var(--Ctex-text)] sm:text-xs">
                {r.ref}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-[11px] text-[var(--Ctex-text)] sm:text-xs">
                  {r.amount}
                </span>
                <meta.icon size={13} className={meta.color} />
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
    <div className="relative mx-auto h-[470px] w-full max-w-[560px] sm:h-[530px]">
      <div
        aria-hidden
        className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-Ctex-blue/20 via-transparent to-Ctex-blue/5"
      />

      {/* Back: live transaction feed */}
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute right-0 top-0 w-[92%] overflow-hidden rounded-2xl border border-[var(--Ctex-border)] bg-[var(--Ctex-elevated)] shadow-[0_24px_48px_-24px_rgba(5,20,40,0.5)] sm:w-[86%]"
      >
        <div className="flex items-center justify-between border-b border-[var(--Ctex-border)] px-4 py-3">
          <p className="text-xs font-medium text-[var(--Ctex-text)] sm:text-sm">Transactions</p>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="Ctex-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>
        <LiveTransactionFeed />
      </motion.div>

      {/* Front: animated order card (replaces static checkout) */}
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 left-0 w-[72%] sm:w-[60%]"
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
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={dotGrid} />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-full max-w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,hsl(205.56deg_88.04%_36.08%_/_0.2),transparent)] dark:bg-[radial-gradient(closest-side,hsl(205.56deg_88.04%_46%_/_0.28),transparent)]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:pb-32">
        <motion.div
          initial={reduceMotion ? undefined : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          variants={reduceMotion ? undefined : textBlock}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--Ctex-border)] bg-[var(--Ctex-surface)] px-3 py-1 text-xs text-[var(--Ctex-text-muted)]">
            <span className="relative flex h-2 w-2">
              <span className="Ctex-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Payment infrastructure for developers
          </div>
          <h1 className="mt-5 font-display text-[2.75rem] font-semibold leading-[1.04] tracking-tight text-[var(--Ctex-text)] sm:text-6xl lg:text-[4.5rem]">
            Accept payments.
            <span className="block bg-gradient-to-r from-[#0A6CFF] via-[#0A8CE8] to-[#00A6E6] bg-clip-text pb-1 text-transparent dark:from-[#4DB8FF] dark:via-[#6FD0FF] dark:to-[#7DF0FF] dark:drop-shadow-[0_0_22px_rgba(77,184,255,0.35)]">
              Build faster.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--Ctex-text-muted)] sm:mt-6 sm:text-base">
            Accept payments, verify transactions, and automate payment
            confirmation with a simple API built for modern businesses.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 sm:mt-9 sm:gap-3">
            <Button as={Link} to="/signup">
              Get Started
              <ArrowRight size={15} />
            </Button>
            <Button as="a" href="#docs" variant="secondary">
              Read the Docs
            </Button>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--Ctex-text-muted)] sm:mt-9 sm:text-sm">
            {["No SDK to install", "Your API key is the integration", "Signed webhooks"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className={ACCENT} />
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
      className="overflow-hidden border-y border-[var(--Ctex-border)] bg-[var(--Ctex-surface)] py-4 sm:py-5"
      style={{
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}
    >
      <div className="Ctex-marquee flex w-max items-center gap-10 sm:gap-14">
        {loop.map(({ icon: Icon, label }, i) => (
          <span
            key={`${label}-${i}`}
            className="flex items-center gap-2 whitespace-nowrap text-xs text-[var(--Ctex-text-muted)] sm:text-sm"
          >
            <Icon size={15} className={`shrink-0 ${ACCENT}`} />
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
    { problem: "Manual verification", solution: "Automatic verification + webhooks" },
    { problem: "Unclear transaction status", solution: "Real-time transaction state" },
    { problem: "Difficult API management", solution: "Simple key generation and rotation" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading
          title="Payment integration shouldn't slow your product down."
          sub="Most delays come from the same handful of problems. Ctex PAY removes them one by one."
        />
      </Reveal>

      <div className="mt-10 grid gap-4 sm:mt-14 lg:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-[var(--Ctex-border)] bg-[var(--Ctex-surface)] p-6 sm:p-8">
            <p className="text-sm font-medium text-[var(--Ctex-text-muted)]">Without Ctex PAY</p>
            <ul className="mt-5 space-y-4">
              {rows.map((r) => (
                <li key={r.problem} className="flex items-center gap-3 text-sm text-[var(--Ctex-text-muted)] sm:text-base">
                  <XCircle size={18} className="shrink-0 text-red-500/80" />
                  {r.problem}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="relative h-full overflow-hidden rounded-2xl border border-Ctex-blue/40 bg-gradient-to-br from-Ctex-blue/15 via-[var(--Ctex-surface)] to-[var(--Ctex-surface)] p-6 shadow-[0_20px_44px_-24px_rgba(11,104,173,0.5)] sm:p-8">
            <p className={`text-sm font-medium ${ACCENT}`}>With Ctex PAY</p>
            <ul className="mt-5 space-y-4">
              {rows.map((r) => (
                <li key={r.solution} className="flex items-center gap-3 text-sm font-medium text-[var(--Ctex-text)] sm:text-base">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                  {r.solution}
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
/* Core features — bento with small live-UI visuals                    */
/* ------------------------------------------------------------------ */

function BentoCell({ icon: Icon, title, desc, children, className = "" }) {
  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl border border-[var(--Ctex-border)] bg-[var(--Ctex-surface)] p-5 transition-colors duration-200 hover:border-Ctex-blue/50 sm:p-6 ${className}`}
    >
      <div className="flex-1">{children}</div>
      <div className="mt-5">
        <div className="flex items-center gap-2">
          <Icon size={16} className={ACCENT} />
          <p className="text-sm font-medium text-[var(--Ctex-text)] sm:text-base">{title}</p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--Ctex-text-muted)] sm:text-sm">{desc}</p>
      </div>
    </div>
  );
}

function Features() {
  const compact = [
    { icon: Key, title: "API-First Payments", desc: "Integrate directly with the Ctex PAY API without installing an SDK." },
    { icon: Users, title: "Customer Management", desc: "Create and manage customers directly from your API." },
    { icon: Receipt, title: "Transaction Management", desc: "Track payment status and transaction history in one place." },
    { icon: ArrowDownToLine, title: "Payouts", desc: "Withdraw eligible funds to your supported bank accounts." },
  ];

  const chain = ["Customer pays", "Provider", "Verified", "Signed webhook"];

  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading title="One platform for your entire payment operation." />
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 lg:grid-cols-6">
        <Reveal className="lg:col-span-4">
          <BentoCell
            icon={CheckCircle2}
            title="Automatic Verification"
            desc="Ctex PAY verifies transactions before reporting successful payments."
            className="h-full"
          >
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--Ctex-border)] bg-[var(--Ctex-bg)] p-4 font-mono text-[10px] sm:text-xs">
              {chain.map((c, i) => (
                <React.Fragment key={c}>
                  <span
                    className={`rounded-full border px-3 py-1.5 ${
                      i === 2
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                        : "border-[var(--Ctex-border)] text-[var(--Ctex-text)]"
                    }`}
                  >
                    {c}
                  </span>
                  {i < chain.length - 1 && <ArrowRight size={11} className="shrink-0 opacity-50" />}
                </React.Fragment>
              ))}
            </div>
          </BentoCell>
        </Reveal>

        <Reveal delay={0.04} className="lg:col-span-2">
          <BentoCell icon={Lock} title="API Keys" desc="Generate, rotate, and revoke API keys directly from your dashboard." className="h-full">
            <div className="space-y-2 rounded-xl border border-[var(--Ctex-border)] bg-[var(--Ctex-bg)] p-3 font-mono text-[10px] sm:text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[var(--Ctex-text)]">Ctex_live_••••8f21</span>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-500">Active</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[var(--Ctex-text)]">Ctex_test_••••1a09</span>
                <span className="shrink-0 rounded-full bg-Ctex-blue/10 px-2 py-0.5 text-[var(--Ctex-accent)]">Test</span>
              </div>
            </div>
          </BentoCell>
        </Reveal>

        <Reveal className="lg:col-span-2">
          <BentoCell icon={Webhook} title="Webhooks" desc="Receive secure payment notifications directly on your server." className="h-full">
            <div className="space-y-1.5 rounded-xl border border-[var(--Ctex-border)] bg-[var(--Ctex-bg)] p-3 font-mono text-[10px] sm:text-xs">
              {["payment.success", "payment.success", "payment.pending"].map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-[var(--Ctex-text)]">{e}</span>
                  <span className="text-emerald-500">200 OK</span>
                </div>
              ))}
            </div>
          </BentoCell>
        </Reveal>

        <Reveal delay={0.04} className="lg:col-span-2">
          <BentoCell icon={Wallet} title="Merchant Wallet" desc="Monitor available funds and balances as payments settle." className="h-full">
            <div className="rounded-xl border border-[var(--Ctex-border)] bg-[var(--Ctex-bg)] p-4">
              <p className="text-[10px] text-[var(--Ctex-text-muted)] sm:text-xs">Available balance</p>
              <p className="mt-1 font-mono text-lg text-[var(--Ctex-text)] sm:text-xl">₦482,300.00</p>
            </div>
          </BentoCell>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-2">
          <BentoCell
            icon={ShieldCheck}
            title="Idempotency & Retries"
            desc="Duplicate requests are ignored; transient failures retry safely."
            className="h-full"
          >
            <div className="space-y-1.5 rounded-xl border border-[var(--Ctex-border)] bg-[var(--Ctex-bg)] p-3 font-mono text-[10px] sm:text-xs">
              <p className="text-[var(--Ctex-text-muted)]">Idempotency-Key: order_10234</p>
              <p className="flex items-center gap-1.5 text-[var(--Ctex-text)]">
                <RefreshCw size={11} className={ACCENT} /> Retried after timeout
              </p>
              <p className="text-emerald-500">Charged once</p>
            </div>
          </BentoCell>
        </Reveal>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {compact.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.04}>
            <div className="h-full rounded-2xl border border-[var(--Ctex-border)] p-5 transition-colors duration-200 hover:border-Ctex-blue/50">
              <f.icon size={16} className={ACCENT} />
              <p className="mt-3 text-sm font-medium text-[var(--Ctex-text)]">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--Ctex-text-muted)] sm:text-sm">{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Developers + Webhooks — one dark stage                              */
/* ------------------------------------------------------------------ */

function DeveloperSection() {
  const tabs = {
    "Node.js": `const res = await fetch("https://api.Ctexpay.com/v1/payments", {
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
  -H "Authorization: Bearer $Ctex_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 500000,
    "currency": "NGN",
    "customer": "cus_8fh29a",
    "reference": "order_10234"
  }'`,
    Python: `import requests

response = requests.post(
    "https://api.Ctexpay.com/v1/payments",
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
    PHP: `$ch = curl_init("https://api.Ctexpay.com/v1/payments");

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
    JavaScript: `const res = await fetch("https://api.Ctexpay.com/v1/payments", {
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
    { title: "Create merchant", desc: "Register the business you're collecting payments for." },
    { title: "Generate API key", desc: "Create a key from your dashboard — no approval wait." },
    { title: "Add API to your application", desc: "Call the API directly. No SDK required." },
    { title: "Receive webhook", desc: "Ctex PAY notifies your server the moment status changes." },
    { title: "Verify payment", desc: "Confirm the signature, then mark the order paid." },
  ];

  const flow = [
    { title: "Customer pays", desc: "Your customer completes payment at checkout." },
    { title: "Ctex PAY verifies transaction", desc: "The payment is confirmed with the provider, not assumed." },
    { title: "Ctex PAY signs webhook", desc: "A signed event is generated for your endpoint." },
    { title: "Merchant receives webhook", desc: "Your server gets a POST request with the event payload." },
    { title: "Merchant verifies signature", desc: "Confirm the request actually came from Ctex PAY." },
    { title: "Merchant updates order", desc: "Mark the order paid and continue your flow." },
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

  const ext = active === "Python" ? "py" : active === "PHP" ? "php" : active === "cURL" ? "sh" : "js";

  return (
    <DarkBand id="developers">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={dotGrid} />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-0 h-[460px] w-[620px] bg-[radial-gradient(closest-side,hsl(205.56deg_88.04%_46%_/_0.22),transparent)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-28">
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
            <div className="flex flex-wrap gap-1.5 overflow-x-auto">
              {Object.keys(tabs).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActive(tab)}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-[10px] transition-colors sm:text-xs ${
                    active === tab
                      ? "border-Ctex-blue bg-Ctex-blue/15 text-[var(--Ctex-accent)]"
                      : "border-[var(--Ctex-border)] text-[var(--Ctex-text-muted)] hover:text-[var(--Ctex-text)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="mt-3 sm:mt-4">
              <CodeWindow label={`payments.${ext}`} lines={tabs[active]} accent />
            </div>
          </Reveal>
        </div>

        {/* Webhooks */}
        <div className="mt-20 border-t border-[var(--Ctex-border)] pt-16 sm:mt-28 sm:pt-24">
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
    </DarkBand>
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
    "Ctex PAY",
    "Payment Provider",
    "Verification",
    "Signed Webhook",
    "Merchant Server",
  ];

  return (
    <section id="security" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="Security"
          title="Payments should be verified, not assumed."
          sub="A successful payment response should never be trusted blindly. Ctex PAY verifies transactions before treating them as successful."
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-8 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--Ctex-border)] bg-[var(--Ctex-surface)] p-4 font-mono text-[10px] sm:mt-12 sm:p-5 sm:text-xs">
          {pipeline.map((step, i) => (
            <React.Fragment key={step}>
              <span
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 ${
                  i === 4
                    ? "border-Ctex-blue/50 bg-Ctex-blue/10 text-[var(--Ctex-accent)]"
                    : "border-[var(--Ctex-border)] text-[var(--Ctex-text-muted)]"
                }`}
              >
                {step}
              </span>
              {i < pipeline.length - 1 && <ArrowRight size={11} className="shrink-0 opacity-50" />}
            </React.Fragment>
          ))}
        </div>
      </Reveal>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={(i % 4) * 0.04}>
            <div className="h-full rounded-2xl border border-[var(--Ctex-border)] p-5 transition-colors duration-200 hover:border-Ctex-blue/50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-Ctex-blue/10">
                <it.icon size={16} className={ACCENT} />
              </span>
              <p className="mt-3 text-sm font-medium text-[var(--Ctex-text)]">{it.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--Ctex-text-muted)]">{it.desc}</p>
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

  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-28">
      <Reveal>
        <SectionHeading
          title="Every transaction, key, and webhook in one view."
          sub="Interface example with demo values — this is what your dashboard looks like once you're set up."
        />
      </Reveal>

      <Reveal delay={0.08}>
        <div className="relative mt-8 sm:mt-12">
          <div
            aria-hidden
            className="absolute -inset-x-6 -inset-y-8 -z-10 bg-[radial-gradient(closest-side,hsl(205.56deg_88.04%_36.08%_/_0.14),transparent)]"
          />
          <div className="overflow-hidden rounded-2xl border border-[var(--Ctex-border)] bg-[var(--Ctex-elevated)] shadow-[0_32px_64px_-32px_rgba(5,20,40,0.45)]">
            <div className="flex items-center gap-1.5 border-b border-[var(--Ctex-border)] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 font-mono text-[10px] text-[var(--Ctex-text-muted)] sm:text-xs">Dashboard</span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--Ctex-border)] border-b border-[var(--Ctex-border)] sm:grid-cols-5 sm:divide-y-0">
              {stats.map((s) => (
                <div key={s.label} className="px-3 py-3 sm:px-5 sm:py-5">
                  <p className="text-[10px] text-[var(--Ctex-text-muted)] sm:text-xs">{s.label}</p>
                  <p className="mt-1 font-mono text-sm text-[var(--Ctex-text)] sm:mt-1.5 sm:text-lg">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-[1.4fr_1fr]">
              <div className="border-b border-[var(--Ctex-border)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
                <p className="text-xs font-medium text-[var(--Ctex-text)] sm:text-sm">Recent transactions</p>
                <div className="mt-3 divide-y divide-[var(--Ctex-border)] sm:mt-4">
                  {transactions.map((t) => {
                    const meta = statusMeta[t.status];
                    return (
                      <div key={t.ref} className="flex items-center justify-between gap-2 py-2.5 sm:py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-[10px] text-[var(--Ctex-text)] sm:text-xs">{t.ref}</p>
                          <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--Ctex-text-muted)] sm:text-[11px]">{t.customer}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                          <span className="font-mono text-[10px] text-[var(--Ctex-text)] sm:text-xs">{t.amount}</span>
                          <span className={`flex items-center gap-1 text-[10px] sm:text-xs ${meta.color}`}>
                            <meta.icon size={11} />
                            <span className="hidden sm:inline">{meta.label}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <p className="text-xs font-medium text-[var(--Ctex-text)] sm:text-sm">API keys</p>
                <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] sm:text-xs">
                    <span className="truncate text-[var(--Ctex-text)]">Ctex_live_saka_••••••••8f21</span>
                    <span className="shrink-0 text-emerald-500">Active</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] sm:text-xs">
                    <span className="truncate text-[var(--Ctex-text)]">Ctex_test_saka_••••••••1a09</span>
                    <span className="shrink-0 text-[var(--Ctex-text-muted)]">Test mode</span>
                  </div>
                </div>

                <p className="mt-5 text-xs font-medium text-[var(--Ctex-text)] sm:mt-6 sm:text-sm">Webhook status</p>
                <div className="mt-2.5 flex items-center gap-2 font-mono text-[10px] sm:mt-3 sm:text-xs">
                  <Circle size={7} className="shrink-0 fill-emerald-500 text-emerald-500" />
                  <span className="truncate text-[var(--Ctex-text)]">api.yourapp.com/webhooks/Ctexpay</span>
                </div>
                <p className="mt-1 text-[10px] text-[var(--Ctex-text-muted)] sm:text-[11px]">Last delivery succeeded</p>
              </div>
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
    { title: "Create account", desc: "Sign up as a merchant on Ctex PAY." },
    { title: "Create business", desc: "Register the business you're collecting payments for." },
    { title: "Generate API key", desc: "Create keys scoped to what your app needs." },
    { title: "Configure webhook", desc: "Point Ctex PAY at your server's webhook endpoint." },
    { title: "Integrate API", desc: "Call the payments API directly from your application." },
    { title: "Accept payments", desc: "Customers pay; you get notified automatically." },
    { title: "Monitor transactions", desc: "Track status and history from your dashboard." },
    { title: "Withdraw funds", desc: "Move eligible balance to your bank account." },
  ];

  return (
    <section id="merchant-flow" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="Merchant experience" title="From account to payout, in one flow." />
      </Reveal>
      <Reveal delay={0.06}>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-[var(--Ctex-border)] bg-[var(--Ctex-surface)] p-4 transition-colors duration-200 hover:border-Ctex-blue/50 sm:p-5"
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-Ctex-blue/10 font-mono text-[10px] sm:text-xs ${ACCENT}`}>
                {i + 1}
              </span>
              <p className="mt-3 text-xs font-medium text-[var(--Ctex-text)] sm:text-base">{s.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--Ctex-text-muted)] sm:text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function CustomerFlow() {
  const steps = ["Merchant website", "Checkout", "Customer payment", "Ctex PAY", "Payment provider", "Verification", "Merchant webhook"];
  return (
    <section className="border-y border-[var(--Ctex-border)] bg-[var(--Ctex-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Customer experience"
            title="Simple for the person paying, too."
            sub="Ctex PAY sits between your checkout and the payment provider, so your customer only ever sees a single, consistent payment experience."
          />
        </Reveal>
        <Reveal delay={0.06}>
          <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3 font-mono text-[10px] text-[var(--Ctex-text-muted)] sm:mt-12 sm:text-xs md:text-sm">
            {steps.map((step, i) => (
              <React.Fragment key={step}>
                <span
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 ${
                    step === "Ctex PAY"
                      ? "border-Ctex-blue bg-Ctex-blue text-white"
                      : "border-[var(--Ctex-border)] bg-[var(--Ctex-elevated)] text-[var(--Ctex-text)]"
                  }`}
                >
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
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="Pricing" title="Simple, transparent transaction pricing." />
      </Reveal>

      <Reveal delay={0.08}>
        <div className="relative mt-8 max-w-lg overflow-hidden rounded-2xl border border-Ctex-blue/40 bg-gradient-to-br from-Ctex-blue/10 via-[var(--Ctex-surface)] to-[var(--Ctex-surface)] p-6 shadow-[0_24px_48px_-28px_rgba(11,104,173,0.55)] sm:mt-12 sm:p-8">
          <p className="font-display text-xl font-semibold text-[var(--Ctex-text)] sm:text-2xl">Transaction fee</p>
          <p className="mt-1.5 text-xs text-[var(--Ctex-text-muted)] sm:mt-2 sm:text-sm">
            Configured by Ctex PAY per merchant. No setup fees, no monthly minimums.
          </p>
          <ul className="mt-5 space-y-2.5 text-xs text-[var(--Ctex-text-muted)] sm:mt-6 sm:space-y-3 sm:text-sm">
            {[
              "Pay only for successful transactions",
              "No hidden integration costs",
              "Full access to the dashboard and API",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 size={14} className={`shrink-0 ${ACCENT}`} />
                {t}
              </li>
            ))}
          </ul>
          <Button as={Link} to="/signup" className="mt-6 w-full sm:mt-8">
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
    <section id="docs" className="border-y border-[var(--Ctex-border)] bg-[var(--Ctex-surface)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:gap-10 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <Eyebrow>Documentation</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--Ctex-text)] sm:mt-3 sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
            Ready to integrate?
          </h2>
          <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
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
            lines={`curl https://api.Ctexpay.com/v1/payments \\
  -H "Authorization: Bearer $Ctex_SECRET_KEY" \\
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
    { q: "Do I need an SDK?", a: "No. Ctex PAY is designed around direct API integration." },
    { q: "How do I authenticate API requests?", a: "Using your Ctex PAY API key, passed as a bearer token." },
    { q: "Can I configure webhooks?", a: "Yes. Merchants can configure their webhook endpoint from their dashboard." },
    { q: "How are payments verified?", a: "Ctex PAY verifies payment information before treating a transaction as successful." },
    { q: "Can I withdraw my funds?", a: "Yes, eligible merchant funds can be withdrawn to supported bank accounts." },
    { q: "Can I rotate my API keys?", a: "Yes, keys can be rotated at any time from your dashboard." },
    { q: "Can I revoke an API key?", a: "Yes, revoked keys stop working immediately." },
    { q: "Is Ctex PAY suitable for developers?", a: "Yes. The platform is designed with API-first integration in mind." },
  ];
  const [open, setOpen] = useState(0);

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="FAQ" title="Common questions." />
      </Reveal>

      <div className="mt-8 space-y-3 sm:mt-10">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={f.q}
              className={`rounded-2xl border px-5 transition-colors duration-200 ${
                isOpen
                  ? "border-Ctex-blue/40 bg-[var(--Ctex-surface)]"
                  : "border-[var(--Ctex-border)]"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 py-4 text-left sm:gap-4 sm:py-5"
              >
                <span className="text-sm font-medium text-[var(--Ctex-text)] sm:text-base">{f.q}</span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-[var(--Ctex-text-muted)] transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-[var(--Ctex-accent)]" : ""
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
                    <p className="pb-4 text-xs leading-relaxed text-[var(--Ctex-text-muted)] sm:pb-5 sm:text-sm">{f.a}</p>
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
    <DarkBand>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={dotGrid} />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-full max-w-[900px] -translate-x-1/2 bg-[radial-gradient(closest-side,hsl(205.56deg_88.04%_46%_/_0.35),transparent)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-32">
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-display text-3xl font-semibold tracking-tight text-[var(--Ctex-text)] sm:text-5xl sm:leading-[1.08]">
            Your payments. Your API. Your business.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[var(--Ctex-text-muted)] sm:mt-5 sm:text-base">
            Build your payment flow with infrastructure designed around developers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2 sm:mt-10 sm:gap-3">
            <Button as={Link} to="/signup" variant="light">
              Get Started
              <ArrowRight size={15} />
            </Button>
            <Button as="a" href="#docs" variant="secondary">
              Explore Documentation
            </Button>
          </div>
        </Reveal>
      </div>
    </DarkBand>
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
    <footer className="border-t border-[var(--Ctex-border)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-10">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-medium text-[var(--Ctex-text)] sm:text-sm">{col.title}</p>
              <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs text-[var(--Ctex-text-muted)] hover:text-[var(--Ctex-accent)] sm:text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--Ctex-border)] pt-6 sm:mt-14 sm:flex-row sm:items-center sm:gap-4 sm:pt-8">
          <img src={ImageLogo.Logo} alt="Ctex PAY" className="h-12 w-auto" />
          <p className="text-[10px] text-[var(--Ctex-text-muted)] sm:text-xs">© 2026 Ctex PAY. All rights reserved.</p>
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
    <div className="min-h-screen bg-[var(--Ctex-bg)] font-body text-[var(--Ctex-text)]">
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
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-ctex-bg text-ctex-text">
      {/* Animated background gradient */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        style={{
          background:
            "radial-gradient(1200px 600px at 10% -10%, color-mix(in srgb, var(--ctex-blue) 22%, transparent), transparent 60%), radial-gradient(900px 500px at 110% 10%, color-mix(in srgb, var(--ctex-blue-light) 20%, transparent), transparent 55%)",
        }}
      />

      {/* Floating orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl"
        style={{
          background:
            "color-mix(in srgb, var(--ctex-blue) 40%, transparent)",
        }}
        animate={{ y: [0, 24, 0], x: [0, 18, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full blur-3xl"
        style={{
          background:
            "color-mix(in srgb, var(--ctex-blue-light) 40%, transparent)",
        }}
        animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(circle at 50% 40%, black 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 40%, black 40%, transparent 75%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-6 flex items-center justify-between gap-3 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-ctex-text-muted transition hover:text-ctex-blue"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-ctex-blue" />
              C-TEX PAY
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-3 py-1.5 text-xs font-medium text-ctex-text-muted transition hover:border-ctex-blue hover:text-ctex-blue"
            >
              ← Back to Home
            </Link>
          </div>

          <div
            className="rounded-2xl border border-ctex-border bg-ctex-surface/80 p-6 shadow-2xl shadow-black/5 backdrop-blur-xl sm:p-8"
            style={{
              boxShadow:
                "0 20px 60px -20px color-mix(in srgb, var(--ctex-blue) 25%, transparent)",
            }}
          >
            <header className="mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-ctex-text sm:text-3xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-sm text-ctex-text-muted">{subtitle}</p>
              )}
            </header>

            {children}
          </div>

          {footer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-6 text-center text-sm text-ctex-text-muted"
            >
              {footer}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ImageLogo } from "../../utils/image";

/* --------------------------------------------------------------------------
   Brand logo
   -------------------------------------------------------------------------- */
function BrandLink() {
  return (
    <Link
      to="/"
      aria-label="C-TEX PAY home"
      className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-accent/40"
    >
      <img
        src={ImageLogo.Logo2}
        alt=""
        className="h-[52px] w-[72px] object-contain border border-ctex-border rounded-full bg-ctex-surface "
      />
    </Link>
  );
}

/* --------------------------------------------------------------------------
   Layout
   -------------------------------------------------------------------------- */
export default function AuthLayout({ title, subtitle, children, footer }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen w-full flex-col bg-ctex-panel text-ctex-text">
      {/* Top bar */}
      <div className="flex items-center px-5 py-5 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-3.5 py-2 text-xs font-medium text-ctex-text-muted transition hover:text-ctex-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-accent/40"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-2 sm:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[440px]"
        >
          <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-6 shadow-sm shadow-black/5 sm:p-9">
            <header className="mb-8 flex flex-col items-center text-center">
              <BrandLink />
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ctex-text sm:text-[26px]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ctex-text-muted">
                  {subtitle}
                </p>
              )}
            </header>

            {children}
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-ctex-text-muted">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
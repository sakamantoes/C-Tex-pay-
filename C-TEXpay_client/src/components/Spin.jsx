import { motion, useReducedMotion } from "framer-motion";
import { ImageLogo } from "../utils/image";

const CIRCUMFERENCE = 2 * Math.PI * 52;

export function FullScreenLoader() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ctex-bg text-ctex-text"
    >
      <span className="sr-only">Loading</span>

      {/* Soft ambient glow behind the logo */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute h-72 w-72 rounded-full blur-3xl"
        style={{
          background: "color-mix(in srgb, var(--ctex-accent) 14%, transparent)",
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={
          reduceMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }
        }
        transition={
          reduceMotion
            ? { duration: 0.4 }
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
        }
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center gap-8"
      >
        <div className="relative flex h-28 w-28 items-center justify-center">
          {/* Expanding ripple rings */}
          {!reduceMotion &&
            [0, 1].map((i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-ctex-accent/40"
                initial={{ opacity: 0.5, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.7 }}
                transition={{
                  duration: 2.4,
                  delay: i * 1.2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}

          {/* Track + spinning arc */}
          <svg
            viewBox="0 0 112 112"
            className="absolute inset-0 h-28 w-28"
            aria-hidden="true"
          >
            <circle
              cx="56"
              cy="56"
              r="52"
              fill="none"
              stroke="var(--ctex-border)"
              strokeWidth="2"
            />
            <motion.circle
              cx="56"
              cy="56"
              r="52"
              fill="none"
              stroke="var(--ctex-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * 0.28} ${CIRCUMFERENCE}`}
              style={{ originX: "56px", originY: "56px" }}
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            />
          </svg>

          {/* Logo */}
          <motion.img
            src={ImageLogo.Logo2}
            alt=""
            className="relative h-14 w-14 object-contain"
            animate={
              reduceMotion ? undefined : { scale: [1, 1.06, 1], y: [0, -2, 0] }
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Indeterminate progress bar */}
        <div
          aria-hidden="true"
          className="relative h-1 w-32 overflow-hidden rounded-full bg-ctex-border"
        >
          <motion.span
            className="absolute inset-y-0 w-1/2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--ctex-accent), transparent)",
            }}
            initial={{ x: "-100%" }}
            animate={reduceMotion ? { x: "50%" } : { x: "200%" }}
            transition={{
              duration: 1.4,
              repeat: reduceMotion ? 0 : Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}

export default FullScreenLoader;
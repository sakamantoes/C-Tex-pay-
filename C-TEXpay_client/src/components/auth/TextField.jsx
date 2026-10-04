import { motion, AnimatePresence } from "framer-motion";
import { forwardRef, useState } from "react";

const TextField = forwardRef(function TextField(
  { label, error, icon, type = "text", className = "", ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
          {label}
        </label>
      )}

      <div
        className={[
          "group relative flex items-center rounded-xl border bg-ctex-elevated/60 transition-all duration-200",
          "border-ctex-border",
          focused ? "border-ctex-blue ring-2 ring-ctex-blue/20" : "",
          error ? "border-red-500/70 ring-2 ring-red-500/15" : "",
        ].join(" ")}
      >
        {icon && (
          <span className="pointer-events-none absolute left-3 flex h-5 w-5 items-center justify-center text-ctex-text-muted">
            {icon}
          </span>
        )}

        <input
          ref={ref}
          type={inputType}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className={[
            "h-11 w-full bg-transparent text-sm text-ctex-text placeholder:text-ctex-text-muted/60",
            "outline-none rounded-xl",
            icon ? "pl-10" : "pl-3.5",
            isPassword ? "pr-11" : "pr-3.5",
            className,
          ].join(" ")}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-ctex-text-muted transition hover:bg-ctex-border/40 hover:text-ctex-text"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 text-xs text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

export default TextField;

/* ----------------------------- Inline Icons ----------------------------- */

function EyeIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a18.77 18.77 0 0 1 4.06-5.06" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.77 18.77 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}
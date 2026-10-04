import { motion } from "framer-motion";

export default function PrimaryButton({
  children,
  loading,
  disabled,
  type = "submit",
  className = "",
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      whileHover={!isDisabled ? { y: -1 } : undefined}
      whileTap={!isDisabled ? { scale: 0.985 } : undefined}
      disabled={isDisabled}
      className={[
        "relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl",
        "bg-ctex-blue text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25",
        "transition-all duration-200",
        "hover:bg-ctex-blue-light hover:shadow-ctex-blue/35",
        "disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none",
        className,
      ].join(" ")}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
      )}
      <span>{children}</span>

      {/* Sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 hover:translate-x-full"
      />
    </motion.button>
  );
}
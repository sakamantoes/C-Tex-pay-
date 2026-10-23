import { ImageLogo } from "../utils/image";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ctex-bg text-ctex-text">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Soft pulsing glow behind the logo */}
          <span
            aria-hidden
            className="ctex-loader-glow pointer-events-none absolute inset-0 rounded-full bg-ctex-blue/20 blur-2xl"
          />

          {/* Logo with float + subtle scale */}
          <img
            src={ImageLogo.Logo2}
            alt="Loading C-TEX PAY"
            className="ctex-loader-img relative h-20 w-auto select-none"
            draggable="false"
          />
        </div>

        {/* Optional: shimmering "Loading" label */}
        <p className="ctex-loader-label font-mono text-[11px] tracking-[0.25em] text-ctex-text-muted">
          LOADING
        </p>
      </div>

      {/* Scoped styles — keyframes + reduced-motion fallback */}
      <style>{`
        @keyframes ctex-loader-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-6px) scale(1.03); }
        }
        @keyframes ctex-loader-glow {
          0%, 100% { opacity: 0.35; transform: scale(0.95); }
          50%      { opacity: 0.7;  transform: scale(1.08); }
        }
        @keyframes ctex-loader-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .ctex-loader-img {
          animation: ctex-loader-float 2.4s ease-in-out infinite;
          filter: drop-shadow(0 6px 16px rgba(11, 104, 173, 0.18));
          will-change: transform;
        }

        .ctex-loader-glow {
          animation: ctex-loader-glow 2.4s ease-in-out infinite;
        }

        .ctex-loader-label {
          background: linear-gradient(
            90deg,
            var(--ctex-text-muted) 0%,
            var(--ctex-text) 50%,
            var(--ctex-text-muted) 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: ctex-loader-shimmer 2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .ctex-loader-img,
          .ctex-loader-glow,
          .ctex-loader-label {
            animation: none !important;
          }
          .ctex-loader-label {
            -webkit-text-fill-color: var(--ctex-text-muted);
          }
        }
      `}</style>
    </div>
  );
}
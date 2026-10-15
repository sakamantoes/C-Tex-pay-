import { BadgeCheck, Lock, ShieldCheck } from "lucide-react";
import { ImageLogo } from "../../../utils/image";

const LOGO_STYLE = { maxWidth: "none" };

export default function CheckoutShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ctex-bg px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-10">
      {/* Background: soft blue washes + fine grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(30,120,190,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,120,190,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-240px] h-[460px] w-[900px] -translate-x-1/2 rounded-full bg-ctex-blue/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-[-200px] h-[420px] w-[520px] rounded-full bg-ctex-blue-light/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Main content */}
        <main>{children}</main>

        {/* Footer trust signals */}
        <footer className="mt-10 sm:mt-12">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium text-ctex-text-muted">
            <TrustItem icon={ShieldCheck} label="Secure payments" />
            <TrustItem icon={Lock} label="Encrypted connection" />
            <TrustItem icon={BadgeCheck} label="Trusted platform" />
          </ul>

          <p className="mt-4 flex flex-wrap items-center justify-center gap-1 text-center text-xs text-ctex-text-muted/80">
            <span>Protected by</span>
            <img
              src={ImageLogo.Logo2}
              alt="C-TEX PAY"
              className="inline-block h-3.5 w-[60px] align-middle"
            />
            <span>. Your payment details are never shared with third parties.</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

function TrustItem({ icon: Icon, label }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ctex-blue/10 text-ctex-blue">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span>{label}</span>
    </li>
  );
}
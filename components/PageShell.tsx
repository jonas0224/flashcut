import type { ReactNode } from "react";

export function PageShell({
  children,
  className = "",
  hideFooter = false,
  lockScroll = false,
}: {
  children: ReactNode;
  className?: string;
  hideFooter?: boolean;
  /** Host play view — keep content locked to viewport height. */
  lockScroll?: boolean;
}) {
  const year = new Date().getFullYear();

  return (
    <div className={`fc-shell ${className}`}>
      <div className="relative z-10 flex h-dvh w-full flex-col overflow-hidden">
        <div
          className={`flex min-h-0 flex-1 flex-col ${lockScroll ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          {children}
        </div>
        {!hideFooter && (
          <footer className="shrink-0 px-5 py-3 text-center">
            <p className="text-xs text-white/50">© {year} Jonas</p>
          </footer>
        )}
      </div>
    </div>
  );
}

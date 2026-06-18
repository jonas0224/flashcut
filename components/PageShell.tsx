import type { ReactNode } from "react";

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <div className={`fc-shell ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(37,99,235,0.08),transparent_45%),radial-gradient(circle_at_85%_90%,rgba(59,130,246,0.06),transparent_40%)]" />
      <div className="relative z-10 flex min-h-dvh w-full flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="px-5 py-6 text-center">
          <p className="text-xs text-blue-400">© {year} Jonas</p>
        </footer>
      </div>
    </div>
  );
}

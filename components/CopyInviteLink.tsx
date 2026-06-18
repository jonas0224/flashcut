"use client";

import { useEffect, useState } from "react";

type Props = {
  code: string;
  className?: string;
  variant?: "light" | "shell";
};

export function CopyInviteLink({
  code,
  className = "",
  variant = "light",
}: Props) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const onShell = variant === "shell";

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/join/${code}`);
  }, [code]);

  async function copyLink() {
    const url = inviteUrl || `${window.location.origin}/join/${code}`;
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <p className={onShell ? "fc-shell-label" : "fc-label"}>Invite link</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          readOnly
          value={inviteUrl}
          className={`min-w-0 flex-1 text-sm sm:text-base ${onShell ? "fc-shell-input" : "fc-input"}`}
          aria-label="Invite link"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={() => void copyLink()}
          className="fc-btn-cta shrink-0 px-5 py-3 text-sm sm:text-base"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      {copyError && (
        <p
          className={`text-sm font-semibold ${onShell ? "text-red-300" : "text-red-600"}`}
        >
          Could not copy — select the link and copy manually.
        </p>
      )}
    </div>
  );
}

import { useState, useCallback } from "react";
import { copyToClipboard } from "../lib/clipboard";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export default function CopyButton({
  text,
  label = "Copy",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`px-4 py-2 rounded-[var(--radius-inner)] text-sm font-mono font-bold transition-all duration-200 cursor-pointer ${
        copied
          ? "bg-green-700 text-white"
          : "bg-black/10 text-black hover:bg-black/20"
      } ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

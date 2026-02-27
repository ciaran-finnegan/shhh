import { useMemo } from "react";
import CopyButton from "./CopyButton";
import MagneticButton from "./MagneticButton";

interface ShareViewProps {
  id: string;
  passphrase: string;
  expiresIn: number;
  onReset: () => void;
}

export default function ShareView({ id, passphrase, expiresIn, onReset }: ShareViewProps) {
  const shareUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/s/${id}`;
  }, [id]);

  const expiryLabel = useMemo(() => {
    const hours = Math.floor(expiresIn / 3600);
    const minutes = Math.floor((expiresIn % 3600) / 60);
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  }, [expiresIn]);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="text-center mb-2">
        <h2 className="font-serif italic text-2xl mb-1">Sealed.</h2>
        <p className="text-mid-gray text-sm">
          Share the link and passphrase separately. Expires in{" "}
          <span className="font-mono font-bold">{expiryLabel}</span>.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <span className="block text-sm font-semibold text-mid-gray mb-2 uppercase tracking-wider">
            Link
          </span>
          <div className="flex items-center gap-2 bg-off-white rounded-[var(--radius-inner)] p-3">
            <code className="flex-1 font-mono text-sm truncate select-all">{shareUrl}</code>
            <CopyButton text={shareUrl} label="Copy" />
          </div>
        </div>

        <div>
          <span className="block text-sm font-semibold text-mid-gray mb-2 uppercase tracking-wider">
            Passphrase
          </span>
          <div className="flex items-center gap-2 bg-off-white rounded-[var(--radius-inner)] p-3">
            <code className="flex-1 font-mono text-sm select-all">{passphrase}</code>
            <CopyButton text={passphrase} label="Copy" />
          </div>
        </div>
      </div>

      <div className="bg-signal-red/5 border border-signal-red/20 rounded-[var(--radius-inner)] p-4">
        <p className="text-sm text-signal-red font-semibold">
          This secret can only be opened once. After that, it's gone forever.
        </p>
      </div>

      <MagneticButton variant="secondary" onClick={onReset} className="w-full">
        Seal another
      </MagneticButton>
    </div>
  );
}

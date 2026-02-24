import { useState, useCallback } from "react";
import { decrypt } from "../lib/crypto";
import { retrieveSecret } from "../lib/api";
import MagneticButton from "./MagneticButton";
import CopyButton from "./CopyButton";

interface OpenViewProps {
  secretId: string;
  onError: (message: string) => void;
  onReset: () => void;
}

export default function OpenView({ secretId, onError, onReset }: OpenViewProps) {
  const [passphrase, setPassphrase] = useState("");
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleOpen = useCallback(async () => {
    if (!passphrase.trim()) return;

    setOpening(true);
    try {
      const ciphertext = await retrieveSecret(secretId);
      const plaintext = await decrypt(ciphertext, passphrase);
      setDecrypted(plaintext);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to open secret";

      if (message.includes("Wrong passphrase")) {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      } else {
        onError(message);
      }
    } finally {
      setOpening(false);
    }
  }, [secretId, passphrase, onError]);

  if (decrypted !== null) {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="text-center mb-2">
          <h2 className="font-serif italic text-2xl mb-1">Opened.</h2>
          <p className="text-mid-gray text-sm">
            This secret has been destroyed. Copy it now.
          </p>
        </div>

        <div className="bg-off-white rounded-[var(--radius-inner)] p-4">
          <pre className="font-mono text-sm whitespace-pre-wrap break-words select-all">
            {decrypted}
          </pre>
        </div>

        <div className="flex gap-2">
          <CopyButton text={decrypted} label="Copy secret" className="flex-1" />
          <MagneticButton variant="secondary" onClick={onReset} className="flex-1">
            Done
          </MagneticButton>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-up space-y-6 ${shaking ? "animate-shake" : ""}`}>
      <div className="text-center mb-2">
        <h2 className="font-serif italic text-2xl mb-1">
          Someone sent you a secret.
        </h2>
        <p className="text-mid-gray text-sm">
          Enter the passphrase to open it. You only get one shot.
        </p>
      </div>

      <div>
        <label
          htmlFor="open-passphrase"
          className="block text-sm font-semibold text-mid-gray mb-2 uppercase tracking-wider"
        >
          Passphrase
        </label>
        <input
          id="open-passphrase"
          type="text"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleOpen();
          }}
          placeholder="Enter the passphrase..."
          autoFocus
          className="w-full p-4 bg-off-white rounded-[var(--radius-inner)] border-2 border-transparent focus:border-black/20 outline-none font-mono text-sm transition-colors"
        />
      </div>

      <MagneticButton
        onClick={handleOpen}
        disabled={!passphrase.trim() || opening}
        className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {opening ? "Opening..." : "Open it"}
      </MagneticButton>
    </div>
  );
}

import { useState, useCallback } from "react";
import { TTL_PRESETS } from "@shared/constants";
import { encrypt } from "../lib/crypto";
import { generatePassphrase } from "../lib/passphrase";
import { createSecret } from "../lib/api";
import MagneticButton from "./MagneticButton";
import StrengthBar from "./StrengthBar";

interface SealViewProps {
  onSealed: (id: string, passphrase: string, expiresIn: number) => void;
  onError: (message: string) => void;
}

export default function SealView({ onSealed, onError }: SealViewProps) {
  const [secret, setSecret] = useState("");
  const [passphrase, setPassphrase] = useState(() => generatePassphrase());
  const [ttl, setTtl] = useState<number>(TTL_PRESETS[0].seconds);
  const [sealing, setSealing] = useState(false);

  const regenerate = useCallback(() => {
    setPassphrase(generatePassphrase());
  }, []);

  const handleSeal = useCallback(async () => {
    if (!secret.trim()) return;

    setSealing(true);
    try {
      const ciphertext = await encrypt(secret, passphrase);
      const result = await createSecret(ciphertext, ttl);
      onSealed(result.id, passphrase, result.expiresIn);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to seal secret");
    } finally {
      setSealing(false);
    }
  }, [secret, passphrase, ttl, onSealed, onError]);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <label
          htmlFor="secret-input"
          className="block text-sm font-semibold text-mid-gray mb-2 uppercase tracking-wider"
        >
          Your secret
        </label>
        <textarea
          id="secret-input"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Paste your secret here..."
          rows={5}
          className="w-full p-4 bg-off-white rounded-[var(--radius-inner)] border-2 border-transparent focus:border-black/20 outline-none resize-none font-mono text-sm transition-colors"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="passphrase-input"
            className="text-sm font-semibold text-mid-gray uppercase tracking-wider"
          >
            Passphrase
          </label>
          <button
            onClick={regenerate}
            className="text-xs font-mono text-signal-red hover:underline cursor-pointer"
          >
            Regenerate
          </button>
        </div>
        <input
          id="passphrase-input"
          type="text"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="w-full p-4 bg-off-white rounded-[var(--radius-inner)] border-2 border-transparent focus:border-black/20 outline-none font-mono text-sm transition-colors"
        />
        <div className="mt-2">
          <StrengthBar passphrase={passphrase} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-mid-gray mb-3 uppercase tracking-wider">
          Expires in
        </label>
        <div className="flex gap-2">
          {TTL_PRESETS.map((preset) => (
            <button
              key={preset.seconds}
              onClick={() => setTtl(preset.seconds)}
              className={`flex-1 py-2.5 rounded-[var(--radius-inner)] text-sm font-semibold transition-all cursor-pointer ${
                ttl === preset.seconds
                  ? "bg-black text-off-white"
                  : "bg-off-white text-black hover:bg-black/10"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <MagneticButton
        onClick={handleSeal}
        disabled={!secret.trim() || sealing}
        className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sealing ? "Sealing..." : "Seal it"}
      </MagneticButton>
    </div>
  );
}

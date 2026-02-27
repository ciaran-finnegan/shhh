import { TTL_PRESETS } from "@shared/constants";
import { useCallback, useState } from "react";
import { createSecret, createSecretWithFiles } from "../lib/api";
import { encrypt } from "../lib/crypto";
import { encryptFile } from "../lib/file-crypto";
import { generatePassphrase } from "../lib/passphrase";
import FileDropZone from "./FileDropZone";
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
  const [files, setFiles] = useState<File[]>([]);
  const [sealProgress, setSealProgress] = useState("");

  const regenerate = useCallback(() => {
    setPassphrase(generatePassphrase());
  }, []);

  const handleSeal = useCallback(async () => {
    const hasText = secret.trim().length > 0;
    const hasFiles = files.length > 0;
    if (!hasText && !hasFiles) return;

    setSealing(true);
    try {
      if (hasFiles) {
        setSealProgress("Encrypting...");
        const encryptedText = hasText ? await encrypt(secret, passphrase) : null;

        const encryptedFiles = [];
        for (let i = 0; i < files.length; i++) {
          setSealProgress(`Encrypting file ${i + 1}/${files.length}...`);
          encryptedFiles.push(await encryptFile(files[i], passphrase));
        }

        setSealProgress("Uploading...");
        const result = await createSecretWithFiles(encryptedText, encryptedFiles, ttl);
        onSealed(result.id, passphrase, result.expiresIn);
      } else {
        const ciphertext = await encrypt(secret, passphrase);
        const result = await createSecret(ciphertext, ttl);
        onSealed(result.id, passphrase, result.expiresIn);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to seal secret");
    } finally {
      setSealing(false);
      setSealProgress("");
    }
  }, [secret, passphrase, ttl, files, onSealed, onError]);

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

      <FileDropZone files={files} onFilesChange={setFiles} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="passphrase-input"
            className="text-sm font-semibold text-mid-gray uppercase tracking-wider"
          >
            Passphrase
          </label>
          <button
            type="button"
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
        <span className="block text-sm font-semibold text-mid-gray mb-3 uppercase tracking-wider">
          Expires in
        </span>
        <div className="flex gap-2">
          {TTL_PRESETS.map((preset) => (
            <button
              type="button"
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
        disabled={(!secret.trim() && files.length === 0) || sealing}
        className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sealing ? sealProgress || "Sealing..." : "Seal it"}
      </MagneticButton>
    </div>
  );
}

import { useCallback, useState } from "react";
import { retrieveSecretV2 } from "../lib/api";
import { decrypt } from "../lib/crypto";
import { decryptFileData } from "../lib/file-crypto";
import { formatFileSize } from "../lib/format";
import CopyButton from "./CopyButton";
import MagneticButton from "./MagneticButton";

interface OpenViewProps {
  secretId: string;
  onError: (message: string) => void;
  onReset: () => void;
}

interface DecryptedFile {
  name: string;
  type: string;
  size: number;
  encryptedData: string;
}

export default function OpenView({ secretId, onError, onReset }: OpenViewProps) {
  const [passphrase, setPassphrase] = useState("");
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decryptedFiles, setDecryptedFiles] = useState<DecryptedFile[]>([]);
  const [hasResult, setHasResult] = useState(false);
  const [opening, setOpening] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  const handleOpen = useCallback(async () => {
    if (!passphrase.trim()) return;

    setOpening(true);
    try {
      const result = await retrieveSecretV2(secretId);

      if ("ciphertext" in result) {
        // V1 response
        const plaintext = await decrypt(result.ciphertext, passphrase);
        setDecryptedText(plaintext);
        setHasResult(true);
      } else {
        // V2 response
        let text: string | null = null;
        if (result.text) {
          text = await decrypt(result.text, passphrase);
        }

        const files: DecryptedFile[] = [];
        if (result.files) {
          for (const f of result.files) {
            const metaJson = await decrypt(f.encryptedMeta, passphrase);
            const meta = JSON.parse(metaJson) as {
              name: string;
              type: string;
              size: number;
            };
            files.push({
              name: meta.name,
              type: meta.type,
              size: meta.size,
              encryptedData: f.data,
            });
          }
        }

        setDecryptedText(text);
        setDecryptedFiles(files);
        setHasResult(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open secret";

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

  const handleDownload = useCallback(
    async (file: DecryptedFile, index: number) => {
      setDownloading(index);
      try {
        const decrypted = await decryptFileData(file.encryptedData, passphrase);
        const blob = new Blob([decrypted], { type: file.type || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        onError("Failed to decrypt file");
      } finally {
        setDownloading(null);
      }
    },
    [passphrase, onError],
  );

  if (hasResult) {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="text-center mb-2">
          <h2 className="font-serif italic text-2xl mb-1">Opened.</h2>
          <p className="text-mid-gray text-sm">This secret has been destroyed. Copy it now.</p>
        </div>

        {decryptedText !== null && decryptedText.length > 0 && (
          <div className="bg-off-white rounded-[var(--radius-inner)] p-4">
            <pre className="font-mono text-sm whitespace-pre-wrap break-words select-all">
              {decryptedText}
            </pre>
          </div>
        )}

        {decryptedFiles.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-mid-gray mb-2 uppercase tracking-wider">
              Files
            </p>
            <ul className="space-y-1">
              {decryptedFiles.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between bg-off-white rounded-[var(--radius-inner)] px-3 py-2"
                >
                  <span className="font-mono text-xs truncate mr-2">{file.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-mid-gray">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => handleDownload(file, i)}
                      disabled={downloading === i}
                      className="text-xs font-mono text-signal-red hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {downloading === i ? "..." : "Download"}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          {decryptedText !== null && decryptedText.length > 0 && (
            <CopyButton text={decryptedText} label="Copy secret" className="flex-1" />
          )}
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
        <h2 className="font-serif italic text-2xl mb-1">Someone sent you a secret.</h2>
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

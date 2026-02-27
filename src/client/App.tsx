import { GITHUB_URL } from "@shared/constants";
import { useCallback, useEffect, useState } from "react";
import ErrorState from "./components/ErrorState";
import OpenView from "./components/OpenView";
import SealView from "./components/SealView";
import ShareView from "./components/ShareView";

type ViewState = "seal" | "share" | "open" | "error";

interface ShareData {
  id: string;
  passphrase: string;
  expiresIn: number;
}

function parseSecretId(): string | null {
  const match = window.location.pathname.match(/^\/s\/([^/]+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const [view, setView] = useState<ViewState>(() => (parseSecretId() ? "open" : "seal"));
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [secretId] = useState<string | null>(() => parseSecretId());
  const [errorMessage, setErrorMessage] = useState("");

  const handleSealed = useCallback((id: string, passphrase: string, expiresIn: number) => {
    setShareData({ id, passphrase, expiresIn });
    setView("share");
  }, []);

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
    setView("error");
  }, []);

  const handleReset = useCallback(() => {
    window.history.pushState({}, "", "/");
    setView("seal");
    setShareData(null);
    setErrorMessage("");
  }, []);

  useEffect(() => {
    const handler = () => {
      const id = parseSecretId();
      if (id) {
        setView("open");
      } else {
        setView("seal");
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold tracking-tight">
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              shhh
            </button>
          </h1>
          <p className="text-mid-gray text-sm mt-1">share secrets, not passwords</p>
        </header>

        <main className="bg-white/60 backdrop-blur-sm rounded-[var(--radius-card)] p-8 shadow-sm">
          {view === "seal" && <SealView onSealed={handleSealed} onError={handleError} />}
          {view === "share" && shareData && (
            <ShareView
              id={shareData.id}
              passphrase={shareData.passphrase}
              expiresIn={shareData.expiresIn}
              onReset={handleReset}
            />
          )}
          {view === "open" && secretId && (
            <OpenView secretId={secretId} onError={handleError} onReset={handleReset} />
          )}
          {view === "error" && <ErrorState message={errorMessage} onReset={handleReset} />}
        </main>

        <footer className="text-center mt-6 text-xs text-mid-gray space-y-1">
          <p>Zero-knowledge encryption. Your secret never touches our servers unencrypted.</p>
          <p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-black transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Open source — verify it yourself
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

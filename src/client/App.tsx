import { useState, useEffect, useCallback } from "react";
import SealView from "./components/SealView";
import ShareView from "./components/ShareView";
import OpenView from "./components/OpenView";
import ErrorState from "./components/ErrorState";

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
  const [view, setView] = useState<ViewState>(() =>
    parseSecretId() ? "open" : "seal",
  );
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [secretId] = useState<string | null>(() => parseSecretId());
  const [errorMessage, setErrorMessage] = useState("");

  const handleSealed = useCallback(
    (id: string, passphrase: string, expiresIn: number) => {
      setShareData({ id, passphrase, expiresIn });
      setView("share");
    },
    [],
  );

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
          <h1
            className="text-5xl font-bold tracking-tight cursor-pointer"
            onClick={handleReset}
          >
            shhh
          </h1>
          <p className="text-mid-gray text-sm mt-1">
            share secrets, not passwords
          </p>
        </header>

        <main className="bg-white/60 backdrop-blur-sm rounded-[var(--radius-card)] p-8 shadow-sm">
          {view === "seal" && (
            <SealView onSealed={handleSealed} onError={handleError} />
          )}
          {view === "share" && shareData && (
            <ShareView
              id={shareData.id}
              passphrase={shareData.passphrase}
              expiresIn={shareData.expiresIn}
              onReset={handleReset}
            />
          )}
          {view === "open" && secretId && (
            <OpenView
              secretId={secretId}
              onError={handleError}
              onReset={handleReset}
            />
          )}
          {view === "error" && (
            <ErrorState message={errorMessage} onReset={handleReset} />
          )}
        </main>

        <footer className="text-center mt-6 text-xs text-mid-gray">
          Zero-knowledge encryption. Your secret never touches our servers unencrypted.
        </footer>
      </div>
    </div>
  );
}

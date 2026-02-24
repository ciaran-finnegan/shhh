import { useMemo, useState, useEffect } from "react";

type ZxcvbnFn = (password: string) => { score: number };

const SEGMENT_COLORS = [
  "bg-signal-red",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-green-500",
];

const LABELS = ["Weak", "Fair", "Good", "Strong"];

let zxcvbnFn: ZxcvbnFn | null = null;
const zxcvbnPromise = Promise.all([
  import("@zxcvbn-ts/core"),
  import("@zxcvbn-ts/language-common"),
  import("@zxcvbn-ts/language-en"),
]).then(([core, common, en]) => {
  core.zxcvbnOptions.setOptions({
    translations: en.translations,
    graphs: common.adjacencyGraphs,
    dictionary: {
      ...common.dictionary,
      ...en.dictionary,
    },
  });
  zxcvbnFn = core.zxcvbn;
});

interface StrengthBarProps {
  passphrase: string;
}

export default function StrengthBar({ passphrase }: StrengthBarProps) {
  const [ready, setReady] = useState(!!zxcvbnFn);

  useEffect(() => {
    if (!ready) {
      zxcvbnPromise.then(() => setReady(true));
    }
  }, [ready]);

  const score = useMemo(() => {
    if (!passphrase || !zxcvbnFn) return 0;
    return zxcvbnFn(passphrase).score;
  }, [passphrase, ready]);

  const filled = score;

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1 flex-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < filled ? SEGMENT_COLORS[filled - 1] : "bg-black/10"
            }`}
          />
        ))}
      </div>
      {passphrase && filled > 0 && (
        <span className="text-xs font-mono text-mid-gray">
          {LABELS[filled - 1]}
        </span>
      )}
    </div>
  );
}

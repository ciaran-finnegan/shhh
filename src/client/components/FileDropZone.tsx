import { MAX_FILE_SIZE, MAX_FILES } from "@shared/constants";
import { useCallback, useRef, useState } from "react";
import { formatFileSize } from "../lib/format";

interface FileDropZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function FileDropZone({ files, onFilesChange }: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null);
      const newFiles = Array.from(incoming);

      if (files.length + newFiles.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      for (const f of newFiles) {
        if (f.size > MAX_FILE_SIZE) {
          setError(`${f.name} exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`);
          return;
        }
      }

      onFilesChange([...files, ...newFiles]);
    },
    [files, onFilesChange],
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
      setError(null);
    },
    [files, onFilesChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  return (
    <div>
      <span className="block text-sm font-semibold text-mid-gray mb-2 uppercase tracking-wider">
        Attachments
      </span>

      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`rounded-[var(--radius-inner)] border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-black/40 bg-black/5"
            : "border-black/10 bg-off-white hover:border-black/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <svg
          aria-hidden="true"
          className="mx-auto mb-2 text-mid-gray"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
        <p className="text-sm text-mid-gray">Drop files here or click to browse</p>
        <p className="text-xs text-mid-gray/60 mt-1">
          Up to {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each
        </p>
      </div>

      {error && <p className="text-xs text-signal-red mt-2">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-3 space-y-1">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between bg-off-white rounded-[var(--radius-inner)] px-3 py-2"
            >
              <span className="font-mono text-xs truncate mr-2">{file.name}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-mid-gray">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="text-mid-gray hover:text-signal-red transition-colors cursor-pointer text-sm leading-none"
                  aria-label={`Remove ${file.name}`}
                >
                  &times;
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";

export function FileUpload({
  accept,
  file,
  onChange,
}: {
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <label className="mb-1.5 block text-sm text-ink-secondary">File</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onChange(dropped);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed px-6 py-10 text-center transition ${
          dragOver ? "border-info bg-info-bg" : "border-canvas-border hover:border-ink-muted"
        }`}
      >
        {file ? (
          <>
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="mt-1 text-xs text-ink-muted">{(file.size / 1024).toFixed(0)} KB — click to replace</p>
          </>
        ) : (
          <>
            <p className="text-sm text-ink">Drop a file here, or click to browse</p>
            <p className="mt-1 text-xs text-ink-muted">Up to 15MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

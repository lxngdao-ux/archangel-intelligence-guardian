"use client";

export function TextPasteInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-ink-secondary" htmlFor="text-input">
        Message or text
      </label>
      <textarea
        id="text-input"
        rows={8}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-card border border-canvas-border bg-canvas-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-info"
      />
      <p className="mt-1.5 text-xs text-ink-muted">{value.length.toLocaleString()} characters</p>
    </div>
  );
}

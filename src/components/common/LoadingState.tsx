export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-secondary">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-canvas-border border-t-info" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

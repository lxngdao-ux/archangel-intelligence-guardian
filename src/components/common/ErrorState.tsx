export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-risk/30 bg-risk-bg py-12 text-center">
      <p className="font-medium text-risk">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-card border border-risk/40 px-4 py-2 text-sm text-risk hover:bg-risk/10"
        >
          Try again
        </button>
      )}
    </div>
  );
}

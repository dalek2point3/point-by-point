export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 rounded-full bg-ink/10">
      <div className="h-3 rounded-full bg-moss transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

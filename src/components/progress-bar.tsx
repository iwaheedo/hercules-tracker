export function ProgressBar({
  value,
  size = "default",
}: {
  value: number;
  size?: "sm" | "default";
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={`w-full ${height} bg-surface-200 rounded-full overflow-hidden`}>
      <div
        className={`${height} bg-brand-500 rounded-full transition-all duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

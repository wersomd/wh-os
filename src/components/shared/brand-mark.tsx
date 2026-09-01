import { cn } from "@/lib/utils";

// WH Solutions node-graph logomark: a rounded "ink" frame with an electric-blue
// connection graph. Colors come from CSS vars so it adapts to light / dark.
export default function BrandMark({
  withWordmark = false,
  className,
}: {
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        aria-hidden
        viewBox="0 0 32 32"
        className="size-8 shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="var(--brand-frame)" />
        <path
          d="M16 16 7 9M16 16l9 7"
          stroke="var(--brand-node)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="4.2" fill="var(--brand-node)" />
        <circle cx="7" cy="9" r="2.6" fill="var(--brand-node)" />
        <circle cx="25" cy="23" r="2.6" fill="var(--brand-node)" />
      </svg>
      {withWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight">
          WH·OS
        </span>
      )}
    </span>
  );
}

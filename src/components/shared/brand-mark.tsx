import { cn } from "@/lib/utils";

export default function BrandMark({
  withWordmark = false,
  className,
}: {
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-base font-semibold leading-none text-primary"
      >
        人生
      </span>
      {withWordmark && (
        <span className="text-lg font-semibold tracking-tight">JinseiOS</span>
      )}
    </span>
  );
}

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
        className="flex size-8 items-center justify-center rounded-md bg-primary text-base font-medium leading-none text-primary-foreground"
      >
        人生
      </span>
      {withWordmark && (
        <span className="text-lg font-medium">JinseiOS</span>
      )}
    </span>
  );
}

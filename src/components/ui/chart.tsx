"use client";

import * as React from "react";
import { Tooltip } from "recharts";

import { cn } from "@/lib/utils";

type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config?: ChartConfig;
  }
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-legend-item-text]:text-muted-foreground [&_.recharts-text]:fill-foreground [&_.recharts-tooltip-cursor]:fill-muted/50",
      className,
    )}
    {...props}
  />
));
ChartContainer.displayName = "ChartContainer";

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: Array<{
    name?: unknown;
    value?: unknown;
    color?: string;
    fill?: string;
  }>;
  label?: unknown;
  formatter?: (value: number, name: string, item: unknown) => React.ReactNode;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="animate-in fade-in-0 zoom-in-95 rounded-lg border bg-popover px-3 py-2 text-[15px] leading-5 text-popover-foreground shadow-sm">
      {label != null ? (
        <div className="mb-1 font-medium">{String(label)}</div>
      ) : null}
      <div className="grid gap-1">
        {payload.map((p) => {
          const name = String(p.name ?? "");
          const value = typeof p.value === "number" ? p.value : Number(p.value);
          const dotColor =
            typeof p.color === "string"
              ? p.color
              : typeof p.fill === "string"
                ? p.fill
                : undefined;
          return (
            <div key={name} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full border"
                  style={dotColor ? { backgroundColor: dotColor } : undefined}
                  aria-hidden
                />
                {name}
              </span>
              <span className="font-medium">
                {formatter ? formatter(value, name, p) : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartTooltip(props: React.ComponentProps<typeof Tooltip>) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Recharts 툴팁은 SSR 단계에서 환경 차이로 깨질 수 있어
  // 클라이언트 마운트 후에만 렌더링합니다.
  if (!mounted) return null;

  return <Tooltip cursor={{ fill: "hsl(var(—muted))" }} {…props} />;
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };


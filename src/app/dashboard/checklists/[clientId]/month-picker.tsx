"use client";

import { adjacentMonth, monthLabel } from "@/app/dashboard/checklists/data";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MonthPickerProps = {
  clientId: string;
  month: string;
};

export function MonthPicker({ clientId, month }: MonthPickerProps) {
  const router = useRouter();
  const basePath = `/dashboard/checklists/${clientId}`;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`${basePath}?month=${adjacentMonth(month, -1)}`}
        aria-label="Previous month"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        &larr;
      </Link>

      <input
        type="month"
        value={month}
        onChange={(event) => {
          if (event.target.value) {
            router.push(`${basePath}?month=${event.target.value}`);
          }
        }}
        className="h-7 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />

      <Link
        href={`${basePath}?month=${adjacentMonth(month, 1)}`}
        aria-label="Next month"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        &rarr;
      </Link>

      <span className="text-sm font-medium text-foreground">
        {monthLabel(month)}
      </span>
    </div>
  );
}

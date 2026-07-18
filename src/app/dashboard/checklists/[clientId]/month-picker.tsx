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
    <div className="flex flex-1 flex-wrap items-center gap-2 md:flex-none">
      <Link
        href={`${basePath}?month=${adjacentMonth(month, -1)}`}
        aria-label="Previous month"
        className={cn(buttonVariants({ variant: "outline" }), "min-w-12")}
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
        aria-label={monthLabel(month)}
        className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:flex-none md:px-2.5 md:text-sm dark:bg-input/30"
      />

      <Link
        href={`${basePath}?month=${adjacentMonth(month, 1)}`}
        aria-label="Next month"
        className={cn(buttonVariants({ variant: "outline" }), "min-w-12")}
      >
        &rarr;
      </Link>
    </div>
  );
}

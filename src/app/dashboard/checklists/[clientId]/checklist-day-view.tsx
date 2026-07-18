"use client";

import { upsertChecklistEntry } from "@/app/dashboard/checklists/actions";
import {
  CHECKLIST_VALUES,
  daysInMonth,
  entryDateFor,
  getInitials,
} from "@/app/dashboard/checklists/data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChecklistEntry, ChecklistValue, Objective } from "@/types/db";
import { useEffect, useMemo, useState, useTransition } from "react";

type ChecklistDayViewProps = {
  clientId: string;
  month: string;
  objectives: Objective[];
  entries: ChecklistEntry[];
  currentUserName: string;
};

type CellState = {
  value: ChecklistValue;
  recordedByName: string | null;
};

function cellKey(objectiveId: string, entryDate: string) {
  return `${objectiveId}:${entryDate}`;
}

function defaultDay(month: string): number {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (month === currentMonth) {
    return now.getDate();
  }
  return 1;
}

function dayLabel(month: string, day: number): string {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ChecklistDayView({
  clientId,
  month,
  objectives,
  entries,
  currentUserName,
}: ChecklistDayViewProps) {
  const totalDays = daysInMonth(month);
  const [day, setDay] = useState(() =>
    Math.min(defaultDay(month), totalDays),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [cells, setCells] = useState<Map<string, CellState>>(() => {
    const map = new Map<string, CellState>();
    for (const entry of entries) {
      map.set(cellKey(entry.objective_id, entry.entry_date), {
        value: entry.value,
        recordedByName: entry.recorded_by_name,
      });
    }
    return map;
  });

  useEffect(() => {
    setDay(Math.min(defaultDay(month), daysInMonth(month)));
  }, [month]);

  const entryDate = useMemo(() => entryDateFor(month, day), [month, day]);

  const handleChange = (
    objectiveId: string,
    nextValue: ChecklistValue | null,
  ) => {
    const key = cellKey(objectiveId, entryDate);
    const previous = cells.get(key);

    setError(null);
    setCells((prev) => {
      const next = new Map(prev);
      if (nextValue === null) {
        next.delete(key);
      } else {
        next.set(key, { value: nextValue, recordedByName: currentUserName });
      }
      return next;
    });
    setSavingKeys((prev) => new Set(prev).add(key));

    startTransition(async () => {
      const result = await upsertChecklistEntry(
        clientId,
        objectiveId,
        entryDate,
        nextValue,
      );

      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

      if (result.error) {
        setError(result.error);
        setCells((prev) => {
          const next = new Map(prev);
          if (previous) {
            next.set(key, previous);
          } else {
            next.delete(key);
          }
          return next;
        });
      }
    });
  };

  if (objectives.length === 0) {
    return (
      <p className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
        No objectives yet. Use Manage objectives to add one and start tracking
        this client.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-4 border-b bg-muted/20 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-w-14"
            disabled={day <= 1}
            onClick={() => setDay((value) => Math.max(1, value - 1))}
            aria-label="Previous day"
          >
            &larr;
          </Button>
          <div className="flex-1 text-center">
            <p className="text-base font-semibold text-foreground">
              {dayLabel(month, day)}
            </p>
            <p className="text-xs text-muted-foreground">
              Day {day} of {totalDays}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-w-14"
            disabled={day >= totalDays}
            onClick={() => setDay((value) => Math.min(totalDays, value + 1))}
            aria-label="Next day"
          >
            &rarr;
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <ul className="space-y-3">
        {objectives.map((objective, index) => {
          const key = cellKey(objective.id, entryDate);
          const cell = cells.get(key);
          const isSaving = savingKeys.has(key);

          return (
            <li
              key={objective.id}
              className="space-y-3 rounded-lg border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-foreground">
                  <span className="text-muted-foreground">#{index + 1}</span>{" "}
                  {objective.title}
                </p>
                {cell ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {getInitials(cell.recordedByName)}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {CHECKLIST_VALUES.map((option) => {
                  const selected = cell?.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSaving}
                      title={option.description}
                      onClick={() =>
                        handleChange(
                          objective.id,
                          selected ? null : option.value,
                        )
                      }
                      className={cn(
                        "flex min-h-12 flex-col items-center justify-center rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50",
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-input bg-transparent text-foreground hover:bg-muted",
                      )}
                    >
                      <span>{option.label}</span>
                      <span
                        className={cn(
                          "text-[0.65rem] font-normal",
                          selected
                            ? "text-background/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

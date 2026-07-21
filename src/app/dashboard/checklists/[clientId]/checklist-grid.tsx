"use client";

import {
  bulkClearChecklistEntries,
  bulkUpsertChecklistEntries,
  type BulkChecklistCell,
} from "@/app/dashboard/checklists/actions";
import {
  CHECKLIST_VALUES,
  daysInMonth,
  entryDateFor,
  getInitials,
} from "@/app/dashboard/checklists/data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChecklistEntry, ChecklistValue, Objective } from "@/types/db";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

type ChecklistGridProps = {
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

type RangeSelection = {
  objectiveId: string;
  anchorDay: number;
  endDay: number;
};

function cellKey(objectiveId: string, entryDate: string) {
  return `${objectiveId}:${entryDate}`;
}

function daysInRange(anchorDay: number, endDay: number): number[] {
  const start = Math.min(anchorDay, endDay);
  const end = Math.max(anchorDay, endDay);
  const result: number[] = [];
  for (let day = start; day <= end; day++) result.push(day);
  return result;
}

export function ChecklistGrid({
  clientId,
  month,
  objectives,
  entries,
  currentUserName,
}: ChecklistGridProps) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [selection, setSelection] = useState<RangeSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragObjectiveRef = useRef<string | null>(null);

  const [cells, setCells] = useState<Map<string, CellState>>(() => {
    const map = new Map<string, CellState>();
    for (const entry of entries) {
      map.set(cellKey(entry.objective_id, entry.entry_date.slice(0, 10)), {
        value: entry.value,
        recordedByName: entry.recorded_by_name,
      });
    }
    return map;
  });

  const days = useMemo(
    () => Array.from({ length: daysInMonth(month) }, (_, i) => i + 1),
    [month],
  );

  const selectedDays = useMemo(() => {
    if (!selection) return new Set<number>();
    return new Set(daysInRange(selection.anchorDay, selection.endDay));
  }, [selection]);

  const selectedCount = selectedDays.size;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelection(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!selection) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (gridRef.current?.contains(target)) return;
      if (barRef.current?.contains(target)) return;
      setSelection(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [selection]);

  useEffect(() => {
    if (!isDragging) return;

    const endDrag = () => {
      setIsDragging(false);
      dragObjectiveRef.current = null;
    };

    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [isDragging]);

  const beginSelection = (
    objectiveId: string,
    day: number,
    shiftKey: boolean,
  ) => {
    if (shiftKey && selection && selection.objectiveId === objectiveId) {
      setSelection({
        ...selection,
        endDay: day,
      });
      return;
    }

    dragObjectiveRef.current = objectiveId;
    setIsDragging(true);
    setSelection({
      objectiveId,
      anchorDay: day,
      endDay: day,
    });
  };

  const extendSelection = (objectiveId: string, day: number) => {
    if (!isDragging) return;
    if (dragObjectiveRef.current !== objectiveId) return;
    setSelection((prev) => {
      if (!prev || prev.objectiveId !== objectiveId) return prev;
      if (prev.endDay === day) return prev;
      return { ...prev, endDay: day };
    });
  };

  const applySelectionValue = (value: ChecklistValue | null) => {
    if (!selection) return;

    const dayList = daysInRange(selection.anchorDay, selection.endDay);
    const previousSnapshot = new Map(cells);
    const keys = dayList.map((day) => ({
      objectiveId: selection.objectiveId,
      entryDate: entryDateFor(month, day),
    }));

    setError(null);
    setBulkPending(true);
    setCells((prev) => {
      const next = new Map(prev);
      for (const key of keys) {
        const mapKey = cellKey(key.objectiveId, key.entryDate);
        if (value === null) {
          next.delete(mapKey);
        } else {
          next.set(mapKey, {
            value,
            recordedByName: currentUserName,
          });
        }
      }
      return next;
    });

    startTransition(async () => {
      const result =
        value === null
          ? await bulkClearChecklistEntries(clientId, keys)
          : await bulkUpsertChecklistEntries(
              clientId,
              keys.map(
                (key): BulkChecklistCell => ({
                  ...key,
                  value,
                }),
              ),
              "overwrite",
            );

      setBulkPending(false);

      if (result.error) {
        setError(result.error);
        setCells(previousSnapshot);
        return;
      }

      setSelection(null);
    });
  };

  if (objectives.length === 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
          No objectives yet. Use Manage objectives to add one and start
          tracking this client.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div
        ref={gridRef}
        className="overflow-x-auto rounded-lg border bg-white"
      >
        <table className="border-collapse text-sm select-none">
          <thead>
            <tr className="border-b bg-muted">
              <th className="sticky left-0 z-20 min-w-[220px] border-r bg-muted p-2 text-left font-medium text-foreground">
                Objective
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="min-w-12 border-l p-2 text-center font-medium text-muted-foreground"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {objectives.map((objective, index) => (
              <Fragment key={objective.id}>
                <tr className="border-b">
                  <td className="sticky left-0 z-10 min-w-[220px] border-r bg-white p-2 font-medium text-foreground">
                    #{index + 1} {objective.title}
                  </td>
                  {days.map((day) => {
                    const entryDate = entryDateFor(month, day);
                    const key = cellKey(objective.id, entryDate);
                    const cell = cells.get(key);
                    const isSelected =
                      selection?.objectiveId === objective.id &&
                      selectedDays.has(day);

                    return (
                      <td
                        key={day}
                        className={cn(
                          "min-w-12 cursor-cell border-l p-0 text-center hover:bg-muted/50",
                          isSelected && "bg-ring/20 hover:bg-ring/20",
                          bulkPending && "pointer-events-none opacity-50",
                        )}
                        aria-selected={isSelected}
                        aria-label={
                          cell
                            ? `${objective.title}, day ${day}, ${cell.value}`
                            : `${objective.title}, day ${day}, empty`
                        }
                        onPointerDown={(event) => {
                          if (event.button !== 0) return;
                          event.preventDefault();
                          beginSelection(objective.id, day, event.shiftKey);
                        }}
                        onPointerEnter={() => {
                          extendSelection(objective.id, day);
                        }}
                      >
                        <span
                          aria-hidden={!cell}
                          className={cn(
                            "flex h-9 w-full items-center justify-center text-xs font-medium",
                            isSelected && "text-foreground",
                            !cell && "text-muted-foreground/50",
                            bulkPending && "opacity-50",
                          )}
                        >
                          {cell?.value ?? "–"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b bg-muted">
                  <td className="sticky left-0 z-10 min-w-[220px] border-r bg-muted p-2 pl-6 text-xs text-muted-foreground">
                    Initials
                  </td>
                  {days.map((day) => {
                    const entryDate = entryDateFor(month, day);
                    const key = cellKey(objective.id, entryDate);
                    const cell = cells.get(key);
                    const isSelected =
                      selection?.objectiveId === objective.id &&
                      selectedDays.has(day);

                    return (
                      <td
                        key={day}
                        className={cn(
                          "min-w-12 border-l p-1 text-center text-xs text-muted-foreground",
                          isSelected && "bg-ring/20",
                        )}
                        title={cell?.recordedByName ?? undefined}
                      >
                        {cell ? getInitials(cell.recordedByName) : ""}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {CHECKLIST_VALUES.map((option) => `${option.label} = ${option.description}`).join(
          " \u00b7 ",
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        Click or drag across days in a row, then set a value. Shift-click to
        extend. Escape clears the selection.
      </p>

      {selection ? (
        <div
          ref={barRef}
          className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        >
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-lg">
            <span className="text-sm text-muted-foreground">
              {selectedCount} day{selectedCount === 1 ? "" : "s"} selected
            </span>
            <span className="text-sm font-medium text-foreground">Set to:</span>
            {CHECKLIST_VALUES.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                title={option.description}
                onClick={() => applySelectionValue(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkPending}
              onClick={() => applySelectionValue(null)}
            >
              Clear
            </Button>
            {bulkPending ? (
              <span className="text-xs text-muted-foreground">Saving…</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

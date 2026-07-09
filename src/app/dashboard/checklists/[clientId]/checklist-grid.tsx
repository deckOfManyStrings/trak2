"use client";

import { upsertChecklistEntry } from "@/app/dashboard/checklists/actions";
import {
  CHECKLIST_VALUES,
  daysInMonth,
  entryDateFor,
  getInitials,
} from "@/app/dashboard/checklists/data";
import type { ChecklistEntry, ChecklistValue, Objective } from "@/types/db";
import { Fragment, useMemo, useState, useTransition } from "react";

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

function cellKey(objectiveId: string, entryDate: string) {
  return `${objectiveId}:${entryDate}`;
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

  const days = useMemo(
    () => Array.from({ length: daysInMonth(month) }, (_, i) => i + 1),
    [month],
  );

  const handleChange = (
    objectiveId: string,
    day: number,
    nextValue: ChecklistValue | "",
  ) => {
    const entryDate = entryDateFor(month, day);
    const key = cellKey(objectiveId, entryDate);
    const previous = cells.get(key);
    const parsedValue: ChecklistValue | null =
      nextValue === "" ? null : nextValue;

    setError(null);
    setCells((prev) => {
      const next = new Map(prev);
      if (parsedValue === null) {
        next.delete(key);
      } else {
        next.set(key, { value: parsedValue, recordedByName: currentUserName });
      }
      return next;
    });
    setSavingKeys((prev) => new Set(prev).add(key));

    startTransition(async () => {
      const result = await upsertChecklistEntry(
        clientId,
        objectiveId,
        entryDate,
        parsedValue,
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

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 min-w-[220px] bg-muted/40 p-2 text-left font-medium text-foreground">
                Objective
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="min-w-16 border-l p-2 text-center font-medium text-muted-foreground"
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
                  <td className="sticky left-0 z-10 min-w-[220px] bg-white p-2 font-medium text-foreground">
                    #{index + 1} {objective.title}
                  </td>
                  {days.map((day) => {
                    const entryDate = entryDateFor(month, day);
                    const key = cellKey(objective.id, entryDate);
                    const cell = cells.get(key);
                    const isSaving = savingKeys.has(key);

                    return (
                      <td key={day} className="min-w-16 border-l p-1 text-center">
                        <select
                          value={cell?.value ?? ""}
                          disabled={isSaving}
                          onChange={(event) =>
                            handleChange(
                              objective.id,
                              day,
                              event.target.value as ChecklistValue | "",
                            )
                          }
                          className="h-7 w-full appearance-none rounded border border-input bg-transparent px-1 text-center text-xs leading-7 text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
                        >
                          <option value="">&mdash;</option>
                          {CHECKLIST_VALUES.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                              title={option.description}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b bg-muted/20">
                  <td className="sticky left-0 z-10 min-w-[220px] bg-muted/20 p-2 pl-6 text-xs text-muted-foreground">
                    Initials
                  </td>
                  {days.map((day) => {
                    const entryDate = entryDateFor(month, day);
                    const key = cellKey(objective.id, entryDate);
                    const cell = cells.get(key);

                    return (
                      <td
                        key={day}
                        className="min-w-16 border-l p-1 text-center text-xs text-muted-foreground"
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
    </div>
  );
}

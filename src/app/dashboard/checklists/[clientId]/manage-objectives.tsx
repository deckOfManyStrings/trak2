"use client";

import {
  createObjective,
  deleteObjective,
  toggleObjectiveStatus,
  updateObjective,
  type ActionState,
} from "@/app/dashboard/checklists/actions";
import { ImportChecklist, type ImportChecklistHandle } from "@/app/dashboard/checklists/[clientId]/import-checklist";
import { MonthPicker } from "@/app/dashboard/checklists/[clientId]/month-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ObjectiveWithEntryCount } from "@/types/db";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

const initialState: ActionState = {};

type ManageObjectivesProps = {
  clientId: string;
  clientName: string;
  month: string;
  objectives: ObjectiveWithEntryCount[];
};

function confirmPermanentDelete(
  title: string,
  entryCount: number,
): boolean {
  if (entryCount === 0) {
    return window.confirm(
      `Permanently delete "${title}"? This cannot be undone.`,
    );
  }

  return window.confirm(
    `Permanently delete "${title}"?\n\nThis will permanently delete ${entryCount} daily mark${
      entryCount === 1 ? "" : "s"
    }. Prefer Retire if you want to keep history.`,
  );
}

function ObjectiveRow({
  clientId,
  objective,
  index,
}: {
  clientId: string;
  objective: ObjectiveWithEntryCount;
  index: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description ?? "");
  const [updateState, updateAction, updatePending] = useActionState(
    updateObjective,
    initialState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    toggleObjectiveStatus,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteObjective,
    initialState,
  );
  const pending = updatePending || statusPending || deletePending;

  useEffect(() => {
    setTitle(objective.title);
    setDescription(objective.description ?? "");
    setEditing(false);
  }, [objective.title, objective.description, objective.id]);

  useEffect(() => {
    if (updateState.success) {
      setEditing(false);
    }
  }, [updateState.success]);

  const error =
    updateState.error || statusState.error || deleteState.error || null;

  const resetEditing = () => {
    setTitle(objective.title);
    setDescription(objective.description ?? "");
    setEditing(false);
  };

  return (
    <li className="space-y-2 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <form action={updateAction} className="space-y-3">
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="objectiveId" value={objective.id} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {index !== null ? (
                  <span className="shrink-0 text-sm text-muted-foreground">
                    #{index + 1}
                  </span>
                ) : null}
                <Input
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  className="min-w-0 flex-1"
                  aria-label="Objective title"
                  placeholder="Short title for the checklist"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`objective-description-${objective.id}`}>
                  Export description
                </Label>
                <Textarea
                  id={`objective-description-${objective.id}`}
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Long wording for the monthly Excel form (optional)"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {updatePending ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={resetEditing}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="min-w-0 space-y-1">
              <div className="flex min-w-0 items-baseline gap-2">
                {index !== null ? (
                  <span className="shrink-0 text-sm text-muted-foreground">
                    #{index + 1}
                  </span>
                ) : null}
                <span className="min-w-0 text-sm text-foreground">
                  {objective.title}
                </span>
                {objective.entry_count > 0 ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {objective.entry_count} mark
                    {objective.entry_count === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
              {objective.description ? (
                <p className="truncate text-xs text-muted-foreground">
                  {objective.description}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {!editing ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={pending}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <form action={statusAction}>
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="objectiveId" value={objective.id} />
              <input
                type="hidden"
                name="nextStatus"
                value={objective.status === "active" ? "retired" : "active"}
              />
              <Button
                type="submit"
                size="sm"
                variant={
                  objective.status === "active" ? "outline" : "ghost"
                }
                disabled={pending}
              >
                {objective.status === "active" ? "Retire" : "Reactivate"}
              </Button>
            </form>
            <form
              action={deleteAction}
              onSubmit={(event) => {
                if (
                  !confirmPermanentDelete(
                    objective.title,
                    objective.entry_count,
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="objectiveId" value={objective.id} />
              <input
                type="hidden"
                name="confirmDelete"
                value={objective.entry_count > 0 ? "1" : "0"}
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                disabled={pending}
              >
                Delete
              </Button>
            </form>
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </li>
  );
}

export function ManageObjectives({
  clientId,
  clientName,
  month,
  objectives,
}: ManageObjectivesProps) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<ImportChecklistHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addFormRef = useRef<HTMLFormElement>(null);
  const [addState, addAction, addPending] = useActionState(
    createObjective,
    initialState,
  );

  const activeObjectives = objectives.filter(
    (objective) => objective.status === "active",
  );
  const retiredObjectives = objectives.filter(
    (objective) => objective.status === "retired",
  );

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (addState.success) {
      addFormRef.current?.reset();
      inputRef.current?.focus();
    }
  }, [addState.success]);

  useEffect(() => {
    if (!moreOpen && !exportOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (moreOpen && moreRef.current && !moreRef.current.contains(target)) {
        setMoreOpen(false);
      }
      if (
        exportOpen &&
        exportRef.current &&
        !exportRef.current.contains(target)
      ) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [moreOpen, exportOpen]);

  const openManage = () => {
    setMoreOpen(false);
    setOpen(true);
  };

  const openImport = () => {
    setExportOpen(false);
    setMoreOpen(false);
    importRef.current?.pickFile();
  };

  const exportMenuItems = (
    <>
      <a
        href={`/dashboard/checklists/${clientId}/export?month=${month}`}
        className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-muted"
        onClick={() => {
          setExportOpen(false);
          setMoreOpen(false);
        }}
      >
        Export to Excel
      </a>
      <button
        type="button"
        className="block w-full rounded-md px-3 py-3 text-left text-sm font-medium hover:bg-muted"
        onClick={openImport}
      >
        Import from Excel
      </button>
      <Link
        href={`/dashboard/checklists/${clientId}/quarterly-report`}
        className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-muted"
        onClick={() => {
          setExportOpen(false);
          setMoreOpen(false);
        }}
      >
        Quarterly Report
      </Link>
      <Link
        href={`/dashboard/checklists/${clientId}/semi-annual-report`}
        className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-muted"
        onClick={() => {
          setExportOpen(false);
          setMoreOpen(false);
        }}
      >
        Semi-Annual Report
      </Link>
      <Link
        href={`/dashboard/checklists/${clientId}/annual-report`}
        className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-muted"
        onClick={() => {
          setExportOpen(false);
          setMoreOpen(false);
        }}
      >
        Annual Report
      </Link>
    </>
  );

  return (
    <div className="space-y-4">
      <ImportChecklist ref={importRef} clientId={clientId} month={month} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            <Link
              href="/dashboard/checklists"
              className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground md:min-h-0"
            >
              Checklists
            </Link>{" "}
            / {clientName}
          </p>
          <h1 className="text-xl font-semibold">{clientName}</h1>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <MonthPicker clientId={clientId} month={month} />

          <div className="relative md:hidden" ref={moreRef}>
            <Button
              type="button"
              variant="outline"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((value) => !value)}
            >
              More
            </Button>
            {moreOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border bg-white p-1 shadow-md">
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-3 text-left text-sm font-medium hover:bg-muted"
                  onClick={openManage}
                >
                  {open ? "Close objectives" : "Manage objectives"}
                </button>
                <div className="my-1 border-t" />
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Export
                </p>
                {exportMenuItems}
              </div>
            ) : null}
          </div>

          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "Done" : "Manage objectives"}
            </Button>
            <div className="relative" ref={exportRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={exportOpen}
                onClick={() => setExportOpen((value) => !value)}
              >
                Export
              </Button>
              {exportOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border bg-white p-1 shadow-md">
                  {exportMenuItems}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <div className="space-y-4 rounded-lg border bg-white p-4">
          <div>
            <h2 className="text-sm font-medium text-foreground">
              Objectives for {clientName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Edit title and optional export description. Retire to hide from
              the checklist while keeping daily marks. Delete permanently only
              when an objective was added by mistake.
            </p>
          </div>

          {activeObjectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active objectives. Add one below to start tracking this
              client.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {activeObjectives.map((objective, index) => (
                <ObjectiveRow
                  key={objective.id}
                  clientId={clientId}
                  objective={objective}
                  index={index}
                />
              ))}
            </ul>
          )}

          {retiredObjectives.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Retired
              </h3>
              <p className="text-xs text-muted-foreground">
                Hidden from daily entry. Marks are kept for reports and
                history.
              </p>
              <ul className="divide-y rounded-lg border border-dashed">
                {retiredObjectives.map((objective) => (
                  <ObjectiveRow
                    key={objective.id}
                    clientId={clientId}
                    objective={objective}
                    index={null}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          <form
            ref={addFormRef}
            action={addAction}
            className="space-y-3"
          >
            <input type="hidden" name="clientId" value={clientId} />
            <div className="space-y-1.5">
              <Label htmlFor="objective-title">Add objective</Label>
              <Input
                ref={inputRef}
                id="objective-title"
                name="title"
                placeholder="e.g. Greet peers"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective-description">
                Export description (optional)
              </Label>
              <Textarea
                id="objective-description"
                name="description"
                rows={2}
                placeholder="Long wording for the monthly Excel form"
              />
            </div>
            <Button type="submit" disabled={addPending}>
              {addPending ? "Adding..." : "Add"}
            </Button>
            {addState.error ? (
              <p className="text-sm text-destructive">{addState.error}</p>
            ) : null}
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full md:hidden"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}

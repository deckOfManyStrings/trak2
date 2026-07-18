"use client";

import {
  createObjective,
  deleteObjective,
  type ActionState,
} from "@/app/dashboard/checklists/actions";
import { MonthPicker } from "@/app/dashboard/checklists/[clientId]/month-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Objective } from "@/types/db";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

const initialState: ActionState = {};

type ManageObjectivesProps = {
  clientId: string;
  clientName: string;
  month: string;
  objectives: Objective[];
};

export function ManageObjectives({
  clientId,
  clientName,
  month,
  objectives,
}: ManageObjectivesProps) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addFormRef = useRef<HTMLFormElement>(null);
  const [addState, addAction, addPending] = useActionState(
    createObjective,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteObjective,
    initialState,
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
    if (!moreOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [moreOpen]);

  const openManage = () => {
    setMoreOpen(false);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
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
              <div className="absolute right-0 z-30 mt-2 w-52 rounded-lg border bg-white p-1 shadow-md">
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-3 text-left text-sm font-medium hover:bg-muted"
                  onClick={openManage}
                >
                  {open ? "Close objectives" : "Manage objectives"}
                </button>
                <a
                  href={`/dashboard/checklists/${clientId}/export?month=${month}`}
                  className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-muted"
                >
                  Export to Excel
                </a>
                <Link
                  href={`/dashboard/checklists/${clientId}/annual-report`}
                  className="block rounded-md px-3 py-3 text-sm font-medium hover:bg-muted"
                >
                  Annual Report
                </Link>
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
            <a
              href={`/dashboard/checklists/${clientId}/export?month=${month}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Export to Excel
            </a>
            <Link
              href={`/dashboard/checklists/${clientId}/annual-report`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Annual Report
            </Link>
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
              Each client has their own checklist objectives. Removing one also
              deletes its daily marks.
            </p>
          </div>

          {objectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No objectives yet. Add one below to start tracking this client.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {objectives.map((objective, index) => (
                <li
                  key={objective.id}
                  className="flex items-center justify-between gap-3 px-3 py-3"
                >
                  <span className="min-w-0 text-sm text-foreground">
                    <span className="text-muted-foreground">#{index + 1}</span>{" "}
                    {objective.title}
                  </span>
                  <form
                    action={deleteAction}
                    onSubmit={(event) => {
                      if (
                        !window.confirm(
                          `Remove "${objective.title}"? Daily marks for this objective will be deleted.`,
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="clientId" value={clientId} />
                    <input
                      type="hidden"
                      name="objectiveId"
                      value={objective.id}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={deletePending}
                    >
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {deleteState.error ? (
            <p className="text-sm text-destructive">{deleteState.error}</p>
          ) : null}

          <form
            ref={addFormRef}
            action={addAction}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <input type="hidden" name="clientId" value={clientId} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="objective-title">Add objective</Label>
              <Input
                ref={inputRef}
                id="objective-title"
                name="title"
                placeholder="e.g. Greet peers"
                required
              />
            </div>
            <Button type="submit" disabled={addPending}>
              {addPending ? "Adding..." : "Add"}
            </Button>
            {addState.error ? (
              <p className="w-full text-sm text-destructive">{addState.error}</p>
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

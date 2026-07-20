"use client";

import {
  bulkUpsertChecklistEntries,
  previewChecklistImport,
  type ChecklistImportPreview,
} from "@/app/dashboard/checklists/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useTransition,
} from "react";

export type ImportChecklistHandle = {
  pickFile: () => void;
};

type ImportChecklistProps = {
  clientId: string;
  month: string;
};

export const ImportChecklist = forwardRef<
  ImportChecklistHandle,
  ImportChecklistProps
>(function ImportChecklist({ clientId, month }, ref) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ChecklistImportPreview | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    pickFile: () => {
      setError(null);
      inputRef.current?.click();
    },
  }));

  const reset = () => {
    setPreview(null);
    setError(null);
    setOverwrite(false);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setFileName(file.name);
    setPreview(null);

    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("month", month);
    formData.set("file", file);

    startTransition(async () => {
      const result = await previewChecklistImport(formData);
      if (result.error && !result.cells?.length) {
        setError(result.error);
        setOpen(true);
        setPreview(result);
        return;
      }
      setPreview(result);
      setOpen(true);
    });
  };

  const applyImport = () => {
    if (!preview?.cells?.length) return;

    startTransition(async () => {
      const result = await bulkUpsertChecklistEntries(
        clientId,
        preview.cells!,
        overwrite ? "overwrite" : "fillEmpty",
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      close();
      router.refresh();
    });
  };

  const importCount = overwrite
    ? (preview?.cells?.length ?? 0)
    : (preview?.newCount ?? 0);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
        }}
      />

      {pending && !open ? (
        <p className="text-xs text-muted-foreground">Reading Excel file…</p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-checklist-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-white p-4 shadow-lg"
          >
            <h2
              id="import-checklist-title"
              className="text-base font-semibold text-foreground"
            >
              Import preview
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {fileName ? (
                <>
                  <span className="font-medium text-foreground">{fileName}</span>
                  {" → "}
                </>
              ) : null}
              month {month}
              {preview?.monthHint && preview.monthHint !== month
                ? ` (file title mentions ${preview.monthHint})`
                : null}
            </p>

            {preview?.cells ? (
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <dt className="text-xs text-muted-foreground">New marks</dt>
                  <dd className="text-lg font-semibold">
                    {preview.newCount ?? 0}
                  </dd>
                </div>
                <div className="rounded-md border p-2">
                  <dt className="text-xs text-muted-foreground">
                    Would overwrite
                  </dt>
                  <dd className="text-lg font-semibold">
                    {preview.overwriteCount ?? 0}
                  </dd>
                </div>
              </dl>
            ) : null}

            {preview?.matches && preview.matches.length > 0 ? (
              <div className="mt-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Objectives
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                  {preview.matches.map((match) => (
                    <li
                      key={match.sheetLabel}
                      className={
                        match.matchedBy
                          ? "text-foreground"
                          : "text-destructive"
                      }
                    >
                      {match.sheetLabel}
                      {match.matchedBy
                        ? ` → ${match.objectiveTitle}`
                        : " (unmatched)"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview?.unmatchedLabels && preview.unmatchedLabels.length > 0 ? (
              <p className="mt-3 text-sm text-destructive">
                Unmatched sheet rows will be skipped. Add matching objectives
                first if needed.
              </p>
            ) : null}

            {preview?.invalid && preview.invalid.length > 0 ? (
              <div className="mt-3 space-y-1">
                <p className="text-sm text-destructive">
                  {preview.invalid.length} invalid value
                  {preview.invalid.length === 1 ? "" : "s"} will be skipped.
                </p>
                <ul className="max-h-24 overflow-y-auto text-xs text-muted-foreground">
                  {preview.invalid.slice(0, 8).map((item) => (
                    <li key={`${item.sheetLabel}-${item.day}-${item.raw}`}>
                      {item.sheetLabel}, day {item.day}: &ldquo;{item.raw}
                      &rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(preview?.overwriteCount ?? 0) > 0 ? (
              <label className="mt-4 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={overwrite}
                  onChange={(event) => setOverwrite(event.target.checked)}
                />
                <span>
                  Overwrite existing cells ({preview?.overwriteCount}). Leave
                  unchecked to only fill empty days.
                </span>
              </label>
            ) : null}

            {error ? (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={close}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending || importCount === 0}
                onClick={applyImport}
              >
                {pending
                  ? "Importing…"
                  : `Import ${importCount} mark${importCount === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
});

import { CHECKLIST_VALUES, daysInMonth } from "@/app/dashboard/checklists/data";
import { MONTHLY_EXPORT_LAYOUT } from "@/app/dashboard/checklists/export-checklist-xlsx";
import type { ChecklistValue, Objective } from "@/types/db";
import ExcelJS from "exceljs";

export type ImportedChecklistCell = {
  objectiveId: string;
  entryDate: string;
  value: ChecklistValue;
};

export type ImportObjectiveMatch = {
  sheetLabel: string;
  objectiveId: string | null;
  objectiveTitle: string | null;
  matchedBy: "position" | "title" | null;
};

export type ParsedChecklistImport = {
  monthHint: string | null;
  dayColumns: number[];
  matches: ImportObjectiveMatch[];
  cells: ImportedChecklistCell[];
  invalid: { sheetLabel: string; day: number; raw: string }[];
  unmatchedLabels: string[];
};

type ObjectiveRef = Pick<
  Objective,
  "id" | "title" | "description" | "position"
>;

const VALID_VALUES = new Set<string>(
  CHECKLIST_VALUES.map((option) => option.value),
);

const LEGACY_OBJECTIVE_LABEL_RE = /^#(\d+)\s+(.+)$/;
const OBJECTIVE_BLOCK_RE = /^objective\s*#\s*(\d+)$/i;

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("result" in value && value.result != null) {
      return String(value.result).trim();
    }
  }
  return "";
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function isChecklistValue(value: string): value is ChecklistValue {
  return VALID_VALUES.has(value);
}

function normalizeChecklistCell(raw: string): ChecklistValue | null {
  const trimmed = raw.trim();
  if (isChecklistValue(trimmed)) return trimmed;

  const upper = trimmed.toUpperCase();
  if (upper === "NA" || upper === "N.A." || upper === "N.A") return "N/A";
  if (upper === "N/A") return "N/A";
  // Legacy exports used NP for "No program"; treat as Absent.
  if (upper === "NP") return "A";
  if (isChecklistValue(upper)) return upper;
  return null;
}

function monthFromTitle(title: string): string | null {
  const match = title.match(/\b(\d{4}-(0[1-9]|1[0-2]))\b/);
  return match ? match[1] : null;
}

function emptyResult(): ParsedChecklistImport {
  return {
    monthHint: null,
    dayColumns: [],
    matches: [],
    cells: [],
    invalid: [],
    unmatchedLabels: [],
  };
}

function buildObjectiveIndexes(objectives: ObjectiveRef[]) {
  const ordered = [...objectives].sort((a, b) => a.position - b.position);
  const byPosition = new Map<number, ObjectiveRef>();
  const byText = new Map<string, ObjectiveRef>();
  for (const [index, objective] of ordered.entries()) {
    byPosition.set(index + 1, objective);
    byText.set(normalizeTitle(objective.title), objective);
    if (objective.description?.trim()) {
      byText.set(normalizeTitle(objective.description), objective);
    }
  }
  return { ordered, byPosition, byText };
}

function readDayColumns(
  row: ExcelJS.Row,
  monthDayCount: number,
): { day: number; column: number }[] {
  const dayColumns: { day: number; column: number }[] = [];
  row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const raw = cellText(cell.value);
    if (/^total$/i.test(raw)) return;
    const day = Number(raw);
    if (Number.isInteger(day) && day >= 1 && day <= monthDayCount) {
      dayColumns.push({ day, column: columnNumber });
    }
  });
  return dayColumns;
}

function matchObjective(
  index: number | null,
  text: string,
  usedObjectiveIds: Set<string>,
  byPosition: Map<number, ObjectiveRef>,
  byText: Map<string, ObjectiveRef>,
): { matched: ObjectiveRef | null; matchedBy: ImportObjectiveMatch["matchedBy"] } {
  if (index != null) {
    const byPos = byPosition.get(index);
    if (byPos && !usedObjectiveIds.has(byPos.id)) {
      return { matched: byPos, matchedBy: "position" };
    }
  }

  const byTit = byText.get(normalizeTitle(text));
  if (byTit && !usedObjectiveIds.has(byTit.id)) {
    return { matched: byTit, matchedBy: "title" };
  }

  return { matched: null, matchedBy: null };
}

function collectCellsFromDataRow(args: {
  dataRow: ExcelJS.Row;
  dayColumns: { day: number; column: number }[];
  matched: ObjectiveRef;
  sheetLabel: string;
  month: string;
  cells: ImportedChecklistCell[];
  invalid: ParsedChecklistImport["invalid"];
}) {
  const { dataRow, dayColumns, matched, sheetLabel, month, cells, invalid } =
    args;

  for (const { day, column } of dayColumns) {
    const raw = cellText(dataRow.getCell(column).value);
    if (!raw) continue;

    const normalized = normalizeChecklistCell(raw);
    if (!normalized) {
      invalid.push({ sheetLabel, day, raw });
      continue;
    }

    const entryDate = `${month}-${String(day).padStart(2, "0")}`;
    cells.push({
      objectiveId: matched.id,
      entryDate,
      value: normalized,
    });
  }
}

function parseClassicLayout(
  sheet: ExcelJS.Worksheet,
  objectives: ObjectiveRef[],
  month: string,
): ParsedChecklistImport | null {
  const monthDayCount = daysInMonth(month);
  const blockStarts: { row: number; index: number }[] = [];

  for (let row = 1; row <= sheet.rowCount; row++) {
    const label = cellText(sheet.getRow(row).getCell(1).value);
    const match = OBJECTIVE_BLOCK_RE.exec(label);
    if (match) {
      blockStarts.push({ row, index: Number(match[1]) });
    }
  }

  if (blockStarts.length === 0) return null;

  const { byPosition, byText } = buildObjectiveIndexes(objectives);
  const matches: ImportObjectiveMatch[] = [];
  const cells: ImportedChecklistCell[] = [];
  const invalid: ParsedChecklistImport["invalid"] = [];
  const unmatchedLabels: string[] = [];
  const usedObjectiveIds = new Set<string>();
  const allDays = new Set<number>();

  let monthHint: string | null = null;
  for (let row = 1; row < blockStarts[0].row; row++) {
    for (let col = 1; col <= 40; col++) {
      monthHint =
        monthFromTitle(cellText(sheet.getRow(row).getCell(col).value)) ??
        monthHint;
    }
  }

  for (const block of blockStarts) {
    const label = cellText(sheet.getRow(block.row).getCell(1).value);
    const description = cellText(
      sheet.getRow(block.row).getCell(MONTHLY_EXPORT_LAYOUT.DAY_START).value,
    );

    // Day row is typically +2 from Objective #N header; Data is +3.
    let dayRowNumber = block.row + 2;
    let dataRowNumber = block.row + 3;
    let dayColumns = readDayColumns(sheet.getRow(dayRowNumber), monthDayCount);

    // Defensive: scan a few rows if spacing differs.
    if (dayColumns.length === 0) {
      for (let offset = 1; offset <= 5; offset++) {
        const candidate = block.row + offset;
        const cols = readDayColumns(sheet.getRow(candidate), monthDayCount);
        if (cols.length > 0) {
          dayRowNumber = candidate;
          dayColumns = cols;
          // Data row is the next row labeled "Data", else dayRow+1.
          dataRowNumber = dayRowNumber + 1;
          for (let r = dayRowNumber + 1; r <= dayRowNumber + 3; r++) {
            if (/^data$/i.test(cellText(sheet.getRow(r).getCell(1).value))) {
              dataRowNumber = r;
              break;
            }
          }
          break;
        }
      }
    }

    for (const { day } of dayColumns) allDays.add(day);

    const { matched, matchedBy } = matchObjective(
      block.index,
      description || label,
      usedObjectiveIds,
      byPosition,
      byText,
    );

    matches.push({
      sheetLabel: description ? `${label}: ${description}` : label,
      objectiveId: matched?.id ?? null,
      objectiveTitle: matched?.title ?? null,
      matchedBy,
    });

    if (!matched) {
      unmatchedLabels.push(label);
      continue;
    }

    usedObjectiveIds.add(matched.id);
    collectCellsFromDataRow({
      dataRow: sheet.getRow(dataRowNumber),
      dayColumns,
      matched,
      sheetLabel: label,
      month,
      cells,
      invalid,
    });
  }

  return {
    monthHint,
    dayColumns: [...allDays].sort((a, b) => a - b),
    matches,
    cells,
    invalid,
    unmatchedLabels,
  };
}

function parseLegacyLayout(
  sheet: ExcelJS.Worksheet,
  objectives: ObjectiveRef[],
  month: string,
): ParsedChecklistImport {
  let headerRowNumber = 2;
  for (let row = 1; row <= Math.min(sheet.rowCount, 8); row++) {
    if (/^objective$/i.test(cellText(sheet.getRow(row).getCell(1).value))) {
      headerRowNumber = row;
      break;
    }
  }

  let monthHint: string | null = null;
  for (let row = 1; row < headerRowNumber; row++) {
    const title = cellText(sheet.getRow(row).getCell(1).value);
    monthHint = monthFromTitle(title) ?? monthHint;
  }

  const monthDayCount = daysInMonth(month);
  const dayColumns = readDayColumns(
    sheet.getRow(headerRowNumber),
    monthDayCount,
  );
  const { byPosition, byText } = buildObjectiveIndexes(objectives);
  const matches: ImportObjectiveMatch[] = [];
  const cells: ImportedChecklistCell[] = [];
  const invalid: ParsedChecklistImport["invalid"] = [];
  const unmatchedLabels: string[] = [];
  const usedObjectiveIds = new Set<string>();

  let rowIndex = headerRowNumber + 1;
  while (rowIndex <= sheet.rowCount) {
    const valueRow = sheet.getRow(rowIndex);
    const label = cellText(valueRow.getCell(1).value);

    if (!label) {
      rowIndex += 1;
      continue;
    }

    if (
      /^manager\s*\/\s*administrator review$/i.test(label) ||
      /^i have reviewed this monthly report/i.test(label)
    ) {
      break;
    }

    if (/^initials$/i.test(label) || /^data$/i.test(label)) {
      rowIndex += 1;
      continue;
    }

    const legacy = LEGACY_OBJECTIVE_LABEL_RE.exec(label.trim());
    const index = legacy ? Number(legacy[1]) : null;
    const sheetTitle = legacy ? legacy[2].trim() : label.trim();

    const { matched, matchedBy } = matchObjective(
      index,
      sheetTitle,
      usedObjectiveIds,
      byPosition,
      byText,
    );

    matches.push({
      sheetLabel: label,
      objectiveId: matched?.id ?? null,
      objectiveTitle: matched?.title ?? null,
      matchedBy,
    });

    if (!matched) {
      unmatchedLabels.push(label);
      rowIndex += 2;
      continue;
    }

    usedObjectiveIds.add(matched.id);
    collectCellsFromDataRow({
      dataRow: valueRow,
      dayColumns,
      matched,
      sheetLabel: label,
      month,
      cells,
      invalid,
    });

    rowIndex += 2;
  }

  return {
    monthHint,
    dayColumns: dayColumns.map((d) => d.day),
    matches,
    cells,
    invalid,
    unmatchedLabels,
  };
}

/**
 * Parses an .xlsx matching the classic monthly form export (Objective #N
 * blocks with Data/Initials), or the older flat title + day-header layout.
 */
export async function parseChecklistImportXlsx(
  buffer: ArrayBuffer | Buffer,
  objectives: ObjectiveRef[],
  month: string,
): Promise<ParsedChecklistImport> {
  const workbook = new ExcelJS.Workbook();
  const data =
    buffer instanceof ArrayBuffer ? Buffer.from(buffer) : Buffer.from(buffer);
  await workbook.xlsx.load(data as unknown as ExcelJS.Buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return emptyResult();

  return (
    parseClassicLayout(sheet, objectives, month) ??
    parseLegacyLayout(sheet, objectives, month)
  );
}

import {
  daysInMonth,
  entryDateFor,
  getInitials,
} from "@/app/dashboard/checklists/data";
import type { ChecklistEntry, Objective } from "@/types/db";
import ExcelJS from "exceljs";

const LABEL_START = 1;
const LABEL_END = 3;
const DAY_START = 4;

const WEEKEND_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
};

const THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const MEDIUM = { style: "medium" as const };

type BuildMonthlyChecklistSheetArgs = {
  sheet: ExcelJS.Worksheet;
  month: string;
  clientName: string;
  companyName: string | null;
  objectives: Pick<Objective, "id" | "title" | "description">[];
  entryByKey: Map<string, ChecklistEntry>;
};

function isWeekend(month: string, day: number): boolean {
  const [year, monthNum] = month.split("-").map(Number);
  const weekday = new Date(year, monthNum - 1, day).getDay();
  return weekday === 0 || weekday === 6;
}

function monthParts(month: string): { monthName: string; year: string } {
  const [year, monthNum] = month.split("-").map(Number);
  const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", {
    month: "long",
  });
  return { monthName, year: String(year) };
}

function objectiveExportText(
  objective: Pick<Objective, "title" | "description">,
): string {
  const description = objective.description?.trim();
  return description || objective.title;
}

function applyOuterBorder(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
) {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cell = sheet.getCell(row, col);
      const border: Partial<ExcelJS.Borders> = { ...(cell.border ?? {}) };
      if (row === startRow) border.top = MEDIUM;
      if (row === endRow) border.bottom = MEDIUM;
      if (col === startCol) border.left = MEDIUM;
      if (col === endCol) border.right = MEDIUM;
      cell.border = border;
    }
  }
}

function setThinGrid(
  sheet: ExcelJS.Worksheet,
  row: number,
  startCol: number,
  endCol: number,
) {
  for (let col = startCol; col <= endCol; col++) {
    const cell = sheet.getCell(row, col);
    cell.border = { ...THIN };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }
}

/**
 * Builds the classic one-page monthly checklist form: company header,
 * Name/Month row, per-objective bordered blocks with Data/Initials/Total,
 * weekend shading, and a manager sign-off block.
 */
export function buildMonthlyChecklistSheet({
  sheet,
  month,
  clientName,
  companyName,
  objectives,
  entryByKey,
}: BuildMonthlyChecklistSheetArgs) {
  const totalDays = daysInMonth(month);
  const totalCol = DAY_START + totalDays;
  const lastCol = totalCol;
  const { monthName, year } = monthParts(month);

  let row = 1;

  if (companyName) {
    sheet.mergeCells(row, LABEL_START, row, lastCol);
    const companyCell = sheet.getCell(row, LABEL_START);
    companyCell.value = companyName;
    companyCell.font = { bold: true, size: 14 };
    companyCell.alignment = { horizontal: "left", vertical: "middle" };
    row += 1;
  }

  // Name / Month header
  sheet.getCell(row, LABEL_START).value = "Name:";
  sheet.getCell(row, LABEL_START).font = { bold: true };
  const monthLabelCol = Math.max(lastCol - 6, 16);
  const nameEnd = Math.max(LABEL_START + 1, Math.min(14, monthLabelCol - 1));
  sheet.mergeCells(row, LABEL_START + 1, row, nameEnd);
  const nameCell = sheet.getCell(row, LABEL_START + 1);
  nameCell.value = clientName;
  nameCell.border = { bottom: { style: "thin" } };
  nameCell.font = { bold: true, size: 12 };

  sheet.getCell(row, monthLabelCol).value = "Month:";
  sheet.getCell(row, monthLabelCol).font = { bold: true };
  sheet.mergeCells(row, monthLabelCol + 1, row, Math.min(monthLabelCol + 3, lastCol - 2));
  sheet.getCell(row, monthLabelCol + 1).value = monthName;
  sheet.getCell(row, monthLabelCol + 1).font = { bold: true };
  sheet.mergeCells(row, Math.min(monthLabelCol + 4, lastCol), row, lastCol);
  sheet.getCell(row, Math.min(monthLabelCol + 4, lastCol)).value = year;
  sheet.getCell(row, Math.min(monthLabelCol + 4, lastCol)).font = { bold: true };
  row += 2;

  sheet.getCell(row, LABEL_START).value = "A: Absent";
  sheet.getCell(row, LABEL_START).font = { italic: true, size: 9 };
  row += 2;

  for (const [index, objective] of objectives.entries()) {
    const blockStart = row;
    const headerEnd = row + 1;
    const dayRow = row + 2;
    const dataRow = row + 3;
    const initialsRow = row + 4;
    const blockEnd = initialsRow;

    sheet.mergeCells(blockStart, LABEL_START, headerEnd, LABEL_END);
    const labelCell = sheet.getCell(blockStart, LABEL_START);
    labelCell.value = `Objective #${index + 1}`;
    labelCell.font = { bold: true, size: 11 };
    labelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    sheet.mergeCells(blockStart, DAY_START, headerEnd, totalCol - 1);
    const descCell = sheet.getCell(blockStart, DAY_START);
    descCell.value = objectiveExportText(objective);
    descCell.font = { size: 10 };
    descCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // Day numbers + Total
    for (let day = 1; day <= totalDays; day++) {
      const col = DAY_START + day - 1;
      const cell = sheet.getCell(dayRow, col);
      cell.value = day;
      cell.font = { bold: true, size: 8 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { ...THIN };
      if (isWeekend(month, day)) cell.fill = WEEKEND_FILL;
    }
    const totalHeader = sheet.getCell(dayRow, totalCol);
    totalHeader.value = "Total";
    totalHeader.font = { bold: true, size: 9 };
    totalHeader.alignment = { horizontal: "center", vertical: "middle" };
    totalHeader.border = { ...THIN };

    // Data row
    sheet.mergeCells(dataRow, LABEL_START, dataRow, LABEL_END);
    const dataLabel = sheet.getCell(dataRow, LABEL_START);
    dataLabel.value = "Data";
    dataLabel.font = { bold: true };
    dataLabel.alignment = { horizontal: "left", vertical: "middle" };

    let yesCount = 0;
    for (let day = 1; day <= totalDays; day++) {
      const entryDate = entryDateFor(month, day);
      const entry = entryByKey.get(`${objective.id}:${entryDate}`);
      const col = DAY_START + day - 1;
      const cell = sheet.getCell(dataRow, col);
      cell.value = entry?.value ?? "";
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { ...THIN };
      if (isWeekend(month, day)) cell.fill = WEEKEND_FILL;
      if (entry?.value === "Y") yesCount += 1;
    }
    const totalCell = sheet.getCell(dataRow, totalCol);
    totalCell.value = yesCount;
    totalCell.font = { bold: true };
    totalCell.alignment = { horizontal: "center", vertical: "middle" };
    totalCell.border = { ...THIN };

    // Initials row
    sheet.mergeCells(initialsRow, LABEL_START, initialsRow, LABEL_END);
    const initialsLabel = sheet.getCell(initialsRow, LABEL_START);
    initialsLabel.value = "Initials";
    initialsLabel.font = { bold: true };
    initialsLabel.alignment = { horizontal: "left", vertical: "middle" };

    for (let day = 1; day <= totalDays; day++) {
      const entryDate = entryDateFor(month, day);
      const entry = entryByKey.get(`${objective.id}:${entryDate}`);
      const col = DAY_START + day - 1;
      const cell = sheet.getCell(initialsRow, col);
      cell.value = entry ? getInitials(entry.recorded_by_name) : "";
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { size: 8 };
      cell.border = { ...THIN };
      if (isWeekend(month, day)) cell.fill = WEEKEND_FILL;
    }
    setThinGrid(sheet, initialsRow, totalCol, totalCol);

    applyOuterBorder(sheet, blockStart, blockEnd, LABEL_START, lastCol);

    sheet.getRow(blockStart).height = 18;
    sheet.getRow(headerEnd).height = 18;
    sheet.getRow(dataRow).height = 18;
    sheet.getRow(initialsRow).height = 18;

    row = blockEnd + 3;
  }

  // Manager / Administrator review
  sheet.mergeCells(row, LABEL_START, row, lastCol);
  const reviewTitle = sheet.getCell(row, LABEL_START);
  reviewTitle.value = "Manager / Administrator review";
  reviewTitle.font = { bold: true, size: 12 };
  row += 1;

  sheet.mergeCells(row, LABEL_START, row, lastCol);
  const reviewNote = sheet.getCell(row, LABEL_START);
  reviewNote.value =
    "I have reviewed this monthly report for accuracy and completeness.";
  reviewNote.font = { italic: true, size: 10 };
  row += 2;

  const underlineEnd = Math.min(DAY_START + 8, lastCol);
  const thinBottom = { bottom: { style: "thin" as const } };

  sheet.getCell(row, LABEL_START).value = "Name";
  sheet.getCell(row, LABEL_START).font = { bold: true };
  if (underlineEnd > LABEL_START + 1) {
    sheet.mergeCells(row, LABEL_START + 1, row, underlineEnd);
    sheet.getCell(row, LABEL_START + 1).border = thinBottom;
  }
  row += 2;

  sheet.getCell(row, LABEL_START).value = "Signature";
  sheet.getCell(row, LABEL_START).font = { bold: true };
  if (underlineEnd > LABEL_START + 1) {
    sheet.mergeCells(row, LABEL_START + 1, row, underlineEnd);
    sheet.getCell(row, LABEL_START + 1).border = thinBottom;
  }
  row += 2;

  sheet.getCell(row, LABEL_START).value = "Date";
  sheet.getCell(row, LABEL_START).font = { bold: true };
  const dateEnd = Math.min(DAY_START + 4, lastCol);
  if (dateEnd > LABEL_START + 1) {
    sheet.mergeCells(row, LABEL_START + 1, row, dateEnd);
    sheet.getCell(row, LABEL_START + 1).border = thinBottom;
  }

  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = 8;
  sheet.getColumn(3).width = 8;
  for (let day = 1; day <= totalDays; day++) {
    sheet.getColumn(DAY_START + day - 1).width = 3.2;
  }
  sheet.getColumn(totalCol).width = 6;

  sheet.pageSetup.orientation = "landscape";
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 1;
  sheet.pageSetup.horizontalCentered = true;
  sheet.pageSetup.margins = {
    left: 0.4,
    right: 0.4,
    top: 0.4,
    bottom: 0.4,
    header: 0.2,
    footer: 0.2,
  };
}

export const MONTHLY_EXPORT_LAYOUT = {
  LABEL_START,
  LABEL_END,
  DAY_START,
} as const;

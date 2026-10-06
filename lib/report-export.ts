import "server-only";
import PDFDocument from "pdfkit";
import { csvDateTime, formatCell, isNumeric, type Cell, type Column } from "./report-format";
import type { ReportData } from "./reports";

export type ExportMeta = { generatedBy: string; generatedAt: Date };

function generatedAtLabel(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(d) + " (Kampala)";
}

export function exportFilename(r: ReportData, ext: "csv" | "pdf") {
  const span = r.kind === "inventory" ? new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10) : r.range.from === r.range.to ? r.range.from : `${r.range.from}_to_${r.range.to}`;
  return `ringup-${r.kind}-${span}.${ext}`;
}

// ---------------------------------------------------------------- CSV ----

function csvEscape(v: string) {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Text cells that a spreadsheet would treat as a formula are prefixed with ' (CSV injection guard). */
function csvText(v: string) {
  return csvEscape(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
}

function csvCell(v: Cell | undefined, c: Column): string {
  if (v === null || v === undefined) return "";
  switch (c.format) {
    case "money":
    case "int":
      return String(Math.round(Number(v)));
    case "pct":
      return (Number(v) * 100).toFixed(1);
    case "datetime":
      return csvDateTime(String(v));
    default:
      return csvText(String(v));
  }
}

function csvHeader(c: Column) {
  const suffix = c.format === "money" ? " (UGX)" : c.format === "pct" ? " (%)" : c.format === "datetime" ? " (Kampala)" : "";
  return csvText(c.label + suffix);
}

export function toCsv(r: ReportData, meta: ExportMeta) {
  const lines: string[] = [];
  lines.push(r.columns.map(csvHeader).join(","));
  for (const row of r.rows) lines.push(r.columns.map((c) => csvCell(row[c.key], c)).join(","));
  if (r.totals) lines.push(r.columns.map((c) => csvCell(r.totals![c.key], c)).join(","));
  lines.push("");
  lines.push(`${csvText("Report")},${csvText(r.title)}`);
  lines.push(`${csvText("Period")},${csvText(r.periodLabel)}`);
  for (const s of r.summary) lines.push(`${csvText(s.label + (s.format === "money" ? " (UGX)" : s.format === "pct" ? " (%)" : ""))},${csvCell(s.value, { key: "", label: "", format: s.format })}`);
  lines.push(`${csvText("Generated")},${csvText(`${generatedAtLabel(meta.generatedAt)} by ${meta.generatedBy}`)}`);
  for (const n of r.notes) lines.push(`${csvText("Note")},${csvText(n)}`);
  return "\uFEFF" + lines.join("\r\n") + "\r\n"; // BOM so Excel opens UTF-8 correctly
}

// ---------------------------------------------------------------- PDF ----

const C = { text: "#18181b", muted: "#71717a", line: "#d4d4d8", head: "#f4f4f5", zebra: "#fafafa", brand: "#047857" };

export async function toPdf(r: ReportData, meta: ExportMeta): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36,
    bufferPages: true,
    info: { Title: `RingUp – ${r.title}`, Author: "RingUp POS", Subject: r.periodLabel, CreationDate: meta.generatedAt },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottom = doc.page.height - doc.page.margins.bottom - 18; // leave room for the footer

  // ---- header ----
  doc.fillColor(C.brand).font("Helvetica-Bold").fontSize(10).text("RingUp", left, 36);
  doc.fillColor(C.text).font("Helvetica-Bold").fontSize(18).text(r.title, left, 50);
  doc.fillColor(C.muted).font("Helvetica").fontSize(9).text(`${r.periodLabel}   ·   Generated ${generatedAtLabel(meta.generatedAt)} by ${meta.generatedBy}`, left, 74);
  let y = 94;

  // ---- summary boxes ----
  if (r.summary.length) {
    const perRow = Math.min(r.summary.length, 4);
    const gap = 8;
    const bw = (width - gap * (perRow - 1)) / perRow;
    r.summary.forEach((s, i) => {
      const col = i % perRow;
      if (i > 0 && col === 0) y += 44;
      const x = left + col * (bw + gap);
      doc.roundedRect(x, y, bw, 38, 4).fillAndStroke("#ffffff", C.line);
      doc.fillColor(C.muted).font("Helvetica").fontSize(8).text(s.label, x + 8, y + 6, { width: bw - 16, lineBreak: false, ellipsis: true });
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(12).text(formatCell(s.value, s.format), x + 8, y + 19, { width: bw - 16, lineBreak: false, ellipsis: true });
    });
    y += 52;
  }

  // ---- table ----
  const weights = r.columns.map((c) => c.weight ?? (c.format === "text" ? 1.3 : c.format === "datetime" ? 1.6 : 1.1));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / wsum) * width);
  const rowH = 15;
  const pad = 4;

  const drawRow = (cells: string[], opts: { bold?: boolean; fill?: string; color?: string; topLine?: boolean }) => {
    if (opts.fill) doc.rect(left, y, width, rowH).fill(opts.fill);
    if (opts.topLine) doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.8).strokeColor(C.text).stroke();
    doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(opts.color ?? C.text);
    let x = left;
    cells.forEach((t, i) => {
      doc.text(t, x + pad, y + 4, { width: widths[i] - pad * 2, align: isNumeric(r.columns[i].format) ? "right" : "left", lineBreak: false, ellipsis: true });
      x += widths[i];
    });
    y += rowH;
  };
  const header = () => drawRow(r.columns.map((c) => c.label), { bold: true, fill: C.head, color: C.muted });
  const ensure = (h: number) => {
    if (y + h > bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      header();
    }
  };

  if (y + rowH * 2 > bottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  header();
  if (r.rows.length === 0) {
    drawRow([r.kind === "low-stock" ? "No products are low or out of stock." : "No data for this period."], { color: C.muted });
  }
  r.rows.forEach((row, i) => {
    ensure(rowH);
    drawRow(r.columns.map((c) => formatCell(row[c.key], c.format)), { fill: i % 2 ? C.zebra : undefined });
  });
  if (r.totals) {
    ensure(rowH);
    drawRow(r.columns.map((c) => (r.totals![c.key] === undefined ? "" : formatCell(r.totals![c.key], c.format))), { bold: true, topLine: true });
  }
  if (r.rows.length < r.totalRows) {
    ensure(rowH);
    drawRow([`Showing the latest ${r.rows.length.toLocaleString("en-US")} of ${r.totalRows.toLocaleString("en-US")} rows – export CSV for the full list.`], { color: C.muted });
  }

  // ---- notes ----
  if (r.notes.length) {
    y += 10;
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted);
    for (const n of r.notes) {
      const h = doc.heightOfString(n, { width });
      if (y + h > bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.text(n, left, y, { width });
      y += h + 3;
    }
  }

  // ---- footer: page numbers ----
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fy = doc.page.height - 36 - 8;
    doc.page.margins.bottom = 0; // writing below the bottom margin would otherwise add a new page
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted);
    doc.text(`RingUp · ${r.title} · ${r.periodLabel}`, left, fy, { width: width / 2, lineBreak: false, ellipsis: true });
    doc.text(`Page ${i + 1} of ${range.count}`, left + width / 2, fy, { width: width / 2, align: "right", lineBreak: false });
  }

  doc.end();
  return done;
}

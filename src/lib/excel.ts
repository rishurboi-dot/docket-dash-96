import * as XLSX from "xlsx";

export interface ParsedReportRow {
  docket_number: string;
  weight: number | null;
  zone_code: string | null;
  mode: string | null;
  destination: string | null;
  raw: Record<string, unknown>;
}

const HEADER_PATTERNS: Record<string, RegExp> = {
  docket: /docket|awb|consignment|waybill|tracking|pod|lr.?no|shipment/i,
  weight: /weight|wt\b|chargeable|kgs?\b/i,
  zone: /zone|sector|region/i,
  mode: /mode|service|product|courier.?type|^type$/i,
  destination: /destination|dest|city|to\b|delivery|consignee.?city/i,
};

function matchColumn(headers: string[], pattern: RegExp): number {
  return headers.findIndex((h) => pattern.test(h ?? ""));
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function parseCourierExcel(file: File): Promise<ParsedReportRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  if (!rows.length) return [];

  const headers = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
  const idx = {
    docket: matchColumn(headers, HEADER_PATTERNS.docket),
    weight: matchColumn(headers, HEADER_PATTERNS.weight),
    zone: matchColumn(headers, HEADER_PATTERNS.zone),
    mode: matchColumn(headers, HEADER_PATTERNS.mode),
    destination: matchColumn(headers, HEADER_PATTERNS.destination),
  };

  const out: ParsedReportRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;
    const docketRaw = idx.docket >= 0 ? row[idx.docket] : row[0];
    const docket_number = String(docketRaw ?? "").trim();
    if (!docket_number) continue;
    const raw: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      if (h) raw[h] = row[i] ?? null;
    });
    out.push({
      docket_number,
      weight: idx.weight >= 0 ? toNumber(row[idx.weight]) : null,
      zone_code: idx.zone >= 0 ? String(row[idx.zone] ?? "").trim() || null : null,
      mode: idx.mode >= 0 ? String(row[idx.mode] ?? "").trim() || null : null,
      destination: idx.destination >= 0 ? String(row[idx.destination] ?? "").trim() || null : null,
      raw,
    });
  }
  return out;
}

export function exportRowsToExcel(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "Billing",
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
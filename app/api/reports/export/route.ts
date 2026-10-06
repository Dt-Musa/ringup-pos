import { apiAuth } from "@/lib/auth";
import { errorResponse, validate } from "@/lib/api-utils";
import { buildReport } from "@/lib/reports";
import { exportFilename, toCsv, toPdf } from "@/lib/report-export";
import { reportExportSchema } from "@/lib/validation/report";

export const dynamic = "force-dynamic";

const PDF_ROW_LIMIT = 5_000;
const CSV_ROW_LIMIT = 100_000;

/**
 * GET /api/reports/export?report=sales&format=csv|pdf&preset=month|today|week|last30|custom&from=YYYY-MM-DD&to=YYYY-MM-DD&grain=day|week|month
 * ADMIN / MANAGER only (also enforced by the proxy via API_RULES).
 */
export async function GET(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const v = validate(reportExportSchema, params);
  if (!v.ok) return v.response;
  const q = v.data;

  try {
    const report = await buildReport(q.report, q, { rowLimit: q.format === "pdf" ? PDF_ROW_LIMIT : CSV_ROW_LIMIT });
    const meta = { generatedBy: auth.user.name, generatedAt: new Date() };
    const headers = (type: string, ext: "csv" | "pdf") => ({
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${exportFilename(report, ext)}"`,
      "Cache-Control": "no-store",
    });
    if (q.format === "csv") {
      return new Response(toCsv(report, meta), { headers: headers("text/csv; charset=utf-8", "csv") });
    }
    const pdf = await toPdf(report, meta);
    return new Response(new Uint8Array(pdf), { headers: headers("application/pdf", "pdf") });
  } catch (e) {
    console.error("[reports/export] failed", e instanceof Error ? e.message : e);
    return errorResponse("Could not generate the report. Please try again.", 500);
  }
}

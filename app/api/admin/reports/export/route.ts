import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { toCsv } from "@/lib/csv";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getOrdersReport, getPaymentReport, getFreelancerPerformanceReport, getClientActivityReport, parseReportRange } from "@/lib/analytics";

// FIXED (Milestone 17 gap): no export capability existed for any report.
// One route handles all four report types and both formats, since the
// shape of "fetch a report, then render it as CSV or PDF" is identical
// each time — only the row-shaping differs per report type.
async function GETHandler(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) throw new ApiError("Admin session required", 403);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const format = searchParams.get("format") ?? "csv";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const range = parseReportRange(fromParam, toParam);

  let rows: Record<string, string | number>[] = [];
  let title = "Report";

  if (type === "orders") {
    title = "Orders Report";
    const report = await getOrdersReport(range);
    rows = report.byStatus.map((r) => ({ Status: r.status, Count: r.count }));
  } else if (type === "payments") {
    title = "Payment Report";
    const report = await getPaymentReport(range);
    rows = report.byType.map((r) => ({ Type: r.type, Count: r.count, "Total (GBP)": r.totalGbp.toFixed(2) }));
  } else if (type === "freelancers") {
    title = "Freelancer Performance Report";
    const report = await getFreelancerPerformanceReport(range);
    rows = report.map((r) => ({ Name: r.name, "Completed Orders": r.completedOrders, Rating: r.ratingAvg.toFixed(1), "Total Earned (GBP)": r.totalEarnedGbp.toFixed(2) }));
  } else if (type === "clients") {
    title = "Client Activity Report";
    const report = await getClientActivityReport(range);
    rows = report.map((r) => ({ Name: r.name, Email: r.email, "Orders Placed": r.ordersPlaced, "Total Spend (GBP)": r.totalSpendGbp.toFixed(2) }));
  } else {
    throw new ApiError("Unknown report type", 400);
  }

  if (format === "pdf") {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let y = 800;
    const left = 50;
    page.drawText(title, { x: left, y, size: 20, font: bold, color: rgb(0.05, 0.05, 0.05) });
    y -= 24;
    page.drawText(`${range.from.toLocaleDateString("en-GB")} – ${range.to.toLocaleDateString("en-GB")}`, { x: left, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 30;

    if (rows.length === 0) {
      page.drawText("No data for this period.", { x: left, y, size: 11, font });
    } else {
      const headers = Object.keys(rows[0]);
      page.drawText(headers.join("   ·   "), { x: left, y, size: 10, font: bold });
      y -= 18;
      for (const row of rows.slice(0, 35)) {
        // 35 rows fits one A4 page at this line height — a real "next page" for longer reports is a reasonable follow-up, not built here.
        page.drawText(headers.map((h) => String(row[h])).join("   ·   "), { x: left, y, size: 9, font });
        y -= 15;
        if (y < 40) break;
      }
    }

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${title.replace(/\s+/g, "-")}.pdf"` },
    });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${title.replace(/\s+/g, "-")}.csv"` },
  });
}

export const GET = withErrorHandling(GETHandler);

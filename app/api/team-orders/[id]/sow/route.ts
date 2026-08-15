import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// Generates a basic, platform-standard Statement of Work once a team
// engagement's deposit has been paid. This is intentionally simple —
// a real SOW generator would let the team leader customize scope/deliverables
// before generating, and probably route through legal review for anything
// above a certain contract value. This is a first pass: enough structure to
// be useful, not a substitute for a negotiated contract.
async function GETHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.teamOrder.findUnique({
    where: { id: params.id },
    include: {
      team: { include: { teamLeader: { include: { user: true } } } },
      client: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.clientId !== session.sub && session.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't have access to this document" }, { status: 403 });
  }
  if (order.status === "REQUESTED") {
    return NextResponse.json({ error: "A deposit must be paid before the SOW can be generated" }, { status: 409 });
  }

  const composition = (order.customComposition as any[] | null) ?? null;
  const teamName = order.team?.name ?? "Custom Oracle Project Team";
  const leaderName = order.team?.teamLeader.user.fullName ?? composition?.[0]?.consultantName ?? "Team Leader";

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 50;
  const draw = (text: string, opts: { size?: number; f?: typeof font; color?: [number, number, number]; gap?: number } = {}) => {
    page.drawText(text, {
      x: left,
      y,
      size: opts.size ?? 11,
      font: opts.f ?? font,
      color: rgb(...(opts.color ?? [0.05, 0.05, 0.05])),
    });
    y -= opts.gap ?? (opts.size ?? 11) + 8;
  };

  draw("Statement of Work", { size: 22, f: bold, gap: 30 });
  draw(`Engagement: ${teamName}`, { size: 13, f: bold, gap: 20 });
  draw(`Document generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { gap: 24 });

  draw("1. Parties", { size: 13, f: bold, gap: 18 });
  draw(`Client: ${order.client.fullName} (${order.client.email})`);
  draw(`Team Leader: ${leaderName}`, { gap: 24 });

  draw("2. Scope", { size: 13, f: bold, gap: 18 });
  draw(`Team day rate: £${Number(order.dailyRateGbp).toLocaleString()}/day`);
  draw(`Estimated duration: ${order.estimatedWeeks} weeks`);
  draw(`Estimated total: £${Number(order.totalEstimateGbp).toLocaleString()}`, { gap: 24 });

  draw("3. Team composition", { size: 13, f: bold, gap: 18 });
  if (composition) {
    for (const c of composition) {
      draw(`${c.role}: ${c.consultantName} (£${c.dayRateGbp}/day)`);
    }
  } else if (order.team) {
    draw("See team roster at time of booking on OracleGigs.");
  }
  y -= 12;

  draw("4. Payment terms", { size: 13, f: bold, gap: 18 });
  draw("Deposit paid; remaining balance is billed via milestone-based orders");
  draw("through the OracleGigs platform, consistent with the platform's");
  draw("standard escrow-style milestone release process.", { gap: 24 });

  draw("5. This is a platform-generated summary document, not a negotiated", { size: 9, color: [0.4, 0.4, 0.4] });
  draw("legal contract. Consult independent legal advice for engagements", { size: 9, color: [0.4, 0.4, 0.4] });
  draw("above your organization's standard contracting threshold.", { size: 9, color: [0.4, 0.4, 0.4] });

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="SOW-${order.id.slice(-8)}.pdf"`,
    },
  });
}

export const GET = withErrorHandling(GETHandler);

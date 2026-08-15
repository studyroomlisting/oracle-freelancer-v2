import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// Same honest framing as the SOW generator: a platform-standard mutual NDA
// template, not a substitute for legal review on high-value engagements.
async function GETHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.teamOrder.findUnique({
    where: { id: params.id },
    include: { team: { include: { teamLeader: { include: { user: true } } } }, client: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.clientId !== session.sub && session.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't have access to this document" }, { status: 403 });
  }

  const composition = (order.customComposition as any[] | null) ?? null;
  const leaderName = order.team?.teamLeader.user.fullName ?? composition?.[0]?.consultantName ?? "Team Leader";
  const teamName = order.team?.name ?? "Custom Oracle Project Team";

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 50;
  const wrap = (text: string, maxChars: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > maxChars) {
        lines.push(line.trim());
        line = w;
      } else {
        line = `${line} ${w}`;
      }
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
  };
  const draw = (text: string, opts: { size?: number; f?: typeof font; gap?: number; color?: [number, number, number] } = {}) => {
    page.drawText(text, { x: left, y, size: opts.size ?? 10.5, font: opts.f ?? font, color: rgb(...(opts.color ?? [0.05, 0.05, 0.05])) });
    y -= opts.gap ?? (opts.size ?? 10.5) + 7;
  };
  const drawParagraph = (text: string) => {
    for (const line of wrap(text, 95)) draw(line);
    y -= 6;
  };

  draw("Mutual Non-Disclosure Agreement", { size: 20, f: bold, gap: 28 });
  draw(`Engagement: ${teamName}`, { size: 12, f: bold, gap: 20 });
  draw(`Effective date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { gap: 22 });

  draw("Parties", { size: 12, f: bold, gap: 16 });
  draw(`Disclosing/Receiving Party A: ${order.client.fullName} (${order.client.email})`);
  draw(`Disclosing/Receiving Party B: ${leaderName}, on behalf of ${teamName}`, { gap: 20 });

  draw("1. Confidential Information", { size: 12, f: bold, gap: 16 });
  drawParagraph(
    "Each party may disclose non-public business, technical, or financial information in connection with this engagement (\"Confidential Information\"). The receiving party agrees to protect it with the same care it uses for its own confidential information, and not less than reasonable care."
  );

  draw("2. Exclusions", { size: 12, f: bold, gap: 16 });
  drawParagraph(
    "Confidential Information does not include information that is or becomes publicly available through no fault of the receiving party, was already known prior to disclosure, or is independently developed without use of the disclosed information."
  );

  draw("3. Term", { size: 12, f: bold, gap: 16 });
  drawParagraph(
    "This agreement remains in effect for the duration of the engagement and for 24 months following its conclusion, unless superseded by a separately negotiated agreement between the parties."
  );

  draw("4. Platform role", { size: 12, f: bold, gap: 16 });
  drawParagraph(
    "OracleGigs facilitates this engagement but is not a party to this NDA. The obligations above are between the Client and the Team Leader/team members named on this engagement."
  );

  y -= 10;
  draw("This is a platform-generated standard template, not a substitute for", { size: 8.5, color: [0.4, 0.4, 0.4] });
  draw("independent legal review — especially for engagements involving regulated", { size: 8.5, color: [0.4, 0.4, 0.4] });
  draw("data, government contracts, or above your organization's standard threshold.", { size: 8.5, color: [0.4, 0.4, 0.4] });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="NDA-${order.id.slice(-8)}.pdf"`,
    },
  });
}

export const GET = withErrorHandling(GETHandler);

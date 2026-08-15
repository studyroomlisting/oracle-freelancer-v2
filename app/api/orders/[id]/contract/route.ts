import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";

// FIXED (Milestone 8 gap): "Contract" was listed as scope, but nothing
// like it existed for a regular gig order — only team engagements had a
// generated document (SOW, see /api/team-orders/[id]/sow), which this
// mirrors closely. Same intentional scope: a platform-generated summary
// of what was agreed, not a substitute for a negotiated legal contract.
// Available once payment has cleared — a still-unpaid order has nothing
// binding yet to summarize.
async function GETHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      gig: { include: { freelancerProfile: { include: { user: true } } } },
      gigPackage: true,
      client: true,
      milestones: true,
    },
  });
  if (!order) throw new ApiError("Order not found", 404);
  const isParty = order.clientId === session.sub || order.gig.freelancerProfile.userId === session.sub;
  if (!isParty && session.role !== "ADMIN") throw new ApiError("You don't have access to this document", 403);
  if (order.status === "PENDING_PAYMENT" || order.status === "PENDING_ACCEPTANCE") {
    throw new ApiError("A contract is available once the order has been accepted and paid for", 409);
  }

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

  draw("Order Agreement", { size: 22, f: bold, gap: 30 });
  draw(`Gig: ${order.gig.title}`, { size: 13, f: bold, gap: 20 });
  draw(`Document generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { gap: 24 });

  draw("1. Parties", { size: 13, f: bold, gap: 18 });
  draw(`Client: ${order.client.fullName} (${order.client.email})`);
  draw(`Freelancer: ${order.gig.freelancerProfile.user.fullName} (${order.gig.freelancerProfile.user.email})`, { gap: 24 });

  draw("2. Scope", { size: 13, f: bold, gap: 18 });
  draw(`Package: ${order.gigPackage.title}`);
  draw(`${order.gigPackage.description}`.slice(0, 90), { gap: 16 });
  draw(`Delivery window: ${order.gigPackage.deliveryDays} day${order.gigPackage.deliveryDays !== 1 ? "s" : ""}`);
  draw(`Revisions included: ${order.gigPackage.revisions}`, { gap: 24 });

  draw("3. Payment terms", { size: 13, f: bold, gap: 18 });
  draw(`Total price: £${Number(order.totalPriceGbp).toLocaleString()}`);
  draw(`Platform fee: £${Number(order.platformFeeGbp).toLocaleString()}`);
  draw("Released to the freelancer via milestone approval on the OracleGigs", { gap: 8 });
  draw("platform's standard escrow-style process.", { gap: 24 });

  draw("4. Milestones", { size: 13, f: bold, gap: 18 });
  for (const m of order.milestones) {
    draw(`${m.title} — £${Number(m.amountGbp).toLocaleString()} (${m.status})`);
  }
  y -= 12;

  draw("5. This is a platform-generated summary of the order as placed, not a", { size: 9, color: [0.4, 0.4, 0.4] });
  draw("negotiated legal contract. Consult independent legal advice for work", { size: 9, color: [0.4, 0.4, 0.4] });
  draw("above your organization's standard contracting threshold.", { size: 9, color: [0.4, 0.4, 0.4] });

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Contract-${order.id.slice(-8)}.pdf"`,
    },
  });
}

export const GET = withErrorHandling(GETHandler);

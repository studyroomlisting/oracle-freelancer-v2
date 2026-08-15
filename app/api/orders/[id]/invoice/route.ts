import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ApiError } from "@/lib/api/errors";
import { calculateVatAmount } from "@/lib/pricing";

// FIXED (Milestone 10 gap): no invoice existed at all — distinct from the
// Contract (Milestone 8, order scope/terms) in purpose: this is the
// financial record — amount, VAT breakdown, payment reference, date —
// what an accountant or expense system actually needs, not the agreement
// itself. Available once payment has actually cleared.
async function GETHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { gig: { include: { freelancerProfile: { include: { user: true } } } }, gigPackage: true, client: true },
  });
  if (!order) throw new ApiError("Order not found", 404);
  const isParty = order.clientId === session.sub || order.gig.freelancerProfile.userId === session.sub;
  if (!isParty && session.role !== "ADMIN") throw new ApiError("You don't have access to this document", 403);
  if (order.status === "PENDING_PAYMENT" || order.status === "PENDING_ACCEPTANCE") {
    throw new ApiError("An invoice is available once payment has cleared", 409);
  }

  // Historical orders paid before this phase won't have a stored
  // vatAmountGbp — derive it on the fly rather than show £0.00 VAT on an
  // invoice that clearly had some.
  const vatAmountGbp = Number(order.vatAmountGbp) > 0 ? Number(order.vatAmountGbp) : calculateVatAmount(Number(order.totalPriceGbp), order.vatRatePercent);
  const netAmountGbp = Number(order.totalPriceGbp) - vatAmountGbp;

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

  draw("Invoice", { size: 22, f: bold, gap: 30 });
  draw(`Invoice reference: ${order.stripePaymentId ?? order.id.slice(-8)}`, { size: 11, gap: 16 });
  draw(`Date: ${order.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { gap: 24 });

  draw("Billed to", { size: 13, f: bold, gap: 18 });
  draw(`${order.client.fullName} (${order.client.email})`, { gap: 24 });

  draw("Service provided by", { size: 13, f: bold, gap: 18 });
  draw(`${order.gig.freelancerProfile.user.fullName} (${order.gig.freelancerProfile.user.email})`, { gap: 24 });

  draw("Description", { size: 13, f: bold, gap: 18 });
  draw(`${order.gig.title} — ${order.gigPackage.title}`, { gap: 24 });

  const extrasSnapshot = Array.isArray(order.extrasSnapshot) ? (order.extrasSnapshot as { title: string; priceGbp: number }[]) : [];
  if (extrasSnapshot.length > 0) {
    draw("Extras", { size: 13, f: bold, gap: 18 });
    for (const e of extrasSnapshot) {
      draw(`${e.title} — £${e.priceGbp.toFixed(2)}`);
    }
    y -= 12;
  }

  draw("Amount", { size: 13, f: bold, gap: 18 });
  draw(`Net: £${netAmountGbp.toFixed(2)}`);
  draw(`VAT (${order.vatRatePercent}%): £${vatAmountGbp.toFixed(2)}`);
  draw(`Total paid: £${Number(order.totalPriceGbp).toFixed(2)}`, { f: bold, gap: 24 });

  draw("This is a platform-generated invoice for a simulated payment — real", { size: 9, color: [0.4, 0.4, 0.4] });
  draw("Stripe payment processing is not yet connected on this deployment.", { size: 9, color: [0.4, 0.4, 0.4] });

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${order.id.slice(-8)}.pdf"`,
    },
  });
}

export const GET = withErrorHandling(GETHandler);

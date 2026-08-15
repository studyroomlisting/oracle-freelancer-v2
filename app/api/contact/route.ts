import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  message: z.string().min(1).max(4000),
});

// Support inbox address — change once you have a real one.
const SUPPORT_INBOX = "support@oraclegigs.example";

async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`contact:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "Too many messages sent. Please try again later." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });

  await sendEmail({
    to: SUPPORT_INBOX,
    subject: `Contact form: ${parsed.data.name}`,
    body: `From: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
  });

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(POSTHandler);

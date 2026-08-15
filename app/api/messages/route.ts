import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

const schema = z
  .object({
    receiverId: z.string().min(1),
    body: z.string().max(4000),
    orderId: z.string().optional(),
    gigId: z.string().optional(),
    attachmentUrl: z.string().optional(),
    attachmentType: z.string().optional(),
  })
  // FIXED (Milestone 9 gap): "just a photo, no caption" is a completely
  // normal chat message — body was previously always required (min(1)),
  // which would have forced a caption on every attachment.
  .refine((data) => data.body.trim().length > 0 || !!data.attachmentUrl, {
    message: "A message needs either text or an attachment",
    path: ["body"],
  });

async function POSTHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) {
    return NextResponse.json({ error: "You need to be signed in to send a message" }, { status: 401 });
  }

  // 30 messages per minute per user — plenty for real conversation, blunt for spam scripts.
  const { allowed } = rateLimit(`message:${session.sub}`, 30, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "You're sending messages too quickly — please slow down." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  const { receiverId, body, orderId, gigId, attachmentUrl, attachmentType } = parsed.data;

  if (receiverId === session.sub) {
    return NextResponse.json({ error: "You can't message yourself" }, { status: 400 });
  }

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      senderId: session.sub,
      receiverId,
      body,
      orderId: orderId ?? null,
      gigId: gigId ?? null,
      attachmentUrl: attachmentUrl ?? null,
      attachmentType: attachmentType ?? null,
    },
  });

  const sender = await prisma.user.findUnique({ where: { id: session.sub } });
  if (sender) {
    await sendEmail({ to: receiver.email, ...emailTemplates.newMessage({ senderName: sender.fullName }) });
  }
  await createNotification({
    userId: receiverId,
    type: "message",
    title: `New message from ${sender?.fullName ?? "someone"}`,
    body: body.trim() ? body.slice(0, 140) : "Sent an attachment",
    linkUrl: `/messages/${session.sub}`,
  });

  return NextResponse.json({ message }, { status: 201 });
}

export const POST = withErrorHandling(POSTHandler);

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnySession } from "@/lib/auth";
import { saveUploadedFile, UploadError } from "@/lib/storage";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

async function POSTHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const { url } = await saveUploadedFile(file, "avatars");
    await prisma.user.update({ where: { id: session.sub }, data: { avatarUrl: url } });
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const POST = withErrorHandling(POSTHandler);

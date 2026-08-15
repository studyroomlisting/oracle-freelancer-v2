import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreelancerSession } from "@/lib/auth";
import { saveUploadedFile, UploadError } from "@/lib/storage";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

async function POSTHandler(req: NextRequest) {
  const session = await requireFreelancerSession(req);
  if (!session) return NextResponse.json({ error: "You need a freelancer account to upload a resume" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const { url } = await saveUploadedFile(file, "resumes");
    await prisma.freelancerProfile.update({ where: { userId: session.sub }, data: { resumeUrl: url } });
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const POST = withErrorHandling(POSTHandler);

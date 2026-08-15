import { NextRequest, NextResponse } from "next/server";
import { requireAnySession } from "@/lib/auth";
import { saveUploadedFile, UploadError } from "@/lib/storage";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// FIXED (real gap found during review): reference documents, spec sheets,
// deliverable files — anything beyond a quick chat attachment — had no
// dedicated place to live during an active order.
async function POSTHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const { url } = await saveUploadedFile(file, "workspace-documents");
    return NextResponse.json({ url, name: file.name }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const POST = withErrorHandling(POSTHandler);

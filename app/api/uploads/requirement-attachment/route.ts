import { NextRequest, NextResponse } from "next/server";
import { requireAnySession } from "@/lib/auth";
import { saveUploadedFile, UploadError } from "@/lib/storage";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// FIXED (Post Requirement expansion): screenshots/videos/log files at
// requirement-creation time — didn't exist before. Any authenticated
// user can upload here (matching /api/projects' own rule — a freelancer
// can post a requirement too), the file itself isn't yet linked to any
// posting; that happens when the posting is created/edited with this
// URL included in its attachments list.
async function POSTHandler(req: NextRequest) {
  const session = await requireAnySession(req);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const { url } = await saveUploadedFile(file, "requirements");
    return NextResponse.json({ url, type: file.type, name: file.name }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const POST = withErrorHandling(POSTHandler);
